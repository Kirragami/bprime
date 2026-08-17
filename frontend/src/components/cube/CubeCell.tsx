import type { CSSProperties } from "react";
import { inkForTile, type Cell, type RenderSlot } from "../../cube";

type CubeCellProps = {
  cell: Cell;
  active?: boolean;
  renderSlot?: RenderSlot;
};

export function CubeCell({ cell, active = false, renderSlot }: CubeCellProps) {
  const content = cell.slot ? renderSlot?.(cell.slot, { active }) : null;
  const isCentered = cell.slot === "title";
  const className = [
    "cube-board__cell",
    content && isCentered ? "cube-board__cell--form" : "",
    content && !isCentered ? "cube-board__cell--copy" : "",
    active ? "cube-board__cell--active" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const ink = inkForTile(cell.color);

  return (
    <div
      className={className}
      style={
        {
          backgroundColor: cell.color,
          "--tile": cell.color,
          "--tile-ink": ink.ink,
          "--tile-muted": ink.muted,
          "--tile-button": ink.button,
          "--tile-button-ink": ink.buttonInk,
        } as CSSProperties
      }
    >
      {content}
    </div>
  );
}
