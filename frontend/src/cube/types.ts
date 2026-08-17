import type { ReactNode } from "react";
import type { CubeColor } from "./colors";

export const FACE_IDS = [
  "front",
  "right",
  "back",
  "left",
  "up",
  "down",
] as const;

export type FaceId = (typeof FACE_IDS)[number];
export type SliceIndex = 0 | 1 | 2;
export type TurnAxis = "row" | "col";
export type TurnDir = 1 | -1;

export type Cell = {
  color: CubeColor;
  slot?: string;
};

export type Face = [Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell];
export type CubeFaces = Record<FaceId, Face>;

export type Turn = {
  axis: TurnAxis;
  index: SliceIndex;
  dir: TurnDir;
};

export type SlotContext = {
  active: boolean;
};

export type RenderSlot = (
  slot: string,
  context: SlotContext,
) => ReactNode;
