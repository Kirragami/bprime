import { useEffect, useRef, useState } from "react";
import { LoginForm } from "../auth/LoginForm";
import { RegisterForm } from "../auth/RegisterForm";
import { createRandomCube, syncTaglineColumn, useCube } from "../../cube";
import type { CubeFaces, TurnDir } from "../../cube";
import { AddFriendForm } from "../friends/AddFriendForm";
import { useAuth } from "../../hooks/useAuth";
import { useFriends } from "../../hooks/useFriends";
import { CubeView } from "./CubeView";

const AUTO_COL_MS = 4000;

function createAuthCube() {
  const faces = createRandomCube();
  faces.front[0] = { ...faces.front[0], slot: "login" };
  faces.front[1] = { ...faces.front[1], slot: "tagline" };
  faces.front[2] = { ...faces.front[2], slot: "register-cta" };
  faces.front[3] = { ...faces.front[3], slot: "home-middle" };
  faces.front[4] = { ...faces.front[4], slot: "title" };
  faces.front[6] = { ...faces.front[6], slot: "home-bottom" };
  faces.right[0] = { ...faces.right[0], slot: "register" };
  faces.right[1] = { ...faces.right[1], slot: "register-tagline" };
  faces.right[2] = { ...faces.right[2], slot: "login-cta" };
  faces.right[3] = { ...faces.right[3], slot: "friends" };
  faces.right[4] = { ...faces.right[4], slot: "title" };
  faces.right[5] = { ...faces.right[5], slot: "add-friend" };
  faces.left[0] = { ...faces.left[0], slot: "profile" };
  faces.left[8] = { ...faces.left[8], slot: "settings" };
  faces.back[0] = { ...faces.back[0], slot: "profile" };
  faces.back[3] = { ...faces.back[3], slot: "friends" };
  faces.back[4] = { ...faces.back[4], slot: "title" };
  faces.back[5] = { ...faces.back[5], slot: "add-friend" };
  faces.back[6] = { ...faces.back[6], slot: "settings-back" };
  faces.back[8] = { ...faces.back[8], slot: "logout" };

  return syncTaglineColumn(faces);
}

function rowHasSlot(face: CubeFaces["front"], row: 0 | 1 | 2, slot: string) {
  const start = row * 3;
  return [start, start + 1, start + 2].some((index) => face[index]?.slot === slot);
}

function turnDirsToSlot(faces: CubeFaces, row: 0 | 1 | 2, slot: string): TurnDir[] {
  if (rowHasSlot(faces.front, row, slot)) {
    return [];
  }
  if (rowHasSlot(faces.right, row, slot)) {
    return [1];
  }
  if (rowHasSlot(faces.left, row, slot)) {
    return [-1];
  }
  if (rowHasSlot(faces.back, row, slot)) {
    return [-1, -1];
  }
  return [];
}

const SIGNED_IN_BOTTOM = ["settings", "logout", "settings-back"];

function rowHasAnySlot(face: CubeFaces["front"], row: 0 | 1 | 2, slots: string[]) {
  return slots.some((slot) => rowHasSlot(face, row, slot));
}

function turnDirsToClearBottom(faces: CubeFaces): TurnDir[] {
  if (!rowHasAnySlot(faces.front, 2, SIGNED_IN_BOTTOM)) {
    return [];
  }
  if (!rowHasAnySlot(faces.left, 2, SIGNED_IN_BOTTOM)) {
    return [-1];
  }
  if (!rowHasAnySlot(faces.right, 2, SIGNED_IN_BOTTOM)) {
    return [1];
  }
  return [-1, -1];
}

export function CubeBoard() {
  const cube = useCube(createAuthCube, { afterTurn: syncTaglineColumn });
  const auth = useAuth();
  const friends = useFriends(Boolean(auth.user));
  const [loginError, setLoginError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [formPending, setFormPending] = useState(false);
  const turnColRef = useRef(cube.turnCol);
  const turnRowRef = useRef(cube.turnRow);
  const facesRef = useRef(cube.faces);
  const isBusyRef = useRef(cube.isBusy);

  turnColRef.current = cube.turnCol;
  turnRowRef.current = cube.turnRow;
  facesRef.current = cube.faces;
  isBusyRef.current = cube.isBusy;
  const userRef = useRef(auth.user);
  const revealedRef = useRef(false);
  const transitioningRef = useRef(false);
  userRef.current = auth.user;

  useEffect(() => {
    const id = window.setInterval(() => {
      if (userRef.current || transitioningRef.current || isBusyRef.current()) {
        return;
      }
      void turnColRef.current(1, 1);
    }, AUTO_COL_MS);

    return () => window.clearInterval(id);
  }, []);

  async function turnRowTo(row: 0 | 1 | 2, slot: string) {
    const dirs = turnDirsToSlot(facesRef.current, row, slot);
    for (const dir of dirs) {
      await turnRowRef.current(row, dir);
    }
    return dirs.length > 0;
  }

  async function revealSignedIn() {
    transitioningRef.current = true;
    try {
      await turnRowTo(0, "profile");
      await turnRowTo(2, "settings");
      await turnRowTo(1, "friends");
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
      await auth.signOut();
      await turnRowTo(0, "login");
      await turnRowTo(1, "home-middle");
      const bottomDirs = turnDirsToClearBottom(facesRef.current);
      for (const dir of bottomDirs) {
        await turnRowRef.current(2, dir);
      }
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
      turn={cube.turn}
      angle={cube.angle}
      turning={cube.turning}
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
        if (slot === "home-bottom" || slot === "home-middle") {
          return null;
        }
        if (slot === "settings") {
          return (
            <button
              type="button"
              className="cube-copy"
              onClick={() => void turnRowTo(2, "logout")}
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
              onClick={() => void turnRowTo(2, "settings")}
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
                onClick={() => void cube.turnRow(0, 1)}
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
                onClick={() => void cube.turnRow(0, -1)}
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
