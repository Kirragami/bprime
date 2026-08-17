import { useCallback, useRef, useState } from "react";
import { CUBE_TURN_MS } from "./constants";
import { applySliceTurn, createRandomCube } from "./state";
import type { CubeFaces, SliceIndex, Turn, TurnDir } from "./types";

export type CubeController = {
  faces: CubeFaces;
  turn: Turn | null;
  angle: number;
  turning: boolean;
  turnRow: (index: SliceIndex, dir?: TurnDir) => Promise<boolean>;
  turnCol: (index: SliceIndex, dir?: TurnDir) => Promise<boolean>;
  turnSlice: (turn: Turn) => Promise<boolean>;
};

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function nextFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

export type UseCubeOptions = {
  afterTurn?: (faces: CubeFaces, turn: Turn) => CubeFaces;
};

export function useCube(
  initial?: CubeFaces | (() => CubeFaces),
  options?: UseCubeOptions,
): CubeController {
  const [faces, setFaces] = useState<CubeFaces>(() => {
    if (typeof initial === "function") {
      return initial();
    }
    return initial ?? createRandomCube();
  });
  const [turn, setTurn] = useState<Turn | null>(null);
  const [angle, setAngle] = useState(0);
  const [turning, setTurning] = useState(false);
  const busy = useRef(false);
  const afterTurnRef = useRef(options?.afterTurn);
  afterTurnRef.current = options?.afterTurn;

  const turnSlice = useCallback(async (next: Turn) => {
    if (busy.current) {
      return false;
    }

    busy.current = true;
    setTurning(true);
    setTurn(next);
    setAngle(0);

    await nextFrame();
    setAngle(next.dir * -90);
    await wait(CUBE_TURN_MS);

    setFaces((current) => {
      const applied = applySliceTurn(current, next);
      return afterTurnRef.current?.(applied, next) ?? applied;
    });
    setTurn(null);
    setAngle(0);
    setTurning(false);
    busy.current = false;
    return true;
  }, []);

  const turnRow = useCallback(
    (index: SliceIndex, dir: TurnDir = 1) =>
      turnSlice({ axis: "row", index, dir }),
    [turnSlice],
  );

  const turnCol = useCallback(
    (index: SliceIndex, dir: TurnDir = 1) =>
      turnSlice({ axis: "col", index, dir }),
    [turnSlice],
  );

  return { faces, turn, angle, turning, turnRow, turnCol, turnSlice };
}
