import { useEffect, useRef, useState } from "react";
import { LoginForm } from "../auth/LoginForm";
import { RegisterForm } from "../auth/RegisterForm";
import {
  LOGGED_OUT_SCREEN,
  overlayFor,
  rowSlots,
  sameRowScreen,
  useCube,
  type BoardScreen,
  type RowSlots,
  type SliceIndex,
  type TurnDir,
} from "../../cube";
import { AddFriendForm } from "../friends/AddFriendForm";
import { useAuth } from "../../hooks/useAuth";
import { useFriends } from "../../hooks/useFriends";
import { CubeView } from "./CubeView";

const AUTO_COL_MS = 4000;

export function CubeBoard() {
  const cube = useCube();
  const auth = useAuth();
  const friends = useFriends(Boolean(auth.user));
  const [screen, setScreen] = useState<BoardScreen>(LOGGED_OUT_SCREEN);
  const [incomingSlots, setIncomingSlots] = useState<RowSlots | undefined>();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [formPending, setFormPending] = useState(false);
  const turnColRef = useRef(cube.turnCol);
  const turnRowRef = useRef(cube.turnRow);
  const isBusyRef = useRef(cube.isBusy);

  turnColRef.current = cube.turnCol;
  turnRowRef.current = cube.turnRow;
  isBusyRef.current = cube.isBusy;
  const userRef = useRef(auth.user);
  const screenRef = useRef(screen);
  const revealedRef = useRef(false);
  const transitioningRef = useRef(false);
  userRef.current = auth.user;
  screenRef.current = screen;

  useEffect(() => {
    const id = window.setInterval(() => {
      if (userRef.current || transitioningRef.current || isBusyRef.current()) {
        return;
      }
      void turnColRef.current(1, 1);
    }, AUTO_COL_MS);

    return () => window.clearInterval(id);
  }, []);

  async function spinRow(row: SliceIndex, dir: TurnDir, patch: Partial<BoardScreen>) {
    const next = { ...screenRef.current, ...patch };
    if (sameRowScreen(screenRef.current, next, row)) {
      return;
    }

    setIncomingSlots(rowSlots(overlayFor(next), row));
    await turnRowRef.current(row, dir, () => {
      screenRef.current = next;
      setScreen(next);
      setIncomingSlots(undefined);
    });
  }

  async function revealSignedIn() {
    transitioningRef.current = true;
    try {
      await spinRow(0, -1, { top: "profile" });
      await spinRow(2, -1, { bottom: "settings" });
      await spinRow(1, 1, { middle: "friends" });
    } finally {
      transitioningRef.current = false;
    }
  }

  useEffect(() => {
    if (auth.loading) {
      return;
    }
    if (!auth.user) {
      revealedRef.current = false;
      return;
    }
    if (revealedRef.current) {
      return;
    }
    revealedRef.current = true;
    void revealSignedIn();
  }, [auth.loading, auth.user]);

  async function handleLogin(username: string, password: string) {
    setFormPending(true);
    setLoginError(null);
    try {
      await auth.signIn(username, password);
    } catch (err) {
      setLoginError(auth.errorMessage(err));
    } finally {
      setFormPending(false);
    }
  }

  async function handleLogout() {
    transitioningRef.current = true;
    try {
      await spinRow(0, 1, { top: "login" });
      await spinRow(1, -1, { middle: "idle" });
      await spinRow(2, 1, { bottom: "empty" });
      await auth.signOut();
    } finally {
      transitioningRef.current = false;
    }
  }

  async function handleRegister(username: string, password: string) {
    setFormPending(true);
    setRegisterError(null);
    try {
      await auth.signUp(username, password);
    } catch (err) {
      setRegisterError(auth.errorMessage(err));
    } finally {
      setFormPending(false);
    }
  }

  return (
    <CubeView
      faces={cube.faces}
      overlay={overlayFor(screen)}
      turn={cube.turn}
      angle={cube.angle}
      turning={cube.turning}
      incomingSlots={incomingSlots}
      renderSlot={(slot) => {
        if (slot === "login") {
          return (
            <LoginForm
              pending={formPending}
              error={loginError}
              onSubmit={handleLogin}
            />
          );
        }
        if (slot === "register") {
          return (
            <RegisterForm
              pending={formPending}
              error={registerError}
              onSubmit={handleRegister}
            />
          );
        }
        if (slot === "profile") {
          return auth.user ? (
            <p className="cube-copy">hey {auth.user.username}</p>
          ) : null;
        }
        if (slot === "settings") {
          return (
            <button
              type="button"
              className="cube-copy"
              onClick={() => void spinRow(2, -1, { bottom: "menu" })}
            >
              settings
            </button>
          );
        }
        if (slot === "settings-back") {
          return (
            <button
              type="button"
              className="cube-copy"
              onClick={() => void spinRow(2, 1, { bottom: "settings" })}
            >
              back
            </button>
          );
        }
        if (slot === "logout") {
          return (
            <button
              type="button"
              className="cube-copy"
              onClick={() => void handleLogout()}
            >
              logout
            </button>
          );
        }
        if (slot === "friends") {
          return (
            <div className="friends-list">
              <p className="cube-copy">friends</p>
              {friends.friends.length === 0 ? (
                <p className="friends-list__empty">no friends yet</p>
              ) : (
                <ul className="friends-list__items">
                  {friends.friends.map((friend) => (
                    <li key={friend.id}>{friend.username}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        }
        if (slot === "add-friend") {
          return (
            <AddFriendForm
              pending={friends.pending}
              error={friends.error}
              onSubmit={friends.sendRequest}
            />
          );
        }
        if (slot === "title") {
          return <p className="cube-title">bprime</p>;
        }
        if (slot === "tagline") {
          return <p className="cube-copy">login to play with friends</p>;
        }
        if (slot === "register-tagline") {
          return <p className="cube-copy">make an account and play with friends</p>;
        }
        if (slot === "register-cta") {
          return (
            <p className="cube-copy">
              dont have an account?{" "}
              <button
                type="button"
                className="cube-copy__link"
                onClick={() => void spinRow(0, 1, { top: "register" })}
              >
                register
              </button>
            </p>
          );
        }
        if (slot === "login-cta") {
          return (
            <p className="cube-copy">
              already have an account?{" "}
              <button
                type="button"
                className="cube-copy__link"
                onClick={() => void spinRow(0, -1, { top: "login" })}
              >
                login
              </button>
            </p>
          );
        }
        return null;
      }}
    />
  );
}
