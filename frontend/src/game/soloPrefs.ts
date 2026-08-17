export const LOOK_OPTIONS = [15, 8, 0] as const;

export type LookSec = (typeof LOOK_OPTIONS)[number];

export type SoloPrefs = {
  lookSec: LookSec;
  hideTimer: boolean;
};

const storageKey = "bprime.solo.prefs";
const defaults: SoloPrefs = { lookSec: 15, hideTimer: false };

function isLookSec(value: unknown): value is LookSec {
  return LOOK_OPTIONS.includes(value as LookSec);
}

export function loadSoloPrefs(): SoloPrefs {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return defaults;
    }
    const parsed = JSON.parse(raw) as Partial<SoloPrefs>;
    return {
      lookSec: isLookSec(parsed.lookSec) ? parsed.lookSec : defaults.lookSec,
      hideTimer: Boolean(parsed.hideTimer),
    };
  } catch {
    return defaults;
  }
}

export function saveSoloPrefs(prefs: SoloPrefs) {
  window.localStorage.setItem(storageKey, JSON.stringify(prefs));
}

export function nextLookSec(current: LookSec): LookSec {
  const index = LOOK_OPTIONS.indexOf(current);
  return LOOK_OPTIONS[(index + 1) % LOOK_OPTIONS.length];
}
