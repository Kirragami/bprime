type MultiClockSettingProps = {
  hideTimer: boolean;
  hideOthers: boolean;
  onToggleSelf: () => void;
  onToggleOthers: () => void;
};

export function MultiClockSetting({ hideTimer, hideOthers, onToggleSelf, onToggleOthers }: MultiClockSettingProps) {
  return (
    <div className="cube-copy-stack">
      <button type="button" className="cube-copy" onClick={onToggleSelf}>
        self time {hideTimer ? "off" : "on"}
      </button>
      <button type="button" className="cube-copy" onClick={onToggleOthers}>
        other time {hideOthers ? "off" : "on"}
      </button>
    </div>
  );
}
