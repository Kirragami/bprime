import { useEffect, useState } from "react";
import { scrambleImage } from "../../game/scramble";

export function HistoryAttemptDetail({ scramble }: { scramble: string }) {
  const [image, setImage] = useState("");

  useEffect(() => {
    let active = true;
    setImage("");
    void scrambleImage(scramble).then((svg) => {
      if (active) {
        setImage(svg);
      }
    });
    return () => {
      active = false;
    };
  }, [scramble]);

  return (
    <div className="history-detail">
      <p className="history-detail__scramble">{scramble}</p>
      {image ? <div className="history-detail__image" dangerouslySetInnerHTML={{ __html: image }} /> : null}
    </div>
  );
}
