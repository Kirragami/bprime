import { useEffect, useState } from "react";
import { getHealth } from "../api/health";
import type { Health } from "../types";

type HealthState = {
  data: Health | null;
  error: string | null;
  loading: boolean;
};

export function useHealth() {
  const [state, setState] = useState<HealthState>({
    data: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    getHealth()
      .then((data) => {
        if (!cancelled) {
          setState({ data, error: null, loading: false });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "unreachable";
          setState({ data: null, error: message, loading: false });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
