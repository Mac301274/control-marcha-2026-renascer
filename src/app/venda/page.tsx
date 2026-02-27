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

type StockRow = {
  product_id: string;
  qty_balance: number;
};

const SIZES: Product["size"][] = ["PP","P","M","G","GG","XG","XGG","G1","G2","G3","G4"];
const TYPES: Product["type"][] = ["tradicional","baby_look"];
const PAYMENTS = ["pix","dinheiro","cartao"] as const;

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function VendaPage() {
  return (
    <RequireAuth>
      <AppShell>
        <VendaInner />
      </AppShell>
    </RequireAuth>
  );
}

function VendaInner() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [customerName, setCustomerName] = useState("");
  const [type, setType] = useState<Product["type"]>("tradicional");
  const [size, setSize] = useState<Product["size"]>("M");
  const [qty, setQty] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<string>("0");
  const [saleDate, setSaleDate] = useState<string>(todayISO());
  const [payment, setPayment] = useState<(typeof PAYMENTS)[number]>("pix");

  const [stockBalance, setStockBalance] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedProduct = useMemo(() => {
    return products.find((p) => p.type === type && p.size === size) ?? null;
  }, [products, type, size]);

  const unitPriceNum = useMemo(() => {
    const n = parseBRNumber(unitPrice);
    return Number.isFinite(n) ? n : 0;
  }, [unitPrice]);

  const total = useMemo(() => {
    return Math.round(qty * unitPriceNum * 100) / 100;
  }, [qty, unitPriceNum]);

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

  useEffect(() => {
    (async () => {
      setMsg(null);
      setStockBalance(null);

      if (!selectedProduct) return;

      const { data, error } = await supabase
        .from("v_stock_current")
        .select("product_id, qty_balance")
        .eq("product_id", selectedProduct.id)
        .maybeSingle();

      if (error) {
        setMsg("Erro ao consultar saldo do estoque.");
        return;
      }

      const row = data as StockRow | null;
      setStockBalance(row?.qty_balance ?? 0);
    })();
  }, [selectedProduct]);

  async function handleSave() {
    setMsg(null);

    if (!customerName.trim()) return setMsg("Informe o nome do cliente.");
    if (!selectedProduct) return setMsg("Produto (tipo/tamanho) não encontrado.");

    if (!/^\d+$/.test(String(qty)) || qty < 1 || qty > 400) {
      return setMsg("Quantidade deve ser entre 1 e 400.");
    }

    const price = parseBRNumber(unitPrice);
    if (!Number.isFinite(price) || price < 0) return setMsg("Valor unitário inválido.");

    if (stockBalance !== null && stockBalance < qty) {
      return setMsg(`Estoque insuficiente. Saldo disponível: ${stockBalance}`);
    }

    setSaving(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      setSaving(false);
      window.location.href = "/login";
      return;
    }

    const { error } = await supabase.from("sales").insert({
      customer_name: customerName.trim(),
      product_id: selectedProduct.id,
      qty,
      unit_price: Math.round(price * 100) / 100,
      total_price: total,
      sale_date: saleDate,
      payment_method: payment,
      created_by: userId,
      status: "active",
    });

    setSaving(false);

    if (error) {
      setMsg(error.message ?? "Erro ao registrar venda.");
      return;
    }

    setMsg("✅ Venda registrada com sucesso!");
    setCustomerName("");
    setQty(1);
    setUnitPrice("0");

    const { data, error: e2 } = await supabase
      .from("v_stock_current")
      .select("product_id, qty_balance")
      .eq("product_id", selectedProduct.id)
      .maybeSingle();

    if (!e2) setStockBalance((data as StockRow | null)?.qty_balance ?? 0);
  }

  return (
    <div style={{ maxWidth: 980 }}>
      <h1>Venda</h1>

      {loadingProducts ? (
        <p>Carregando…</p>
      ) : (
        <>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label>Cliente</label>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nome do cliente"
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label>Tipo</label>
              <select value={type} onChange={(e) => setType(e.target.value as any)} style={{ width: "100%" }}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t === "tradicional" ? "Tradicional" : "Baby Look"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Tamanho</label>
              <select value={size} onChange={(e) => setSize(e.target.value as any)} style={{ width: "100%" }}>
                {SIZES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label>Quantidade</label>
              <select value={qty} onChange={(e) => setQty(Number(e.target.value))} style={{ width: "100%" }}>
                {Array.from({ length: 400 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            <div>
              <label>Valor unitário</label>
              <input
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                inputMode="decimal"
                placeholder="Ex: 35,00"
                style={{ width: "100%" }}
              />
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                {formatBRL(Math.round(unitPriceNum * 100) / 100)}
              </div>
            </div>

            <div>
              <label>Total (auto)</label>
              <input value={formatBRL(total)} readOnly style={{ width: "100%" }} />
            </div>

            <div>
              <label>Data da venda</label>
              <input value={saleDate} onChange={(e) => setSaleDate(e.target.value)} type="date" style={{ width: "100%" }} />
            </div>

            <div>
              <label>Pagamento</label>
              <select value={payment} onChange={(e) => setPayment(e.target.value as any)} style={{ width: "100%" }}>
                <option value="pix">Pix</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="cartao">Cartão</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <strong>Saldo disponível:</strong>{" "}
            {selectedProduct ? (stockBalance ?? "…") : "Selecione tipo/tamanho"}
            {selectedProduct?.size_label || selectedProduct?.size_equiv ? (
              <span style={{ opacity: 0.8 }}>
                {" "}— {selectedProduct.size_label ?? ""} {selectedProduct.size_equiv ? `(${selectedProduct.size_equiv})` : ""}
              </span>
            ) : null}
          </div>

          <button onClick={handleSave} disabled={saving} style={{ marginTop: 16 }}>
            {saving ? "Registrando..." : "REGISTRAR VENDA"}
          </button>

          {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
        </>
      )}
    </div>
  );
}
