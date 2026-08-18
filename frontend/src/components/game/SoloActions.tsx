type SoloActionsProps = {
  done: boolean;
  pending?: boolean;
  onSave: () => void;
  onCancel: () => void;
};

export function SoloActions({ done, pending = false, onSave, onCancel }: SoloActionsProps) {
  return (
    <div className={`solo-actions${done ? " solo-actions--split" : ""}`}>
      {done ? (
        <button type="button" className="cube-copy" disabled={pending} onClick={onSave}>
          save
        </button>
      ) : null}
      <button
        type="button"
        className={`cube-copy${done ? "" : " cube-copy--hit"}`}
        disabled={pending}
        onClick={onCancel}
      >
        cancel
      </button>
    </div>
  );
}
