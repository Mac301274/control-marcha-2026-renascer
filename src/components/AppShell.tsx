"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";

const items = [
  { href: "/venda", label: "Venda" },
  { href: "/entrada", label: "Entrada" },
  { href: "/estoque", label: "Estoque Atual" },
  { href: "/relatorios/saida", label: "Relatório de Saída" },
  { href: "/dashboard", label: "Dashboard (Gráficos)" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", minHeight: "100vh" }}>
      <aside style={{ borderRight: "1px solid #e5e7eb", padding: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 12 }}>
          CONTROL MARCHA 2026 - RENASCER
        </div>

        <nav style={{ display: "grid", gap: 6 }}>
          {items.map((it) => {
            const active = pathname?.startsWith(it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                style={{
                  padding: "10px 10px",
                  borderRadius: 10,
                  textDecoration: "none",
                  border: active ? "1px solid #111827" : "1px solid transparent",
                  background: active ? "#f8fafc" : "transparent",
                }}
              >
                {it.label}
              </Link>
            );
          })}
        </nav>

        <button onClick={logout} style={{ marginTop: 16, width: "100%" }}>
          Sair
        </button>
      </aside>

      <main>
        <AppHeader />
        <div style={{ padding: 16 }}>{children}</div>
      </main>
    </div>
  );
}
