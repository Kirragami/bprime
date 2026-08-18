import { useState } from "react";
import { MultiIcon, SoloIcon } from "./ModeIcon";

const modes = [
  {
    id: "solo",
    name: "solo",
    icon: <SoloIcon />,
  },
  {
    id: "multi",
    name: "multi",
    icon: <MultiIcon />,
  },
] as const;

type GameModesProps = {
  onSolo?: () => void;
  onMulti?: () => void;
};

export function GameModes({ onSolo, onMulti }: GameModesProps) {
  const [hint, setHint] = useState<string | null>(null);

  return (
    <div className="game-modes">
      <p className="cube-title">bprime</p>
      <div className="game-modes__row">
        {modes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className="mode-diamond"
            aria-label={mode.name}
            onMouseEnter={() => setHint(mode.name)}
            onMouseLeave={() => setHint(null)}
            onFocus={() => setHint(mode.name)}
            onBlur={() => setHint(null)}
            onClick={() => {
              if (mode.id === "solo") {
                onSolo?.();
              }
              if (mode.id === "multi") {
                onMulti?.();
              }
            }}
          >
            <span className="mode-diamond__face">{mode.icon}</span>
          </button>
        ))}
      </div>
      <p className="game-modes__name">{hint ?? "\u00a0"}</p>
    </div>
  );
}
