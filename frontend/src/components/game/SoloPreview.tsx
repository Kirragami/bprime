export function SoloPreview({ image }: { image: string }) {
  if (!image) {
    return null;
  }

  return <div className="solo-preview" dangerouslySetInnerHTML={{ __html: image }} />;
}
