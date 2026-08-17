export function SoloClockSetting({ hideTimer, onToggle }: { hideTimer: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="cube-copy" onClick={onToggle}>
      time {hideTimer ? "off" : "on"}
    </button>
  );
}
