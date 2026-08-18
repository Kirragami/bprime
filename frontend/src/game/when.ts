export function formatRecordWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date
    .toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    .toLowerCase();
}
