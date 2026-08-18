type SoloActionsProps = {
  done: boolean;
  pending?: boolean;
  cancelLabel?: string;
  onSave?: () => void;
  onCancel: () => void;
};

export function SoloActions({ done, pending = false, cancelLabel = "cancel", onSave, onCancel }: SoloActionsProps) {
  return (
    <div className={`solo-actions${done && onSave ? " solo-actions--split" : ""}`}>
      {done && onSave ? (
        <button type="button" className="cube-copy" disabled={pending} onClick={onSave}>
          save
        </button>
      ) : null}
      <button
        type="button"
        className={`cube-copy${done && onSave ? "" : " cube-copy--hit"}`}
        disabled={pending}
        onClick={onCancel}
      >
        {cancelLabel}
      </button>
    </div>
  );
}
