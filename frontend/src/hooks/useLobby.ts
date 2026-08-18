import { useCallback, useEffect, useState } from "react";
import { friendsEventsUrl } from "../api/friends";
import {
  createLobby,
  getCurrentLobby,
  inviteToLobby,
  joinLobby,
  leaveLobby,
  setLobbyScramble,
  submitLobbyTime,
  type Lobby,
} from "../api/lobbies";

export function useLobby(enabled: boolean) {
  const [lobby, setLobby] = useState<Lobby | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setLobby(null);
      return null;
    }
    const next = await getCurrentLobby();
    setLobby(next);
    return next;
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const source = new EventSource(friendsEventsUrl(), { withCredentials: true });
    const onLobby = () => {
      void refresh();
    };
    source.addEventListener("lobby", onLobby);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      source.removeEventListener("lobby", onLobby);
      source.close();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, refresh]);

  const create = useCallback(async () => {
    const next = await createLobby();
    setLobby(next);
    return next;
  }, []);

  const invite = useCallback(async (userId: number) => {
    if (!lobby) {
      return null;
    }
    const next = await inviteToLobby(lobby.id, userId);
    setLobby(next);
    return next;
  }, [lobby]);

  const join = useCallback(async (id?: number) => {
    const target = id ?? lobby?.id;
    if (!target) {
      return null;
    }
    const next = await joinLobby(target);
    setLobby(next);
    return next;
  }, [lobby]);

  const leave = useCallback(async () => {
    if (!lobby) {
      return null;
    }
    const next = await leaveLobby(lobby.id);
    setLobby(null);
    return next;
  }, [lobby]);

  const postScramble = useCallback(async (scramble: string) => {
    if (!lobby) {
      return null;
    }
    const next = await setLobbyScramble(lobby.id, scramble);
    setLobby(next);
    return next;
  }, [lobby]);

  const postTime = useCallback(async (timeMs: number) => {
    if (!lobby) {
      return null;
    }
    const next = await submitLobbyTime(lobby.id, timeMs);
    setLobby(next);
    return next;
  }, [lobby]);

  return { lobby, refresh, create, invite, join, leave, postScramble, postTime };
}
