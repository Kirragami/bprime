export function RegisterForm() {
  return (
    <form
      className="login-form"
      autoComplete="off"
      spellCheck={false}
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <p className="login-form__title">register</p>
      <input
        type="text"
        name="username"
        placeholder="username"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        data-lpignore="true"
        data-1p-ignore="true"
        data-form-type="other"
      />
      <input
        type="password"
        name="password"
        placeholder="password"
        autoComplete="off"
        spellCheck={false}
        data-lpignore="true"
        data-1p-ignore="true"
        data-form-type="other"
      />
      <button type="submit" className="login-form__submit">
        create
      </button>
    </form>
  );
}
