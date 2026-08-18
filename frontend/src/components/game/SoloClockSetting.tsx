export function SoloClockSetting({ hideTimer, onToggle }: { hideTimer: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="cube-copy cube-copy--hit" onClick={onToggle}>
      time {hideTimer ? "off" : "on"}
    </button>
  );
}
