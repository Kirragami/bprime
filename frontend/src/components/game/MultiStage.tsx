import type { Lobby } from "../../api/lobbies";
import { lobbyWinner } from "../../game/lobby";
import type { TimerPhase } from "../../hooks/useSoloSession";
import { MultiWinner } from "./MultiWinner";
import { SoloTimer } from "./SoloTimer";

type MultiStageProps = {
  status: "open" | "attempt" | "hold" | "done";
  host: boolean;
  canStart?: boolean;
  waiting: boolean;
  phase: TimerPhase;
  elapsed: number;
  inspectLeft: number;
  averageMs: number | null;
  hideTimer: boolean;
  lobby?: Lobby | null;
  selfId?: number;
  onStart: () => void;
};

export function MultiStage({
  status,
  host,
  canStart = true,
  waiting,
  phase,
  elapsed,
  inspectLeft,
  averageMs,
  hideTimer,
  lobby = null,
  selfId,
  onStart,
}: MultiStageProps) {
  if (status === "open" || status === "hold") {
    if (host) {
      if (status === "open" && !canStart) {
        return <p className="cube-copy multi-stage-copy">invite</p>;
      }
      return (
        <button type="button" className="cube-copy multi-stage-copy" onClick={onStart}>
          {status === "open" ? "start" : "next"}
        </button>
      );
    }
    return <p className="cube-copy multi-stage-copy">{status === "open" ? "waiting" : "hold"}</p>;
  }

  if (status === "done") {
    const winner = lobbyWinner(lobby);
    if (winner) {
      return <MultiWinner standing={winner} selfId={selfId} />;
    }
    return (
      <SoloTimer
        phase="done"
        elapsed={elapsed}
        inspectLeft={inspectLeft}
        averageMs={averageMs}
        hideTimer={false}
      />
    );
  }

  if (waiting) {
    return <p className="cube-copy multi-stage-copy">done</p>;
  }

  return (
    <SoloTimer
      phase={phase}
      elapsed={elapsed}
      inspectLeft={inspectLeft}
      averageMs={null}
      hideTimer={hideTimer}
    />
  );
}
