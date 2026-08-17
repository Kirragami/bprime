import { formatTime } from "../../game/ao5";
import type { TimerPhase } from "../../hooks/useSoloSession";

type SoloTimerProps = {
  phase: TimerPhase;
  elapsed: number;
  inspectLeft: number;
  averageMs: number | null;
  hideTimer?: boolean;
};

export function SoloTimer({
  phase,
  elapsed,
  inspectLeft,
  averageMs,
  hideTimer = false,
}: SoloTimerProps) {
  if (phase === "done" && averageMs !== null) {
    return (
      <div className="solo-result">
        <p className="solo-result__label">ao5</p>
        <p className="solo-timer">{formatTime(averageMs)}</p>
      </div>
    );
  }

  if (hideTimer && phase === "running") {
    return (
      <div className="solo-stage is-running is-hidden">
        <div className="solo-timer-pulse" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  const inspectSeconds = Math.ceil(inspectLeft / 1000);
  const value =
    phase === "inspect" || (phase === "ready" && inspectLeft > 0)
      ? String(inspectSeconds)
      : formatTime(elapsed);

  return (
    <div className={`solo-stage is-${phase}`}>
      <p className="solo-timer">{value}</p>
    </div>
  );
}
