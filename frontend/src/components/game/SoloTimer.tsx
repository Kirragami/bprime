import { formatTime } from "../../game/ao5";
import type { TimerPhase } from "../../hooks/useSoloSession";

type SoloTimerProps = {
  phase: TimerPhase;
  elapsed: number;
  inspectLeft: number;
  averageMs: number | null;
};

export function SoloTimer({ phase, elapsed, inspectLeft, averageMs }: SoloTimerProps) {
  if (phase === "done" && averageMs !== null) {
    return (
      <div className="solo-result">
        <p className="solo-result__label">ao5</p>
        <p className="solo-timer">{formatTime(averageMs)}</p>
      </div>
    );
  }

  const inspectSeconds = Math.ceil(inspectLeft / 1000);
  const value =
    phase === "inspect" || phase === "ready"
      ? String(inspectSeconds)
      : formatTime(elapsed);

  return (
    <div className={`solo-stage is-${phase}`}>
      <p className="solo-timer">{value}</p>
    </div>
  );
}
