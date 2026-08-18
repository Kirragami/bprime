import { useCallback, useEffect, useState } from "react";
import { getMeasuring, listMeasurings, type SavedMeasuring } from "../api/measurings";

export function useHistory(enabled: boolean) {
  const [items, setItems] = useState<SavedMeasuring[]>([]);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setItems([]);
      return;
    }
    setItems(await listMeasurings());
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const load = useCallback((id: number) => getMeasuring(id), []);

  return { items, refresh, load };
}
