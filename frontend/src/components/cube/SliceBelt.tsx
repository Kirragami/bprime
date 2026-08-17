import type { CSSProperties } from "react";
import {
  getColBelt,
  getRowBelt,
  type Cell,
  type CubeFaces,
  type Face,
  type RenderSlot,
  type Turn,
} from "../../cube";
import { CubeCell } from "./CubeCell";

type SliceBeltProps = {
  faces: CubeFaces;
  turn: Turn;
  angle: number;
  renderSlot?: RenderSlot;
};

function Strip({ cells, renderSlot }: { cells: Cell[]; renderSlot?: RenderSlot }) {
  return (
    <>
      {cells.map((cell, index) => (
        <CubeCell key={index} cell={cell} renderSlot={renderSlot} />
      ))}
    </>
  );
}

function FaceCap({ face, renderSlot }: { face: Face; renderSlot?: RenderSlot }) {
  return (
    <>
      {face.map((cell, index) => (
        <CubeCell key={index} cell={cell} renderSlot={renderSlot} />
      ))}
    </>
  );
}

export function SliceBelt({ faces, turn, angle, renderSlot }: SliceBeltProps) {
  const style = {
    transform:
      turn.axis === "row" ? `rotateY(${angle}deg)` : `rotateX(${angle}deg)`,
    "--slice-index": turn.index,
  } as CSSProperties;

  if (turn.axis === "row") {
    const belt = getRowBelt(faces, turn.index);

    return (
      <div className="cube-slab cube-slab--row" style={style}>
        <div className="cube-slab-wall cube-slab-wall--front">
          <Strip cells={belt.front} renderSlot={renderSlot} />
        </div>
        <div className="cube-slab-wall cube-slab-wall--right">
          <Strip cells={belt.right} renderSlot={renderSlot} />
        </div>
        <div className="cube-slab-wall cube-slab-wall--back">
          <Strip cells={belt.back} renderSlot={renderSlot} />
        </div>
        <div className="cube-slab-wall cube-slab-wall--left">
          <Strip cells={belt.left} renderSlot={renderSlot} />
        </div>
        <div
          className={
            turn.index === 0
              ? "cube-slab-cap cube-slab-cap--top"
              : "cube-slab-cap cube-slab-cap--top cube-slab-cap--plastic"
          }
        >
          {turn.index === 0 ? <FaceCap face={faces.up} renderSlot={renderSlot} /> : null}
        </div>
        <div
          className={
            turn.index === 2
              ? "cube-slab-cap cube-slab-cap--bottom"
              : "cube-slab-cap cube-slab-cap--bottom cube-slab-cap--plastic"
          }
        >
          {turn.index === 2 ? <FaceCap face={faces.down} renderSlot={renderSlot} /> : null}
        </div>
      </div>
    );
  }

  const belt = getColBelt(faces, turn.index);

  return (
    <div className="cube-slab cube-slab--col" style={style}>
      <div className="cube-slab-wall cube-slab-wall--front cube-slab-wall--col">
        <Strip cells={belt.front} renderSlot={renderSlot} />
      </div>
      <div className="cube-slab-wall cube-slab-wall--up cube-slab-wall--col">
        <Strip cells={belt.up} renderSlot={renderSlot} />
      </div>
      <div className="cube-slab-wall cube-slab-wall--back cube-slab-wall--col">
        <Strip cells={belt.back} renderSlot={renderSlot} />
      </div>
      <div className="cube-slab-wall cube-slab-wall--down cube-slab-wall--col">
        <Strip cells={belt.down} renderSlot={renderSlot} />
      </div>
      <div
        className={
          turn.index === 2
            ? "cube-slab-cap cube-slab-cap--right"
            : "cube-slab-cap cube-slab-cap--right cube-slab-cap--plastic"
        }
      >
        {turn.index === 2 ? <FaceCap face={faces.right} renderSlot={renderSlot} /> : null}
      </div>
      <div
        className={
          turn.index === 0
            ? "cube-slab-cap cube-slab-cap--left"
            : "cube-slab-cap cube-slab-cap--left cube-slab-cap--plastic"
        }
      >
        {turn.index === 0 ? <FaceCap face={faces.left} renderSlot={renderSlot} /> : null}
      </div>
    </div>
  );
}
