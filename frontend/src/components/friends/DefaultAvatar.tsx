export function PersonMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="18" r="9" fill="currentColor" />
      <path d="M8 42.5c1.1-11.2 7.4-16.8 16-16.8s14.9 5.6 16 16.8Z" fill="currentColor" />
    </svg>
  );
}

export function DefaultAvatar() {
  return (
    <span className="friend-avatar friend-avatar--default" aria-hidden="true">
      <PersonMark />
    </span>
  );
}
