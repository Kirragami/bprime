import { useCallback, useEffect, useState } from "react";
import {
  acceptFriend,
  addFriend,
  friendsEventsUrl,
  listFriends,
  rejectFriend,
} from "../api/friends";
import { ApiError } from "../api/client";
import type { FriendGraph } from "../types";

const emptyGraph: FriendGraph = {
  friends: [],
  incoming: [],
  outgoing: [],
};

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
  const [graph, setGraph] = useState<FriendGraph>(emptyGraph);
  const [pending, setPending] = useState(false);
  const [actingId, setActingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setGraph(emptyGraph);
      return;
    }
    const data = await listFriends();
    setGraph(data);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setGraph(emptyGraph);
      return;
    }

    let cancelled = false;
    listFriends()
      .then((data) => {
        if (!cancelled) {
          setGraph(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGraph(emptyGraph);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const source = new EventSource(friendsEventsUrl(), { withCredentials: true });
    const onFriends = () => {
      void refresh();
    };
    source.addEventListener("friends", onFriends);

    return () => {
      source.removeEventListener("friends", onFriends);
      source.close();
    };
  }, [enabled, refresh]);

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

  const acceptRequest = useCallback(
    async (id: number) => {
      setActingId(id);
      setError(null);
      try {
        await acceptFriend(id);
        await refresh();
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setActingId(null);
      }
    },
    [refresh],
  );

  const rejectRequest = useCallback(
    async (id: number) => {
      setActingId(id);
      setError(null);
      try {
        await rejectFriend(id);
        await refresh();
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setActingId(null);
      }
    },
    [refresh],
  );

  return {
    friends: graph.friends,
    incoming: graph.incoming,
    outgoing: graph.outgoing,
    pending,
    actingId,
    error,
    sendRequest,
    acceptRequest,
    rejectRequest,
  };
}
