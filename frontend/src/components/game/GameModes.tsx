import { useState } from "react";

const modes = [
  {
    id: "solo",
    name: "solo",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="13" r="7.2" fill="none" stroke="currentColor" strokeWidth="1.9" />
        <path
          d="M12 9.4v4.1l2.4 1.5M9.2 4.6h5.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "multi",
    name: "multi",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="9" cy="8.4" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M4.8 18.4c.4-3 2.2-4.6 4.2-4.6s3.8 1.6 4.2 4.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="15.4" cy="8.1" r="2.3" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M13.2 18.4c.5-2.6 2-4 3.7-4 1.8 0 3.3 1.4 3.8 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
] as const;

type GameModesProps = {
  onSolo?: () => void;
};

export function GameModes({ onSolo }: GameModesProps) {
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
