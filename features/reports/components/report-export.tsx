"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { statusLabel } from "@/components/shared/status-badge";
import type { ReportRow } from "@/features/reports/types";

function escapeCsv(value: string | number) {
  const text = String(value ?? "");
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function ReportExportButton({
  rows,
  from,
  to,
  currency,
}: {
  rows: ReportRow[];
  from: string;
  to: string;
  currency: string;
}) {
  function downloadCsv() {
    const header = [
      "Fecha",
      "Inicio",
      "Fin",
      "Estado",
      "Cliente",
      "Servicio",
      "Profesional",
      `Precio (${currency})`,
      "Origen",
    ];
    const lines = [
      header,
      ...rows.map((row) => [
        row.date,
        row.start,
        row.end,
        statusLabel(row.status),
        row.client,
        row.service,
        row.employee,
        row.price.toFixed(2),
        row.source,
      ]),
    ].map((columns) => columns.map(escapeCsv).join(";"));

    // BOM para que Excel interprete UTF-8 correctamente.
    const blob = new Blob([`\uFEFF${lines.join("\r\n")}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reporte-${from}-a-${to}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success(`Reporte de ${rows.length} citas exportado.`);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={downloadCsv}
      disabled={rows.length === 0}
    >
      <Download className="size-4" /> Exportar CSV
    </Button>
  );
}
