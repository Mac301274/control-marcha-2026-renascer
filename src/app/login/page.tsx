"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    if (!/^\d{4}$/.test(pin)) {
      setLoading(false);
      setMsg("O PIN deve ter 4 dígitos numéricos.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pin,
    });

    setLoading(false);
    if (error) setMsg("Falha no login. Verifique e-mail e PIN.");
    else window.location.href = "/venda";
  }

  async function handleForgot() {
    setMsg(null);
    if (!email) return setMsg("Informe seu e-mail para recuperar o PIN.");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-pin`,
    });

    if (error) setMsg("Não foi possível enviar o e-mail de recuperação.");
    else setMsg("Enviei um e-mail para você redefinir o PIN.");
  }

  return (
    <div style={{ maxWidth: 460, margin: "48px auto", padding: 18 }}>
      <h1>CONTROL MARCHA 2026 - RENASCER</h1>

      <form onSubmit={handleLogin} style={{ display: "grid", gap: 10 }}>
        <div>
          <label>E-mail</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seuemail@..." />
        </div>

        <div>
          <label>PIN (4 dígitos)</label>
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            inputMode="numeric"
            maxLength={4}
            placeholder="0000"
          />
        </div>

        <button disabled={loading} type="submit">
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <button onClick={handleForgot} style={{ marginTop: 12, width: "100%", background: "#0f172a" }}>
        Esqueci meu PIN
      </button>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}

      <p style={{ marginTop: 14, fontSize: 12, opacity: 0.75 }}>
        Acesso apenas para usuários cadastrados pelo Admin.
      </p>
    </div>
  );
}
