import { useCallback, useEffect, useState } from "react";
import { listBestTimes, type BestTime } from "../api/measurings";

export function useBestTimes(enabled: boolean) {
  const [times, setTimes] = useState<BestTime[]>([]);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setTimes([]);
      return;
    }
    setTimes(await listBestTimes());
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { times, refresh };
}
