"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { formatBRL, parseBRNumber } from "@/lib/format";

type Product = {
  id: string;
  type: "tradicional" | "baby_look";
  size: "PP" | "P" | "M" | "G" | "GG" | "XG" | "XGG" | "G1" | "G2" | "G3" | "G4";
  size_label: string | null;
  size_equiv: string | null;
};

type EntryRow = {
  id: string;
  qty: number;
  unit_cost: number;
  purchase_date: string;
  registered_at: string;
  products: Product;
};

const SIZES: Product["size"][] = ["PP","P","M","G","GG","XG","XGG","G1","G2","G3","G4"];

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function nowBR() {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());
}

export default function EntradaPage() {
  return (
    <RequireAuth>
      <AppShell>
        <EntradaInner />
      </AppShell>
    </RequireAuth>
  );
}

function EntradaInner() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [type, setType] = useState<Product["type"]>("tradicional");
  const [size, setSize] = useState<Product["size"]>("M");
  const [qty, setQty] = useState<number>(1);
  const [unitCost, setUnitCost] = useState<string>("0");
  const [purchaseDate, setPurchaseDate] = useState<string>(todayISO());

  const selectedProduct = useMemo(
    () => products.find((p) => p.type === type && p.size === size) ?? null,
    [products, type, size]
  );

  const [fType, setFType] = useState<string>("all");
  const [fSize, setFSize] = useState<string>("all");
  const [fPurchaseFrom, setFPurchaseFrom] = useState<string>("");
  const [fPurchaseTo, setFPurchaseTo] = useState<string>("");

  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);

  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingProducts(true);
      const { data, error } = await supabase
        .from("products")
        .select("id,type,size,size_label,size_equiv")
        .eq("active", true);

      if (error) {
        setMsg("Erro ao carregar produtos.");
        setLoadingProducts(false);
        return;
      }

      setProducts((data ?? []) as Product[]);
      setLoadingProducts(false);
    })();
  }, []);

  async function loadEntries() {
    setMsg(null);
    setLoadingEntries(true);

    let q = supabase
      .from("stock_entries")
      .select(
        "id, qty, unit_cost, purchase_date, registered_at, products:products(id,type,size,size_label,size_equiv)"
      )
      .order("registered_at", { ascending: false })
      .limit(300);

    // NOTE: dependendo do projeto, o filtro via join pode falhar; se ocorrer, podemos ajustar.
    if (fType !== "all") q = q.eq("products.type", fType);
    if (fSize !== "all") q = q.eq("products.size", fSize);

    if (fPurchaseFrom) q = q.gte("purchase_date", fPurchaseFrom);
    if (fPurchaseTo) q = q.lte("purchase_date", fPurchaseTo);

    const { data, error } = await q;

    setLoadingEntries(false);

    if (error) {
      setMsg("Erro ao consultar entradas.");
      return;
    }

    setEntries((data ?? []) as any);
  }

  useEffect(() => {
    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleInclude() {
    setMsg(null);

    if (!selectedProduct) return setMsg("Produto (tipo/tamanho) não encontrado.");
    if (qty < 1) return setMsg("Quantidade inválida.");

    const cost = parseBRNumber(unitCost);
    if (!Number.isFinite(cost) || cost < 0) return setMsg("Custo unitário inválido.");
    if (!purchaseDate) return setMsg("Informe a data da compra.");

    setSaving(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      setSaving(false);
      window.location.href = "/login";
      return;
    }

    const { error } = await supabase.from("stock_entries").insert({
      product_id: selectedProduct.id,
      qty,
      unit_cost: Math.round(cost * 100) / 100,
      purchase_date: purchaseDate,
      created_by: userId,
    });

    setSaving(false);

    if (error) {
      setMsg(error.message ?? "Erro ao incluir entrada.");
      return;
    }

    setMsg("✅ Entrada registrada com sucesso!");
    setQty(1);
    setUnitCost("0");
    setPurchaseDate(todayISO());

    await loadEntries();
  }

  const guide = [
    { size: "PP", label: "Extra Pequeno", equiv: "36" },
    { size: "P", label: "Pequeno", equiv: "38-40" },
    { size: "M", label: "Médio", equiv: "40-42" },
    { size: "G", label: "Grande", equiv: "42-44" },
    { size: "GG", label: "Extra Grande", equiv: "44-46" },
    { size: "XG", label: "Extra G", equiv: "46-48" },
    { size: "XGG", label: "Extra Extra GG", equiv: "48-50" },
  ];

  return (
    <div style={{ maxWidth: 1100 }}>
      <h1 style={{ marginBottom: 6 }}>Entrada (Cadastro de Itens)</h1>
      <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 14 }}>
        Data do cadastro: <strong>{nowBR()}</strong> (automática)
      </div>

      {loadingProducts ? (
        <p>Carregando…</p>
      ) : (
        <>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr 1fr" }}>
            <div>
              <label>Tipo</label>
              <select value={type} onChange={(e) => setType(e.target.value as any)} style={{ width: "100%" }}>
                <option value="tradicional">Tradicional</option>
                <option value="baby_look">Baby Look</option>
              </select>
            </div>

            <div>
              <label>Tamanho</label>
              <select value={size} onChange={(e) => setSize(e.target.value as any)} style={{ width: "100%" }}>
                {SIZES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {selectedProduct?.size_label || selectedProduct?.size_equiv ? (
                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                  {selectedProduct.size_label ?? ""}{" "}
                  {selectedProduct.size_equiv ? `(${selectedProduct.size_equiv})` : ""}
                </div>
              ) : null}
            </div>

            <div>
              <label>Quantidade</label>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label>Custo unitário (R$)</label>
              <input
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                inputMode="decimal"
                placeholder="Ex: 22,50"
                style={{ width: "100%" }}
              />
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                {formatBRL(Math.round((Number.isFinite(parseBRNumber(unitCost)) ? parseBRNumber(unitCost) : 0) * 100) / 100)}
              </div>
            </div>

            <div>
              <label>Data da compra</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "end" }}>
              <button onClick={handleInclude} disabled={saving} style={{ width: "100%" }}>
                {saving ? "Incluindo..." : "INCLUIR"}
              </button>
            </div>
          </div>

          <div style={{ marginTop: 18, padding: 12, border: "1px solid #e5e7eb", borderRadius: 12 }}>
            <strong>Guia de tamanhos</strong>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 10 }}>
              {guide.map((g) => (
                <div key={g.size} style={{ padding: 10, border: "1px solid #e5e7eb", borderRadius: 10 }}>
                  <div><strong>{g.size}</strong> — {g.label}</div>
                  <div style={{ opacity: 0.85 }}>Equivalência: {g.equiv}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 18, padding: 12, border: "1px solid #e5e7eb", borderRadius: 12 }}>
            <strong>Consulta (filtros)</strong>

            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr 1fr 1fr", marginTop: 10 }}>
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
                <label>Compra: de</label>
                <input type="date" value={fPurchaseFrom} onChange={(e) => setFPurchaseFrom(e.target.value)} style={{ width: "100%" }} />
              </div>
              <div>
                <label>Compra: até</label>
                <input type="date" value={fPurchaseTo} onChange={(e) => setFPurchaseTo(e.target.value)} style={{ width: "100%" }} />
              </div>

              <div style={{ display: "flex", alignItems: "end" }}>
                <button onClick={loadEntries} disabled={loadingEntries} style={{ width: "100%" }}>
                  {loadingEntries ? "Consultando..." : "CONSULTAR"}
                </button>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <h2 style={{ marginBottom: 8 }}>Últimas entradas</h2>

            <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={th}>Cadastro</th>
                    <th style={th}>Compra</th>
                    <th style={th}>Tipo</th>
                    <th style={th}>Tamanho</th>
                    <th style={th}>Quantidade</th>
                    <th style={th}>Custo unitário</th>
                    <th style={th}>Custo total</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((r) => {
                    const total = Math.round(r.qty * r.unit_cost * 100) / 100;
                    return (
                      <tr key={r.id}>
                        <td style={td}>{formatDateTimeBR(r.registered_at)}</td>
                        <td style={td}>{formatDateBR(r.purchase_date)}</td>
                        <td style={td}>{r.products.type === "tradicional" ? "Tradicional" : "Baby Look"}</td>
                        <td style={td}>{r.products.size}</td>
                        <td style={td}>{r.qty}</td>
                        <td style={td}>{formatBRL(r.unit_cost)}</td>
                        <td style={td}>{formatBRL(total)}</td>
                      </tr>
                    );
                  })}
                  {!entries.length && (
                    <tr>
                      <td style={td} colSpan={7}>Nenhuma entrada encontrada.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
        </>
      )}
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

function formatDateBR(dateISO: string) {
  const [y, m, d] = dateISO.split("-");
  if (!y || !m || !d) return dateISO;
  return `${d}/${m}/${y}`;
}

function formatDateTimeBR(ts: string) {
  const d = new Date(ts);
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(d);
}
