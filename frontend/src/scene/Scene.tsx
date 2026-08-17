import { Float } from "@react-three/drei";

export function Scene() {
  return (
    <>
      <color attach="background" args={["#111111"]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[4, 6, 3]} intensity={1.2} />
      <Float speed={1.4} rotationIntensity={0.6} floatIntensity={0.8}>
        <mesh>
          <icosahedronGeometry args={[1.15, 0]} />
          <meshStandardMaterial color="#d8d2c4" metalness={0.15} roughness={0.35} />
        </mesh>
      </Float>
    </>
  );
}
