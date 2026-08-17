import { useCallback, useEffect, useState } from "react";
import { addFriend, listFriends } from "../api/friends";
import { ApiError } from "../api/client";
import type { User } from "../types";

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    return err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "something went wrong";
}

export function useFriends(enabled: boolean) {
  const [friends, setFriends] = useState<User[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setFriends([]);
      return;
    }
    const data = await listFriends();
    setFriends(data);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setFriends([]);
      return;
    }

    let cancelled = false;
    listFriends()
      .then((data) => {
        if (!cancelled) {
          setFriends(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFriends([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const sendRequest = useCallback(
    async (username: string) => {
      setPending(true);
      setError(null);
      try {
        await addFriend(username.trim());
        await refresh();
      } catch (err) {
        setError(errorMessage(err));
        throw err;
      } finally {
        setPending(false);
      }
    },
    [refresh],
  );

  return { friends, pending, error, sendRequest };
}
