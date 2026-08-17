type StatusBadgeProps = {
  label: string;
  tone: "ok" | "warn" | "idle";
};

export function StatusBadge({ label, tone }: StatusBadgeProps) {
  return <span className={`status-badge status-badge--${tone}`}>{label}</span>;
}
