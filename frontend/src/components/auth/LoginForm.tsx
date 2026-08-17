import { useState } from "react";

type LoginFormProps = {
  pending?: boolean;
  error?: string | null;
  onSubmit: (username: string, password: string) => Promise<void>;
};

export function LoginForm({ pending = false, error, onSubmit }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form
      className="login-form"
      autoComplete="off"
      spellCheck={false}
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(username, password);
      }}
    >
      <p className="login-form__title">sign in</p>
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
      <input
        type="password"
        name="password"
        placeholder="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="off"
        spellCheck={false}
        data-lpignore="true"
        data-1p-ignore="true"
        data-form-type="other"
        disabled={pending}
      />
      {error ? <p className="login-form__error">{error}</p> : null}
      <button type="submit" className="login-form__submit" disabled={pending}>
        login
      </button>
    </form>
  );
}
