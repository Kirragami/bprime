import { useCallback, useEffect, useState } from "react";
import { getMe, login, logout, register, uploadAvatar } from "../api/auth";
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

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getMe()
      .then((data) => {
        if (!cancelled) {
          setUser(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    const data = await login(username, password);
    setUser(data);
    return data;
  }, []);

  const signUp = useCallback(async (username: string, password: string) => {
    const data = await register(username, password);
    setUser(data);
    return data;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logout();
    } finally {
      setUser(null);
    }
  }, []);

  const setAvatar = useCallback(async (file: File) => {
    const data = await uploadAvatar(file);
    setUser(data);
    return data;
  }, []);

  return { user, loading, signIn, signUp, signOut, setAvatar, errorMessage };
}
