import { SoloIcon } from "./ModeIcon";

export function SoloTitle() {
  return (
    <div className="solo-title">
      <span className="solo-title__icon">
        <span className="mode-diamond__face">
          <SoloIcon />
        </span>
      </span>
      <p className="solo-title__name">solo</p>
    </div>
  );
}
