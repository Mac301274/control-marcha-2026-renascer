"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPinPage() {
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase sets session from the recovery link automatically in many cases.
  }, []);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!/^\d{4}$/.test(pin)) return setMsg("O novo PIN deve ter 4 dígitos.");

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pin });
    setLoading(false);

    if (error) setMsg("Não foi possível atualizar o PIN.");
    else {
      setMsg("✅ PIN atualizado. Você será redirecionado para o login.");
      setTimeout(() => (window.location.href = "/login"), 1200);
    }
  }

  return (
    <div style={{ maxWidth: 460, margin: "48px auto", padding: 18 }}>
      <h1>Redefinir PIN</h1>
      <form onSubmit={handleUpdate} style={{ display: "grid", gap: 10 }}>
        <div>
          <label>Novo PIN (4 dígitos)</label>
          <input value={pin} onChange={(e) => setPin(e.target.value)} inputMode="numeric" maxLength={4} />
        </div>
        <button disabled={loading} type="submit">
          {loading ? "Salvando..." : "Salvar"}
        </button>
      </form>
      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </div>
  );
}
