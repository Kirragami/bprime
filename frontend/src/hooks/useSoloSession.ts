import { useCallback, useEffect, useRef, useState } from "react";
import { averageOfFive, type Attempt } from "../game/ao5";
import { generateScramble } from "../game/scramble";

export type TimerPhase = "idle" | "inspect" | "ready" | "running" | "done";

const inspectMs = 15_000;
const readyHoldMs = 300;

export function useSoloSession(active: boolean) {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [scramble, setScramble] = useState("");
  const [scrambleImage, setScrambleImage] = useState("");
  const [phase, setPhase] = useState<TimerPhase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [inspectLeft, setInspectLeft] = useState(inspectMs);
  const startedAt = useRef(0);
  const inspectStartedAt = useRef(0);
  const holdTimer = useRef(0);
  const frame = useRef(0);
  const phaseRef = useRef<TimerPhase>("idle");
  const scrambleRef = useRef("");
  const scrambleToken = useRef(0);
  const spaceDown = useRef(false);

  phaseRef.current = phase;
  scrambleRef.current = scramble;

  const nextScramble = useCallback(async () => {
    const token = ++scrambleToken.current;
    const next = await generateScramble();
    if (token !== scrambleToken.current) {
      return;
    }
    setScramble(next.moves);
    setScrambleImage(next.image);
  }, []);

  const reset = useCallback(() => {
    window.clearTimeout(holdTimer.current);
    cancelAnimationFrame(frame.current);
    setAttempts([]);
    setScramble("");
    setScrambleImage("");
    setPhase("idle");
    setElapsed(0);
    setInspectLeft(inspectMs);
    spaceDown.current = false;
    void nextScramble();
  }, [nextScramble]);

  useEffect(() => {
    if (active) {
      reset();
      return;
    }
    scrambleToken.current += 1;
    window.clearTimeout(holdTimer.current);
    cancelAnimationFrame(frame.current);
    setAttempts([]);
    setScramble("");
    setScrambleImage("");
    setPhase("idle");
    setElapsed(0);
  }, [active, reset]);

  useEffect(() => {
    if (phase !== "running" && phase !== "inspect") {
      return;
    }
    const tick = () => {
      if (phaseRef.current === "running") {
        setElapsed(performance.now() - startedAt.current);
      }
      if (phaseRef.current === "inspect") {
        setInspectLeft(Math.max(0, inspectMs - (performance.now() - inspectStartedAt.current)));
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [phase]);

  const stopSolve = useCallback(() => {
    const timeMs = Math.max(1, Math.round(performance.now() - startedAt.current));
    setElapsed(timeMs);
    setAttempts((current) => {
      const next = [...current, { timeMs, scramble: scrambleRef.current }];
      if (next.length >= 5) {
        setPhase("done");
        setScrambleImage("");
        return next.slice(0, 5);
      }
      setPhase("idle");
      setElapsed(0);
      setInspectLeft(inspectMs);
      void nextScramble();
      return next;
    });
  }, [nextScramble]);

  useEffect(() => {
    if (!active) {
      return;
    }

    const ignoreTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }
      return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || ignoreTarget(event.target)) {
        return;
      }
      event.preventDefault();
      if (event.repeat || spaceDown.current) {
        return;
      }
      spaceDown.current = true;

      const current = phaseRef.current;
      if (current === "running") {
        stopSolve();
        return;
      }
      if (current === "done") {
        return;
      }
      if (current === "idle") {
        inspectStartedAt.current = performance.now();
        setPhase("inspect");
        setInspectLeft(inspectMs);
      }
      holdTimer.current = window.setTimeout(() => {
        if (phaseRef.current === "inspect" || phaseRef.current === "idle") {
          setPhase("ready");
        }
      }, readyHoldMs);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") {
        return;
      }
      spaceDown.current = false;
      window.clearTimeout(holdTimer.current);
      if (phaseRef.current === "ready") {
        startedAt.current = performance.now();
        setElapsed(0);
        setPhase("running");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.clearTimeout(holdTimer.current);
    };
  }, [active, stopSolve]);

  const averageMs = attempts.length === 5 ? averageOfFive(attempts.map((item) => item.timeMs)) : null;

  return {
    attempts,
    scramble,
    scrambleImage,
    phase,
    elapsed,
    inspectLeft,
    averageMs,
    reset,
  };
}
