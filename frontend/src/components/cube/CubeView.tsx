import type { CSSProperties } from "react";
import {
  colSlots,
  inkForTile,
  isSliceCell,
  rowSlots,
  type CubeColor,
  type CubeFaces,
  type Overlay,
  type RenderSlot,
  type RowSlots,
  type Turn,
} from "../../cube";
import { CubeCell } from "./CubeCell";
import { SliceBelt } from "./SliceBelt";

function slicePerspectiveOrigin(turn: Turn) {
  const center = `${((turn.index + 0.5) / 3) * 100}%`;
  return turn.axis === "row" ? `50% ${center}` : `${center} 50%`;
}

function OverlayCell({
  color,
  slot,
  renderSlot,
}: {
  color: CubeColor;
  slot: string | null;
  renderSlot?: RenderSlot;
}) {
  const content = slot ? renderSlot?.(slot, { active: true }) : null;
  const ink = inkForTile(color);
  const isTitle = slot === "title" || slot === "title-modes" || slot === "solo-title";
  const isFill =
    slot === "solo-stage" ||
    slot === "solo-preview" ||
    slot === "solo-scramble" ||
    slot === "bests" ||
    slot === "history" ||
    slot === "history-attempts" ||
    slot === "history-detail" ||
    slot === "history-avg" ||
    slot === "history-time";
  const isProfile = slot === "profile";
  const isSoloDock = slot === "solo-history" || slot === "solo-actions";
  const className = [
    "cube-overlay__cell",
    content && isTitle ? "cube-overlay__cell--form" : "",
    content && isFill ? "cube-overlay__cell--timer" : "",
    content && isProfile ? "cube-overlay__cell--profile" : "",
    content && isSoloDock ? "cube-overlay__cell--copy" : "",
    content && !isTitle && !isFill && !isProfile && !isSoloDock ? "cube-overlay__cell--copy" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      style={
        {
          "--tile": color,
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

type CubeViewProps = {
  faces: CubeFaces;
  overlay: Overlay;
  turn?: Turn | null;
  angle?: number;
  turning?: boolean;
  incomingSlots?: RowSlots;
  renderSlot?: RenderSlot;
};

export function CubeView({
  faces,
  overlay,
  turn = null,
  angle = 0,
  turning = false,
  incomingSlots,
  renderSlot,
}: CubeViewProps) {
  const frontSlots = turn
    ? turn.axis === "row"
      ? rowSlots(overlay, turn.index)
      : colSlots(overlay, turn.index)
    : undefined;
  const rideSlots = incomingSlots ?? (turn?.axis === "col" ? frontSlots : undefined);

  return (
    <div
      className={`cube-scene${turning ? " is-turning" : ""}`}
      style={
        turn
          ? ({
              perspectiveOrigin: slicePerspectiveOrigin(turn),
              "--slice-index": turn.index,
            } as CSSProperties)
          : undefined
      }
    >
      <div className="cube-face-flat cube-face-grid">
        {faces.front.map((cell, index) => {
          const hidden = turn ? isSliceCell(turn.axis, turn.index, index) : false;

          if (hidden) {
            return <div key={index} className="cube-board__cell-spacer" />;
          }

          return <CubeCell key={index} cell={cell} />;
        })}
      </div>

      <div className="cube-face-grid cube-overlay-grid">
        {overlay.map((slot, index) => {
          const hidden = turn ? isSliceCell(turn.axis, turn.index, index) : false;

          if (hidden) {
            return <div key={index} className="cube-overlay__cell" />;
          }

          return (
            <OverlayCell
              key={index}
              color={faces.front[index].color}
              slot={slot}
              renderSlot={renderSlot}
            />
          );
        })}
      </div>

      {turn ? (
        <div className={`cube cube--turning cube--${turn.axis}-turn`}>
          <SliceBelt
            faces={faces}
            turn={turn}
            angle={angle}
            frontSlots={frontSlots}
            incomingSlots={rideSlots}
            renderSlot={renderSlot}
          />
        </div>
      ) : null}
    </div>
  );
}
