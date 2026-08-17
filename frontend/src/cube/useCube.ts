import { useCallback, useRef, useState } from "react";
import { CUBE_SETTLE_MS, CUBE_TURN_MS } from "./constants";
import { applySliceTurn, createRandomCube } from "./state";
import type { CubeFaces, SliceIndex, Turn, TurnDir } from "./types";

export type CubeController = {
  faces: CubeFaces;
  turn: Turn | null;
  angle: number;
  turning: boolean;
  isBusy: () => boolean;
  turnRow: (index: SliceIndex, dir?: TurnDir, commit?: () => void) => Promise<boolean>;
  turnCol: (index: SliceIndex, dir?: TurnDir, commit?: () => void) => Promise<boolean>;
  turnSlice: (turn: Turn, commit?: () => void) => Promise<boolean>;
};

type QueuedTurn = {
  next: Turn;
  commit?: () => void;
  resolve: (ok: boolean) => void;
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

export function useCube(initial?: CubeFaces | (() => CubeFaces)): CubeController {
  const [faces, setFaces] = useState<CubeFaces>(() => {
    if (typeof initial === "function") {
      return initial();
    }
    return initial ?? createRandomCube();
  });
  const [turn, setTurn] = useState<Turn | null>(null);
  const [angle, setAngle] = useState(0);
  const [turning, setTurning] = useState(false);
  const running = useRef(false);
  const queue = useRef<QueuedTurn[]>([]);

  const isBusy = useCallback(() => running.current || queue.current.length > 0, []);

  const play = useCallback(async (item: QueuedTurn) => {
    const next = item.next;
    setTurning(true);
    setAngle(0);
    setTurn(next);

    await nextFrame();
    setAngle(next.dir * -90);
    await wait(CUBE_TURN_MS);

    setFaces((current) => applySliceTurn(current, next));
    item.commit?.();
    setTurn(null);
    setAngle(0);
    setTurning(false);
    await nextFrame();
    await wait(CUBE_SETTLE_MS);
  }, []);

  const drain = useCallback(async () => {
    if (running.current) {
      return;
    }

    running.current = true;
    while (queue.current.length > 0) {
      const item = queue.current.shift();
      if (!item) {
        break;
      }
      await play(item);
      item.resolve(true);
    }
    running.current = false;
  }, [play]);

  const turnSlice = useCallback(
    (next: Turn, commit?: () => void) =>
      new Promise<boolean>((resolve) => {
        queue.current.push({ next, commit, resolve });
        void drain();
      }),
    [drain],
  );

  const turnRow = useCallback(
    (index: SliceIndex, dir: TurnDir = 1, commit?: () => void) =>
      turnSlice({ axis: "row", index, dir }, commit),
    [turnSlice],
  );

  const turnCol = useCallback(
    (index: SliceIndex, dir: TurnDir = 1, commit?: () => void) =>
      turnSlice({ axis: "col", index, dir }, commit),
    [turnSlice],
  );

  return { faces, turn, angle, turning, isBusy, turnRow, turnCol, turnSlice };
}
