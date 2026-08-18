import { MultiIcon } from "./ModeIcon";

export function MultiTitle() {
  return (
    <div className="solo-title">
      <span className="solo-title__icon">
        <span className="mode-diamond__face">
          <MultiIcon />
        </span>
      </span>
      <p className="solo-title__name">multi</p>
    </div>
  );
}
