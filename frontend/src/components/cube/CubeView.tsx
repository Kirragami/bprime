import type { CSSProperties } from "react";
import { isSliceCell, type CubeFaces, type RenderSlot, type Turn } from "../../cube";
import { CubeCell } from "./CubeCell";
import { SliceBelt } from "./SliceBelt";

function slicePerspectiveOrigin(turn: Turn) {
  const center = `${((turn.index + 0.5) / 3) * 100}%`;
  return turn.axis === "row" ? `50% ${center}` : `${center} 50%`;
}

type CubeViewProps = {
  faces: CubeFaces;
  turn?: Turn | null;
  angle?: number;
  turning?: boolean;
  renderSlot?: RenderSlot;
};

export function CubeView({
  faces,
  turn = null,
  angle = 0,
  turning = false,
  renderSlot,
}: CubeViewProps) {
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

          return (
            <CubeCell
              key={index}
              cell={cell}
              active={!turning && Boolean(cell.slot)}
              renderSlot={renderSlot}
            />
          );
        })}
      </div>

      {turn ? (
        <div
          className={`cube cube--turning cube--${turn.axis}-turn`}
        >
          <SliceBelt
            faces={faces}
            turn={turn}
            angle={angle}
            renderSlot={renderSlot}
          />
        </div>
      ) : null}
    </div>
  );
}
