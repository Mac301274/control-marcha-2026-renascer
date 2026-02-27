import "./globals.css";

export const metadata = {
  title: "CONTROL MARCHA 2026 - RENASCER",
  description: "Controle online de estoque e vendas de camisas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
