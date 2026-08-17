export function Scene() {
  return (
    <>
      <color attach="background" args={["#111111"]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[4, 6, 3]} intensity={1.2} />
    </>
  );
}
