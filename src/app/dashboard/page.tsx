"use client";

import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";

export default function DashboardPage() {
  return (
    <RequireAuth>
      <AppShell>
        <div style={{ maxWidth: 980 }}>
          <h1>Dashboard (Gráficos)</h1>
          <p style={{ opacity: 0.85 }}>
            Em seguida implementaremos os gráficos: por tamanho, por tipo, por forma de pagamento e por data.
          </p>
        </div>
      </AppShell>
    </RequireAuth>
  );
}
