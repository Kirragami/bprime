import type { CSSProperties } from "react";
import { inkForTile, type Cell, type RenderSlot } from "../../cube";

type CubeCellProps = {
  cell: Cell;
  slot?: string | null;
  active?: boolean;
  renderSlot?: RenderSlot;
};

export function CubeCell({ cell, slot = null, active = false, renderSlot }: CubeCellProps) {
  const content = slot ? renderSlot?.(slot, { active }) : null;
  const isCentered = slot === "title" || slot === "title-modes" || slot === "solo-title";
  const isFill = slot === "solo-stage" || slot === "solo-preview" || slot === "solo-scramble";
  const className = [
    "cube-board__cell",
    content && isCentered ? "cube-board__cell--form" : "",
    content && isFill ? "cube-board__cell--timer" : "",
    content && !isCentered && !isFill ? "cube-board__cell--copy" : "",
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
