export type NotificationEvent =
  | "created"
  | "confirmed"
  | "cancelled"
  | "rescheduled"
  | "reminder";

export type TemplateRow = { label: string; value: string };

export function appointmentEmailHtml({
  businessName,
  headline,
  intro,
  rows,
  footer,
  accent = "#0F766E",
}: {
  businessName: string;
  headline: string;
  intro: string;
  rows: TemplateRow[];
  footer?: string;
  accent?: string;
}) {
  const rowsHtml = rows
    .map(
      (row) => `
      <tr>
        <td style="padding:8px 0;color:#64748b;font-size:14px;vertical-align:top;width:140px">${row.label}</td>
        <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600">${row.value}</td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="es">
  <body style="margin:0;background:#f1f5f9;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:24px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
      <tr><td style="height:6px;background:${accent}"></td></tr>
      <tr>
        <td style="padding:28px 32px 8px">
          <p style="margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${accent};font-weight:700">${businessName}</p>
          <h1 style="margin:8px 0 4px;font-size:24px;line-height:1.3;color:#0f172a">${headline}</h1>
          <p style="margin:0;color:#475569;font-size:14px;line-height:1.6">${intro}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 32px 8px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowsHtml}</table>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 32px 28px">
          <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6">${footer ?? "Este mensaje fue enviado automáticamente por AgendaPro."}</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
