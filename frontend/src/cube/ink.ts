import type { CubeColor } from "./colors";

type TileInk = {
  ink: string;
  muted: string;
  button: string;
  buttonInk: string;
};

function hexToRgb(hex: string) {
  const value = Number.parseInt(hex.slice(1), 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function channel(value: number) {
  const scaled = value / 255;
  return scaled <= 0.03928
    ? scaled / 12.92
    : ((scaled + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function inkForTile(color: CubeColor): TileInk {
  if (luminance(color) > 0.4) {
    return {
      ink: "#141414",
      muted: "rgba(20, 20, 20, 0.4)",
      button: "#141414",
      buttonInk: color,
    };
  }

  return {
    ink: "#ffffff",
    muted: "rgba(255, 255, 255, 0.42)",
    button: "#ffffff",
    buttonInk: color,
  };
}
