import { useState, type FormEvent } from "react";

type AddFriendFormProps = {
  pending?: boolean;
  error?: string | null;
  onSubmit: (username: string) => Promise<void>;
};

export function AddFriendForm({ pending = false, error, onSubmit }: AddFriendFormProps) {
  const [username, setUsername] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSubmit(username).then(() => setUsername(""));
  }

  return (
    <form
      className="login-form"
      autoComplete="off"
      spellCheck={false}
      onSubmit={handleSubmit}
    >
      <p className="login-form__title">add a friend</p>
      <div className="add-friend-row">
        <input
          type="text"
          name="friend-username"
          placeholder="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          disabled={pending}
        />
        <button
          type="submit"
          className="add-friend-row__submit"
          disabled={pending}
          aria-label="add friend"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 5v14M5 12h14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      {error ? <p className="login-form__error">{error}</p> : null}
    </form>
  );
}
