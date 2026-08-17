import type { ReactNode } from "react";

type AppShellProps = {
  header: ReactNode;
  children: ReactNode;
};

export function AppShell({ header, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-shell__header">{header}</header>
      <main className="app-shell__main">{children}</main>
    </div>
  );
}
