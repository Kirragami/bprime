import type { CSSProperties } from "react";
import {
  getColBelt,
  getRowBelt,
  type Cell,
  type CubeFaces,
  type Face,
  type RenderSlot,
  type RowSlots,
  type Turn,
} from "../../cube";
import { CubeCell } from "./CubeCell";

type SliceBeltProps = {
  faces: CubeFaces;
  turn: Turn;
  angle: number;
  frontSlots?: RowSlots;
  incomingSlots?: RowSlots;
  renderSlot?: RenderSlot;
};

function Strip({
  cells,
  slots,
  renderSlot,
}: {
  cells: Cell[];
  slots?: RowSlots;
  renderSlot?: RenderSlot;
}) {
  return (
    <>
      {cells.map((cell, index) => (
        <CubeCell
          key={index}
          cell={cell}
          slot={slots?.[index]}
          active={Boolean(slots?.[index])}
          renderSlot={renderSlot}
        />
      ))}
    </>
  );
}

function FaceCap({ face }: { face: Face }) {
  return (
    <>
      {face.map((cell, index) => (
        <CubeCell key={index} cell={cell} />
      ))}
    </>
  );
}

export function SliceBelt({
  faces,
  turn,
  angle,
  frontSlots,
  incomingSlots,
  renderSlot,
}: SliceBeltProps) {
  const style = {
    transform:
      turn.axis === "row" ? `rotateY(${angle}deg)` : `rotateX(${angle}deg)`,
    "--slice-index": turn.index,
  } as CSSProperties;

  if (turn.axis === "row") {
    const belt = getRowBelt(faces, turn.index);
    const incoming = turn.dir === 1 ? "right" : "left";

    return (
      <div className="cube-slab cube-slab--row" style={style}>
        <div className="cube-slab-wall cube-slab-wall--front">
          <Strip cells={belt.front} slots={frontSlots} renderSlot={renderSlot} />
        </div>
        <div className="cube-slab-wall cube-slab-wall--right">
          <Strip
            cells={belt.right}
            slots={incoming === "right" ? incomingSlots : undefined}
            renderSlot={renderSlot}
          />
        </div>
        <div className="cube-slab-wall cube-slab-wall--back">
          <Strip cells={belt.back} renderSlot={renderSlot} />
        </div>
        <div className="cube-slab-wall cube-slab-wall--left">
          <Strip
            cells={belt.left}
            slots={incoming === "left" ? incomingSlots : undefined}
            renderSlot={renderSlot}
          />
        </div>
        <div
          className={
            turn.index === 0
              ? "cube-slab-cap cube-slab-cap--top"
              : "cube-slab-cap cube-slab-cap--top cube-slab-cap--plastic"
          }
        >
          {turn.index === 0 ? <FaceCap face={faces.up} /> : null}
        </div>
        <div
          className={
            turn.index === 2
              ? "cube-slab-cap cube-slab-cap--bottom"
              : "cube-slab-cap cube-slab-cap--bottom cube-slab-cap--plastic"
          }
        >
          {turn.index === 2 ? <FaceCap face={faces.down} /> : null}
        </div>
      </div>
    );
  }

  const belt = getColBelt(faces, turn.index);
  const incoming = turn.dir === 1 ? "up" : "down";

  return (
    <div className="cube-slab cube-slab--col" style={style}>
      <div className="cube-slab-wall cube-slab-wall--front cube-slab-wall--col">
        <Strip cells={belt.front} slots={frontSlots} renderSlot={renderSlot} />
      </div>
      <div className="cube-slab-wall cube-slab-wall--up cube-slab-wall--col">
        <Strip
          cells={belt.up}
          slots={incoming === "up" ? incomingSlots : undefined}
          renderSlot={renderSlot}
        />
      </div>
      <div className="cube-slab-wall cube-slab-wall--back cube-slab-wall--col">
        <Strip cells={belt.back} />
      </div>
      <div className="cube-slab-wall cube-slab-wall--down cube-slab-wall--col">
        <Strip
          cells={belt.down}
          slots={incoming === "down" ? incomingSlots : undefined}
          renderSlot={renderSlot}
        />
      </div>
      <div
        className={
          turn.index === 2
            ? "cube-slab-cap cube-slab-cap--right"
            : "cube-slab-cap cube-slab-cap--right cube-slab-cap--plastic"
        }
      >
        {turn.index === 2 ? <FaceCap face={faces.right} /> : null}
      </div>
      <div
        className={
          turn.index === 0
            ? "cube-slab-cap cube-slab-cap--left"
            : "cube-slab-cap cube-slab-cap--left cube-slab-cap--plastic"
        }
      >
        {turn.index === 0 ? <FaceCap face={faces.left} /> : null}
      </div>
    </div>
  );
}
