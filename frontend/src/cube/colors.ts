export const CUBE_COLORS = [
  "#ffffff",
  "#ffd500",
  "#b71234",
  "#ff5800",
  "#0046ad",
  "#009b48",
] as const;

export type CubeColor = (typeof CUBE_COLORS)[number];
export type CubeFaceColors = CubeColor[];

export function randomCubeColor(): CubeColor {
  return CUBE_COLORS[Math.floor(Math.random() * CUBE_COLORS.length)];
}

export function randomCubeFace(): CubeFaceColors {
  return Array.from({ length: 9 }, randomCubeColor);
}

export function randomCubeFaces(count: number): CubeFaceColors[] {
  return Array.from({ length: count }, randomCubeFace);
}
