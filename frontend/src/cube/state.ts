import { randomCubeColor } from "./colors";
import { FACE_IDS, type Cell, type CubeFaces, type Face, type Turn } from "./types";

export function randomCell(slot?: string): Cell {
  return slot ? { color: randomCubeColor(), slot } : { color: randomCubeColor() };
}

export function randomFace(): Face {
  return Array.from({ length: 9 }, () => randomCell()) as Face;
}

export function createRandomCube(): CubeFaces {
  return Object.fromEntries(FACE_IDS.map((id) => [id, randomFace()])) as CubeFaces;
}

export function rowIndices(row: number): [number, number, number] {
  return [row * 3, row * 3 + 1, row * 3 + 2];
}

export function colIndices(col: number): [number, number, number] {
  return [col, col + 3, col + 6];
}

function take(face: Face, indices: readonly number[]): Cell[] {
  return indices.map((index) => face[index]);
}

function put(face: Face, indices: readonly number[], cells: Cell[]): Face {
  const next = [...face] as Face;
  indices.forEach((index, offset) => {
    next[index] = cells[offset];
  });
  return next;
}

function cloneFaces(faces: CubeFaces): CubeFaces {
  return {
    front: [...faces.front] as Face,
    right: [...faces.right] as Face,
    back: [...faces.back] as Face,
    left: [...faces.left] as Face,
    up: [...faces.up] as Face,
    down: [...faces.down] as Face,
  };
}

export function getRowBelt(faces: CubeFaces, row: number) {
  const indices = rowIndices(row);
  return {
    front: take(faces.front, indices),
    right: take(faces.right, indices),
    back: take(faces.back, indices),
    left: take(faces.left, indices),
  };
}

export function getColBelt(faces: CubeFaces, col: number) {
  const indices = colIndices(col);
  return {
    front: take(faces.front, indices),
    up: take(faces.up, indices),
    back: take(faces.back, indices),
    down: take(faces.down, indices),
  };
}

export function syncTaglineColumn(faces: CubeFaces): CubeFaces {
  const loginFirst = faces.front[1]?.slot !== "register-tagline";
  const primary = loginFirst ? "tagline" : "register-tagline";
  const secondary = loginFirst ? "register-tagline" : "tagline";
  const next = cloneFaces(faces);

  next.front[1] =
    next.front[0]?.slot === "profile"
      ? { color: next.front[1].color }
      : { ...next.front[1], slot: primary };
  next.up[1] = { ...next.up[1], slot: secondary };
  next.back[1] = { ...next.back[1], slot: primary };
  next.down[1] = { ...next.down[1], slot: secondary };

  for (const id of ["front", "up", "back", "down"] as const) {
    next[id][4] = { ...next[id][4], slot: "title" };
  }

  return next;
}

export function isSliceCell(axis: Turn["axis"], index: number, cellIndex: number) {
  const row = Math.floor(cellIndex / 3);
  const col = cellIndex % 3;
  return axis === "row" ? row === index : col === index;
}

export function rotateFaceCW(face: Face): Face {
  return [
    face[6],
    face[3],
    face[0],
    face[7],
    face[4],
    face[1],
    face[8],
    face[5],
    face[2],
  ] as Face;
}

export function rotateFaceCCW(face: Face): Face {
  return [
    face[2],
    face[5],
    face[8],
    face[1],
    face[4],
    face[7],
    face[0],
    face[3],
    face[6],
  ] as Face;
}

/**
 * Quarter-turn a row (Y) or column (X).
 * dir +1 matches the locked spin: incoming face is right (row) or up (col).
 */
export function applySliceTurn(faces: CubeFaces, turn: Turn): CubeFaces {
  const next = cloneFaces(faces);

  if (turn.axis === "row") {
    const indices = rowIndices(turn.index);
    const front = take(faces.front, indices);
    const right = take(faces.right, indices);
    const back = take(faces.back, indices);
    const left = take(faces.left, indices);

    if (turn.dir === 1) {
      next.front = put(next.front, indices, right);
      next.right = put(next.right, indices, back);
      next.back = put(next.back, indices, left);
      next.left = put(next.left, indices, front);
    } else {
      next.front = put(next.front, indices, left);
      next.left = put(next.left, indices, back);
      next.back = put(next.back, indices, right);
      next.right = put(next.right, indices, front);
    }

    if (turn.index === 0) {
      next.up = turn.dir === 1 ? rotateFaceCW(faces.up) : rotateFaceCCW(faces.up);
    }
    if (turn.index === 2) {
      next.down = turn.dir === 1 ? rotateFaceCCW(faces.down) : rotateFaceCW(faces.down);
    }

    return next;
  }

  const indices = colIndices(turn.index);
  const front = take(faces.front, indices);
  const up = take(faces.up, indices);
  const back = take(faces.back, indices);
  const down = take(faces.down, indices);

  if (turn.dir === 1) {
    next.front = put(next.front, indices, up);
    next.up = put(next.up, indices, back);
    next.back = put(next.back, indices, down);
    next.down = put(next.down, indices, front);
  } else {
    next.front = put(next.front, indices, down);
    next.down = put(next.down, indices, back);
    next.back = put(next.back, indices, up);
    next.up = put(next.up, indices, front);
  }

  if (turn.index === 2) {
    next.right = turn.dir === 1 ? rotateFaceCW(faces.right) : rotateFaceCCW(faces.right);
  }
  if (turn.index === 0) {
    next.left = turn.dir === 1 ? rotateFaceCCW(faces.left) : rotateFaceCW(faces.left);
  }

  return next;
}
