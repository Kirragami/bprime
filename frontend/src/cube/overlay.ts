import type { SliceIndex, TurnAxis, TurnDir } from "./types";

export type BoardScreen = {
  top: "login" | "register" | "profile" | "history-session" | "history-attempt";
  middle: "idle" | "friends";
  bottom: "empty" | "settings" | "menu";
  play: "none" | "solo" | "solo-settings";
};

export type Overlay = [
  string | null,
  string | null,
  string | null,
  string | null,
  string | null,
  string | null,
  string | null,
  string | null,
  string | null,
];

export type RowSlots = [string | null, string | null, string | null];

export type OverlayTurn = {
  axis: TurnAxis;
  index: SliceIndex;
  dir: TurnDir;
};

const emptyOverlay: Overlay = [null, null, null, null, null, null, null, null, null];

export function sliceCells(axis: TurnAxis, index: SliceIndex): [number, number, number] {
  if (axis === "col") {
    return [index, index + 3, index + 6];
  }
  const start = index * 3;
  return [start, start + 1, start + 2];
}

function lastTurnForCell(turns: readonly OverlayTurn[], cell: number) {
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    if (sliceCells(turns[index].axis, turns[index].index).includes(cell)) {
      return index;
    }
  }
  return -1;
}

export function incomingOverlayForTurn(
  final: Overlay,
  turns: readonly OverlayTurn[],
  turnIndex: number,
): Overlay {
  const next = [...emptyOverlay] as Overlay;
  const turn = turns[turnIndex];
  for (const cell of sliceCells(turn.axis, turn.index)) {
    if (lastTurnForCell(turns, cell) === turnIndex) {
      next[cell] = final[cell];
    }
  }
  return next;
}

export const LOGGED_OUT_SCREEN: BoardScreen = {
  top: "login",
  middle: "idle",
  bottom: "empty",
  play: "none",
};

export function overlayFor(screen: BoardScreen): Overlay {
  if (screen.play === "solo") {
    return ["solo-title", "solo-history", "bests", "solo-scramble", "solo-stage", null, "solo-preview", "solo-actions", "settings"];
  }

  if (screen.play === "solo-settings") {
    return ["solo-title", "solo-history", "solo-look", "solo-scramble", "solo-stage", "solo-clock", "solo-preview", "solo-actions", "solo-back"];
  }

  const top: RowSlots =
    screen.top === "login"
      ? ["login", "tagline", "register-cta"]
      : screen.top === "register"
        ? ["register", "register-tagline", "login-cta"]
        : screen.top === "history-session"
          ? ["history-back", "history-avg", "history-attempts"]
          : screen.top === "history-attempt"
            ? ["history-back", "history-time", "history-detail"]
            : ["profile", null, "history"];

  const middle: RowSlots =
    screen.middle === "friends"
      ? ["friends", "title-modes", "add-friend"]
      : [null, "title", null];

  const bottom: RowSlots =
    screen.bottom === "settings"
      ? [null, null, "settings"]
      : screen.bottom === "menu"
        ? ["settings-back", null, "logout"]
        : [null, null, null];

  return [...top, ...middle, ...bottom];
}

export function rowSlots(overlay: Overlay, row: SliceIndex): RowSlots {
  const start = row * 3;
  return [overlay[start], overlay[start + 1], overlay[start + 2]];
}

export function colSlots(overlay: Overlay, col: SliceIndex): RowSlots {
  return [overlay[col], overlay[col + 3], overlay[col + 6]];
}

export function withCol(overlay: Overlay, col: SliceIndex, slots: RowSlots): Overlay {
  const next = [...overlay] as Overlay;
  next[col] = slots[0];
  next[col + 3] = slots[1];
  next[col + 6] = slots[2];
  return next;
}

export function withRow(overlay: Overlay, row: SliceIndex, slots: RowSlots): Overlay {
  const next = [...overlay] as Overlay;
  const start = row * 3;
  next[start] = slots[0];
  next[start + 1] = slots[1];
  next[start + 2] = slots[2];
  return next;
}

export function sameRowScreen(
  current: BoardScreen,
  next: BoardScreen,
  row: SliceIndex,
): boolean {
  if (row === 0) {
    return current.top === next.top;
  }
  if (row === 1) {
    return current.middle === next.middle;
  }
  return current.bottom === next.bottom;
}
