import { useEffect, useMemo, useRef, useState } from "react";
import { LoginForm } from "../auth/LoginForm";
import { ProfileTile } from "../auth/ProfileTile";
import { RegisterForm } from "../auth/RegisterForm";
import {
  LOGGED_OUT_SCREEN,
  colSlots,
  incomingOverlayForTurn,
  overlayFor,
  rowSlots,
  sameRowScreen,
  useCube,
  withCol,
  withRow,
  type BoardScreen,
  type Overlay,
  type OverlayTurn,
  type RowSlots,
  type SliceIndex,
  type TurnDir,
} from "../../cube";
import { AddFriendForm } from "../friends/AddFriendForm";
import { FriendDeck } from "../friends/FriendDeck";
import { useAuth } from "../../hooks/useAuth";
import { useFriends } from "../../hooks/useFriends";
import { getLobby, type Lobby, type LobbyMember } from "../../api/lobbies";
import { getFriendMeasuring, listFriendMeasurings, saveMeasuring, type SavedAttempt, type SavedMeasuring } from "../../api/measurings";
import { BestTimes } from "../game/BestTimes";
import { Leaders } from "../game/Leaders";
import { GameModes } from "../game/GameModes";
import { HistoryAttemptDetail } from "../game/HistoryAttemptDetail";
import { HistoryAttempts } from "../game/HistoryAttempts";
import { HistoryList } from "../game/HistoryList";
import { HistoryPlayers } from "../game/HistoryPlayers";
import { MultiIcon, SoloIcon } from "../game/ModeIcon";
import { MultiInvite } from "../game/MultiInvite";
import { MultiMembers } from "../game/MultiMembers";
import { MultiClockSetting } from "../game/MultiClockSetting";
import { MultiRoom } from "../game/MultiRoom";
import { MultiStage } from "../game/MultiStage";
import { MultiTitle } from "../game/MultiTitle";
import { SoloActions } from "../game/SoloActions";
import { SoloClockSetting } from "../game/SoloClockSetting";
import { SoloHistory } from "../game/SoloHistory";
import { SoloLookSetting } from "../game/SoloLookSetting";
import { SoloPreview } from "../game/SoloPreview";
import { SoloScramble } from "../game/SoloScramble";
import { SoloTimer } from "../game/SoloTimer";
import { SoloTitle } from "../game/SoloTitle";
import { generateScramble, warmScrambler } from "../../game/scramble";
import { averageOfFive, formatTime } from "../../game/ao5";
import { hasAttempt, isLobbyHost, lobbyCanStart, lobbyInvite, lobbyMember, memberAttempts } from "../../game/lobby";
import { formatRecordWhen } from "../../game/when";
import { useBestTimes } from "../../hooks/useBestTimes";
import { useLeaders } from "../../hooks/useLeaders";
import { useHistory } from "../../hooks/useHistory";
import { useLobby } from "../../hooks/useLobby";
import { useMultiTimer } from "../../hooks/useMultiTimer";
import { useSoloSession } from "../../hooks/useSoloSession";
import { useSoloSettings } from "../../hooks/useSoloSettings";
import type { User } from "../../types";
import { CubeView } from "./CubeView";

const AUTO_COL_MS = 4000;

const enterSoloTurns: OverlayTurn[] = [
  { axis: "col", index: 0, dir: -1 },
  { axis: "row", index: 1, dir: 1 },
  { axis: "col", index: 1, dir: -1 },
  { axis: "row", index: 0, dir: -1 },
];

const leaveSoloTurns: OverlayTurn[] = [
  { axis: "row", index: 0, dir: 1 },
  { axis: "col", index: 1, dir: 1 },
  { axis: "row", index: 1, dir: -1 },
  { axis: "col", index: 0, dir: 1 },
];

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
  const bests = useBestTimes(Boolean(auth.user));
  const leaders = useLeaders();
  const history = useHistory(Boolean(auth.user));
  const lobby = useLobby(Boolean(auth.user));
  const [historySession, setHistorySession] = useState<SavedMeasuring | null>(null);
  const [historyAttempt, setHistoryAttempt] = useState<SavedAttempt | null>(null);
  const [historyGame, setHistoryGame] = useState<Lobby | null>(null);
  const [historyFriend, setHistoryFriend] = useState<User | null>(null);
  const [friendHistoryItems, setFriendHistoryItems] = useState<SavedMeasuring[]>([]);
  const [heldLobby, setHeldLobby] = useState<Lobby | null>(null);
  const homeHistoryItems = useMemo(
    () => history.items.filter((item) => (item.attemptCount ?? 1) > 0),
    [history.items],
  );
  const multiHistoryItems = useMemo(
    () => homeHistoryItems.filter((item) => item.mode === "multi"),
    [homeHistoryItems],
  );
  const playLobby = heldLobby ?? lobby.lobby;
  const me = lobbyMember(playLobby, auth.user?.id);
  const multiAttempts = memberAttempts(me);
  const multiWaiting = hasAttempt(me, playLobby?.attemptIndex ?? 0);
  const multiLive =
    Boolean(lobby.lobby) && lobby.lobby?.status === "attempt" && !multiWaiting;
  const multiTimer = useMultiTimer(
    multiLive,
    lobby.lobby?.scramble ?? "",
    soloPrefs.lookSec,
    (timeMs) => {
      void lobby.postTime(timeMs);
    },
    () => {
      void lobby.postStart();
    },
  );
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
    const planned = { ...screenRef.current, ...patch };
    if (sameRowScreen(screenRef.current, planned, row)) {
      screenRef.current = planned;
      overlayRef.current = overlayFor(planned);
      setScreen(planned);
      setOverlay(overlayRef.current);
      return;
    }

    await turnRowRef.current(
      row,
      dir,
      () => {
        const next = { ...screenRef.current, ...patch };
        screenRef.current = next;
        overlayRef.current = overlayFor(next);
        setScreen(next);
        setOverlay(overlayRef.current);
        setIncomingSlots(undefined);
      },
      () => {
        setIncomingSlots(rowSlots(overlayFor({ ...screenRef.current, ...patch }), row));
      },
    );
  }

  async function spinCol(col: SliceIndex, dir: TurnDir, nextOverlay: Overlay) {
    await turnColRef.current(
      col,
      dir,
      () => {
        overlayRef.current = withCol(overlayRef.current, col, colSlots(nextOverlay, col));
        setOverlay(overlayRef.current);
        setIncomingSlots(undefined);
      },
      () => {
        setIncomingSlots(colSlots(nextOverlay, col));
      },
    );
  }

  async function playOverlayTurns(turns: readonly OverlayTurn[], final: Overlay) {
    await Promise.all(
      turns.map((turn, index) => {
        const incoming = incomingOverlayForTurn(final, turns, index);
        if (turn.axis === "col") {
          return turnColRef.current(
            turn.index,
            turn.dir,
            () => {
              overlayRef.current = withCol(overlayRef.current, turn.index, colSlots(incoming, turn.index));
              setOverlay(overlayRef.current);
              setIncomingSlots(undefined);
            },
            () => {
              setIncomingSlots(colSlots(incoming, turn.index));
            },
          );
        }
        return turnRowRef.current(
          turn.index,
          turn.dir,
          () => {
            overlayRef.current = withRow(overlayRef.current, turn.index, rowSlots(incoming, turn.index));
            setOverlay(overlayRef.current);
            setIncomingSlots(undefined);
          },
          () => {
            setIncomingSlots(rowSlots(incoming, turn.index));
          },
        );
      }),
    );
    overlayRef.current = final;
    setOverlay(final);
  }

  function isSoloPlay(play = screenRef.current.play) {
    return play === "solo" || play === "solo-settings";
  }

  function isMultiPlay(play = screenRef.current.play) {
    return play === "multi" || play === "multi-settings";
  }

  function isBusyPlay(play = screenRef.current.play) {
    return isSoloPlay(play) || isMultiPlay(play);
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
      await playOverlayTurns(leaveSoloTurns, overlayFor(nextScreen));
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
      await Promise.all([bests.refresh(), leaders.refresh(), history.refresh()]);
      await leaveSolo();
    } finally {
      setSavePending(false);
    }
  }

  async function enterSolo() {
    if (isBusyPlay() || transitioningRef.current) {
      return;
    }
    transitioningRef.current = true;
    setSoloLive(true);
    try {
      const nextScreen = { ...screenRef.current, play: "solo" as const, top: "profile" as const };
      setHistoryAttempt(null);
      setHistorySession(null);
      setHistoryGame(null);
      await playOverlayTurns(enterSoloTurns, overlayFor(nextScreen));
      screenRef.current = nextScreen;
      setScreen(nextScreen);
    } finally {
      transitioningRef.current = false;
    }
  }

  async function enterMulti(existing = lobby.lobby) {
    if (isBusyPlay() || transitioningRef.current) {
      return;
    }
    transitioningRef.current = true;
    try {
      let current = existing;
      const mine = lobbyMember(current, auth.user?.id);
      if (current && mine?.state === "invited") {
        current = await lobby.join(current.id);
      } else if (!current) {
        current = await lobby.create();
      }
      if (!current) {
        return;
      }
      const nextScreen = {
        ...screenRef.current,
        play: "multi" as const,
        multi: current.status === "open" ? ("lobby" as const) : ("play" as const),
        top: "profile" as const,
      };
      setHistoryAttempt(null);
      setHistorySession(null);
      setHistoryGame(null);
      await playOverlayTurns(enterSoloTurns, overlayFor(nextScreen));
      screenRef.current = nextScreen;
      setScreen(nextScreen);
    } finally {
      transitioningRef.current = false;
    }
  }

  async function leaveMulti(notify = true) {
    if (!isMultiPlay() || transitioningRef.current) {
      return;
    }
    transitioningRef.current = true;
    setHeldLobby(lobby.lobby);
    try {
      if (notify && lobby.lobby) {
        await lobby.leave();
      }
      if (screenRef.current.play === "multi-settings") {
        const playScreen = { ...screenRef.current, play: "multi" as const };
        await spinCol(2, 1, overlayFor(playScreen));
        screenRef.current = playScreen;
        setScreen(playScreen);
      }
      const nextScreen = { ...screenRef.current, play: "none" as const, multi: "lobby" as const };
      await playOverlayTurns(leaveSoloTurns, overlayFor(nextScreen));
      screenRef.current = nextScreen;
      setScreen(nextScreen);
      if (notify) {
        void history.refresh();
        void bests.refresh();
        void leaders.refresh();
      }
    } finally {
      setHeldLobby(null);
      transitioningRef.current = false;
    }
  }

  async function openMultiSettings() {
    if (screenRef.current.play !== "multi" || transitioningRef.current) {
      return;
    }
    transitioningRef.current = true;
    try {
      const nextScreen = { ...screenRef.current, play: "multi-settings" as const };
      await spinCol(2, -1, overlayFor(nextScreen));
      screenRef.current = nextScreen;
      setScreen(nextScreen);
    } finally {
      transitioningRef.current = false;
    }
  }

  async function closeMultiSettings() {
    if (screenRef.current.play !== "multi-settings" || transitioningRef.current) {
      return;
    }
    transitioningRef.current = true;
    try {
      const nextScreen = { ...screenRef.current, play: "multi" as const };
      await spinCol(2, 1, overlayFor(nextScreen));
      screenRef.current = nextScreen;
      setScreen(nextScreen);
    } finally {
      transitioningRef.current = false;
    }
  }

  async function startMultiAttempt() {
    if (!isLobbyHost(playLobby, auth.user?.id) || (playLobby?.status === "open" && !lobbyCanStart(playLobby))) {
      return;
    }
    const next = await generateScramble();
    await lobby.postScramble(next.moves);
  }

  async function revealSignedIn() {
    transitioningRef.current = true;
    try {
      await Promise.all([
        spinRow(0, -1, { top: "profile" }),
        spinRow(2, -1, { bottom: "settings" }),
        spinRow(1, 1, { middle: "friends" }),
      ]);
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

  useEffect(() => {
    if (!isMultiPlay() || !lobby.lobby) {
      return;
    }
    const next = lobby.lobby.status === "open" ? ("lobby" as const) : ("play" as const);
    if (screenRef.current.multi === next) {
      return;
    }
    const patched = { ...screenRef.current, multi: next };
    screenRef.current = patched;
    setScreen(patched);
    setOverlay(overlayFor(patched));
  }, [lobby.lobby, lobby.lobby?.status]);

  useEffect(() => {
    if (!auth.user || auth.loading || !revealedRef.current || transitioningRef.current || isBusyPlay()) {
      return;
    }
    const current = lobby.lobby;
    const mine = lobbyMember(current, auth.user.id);
    if (
      current &&
      mine?.state === "joined" &&
      (current.status === "attempt" ||
        current.status === "hold" ||
        (current.status === "done" && memberAttempts(mine).length === 5))
    ) {
      void enterMulti(current);
    }
  }, [auth.loading, auth.user, lobby.lobby]);

  useEffect(() => {
    if (!isMultiPlay() || !lobby.lobby || lobby.lobby.status !== "done") {
      return;
    }
    void history.refresh();
    void bests.refresh();
    void leaders.refresh();
    if (memberAttempts(lobbyMember(lobby.lobby, auth.user?.id)).length < 5) {
      void leaveMulti(true);
    }
  }, [auth.user, lobby.lobby]);

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
      await Promise.all([
        spinRow(0, 1, { top: "login" }),
        spinRow(1, -1, { middle: "idle" }),
        spinRow(2, 1, { bottom: "empty" }),
      ]);
      setHistoryAttempt(null);
      setHistorySession(null);
      setHistoryGame(null);
      setHistoryFriend(null);
      setFriendHistoryItems([]);
      await auth.signOut();
    } finally {
      transitioningRef.current = false;
    }
  }

  async function openFriendHistory(friend: User) {
    if (isBusyPlay()) {
      return;
    }
    try {
      setFriendHistoryItems(await listFriendMeasurings(friend.id));
      setHistoryFriend(friend);
      const next = { ...screenRef.current, friend: true };
      screenRef.current = next;
      setScreen(next);
      setOverlay(overlayFor(next));
    } catch {
      setHistoryFriend(null);
      setFriendHistoryItems([]);
    }
  }

  function closeFriendHistory() {
    setHistoryFriend(null);
    setFriendHistoryItems([]);
    const next = { ...screenRef.current, friend: false };
    screenRef.current = next;
    setScreen(next);
    setOverlay(overlayFor(next));
  }

  async function openHistorySession(id: number, owner?: User | null) {
    if (transitioningRef.current || isSoloPlay()) {
      return;
    }
    transitioningRef.current = true;
    try {
      const item = owner
        ? await getFriendMeasuring(owner.id, id)
        : await history.load(id);
      setHistoryAttempt(null);
      if (item.lobbyId) {
        try {
          const game = await getLobby(item.lobbyId);
          setHistoryGame(game);
          setHistorySession(null);
          await spinRow(0, 1, { top: "history-game" });
          return;
        } catch {
          // show this player's session if the lobby snapshot is gone
        }
      }
      setHistoryGame(null);
      setHistorySession(item);
      await spinRow(0, 1, { top: "history-session" });
    } catch {
      setHistorySession(null);
      setHistoryGame(null);
    } finally {
      transitioningRef.current = false;
    }
  }

  async function openHistoryPlayer(member: LobbyMember) {
    if (transitioningRef.current) {
      return;
    }
    transitioningRef.current = true;
    try {
      const times = member.results.map((result) => result.timeMs);
      setHistorySession({
        id: member.user.id,
        mode: "multi",
        averageMs: times.length === 5 ? averageOfFive(times) : 0,
        attempts: member.results,
        attemptCount: member.results.length,
        createdAt: historyGame?.createdAt ?? "",
      });
      setHistoryAttempt(null);
      await spinRow(0, 1, { top: "history-session" });
    } finally {
      transitioningRef.current = false;
    }
  }

  async function openHistoryAttempt(attempt: SavedAttempt) {
    if (transitioningRef.current) {
      return;
    }
    transitioningRef.current = true;
    try {
      setHistoryAttempt(attempt);
      await spinRow(0, 1, { top: "history-attempt" });
    } finally {
      transitioningRef.current = false;
    }
  }

  async function closeHistory() {
    if (transitioningRef.current) {
      return;
    }
    transitioningRef.current = true;
    try {
      if (screenRef.current.top === "history-attempt") {
        await spinRow(0, -1, { top: "history-session" });
        setHistoryAttempt(null);
        return;
      }
      if (screenRef.current.top === "history-session") {
        await spinRow(0, -1, { top: historyGame ? "history-game" : "profile" });
        setHistorySession(null);
        return;
      }
      if (screenRef.current.top === "history-game") {
        await spinRow(0, -1, { top: "profile" });
        setHistoryGame(null);
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
      overlay={overlay}
      turn={cube.turn}
      angle={cube.angle}
      turning={cube.turning}
      turnMs={cube.turnMs}
      turnEase={cube.turnEase}
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
              bestMs={bests.times[0]?.timeMs}
              errorMessage={auth.errorMessage}
              onUpload={async (file) => {
                await auth.setAvatar(file);
              }}
            />
          ) : null;
        }
        if (slot === "history" || slot === "history-multi") {
          return (
            <HistoryList
              items={slot === "history-multi" ? multiHistoryItems : homeHistoryItems}
              onOpen={(id) => void openHistorySession(id)}
            />
          );
        }
        if (slot === "history-back") {
          return (
            <button type="button" className="cube-copy cube-copy--hit" onClick={() => void closeHistory()}>
              back
            </button>
          );
        }
        if (slot === "history-avg" && (historySession || historyGame)) {
          const multi = Boolean(historyGame || historySession?.mode === "multi");
          const complete = (historySession?.attemptCount ?? historySession?.attempts?.length ?? 5) === 5;
          return (
            <div className="history-summary">
              <span className="history-summary__icon" aria-hidden="true">
                {multi ? <MultiIcon /> : <SoloIcon />}
              </span>
              <p className={`history-summary__avg${historySession && !complete ? " history-summary__avg--word" : ""}`}>
                {historySession
                  ? complete
                    ? formatTime(historySession.averageMs)
                    : "incomplete"
                  : "multi"}
              </p>
              <p className="history-summary__when">
                {formatRecordWhen(historySession?.createdAt ?? historyGame?.createdAt ?? "")}
              </p>
            </div>
          );
        }
        if (slot === "history-players" && historyGame) {
          return <HistoryPlayers lobby={historyGame} onOpen={(member) => void openHistoryPlayer(member)} />;
        }
        if (slot === "history-attempts" && historySession?.attempts) {
          return (
            <HistoryAttempts
              attempts={historySession.attempts}
              onOpen={(attempt) => void openHistoryAttempt(attempt)}
            />
          );
        }
        if (slot === "history-time" && historyAttempt) {
          return (
            <div className="history-summary">
              <p className="history-summary__avg">{formatTime(historyAttempt.timeMs)}</p>
              <p className="history-summary__when">{historyAttempt.index}/5</p>
            </div>
          );
        }
        if (slot === "history-detail" && historyAttempt) {
          return <HistoryAttemptDetail scramble={historyAttempt.scramble} />;
        }
        if (slot === "settings") {
          return (
            <button
              type="button"
              className="cube-copy cube-copy--hit"
              onClick={() => {
                if (screenRef.current.play === "solo") {
                  void openSoloSettings();
                  return;
                }
                if (screenRef.current.play === "multi") {
                  void openMultiSettings();
                  return;
                }
                void spinRow(2, -1, { bottom: "menu" });
              }}
            >
              settings
            </button>
          );
        }
        if (slot === "multi-back") {
          return (
            <button type="button" className="cube-copy cube-copy--hit" onClick={() => void closeMultiSettings()}>
              back
            </button>
          );
        }
        if (slot === "multi-clock") {
          return (
            <MultiClockSetting
              hideTimer={soloPrefs.hideTimer}
              hideOthers={soloPrefs.hideOthers}
              onToggleSelf={soloPrefs.toggleTimer}
              onToggleOthers={soloPrefs.toggleOthers}
            />
          );
        }
        if (slot === "solo-back") {
          return (
            <button type="button" className="cube-copy cube-copy--hit" onClick={() => void closeSoloSettings()}>
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
        if (slot === "friend-back") {
          return (
            <button type="button" className="cube-copy cube-copy--hit" onClick={closeFriendHistory}>
              back
            </button>
          );
        }
        if (slot === "settings-back") {
          return (
            <button
              type="button"
              className="cube-copy cube-copy--hit"
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
              className="cube-copy cube-copy--hit"
              onClick={() => void handleLogout()}
            >
              logout
            </button>
          );
        }
        if (slot === "friends") {
          const invite = lobbyInvite(lobby.lobby, auth.user?.id);
          return (
            <FriendDeck
              friends={friends.friends}
              incoming={friends.incoming}
              outgoing={friends.outgoing}
              actingId={friends.actingId}
              inviteName={invite?.host?.username ?? null}
              friend={historyFriend}
              historyItems={friendHistoryItems}
              onOpenFriend={(friend) => void openFriendHistory(friend)}
              onOpenSession={(id) => void openHistorySession(id, historyFriend)}
              onAccept={(id) => void friends.acceptRequest(id)}
              onReject={(id) => void friends.rejectRequest(id)}
              onJoinInvite={() => void enterMulti(invite?.lobby)}
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
        if (slot === "bests") {
          return <BestTimes times={bests.times} />;
        }
        if (slot === "leaders") {
          return <Leaders entries={leaders.entries} />;
        }
        if (slot === "solo-title") {
          return <SoloTitle />;
        }
        if (slot === "multi-title") {
          return <MultiTitle />;
        }
        if (slot === "multi-members") {
          return <MultiMembers lobby={playLobby} />;
        }
        if (slot === "multi-invite") {
          const taken = new Set(
            (playLobby?.members ?? []).filter((member) => member.state !== "left").map((member) => member.user.id),
          );
          return (
            <MultiInvite
              friends={friends.friends.filter((friend) => !taken.has(friend.id))}
              onInvite={(id) => {
                if (isLobbyHost(playLobby, auth.user?.id)) {
                  void lobby.invite(id);
                }
              }}
            />
          );
        }
        if (slot === "multi-room" && playLobby) {
          return (
            <MultiRoom
              lobby={playLobby}
              selfId={auth.user?.id}
              hideOthers={soloPrefs.hideOthers}
              hideSelf={soloPrefs.hideTimer}
              selfElapsed={multiTimer.phase === "running" ? multiTimer.elapsed : null}
            />
          );
        }
        if (slot === "multi-stage") {
          return (
            <MultiStage
              status={playLobby?.status ?? "open"}
              host={isLobbyHost(playLobby, auth.user?.id)}
              canStart={lobbyCanStart(playLobby)}
              waiting={multiWaiting}
              phase={multiTimer.phase}
              elapsed={multiTimer.elapsed}
              inspectLeft={multiTimer.inspectLeft}
              averageMs={multiAttempts.length === 5 ? averageOfFive(multiAttempts.map((item) => item.timeMs)) : null}
              hideTimer={soloPrefs.hideTimer}
              lobby={playLobby}
              selfId={auth.user?.id}
              onStart={() => void startMultiAttempt()}
            />
          );
        }
        if (slot === "multi-actions") {
          return (
            <SoloActions
              done={false}
              cancelLabel="leave"
              onCancel={() => void leaveMulti(true)}
            />
          );
        }
        if (slot === "solo-history") {
          return <SoloHistory attempts={isMultiPlay(screen.play) ? multiAttempts : solo.attempts} />;
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
          return <SoloScramble scramble={isMultiPlay(screen.play) ? playLobby?.scramble ?? "" : solo.scramble} />;
        }
        if (slot === "solo-preview") {
          return <SoloPreview image={isMultiPlay(screen.play) ? multiTimer.image : solo.scrambleImage} />;
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
          return <GameModes onSolo={() => void enterSolo()} onMulti={() => void enterMulti()} />;
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
