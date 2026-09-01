import { useState } from "react";
import { mediaUrl } from "../../api/client";
import { DefaultAvatar } from "../friends/DefaultAvatar";
import type { User } from "../../types";

type UsernamePickerFormProps = {
  user: User;
  pending?: boolean;
  error?: string | null;
  onSubmit: (username: string) => Promise<void>;
};

export function UsernamePickerForm({ user, pending = false, error, onSubmit }: UsernamePickerFormProps) {
  const [username, setUsername] = useState("");

  return (
    <form
      className="login-form login-form--picker"
      autoComplete="off"
      spellCheck={false}
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(username);
      }}
    >
      <p className="login-form__title">pick username</p>
      <div className="login-form__avatar" aria-hidden="true">
        {user.avatarUrl ? (
          <img src={mediaUrl(user.avatarUrl)} alt="" />
        ) : (
          <DefaultAvatar />
        )}
      </div>
      <input
        type="text"
        name="username"
        placeholder="username"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        data-lpignore="true"
        data-1p-ignore="true"
        data-form-type="other"
        disabled={pending}
      />
      {error ? <p className="login-form__error">{error}</p> : null}
      <button type="submit" className="login-form__submit" disabled={pending}>
        continue
      </button>
    </form>
  );
}
