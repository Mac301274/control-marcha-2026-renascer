"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";

type StockRow = {
  product_id: string;
  type: "tradicional" | "baby_look";
  size: "PP" | "P" | "M" | "G" | "GG" | "XG" | "XGG" | "G1" | "G2" | "G3" | "G4";
  qty_balance: number;
};

const SIZES: StockRow["size"][] = ["PP","P","M","G","GG","XG","XGG","G1","G2","G3","G4"];

export default function EstoquePage() {
  return (
    <RequireAuth>
      <AppShell>
        <EstoqueInner />
      </AppShell>
    </RequireAuth>
  );
}

function EstoqueInner() {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [fType, setFType] = useState<string>("all");
  const [fSize, setFSize] = useState<string>("all");

  async function load() {
    setMsg(null);
    setLoading(true);

    let q = supabase
      .from("v_stock_current")
      .select("product_id,type,size,qty_balance")
      .order("type", { ascending: true })
      .order("size", { ascending: true });

    if (fType !== "all") q = q.eq("type", fType);
    if (fSize !== "all") q = q.eq("size", fSize);

    const { data, error } = await q;
    setLoading(false);

    if (error) {
      setMsg("Erro ao carregar estoque.");
      return;
    }

    setRows((data ?? []) as StockRow[]);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    const total = rows.reduce((acc, r) => acc + (r.qty_balance ?? 0), 0);
    const trad = rows.filter((r) => r.type === "tradicional").reduce((acc, r) => acc + (r.qty_balance ?? 0), 0);
    const baby = rows.filter((r) => r.type === "baby_look").reduce((acc, r) => acc + (r.qty_balance ?? 0), 0);
    return { total, trad, baby };
  }, [rows]);

  return (
    <div style={{ maxWidth: 1100 }}>
      <h1>Estoque Atual</h1>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "10px 0 14px" }}>
        <div style={pill}><strong>Total:</strong> {totals.total}</div>
        <div style={pill}><strong>Tradicional:</strong> {totals.trad}</div>
        <div style={pill}><strong>Baby Look:</strong> {totals.baby}</div>
      </div>

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr 1fr", marginBottom: 12 }}>
        <div>
          <label>Tipo</label>
          <select value={fType} onChange={(e) => setFType(e.target.value)} style={{ width: "100%" }}>
            <option value="all">Todos</option>
            <option value="tradicional">Tradicional</option>
            <option value="baby_look">Baby Look</option>
          </select>
        </div>

        <div>
          <label>Tamanho</label>
          <select value={fSize} onChange={(e) => setFSize(e.target.value)} style={{ width: "100%" }}>
            <option value="all">Todos</option>
            {SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "end" }}>
          <button onClick={load} disabled={loading} style={{ width: "100%" }}>
            {loading ? "Atualizando..." : "ATUALIZAR"}
          </button>
        </div>
      </div>

      <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Tipo</th>
              <th style={th}>Tamanho</th>
              <th style={th}>Saldo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.product_id}>
                <td style={td}>{r.type === "tradicional" ? "Tradicional" : "Baby Look"}</td>
                <td style={td}>{r.size}</td>
                <td style={td}><strong>{r.qty_balance}</strong></td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td style={td} colSpan={3}>Nenhum item encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  borderBottom: "1px solid #e5e7eb",
  whiteSpace: "nowrap",
};
const td: React.CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid #f1f5f9",
  whiteSpace: "nowrap",
};
const pill: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  padding: "8px 10px",
  borderRadius: 999,
};
