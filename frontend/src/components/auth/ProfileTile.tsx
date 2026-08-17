import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type PointerEvent, type WheelEvent } from "react";
import { mediaUrl } from "../../api/client";
import type { User } from "../../types";

const maxAvatarBytes = 5 * 1024 * 1024;
const exportSize = 512;

type Draft = {
  url: string;
  image: HTMLImageElement;
  scale: number;
  minScale: number;
  x: number;
  y: number;
};

type ProfileTileProps = {
  user: User;
  onUpload: (file: File) => Promise<void>;
  errorMessage: (err: unknown) => string;
};

function coverScale(image: HTMLImageElement, view: number) {
  return Math.max(view / image.naturalWidth, view / image.naturalHeight);
}

function clampOffset(draft: Draft, view: number) {
  const maxX = Math.max(0, (imageWidth(draft) - view) / 2);
  const maxY = Math.max(0, (imageHeight(draft) - view) / 2);
  return {
    ...draft,
    x: Math.min(maxX, Math.max(-maxX, draft.x)),
    y: Math.min(maxY, Math.max(-maxY, draft.y)),
  };
}

function imageWidth(draft: Draft) {
  return draft.image.naturalWidth * draft.scale;
}

function imageHeight(draft: Draft) {
  return draft.image.naturalHeight * draft.scale;
}

export function ProfileTile({ user, onUpload, errorMessage }: ProfileTileProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initial = user.username.slice(0, 1).toLowerCase();
  const label = user.avatarUrl ? "change photo" : "set photo";

  useEffect(() => {
    if (!draft) {
      return;
    }
    const url = draft.url;
    return () => URL.revokeObjectURL(url);
  }, [draft?.url]);

  useLayoutEffect(() => {
    if (!draft || !viewRef.current) {
      return;
    }
    const view = viewRef.current.clientWidth;
    const min = coverScale(draft.image, view);
    if (Math.abs(min - draft.minScale) < 0.001) {
      return;
    }
    setDraft(clampOffset({ ...draft, scale: min, minScale: min, x: 0, y: 0 }, view));
  }, [draft]);

  function viewSize() {
    return viewRef.current?.clientWidth || 160;
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    if (file.size > maxAvatarBytes) {
      setError("image must be 5MB or smaller");
      return;
    }

    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const view = viewSize();
      const min = coverScale(image, view);
      setError(null);
      setDraft({ url, image, scale: min, minScale: min, x: 0, y: 0 });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      setError("could not read image");
    };
    image.src = url;
  }

  function cancelDraft() {
    setDraft(null);
    setError(null);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!draft) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: draft.x, y: draft.y, px: event.clientX, py: event.clientY };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!draft || !dragRef.current) {
      return;
    }
    setDraft(
      clampOffset(
        {
          ...draft,
          x: dragRef.current.x + (event.clientX - dragRef.current.px),
          y: dragRef.current.y + (event.clientY - dragRef.current.py),
        },
        viewSize(),
      ),
    );
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  function onWheel(event: WheelEvent<HTMLDivElement>) {
    if (!draft) {
      return;
    }
    event.preventDefault();
    const view = viewSize();
    const nextScale = Math.min(draft.minScale * 4, Math.max(draft.minScale, draft.scale * (event.deltaY < 0 ? 1.08 : 0.92)));
    setDraft(clampOffset({ ...draft, scale: nextScale, minScale: coverScale(draft.image, view) }, view));
  }

  async function setPhoto() {
    if (!draft) {
      return;
    }

    const view = viewSize();
    const canvas = document.createElement("canvas");
    canvas.width = exportSize;
    canvas.height = exportSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("could not crop image");
      return;
    }

    const ratio = exportSize / view;
    const width = imageWidth(draft) * ratio;
    const height = imageHeight(draft) * ratio;
    ctx.drawImage(
      draft.image,
      exportSize / 2 + draft.x * ratio - width / 2,
      exportSize / 2 + draft.y * ratio - height / 2,
      width,
      height,
    );

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });
    if (!blob) {
      setError("could not crop image");
      return;
    }

    setPending(true);
    setError(null);
    try {
      await onUpload(new File([blob], "avatar.jpg", { type: "image/jpeg" }));
      setDraft(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={`profile-tile${draft ? " is-editing" : ""}`}>
      {draft ? (
        <div
          ref={viewRef}
          className="profile-avatar profile-avatar--edit"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
        >
          <img
            src={draft.url}
            alt=""
            draggable={false}
            style={{
              width: imageWidth(draft),
              height: imageHeight(draft),
              transform: `translate(-50%, -50%) translate(${draft.x}px, ${draft.y}px)`,
            }}
          />
        </div>
      ) : (
        <button
          type="button"
          className="profile-avatar"
          onClick={() => inputRef.current?.click()}
          aria-label={label}
        >
          <span className="profile-avatar__media">
            {user.avatarUrl ? (
              <img src={mediaUrl(user.avatarUrl)} alt="" />
            ) : (
              <span className="profile-avatar__initial">{initial}</span>
            )}
          </span>
          <span className="profile-avatar__veil">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M4.8 19.2h14.4A1.8 1.8 0 0 0 21 17.4V8.7a1.8 1.8 0 0 0-1.8-1.8h-2.28l-.72-1.5A1.2 1.2 0 0 0 15.12 4.8H8.88a1.2 1.2 0 0 0-1.08.66L7.08 6.9H4.8A1.8 1.8 0 0 0 3 8.7v8.7a1.8 1.8 0 0 0 1.8 1.8Zm7.2-3.3a3.3 3.3 0 1 1 0-6.6 3.3 3.3 0 0 1 0 6.6Z"
                fill="currentColor"
              />
            </svg>
            <span>{label}</span>
          </span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        hidden
        onChange={handleFile}
      />
      <p className="cube-copy">{user.username}</p>
      {draft ? (
        <div className="profile-tile__actions">
          <button type="button" className="cube-copy" disabled={pending} onClick={() => void setPhoto()}>
            set
          </button>
          <button type="button" className="cube-copy" disabled={pending} onClick={cancelDraft}>
            cancel
          </button>
        </div>
      ) : null}
      {error ? <p className="profile-tile__error">{error}</p> : null}
    </div>
  );
}
