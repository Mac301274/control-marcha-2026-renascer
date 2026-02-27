function escapeCSV(value: unknown): string {
  const s = String(value ?? "");
  const needsQuotes = /[;\n"]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

export function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const sep = ";";

  const csv =
    headers.map(escapeCSV).join(sep) +
    "\n" +
    rows.map((r) => headers.map((h) => escapeCSV(r[h])).join(sep)).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();

  URL.revokeObjectURL(url);
}
