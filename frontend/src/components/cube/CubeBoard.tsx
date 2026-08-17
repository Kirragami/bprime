import { useEffect, useRef, useState } from "react";
import { LoginForm } from "../auth/LoginForm";
import { ProfileTile } from "../auth/ProfileTile";
import { RegisterForm } from "../auth/RegisterForm";
import {
  LOGGED_OUT_SCREEN,
  colSlots,
  overlayFor,
  rowSlots,
  sameRowScreen,
  useCube,
  withCol,
  withRow,
  type BoardScreen,
  type Overlay,
  type RowSlots,
  type SliceIndex,
  type TurnDir,
} from "../../cube";
import { AddFriendForm } from "../friends/AddFriendForm";
import { FriendsList } from "../friends/FriendsList";
import { useAuth } from "../../hooks/useAuth";
import { useFriends } from "../../hooks/useFriends";
import { saveMeasuring } from "../../api/measurings";
import { GameModes } from "../game/GameModes";
import { SoloActions } from "../game/SoloActions";
import { SoloClockSetting } from "../game/SoloClockSetting";
import { SoloHistory } from "../game/SoloHistory";
import { SoloLookSetting } from "../game/SoloLookSetting";
import { SoloPreview } from "../game/SoloPreview";
import { SoloScramble } from "../game/SoloScramble";
import { SoloTimer } from "../game/SoloTimer";
import { SoloTitle } from "../game/SoloTitle";
import { warmScrambler } from "../../game/scramble";
import { useSoloSession } from "../../hooks/useSoloSession";
import { useSoloSettings } from "../../hooks/useSoloSettings";
import { CubeView } from "./CubeView";

const AUTO_COL_MS = 4000;

export function CubeBoard() {
  const cube = useCube();
  const auth = useAuth();
  const friends = useFriends(Boolean(auth.user));
  const [screen, setScreen] = useState<BoardScreen>(LOGGED_OUT_SCREEN);
  const [overlay, setOverlay] = useState<Overlay>(() => overlayFor(LOGGED_OUT_SCREEN));
  const [incomingSlots, setIncomingSlots] = useState<RowSlots | undefined>();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [formPending, setFormPending] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [soloLive, setSoloLive] = useState(false);
  const soloPrefs = useSoloSettings();
  const solo = useSoloSession(soloLive, soloPrefs.lookSec);
  const turnColRef = useRef(cube.turnCol);
  const turnRowRef = useRef(cube.turnRow);
  const isBusyRef = useRef(cube.isBusy);

  turnColRef.current = cube.turnCol;
  turnRowRef.current = cube.turnRow;
  isBusyRef.current = cube.isBusy;
  const userRef = useRef(auth.user);
  const screenRef = useRef(screen);
  const overlayRef = useRef(overlay);
  const revealedRef = useRef(false);
  const transitioningRef = useRef(false);
  userRef.current = auth.user;
  screenRef.current = screen;
  overlayRef.current = overlay;

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
      overlayRef.current = overlayFor(next);
      setScreen(next);
      setOverlay(overlayRef.current);
      setIncomingSlots(undefined);
    });
  }

  async function spinCol(col: SliceIndex, dir: TurnDir, nextOverlay: Overlay) {
    setIncomingSlots(colSlots(nextOverlay, col));
    await turnColRef.current(col, dir, () => {
      overlayRef.current = withCol(overlayRef.current, col, colSlots(nextOverlay, col));
      setOverlay(overlayRef.current);
      setIncomingSlots(undefined);
    });
  }

  async function spinOverlayRow(row: SliceIndex, dir: TurnDir, nextOverlay: Overlay) {
    setIncomingSlots(rowSlots(nextOverlay, row));
    await turnRowRef.current(row, dir, () => {
      overlayRef.current = withRow(overlayRef.current, row, rowSlots(nextOverlay, row));
      setOverlay(overlayRef.current);
      setIncomingSlots(undefined);
    });
  }

  function isSoloPlay(play = screenRef.current.play) {
    return play === "solo" || play === "solo-settings";
  }

  async function leaveSolo() {
    if (!isSoloPlay() || transitioningRef.current) {
      return;
    }
    transitioningRef.current = true;
    try {
      if (screenRef.current.play === "solo-settings") {
        const soloScreen = { ...screenRef.current, play: "solo" as const };
        await spinCol(2, 1, overlayFor(soloScreen));
        screenRef.current = soloScreen;
        setScreen(soloScreen);
      }
      const nextScreen = { ...screenRef.current, play: "none" as const };
      const nextOverlay = overlayFor(nextScreen);
      await spinCol(1, 1, nextOverlay);
      await spinOverlayRow(1, -1, nextOverlay);
      await spinCol(0, 1, nextOverlay);
      screenRef.current = nextScreen;
      setScreen(nextScreen);
    } finally {
      setSoloLive(false);
      transitioningRef.current = false;
    }
  }

  async function openSoloSettings() {
    if (screenRef.current.play !== "solo" || transitioningRef.current) {
      return;
    }
    transitioningRef.current = true;
    try {
      const nextScreen = { ...screenRef.current, play: "solo-settings" as const };
      await spinCol(2, -1, overlayFor(nextScreen));
      screenRef.current = nextScreen;
      setScreen(nextScreen);
    } finally {
      transitioningRef.current = false;
    }
  }

  async function closeSoloSettings() {
    if (screenRef.current.play !== "solo-settings" || transitioningRef.current) {
      return;
    }
    transitioningRef.current = true;
    try {
      const nextScreen = { ...screenRef.current, play: "solo" as const };
      await spinCol(2, 1, overlayFor(nextScreen));
      screenRef.current = nextScreen;
      setScreen(nextScreen);
    } finally {
      transitioningRef.current = false;
    }
  }

  async function saveSolo() {
    if (solo.attempts.length !== 5 || savePending) {
      return;
    }
    setSavePending(true);
    try {
      await saveMeasuring("solo", solo.attempts);
      await leaveSolo();
    } finally {
      setSavePending(false);
    }
  }

  async function enterSolo() {
    if (isSoloPlay() || transitioningRef.current) {
      return;
    }
    transitioningRef.current = true;
    setSoloLive(true);
    try {
      const nextScreen = { ...screenRef.current, play: "solo" as const };
      const nextOverlay = overlayFor(nextScreen);
      await spinCol(0, -1, nextOverlay);
      await spinOverlayRow(1, 1, nextOverlay);
      await spinCol(1, -1, nextOverlay);
      screenRef.current = nextScreen;
      setScreen(nextScreen);
    } finally {
      transitioningRef.current = false;
    }
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
    if (auth.user) {
      warmScrambler();
    }
  }, [auth.user]);

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
      overlay={overlay}
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
            <ProfileTile
              user={auth.user}
              errorMessage={auth.errorMessage}
              onUpload={async (file) => {
                await auth.setAvatar(file);
              }}
            />
          ) : null;
        }
        if (slot === "settings") {
          return (
            <button
              type="button"
              className="cube-copy"
              onClick={() => {
                if (screenRef.current.play === "solo") {
                  void openSoloSettings();
                  return;
                }
                void spinRow(2, -1, { bottom: "menu" });
              }}
            >
              settings
            </button>
          );
        }
        if (slot === "solo-back") {
          return (
            <button type="button" className="cube-copy" onClick={() => void closeSoloSettings()}>
              back
            </button>
          );
        }
        if (slot === "solo-look") {
          return <SoloLookSetting lookSec={soloPrefs.lookSec} onCycle={soloPrefs.cycleLook} />;
        }
        if (slot === "solo-clock") {
          return <SoloClockSetting hideTimer={soloPrefs.hideTimer} onToggle={soloPrefs.toggleTimer} />;
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
            <FriendsList
              friends={friends.friends}
              incoming={friends.incoming}
              outgoing={friends.outgoing}
              actingId={friends.actingId}
              onAccept={(id) => void friends.acceptRequest(id)}
              onReject={(id) => void friends.rejectRequest(id)}
            />
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
        if (slot === "solo-title") {
          return <SoloTitle />;
        }
        if (slot === "solo-history") {
          return <SoloHistory attempts={solo.attempts} />;
        }
        if (slot === "solo-stage") {
          return (
            <SoloTimer
              phase={solo.phase}
              elapsed={solo.elapsed}
              inspectLeft={solo.inspectLeft}
              averageMs={solo.averageMs}
              hideTimer={soloPrefs.hideTimer}
            />
          );
        }
        if (slot === "solo-scramble") {
          return <SoloScramble scramble={solo.scramble} />;
        }
        if (slot === "solo-preview") {
          return <SoloPreview image={solo.scrambleImage} />;
        }
        if (slot === "solo-actions") {
          return (
            <SoloActions
              done={solo.phase === "done"}
              pending={savePending}
              onSave={() => void saveSolo()}
              onCancel={() => void leaveSolo()}
            />
          );
        }
        if (slot === "title") {
          return <p className="cube-title">bprime</p>;
        }
        if (slot === "title-modes") {
          return <GameModes onSolo={() => void enterSolo()} />;
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
