export function PersonMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="16.4" r="8.5" fill="currentColor" />
      <path d="M7.2 44.2c.9-10.4 7.6-16 16.8-16s15.9 5.6 16.8 16Z" fill="currentColor" />
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
