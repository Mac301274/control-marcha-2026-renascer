"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { formatBRL } from "@/lib/format";
import { downloadCSV } from "@/lib/csv";

type Payment = "pix" | "dinheiro" | "cartao";
type Type = "tradicional" | "baby_look";
type Size = "PP" | "P" | "M" | "G" | "GG" | "XG" | "XGG" | "G1" | "G2" | "G3" | "G4";

type SaleRow = {
  id: string;
  sale_date: string;
  customer_name: string;
  qty: number;
  unit_price: number;
  total_price: number;
  payment_method: Payment;
  status: "active" | "canceled";
  created_at: string;
  products: {
    type: Type;
    size: Size;
    size_label: string | null;
    size_equiv: string | null;
  };
};

const SIZES: Size[] = ["PP","P","M","G","GG","XG","XGG","G1","G2","G3","G4"];

export default function RelatorioSaidaPage() {
  return (
    <RequireAuth>
      <AppShell>
        <RelatorioSaidaInner />
      </AppShell>
    </RequireAuth>
  );
}

function RelatorioSaidaInner() {
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [fType, setFType] = useState<string>("all");
  const [fSize, setFSize] = useState<string>("all");
  const [fPay, setFPay] = useState<string>("all");
  const [fFrom, setFFrom] = useState<string>("");
  const [fTo, setFTo] = useState<string>("");
  const [fStatus, setFStatus] = useState<string>("active");
  const [fCustomer, setFCustomer] = useState<string>("");

  async function load() {
    setMsg(null);
    setLoading(true);

    let q = supabase
      .from("sales")
      .select(
        `
        id, sale_date, customer_name, qty, unit_price, total_price, payment_method, status, created_at,
        products:products(type,size,size_label,size_equiv)
      `
      )
      .order("sale_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1000);

    if (fStatus !== "all") q = q.eq("status", fStatus);
    if (fFrom) q = q.gte("sale_date", fFrom);
    if (fTo) q = q.lte("sale_date", fTo);

    if (fPay !== "all") q = q.eq("payment_method", fPay);

    // Observação: se o filtro via join falhar, ajustamos para filtrar por product_id.
    if (fType !== "all") q = q.eq("products.type", fType);
    if (fSize !== "all") q = q.eq("products.size", fSize);

    if (fCustomer.trim()) q = q.ilike("customer_name", `%${fCustomer.trim()}%`);

    const { data, error } = await q;
    setLoading(false);

    if (error) {
      setMsg("Erro ao carregar relatório de saída.");
      return;
    }

    setRows((data ?? []) as any);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    const activeRows = rows.filter((r) => r.status === "active");
    const qtd = activeRows.reduce((acc, r) => acc + (r.qty ?? 0), 0);
    const total = activeRows.reduce((acc, r) => acc + (r.total_price ?? 0), 0);
    return { qtd, total };
  }, [rows]);

  function exportCSV() {
    const exportRows = rows.map((r) => ({
      "Data da venda": formatDateBR(r.sale_date),
      "Cliente": r.customer_name,
      "Tipo": r.products.type === "tradicional" ? "Tradicional" : "Baby Look",
      "Tamanho": r.products.size,
      "Descrição do tamanho": r.products.size_label ?? "",
      "Equivalência": r.products.size_equiv ?? "",
      "Quantidade": r.qty,
      "Valor unitário": formatBRL(r.unit_price),
      "Valor total": formatBRL(r.total_price),
      "Pagamento": paymentLabel(r.payment_method),
      "Status": r.status === "active" ? "Ativa" : "Cancelada",
    }));

    downloadCSV("RELATORIO-SAIDA.csv", exportRows);
  }

  return (
    <div style={{ maxWidth: 1200 }}>
      <h1>Relatório de Saída (Vendas)</h1>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "10px 0 14px" }}>
        <div style={pill}><strong>Quantidade (ativas):</strong> {totals.qtd}</div>
        <div style={pill}><strong>Total (ativas):</strong> {formatBRL(round2(totals.total))}</div>
      </div>

      <div style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 12 }}>
        <strong>Filtros</strong>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr 1fr 1fr", marginTop: 10 }}>
          <div>
            <label>Status</label>
            <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} style={{ width: "100%" }}>
              <option value="active">Somente ativas</option>
              <option value="canceled">Somente canceladas</option>
              <option value="all">Todas</option>
            </select>
          </div>

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

          <div>
            <label>Pagamento</label>
            <select value={fPay} onChange={(e) => setFPay(e.target.value)} style={{ width: "100%" }}>
              <option value="all">Todos</option>
              <option value="pix">Pix</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="cartao">Cartão</option>
            </select>
          </div>

          <div>
            <label>Data: de</label>
            <input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} style={{ width: "100%" }} />
          </div>

          <div>
            <label>Data: até</label>
            <input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} style={{ width: "100%" }} />
          </div>

          <div style={{ gridColumn: "1 / span 2" }}>
            <label>Cliente (contém)</label>
            <input value={fCustomer} onChange={(e) => setFCustomer(e.target.value)} style={{ width: "100%" }} />
          </div>

          <div style={{ display: "flex", alignItems: "end" }}>
            <button onClick={load} disabled={loading} style={{ width: "100%" }}>
              {loading ? "Consultando..." : "CONSULTAR"}
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "end" }}>
            <button onClick={exportCSV} disabled={!rows.length} style={{ width: "100%" }}>
              EXPORTAR CSV (Excel)
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14, overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Data</th>
              <th style={th}>Cliente</th>
              <th style={th}>Tipo</th>
              <th style={th}>Tam.</th>
              <th style={th}>Qtd</th>
              <th style={th}>Unit.</th>
              <th style={th}>Total</th>
              <th style={th}>Pagamento</th>
              <th style={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={td}>{formatDateBR(r.sale_date)}</td>
                <td style={td}>{r.customer_name}</td>
                <td style={td}>{r.products.type === "tradicional" ? "Tradicional" : "Baby Look"}</td>
                <td style={td}>{r.products.size}</td>
                <td style={td}>{r.qty}</td>
                <td style={td}>{formatBRL(r.unit_price)}</td>
                <td style={td}>{formatBRL(r.total_price)}</td>
                <td style={td}>{paymentLabel(r.payment_method)}</td>
                <td style={td}>{r.status === "active" ? "Ativa" : "Cancelada"}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td style={td} colSpan={9}>Nenhum registro encontrado.</td>
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

function formatDateBR(dateISO: string) {
  const [y, m, d] = dateISO.split("-");
  if (!y || !m || !d) return dateISO;
  return `${d}/${m}/${y}`;
}

function paymentLabel(p: Payment) {
  if (p === "pix") return "Pix";
  if (p === "dinheiro") return "Dinheiro";
  return "Cartão";
}

function round2(n: number) {
  return Math.round((n || 0) * 100) / 100;
}
