import { useCallback, useEffect, useState } from "react";
import { listLeaders, type Leader } from "../api/measurings";

export function useLeaders() {
  const [entries, setEntries] = useState<Leader[]>([]);

  const refresh = useCallback(async () => {
    try {
      setEntries(await listLeaders());
    } catch {
      setEntries([]);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { entries, refresh };
}
