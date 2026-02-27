"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) window.location.href = "/venda";
      else window.location.href = "/login";
    })();
  }, []);

  return null;
}
