import { useEffect, useRef } from "react";
import { LoginForm } from "../auth/LoginForm";
import { RegisterForm } from "../auth/RegisterForm";
import { createRandomCube, syncTaglineColumn, useCube } from "../../cube";
import { CubeView } from "./CubeView";

const AUTO_COL_MS = 4000;

function createAuthCube() {
  const faces = createRandomCube();
  faces.front[0] = { ...faces.front[0], slot: "login" };
  faces.front[1] = { ...faces.front[1], slot: "tagline" };
  faces.front[2] = { ...faces.front[2], slot: "register-cta" };
  faces.front[4] = { ...faces.front[4], slot: "title" };
  faces.right[0] = { ...faces.right[0], slot: "register" };
  faces.right[1] = { ...faces.right[1], slot: "register-tagline" };
  faces.right[2] = { ...faces.right[2], slot: "login-cta" };

  return syncTaglineColumn(faces);
}

export function CubeBoard() {
  const cube = useCube(createAuthCube, { afterTurn: syncTaglineColumn });
  const turningRef = useRef(cube.turning);
  const turnColRef = useRef(cube.turnCol);

  turningRef.current = cube.turning;
  turnColRef.current = cube.turnCol;

  useEffect(() => {
    const id = window.setInterval(() => {
      if (turningRef.current) {
        return;
      }
      void turnColRef.current(1, 1);
    }, AUTO_COL_MS);

    return () => window.clearInterval(id);
  }, []);

  return (
    <CubeView
      faces={cube.faces}
      turn={cube.turn}
      angle={cube.angle}
      turning={cube.turning}
      renderSlot={(slot) => {
        if (slot === "login") {
          return <LoginForm />;
        }
        if (slot === "register") {
          return <RegisterForm />;
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
