import { useCallback, useState } from "react";
import { loadSoloPrefs, nextLookSec, saveSoloPrefs, type SoloPrefs } from "../game/soloPrefs";

export function useSoloSettings() {
  const [prefs, setPrefs] = useState<SoloPrefs>(loadSoloPrefs);

  const cycleLook = useCallback(() => {
    setPrefs((current) => {
      const next = { ...current, lookSec: nextLookSec(current.lookSec) };
      saveSoloPrefs(next);
      return next;
    });
  }, []);

  const toggleTimer = useCallback(() => {
    setPrefs((current) => {
      const next = { ...current, hideTimer: !current.hideTimer };
      saveSoloPrefs(next);
      return next;
    });
  }, []);

  const toggleOthers = useCallback(() => {
    setPrefs((current) => {
      const next = { ...current, hideOthers: !current.hideOthers };
      saveSoloPrefs(next);
      return next;
    });
  }, []);

  return { ...prefs, cycleLook, toggleTimer, toggleOthers };
}
