import { useCallback, useEffect, useRef, useState } from "react";
import { scrambleImage } from "../game/scramble";
import type { TimerPhase } from "./useSoloSession";

const readyHoldMs = 300;

export function useMultiTimer(
  active: boolean,
  scramble: string,
  lookSec: number,
  onStop: (timeMs: number) => void,
  onStart?: () => void,
) {
  const [phase, setPhase] = useState<TimerPhase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [image, setImage] = useState("");
  const inspectMs = Math.max(0, lookSec) * 1000;
  const [inspectLeft, setInspectLeft] = useState(inspectMs);
  const startedAt = useRef(0);
  const inspectStartedAt = useRef(0);
  const inspectMsRef = useRef(inspectMs);
  const holdTimer = useRef(0);
  const frame = useRef(0);
  const phaseRef = useRef<TimerPhase>("idle");
  const spaceDown = useRef(false);
  const onStopRef = useRef(onStop);
  const onStartRef = useRef(onStart);
  const scrambleRef = useRef(scramble);

  phaseRef.current = phase;
  inspectMsRef.current = inspectMs;
  onStopRef.current = onStop;
  onStartRef.current = onStart;
  scrambleRef.current = scramble;

  const reset = useCallback(() => {
    window.clearTimeout(holdTimer.current);
    cancelAnimationFrame(frame.current);
    setPhase("idle");
    setElapsed(0);
    setInspectLeft(inspectMsRef.current);
    spaceDown.current = false;
  }, []);

  useEffect(() => {
    if (!active || !scramble) {
      reset();
      setImage("");
      return;
    }
    reset();
    let alive = true;
    void scrambleImage(scramble).then((svg) => {
      if (alive) {
        setImage(svg);
      }
    });
    return () => {
      alive = false;
    };
  }, [active, scramble, reset]);

  useEffect(() => {
    if (phase !== "running" && phase !== "inspect") {
      return;
    }
    const tick = () => {
      if (phaseRef.current === "running") {
        setElapsed(performance.now() - startedAt.current);
      }
      if (phaseRef.current === "inspect") {
        setInspectLeft(Math.max(0, inspectMsRef.current - (performance.now() - inspectStartedAt.current)));
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [phase]);

  const stopSolve = useCallback(() => {
    const timeMs = Math.max(1, Math.round(performance.now() - startedAt.current));
    setElapsed(timeMs);
    setPhase("idle");
    onStopRef.current(timeMs);
  }, []);

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
      if (current !== "idle" && current !== "inspect") {
        return;
      }
      if (current === "idle" && inspectMsRef.current > 0) {
        inspectStartedAt.current = performance.now();
        setPhase("inspect");
        setInspectLeft(inspectMsRef.current);
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
        onStartRef.current?.();
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

  return { phase, elapsed, inspectLeft, image };
}
