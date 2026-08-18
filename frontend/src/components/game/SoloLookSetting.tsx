import type { LookSec } from "../../game/soloPrefs";

export function SoloLookSetting({ lookSec, onCycle }: { lookSec: LookSec; onCycle: () => void }) {
  return (
    <button type="button" className="cube-copy cube-copy--hit" onClick={onCycle}>
      look {lookSec === 0 ? "off" : lookSec}
    </button>
  );
}
