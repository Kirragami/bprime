import { Canvas } from "@react-three/fiber";
import { Scene } from "./Scene";

export function CanvasView() {
  return (
    <Canvas camera={{ position: [0, 0, 4], fov: 45 }} dpr={[1, 2]}>
      <Scene />
    </Canvas>
  );
}
