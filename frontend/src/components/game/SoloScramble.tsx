export function SoloScramble({ scramble }: { scramble: string }) {
  if (!scramble) {
    return null;
  }

  return <p className="solo-scramble">{scramble}</p>;
}
