import { AppShell } from "../components/layout/AppShell";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useHealth } from "../hooks/useHealth";
import { CanvasView } from "../scene/CanvasView";

export function Home() {
  const { data, error, loading } = useHealth();

  const tone = loading ? "idle" : data?.status === "ok" ? "ok" : "warn";
  const label = loading ? "checking api" : error ? "api offline" : `api ${data?.status}`;

  return (
    <AppShell
      header={
        <>
          <h1>bprime</h1>
          <StatusBadge label={label} tone={tone} />
        </>
      }
    >
      <CanvasView />
    </AppShell>
  );
}
