type SoloPreviewProps = {
  scramble: string;
  image: string;
};

export function SoloPreview({ scramble, image }: SoloPreviewProps) {
  if (!scramble && !image) {
    return null;
  }

  return (
    <div className="solo-preview">
      {scramble ? <p className="solo-preview__scramble">{scramble}</p> : null}
      {image ? (
        <div className="solo-preview__image" dangerouslySetInnerHTML={{ __html: image }} />
      ) : null}
    </div>
  );
}
