export function downloadIcs(reminder: string) {
  const [h = "07", m = "00"] = reminder.split(":");
  const now = new Date();
  const d = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(now).replace(/-/g, "");
  const start = `${d}T${h.padStart(2, "0")}${m.padStart(2, "0")}00`;
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const url = window.location.origin;
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Fita//Lembrete//PT-BR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VTIMEZONE", "TZID:America/Sao_Paulo", "BEGIN:STANDARD", "DTSTART:19700101T000000",
    "TZOFFSETFROM:-0300", "TZOFFSETTO:-0300", "TZNAME:-03", "END:STANDARD", "END:VTIMEZONE",
    "BEGIN:VEVENT", `UID:fita-lembrete-${stamp}@fita`, `DTSTAMP:${stamp}`,
    `DTSTART;TZID=America/Sao_Paulo:${start}`, "DURATION:PT15M", "RRULE:FREQ=DAILY",
    "SUMMARY:Leitura da Bíblia (Fita)", `DESCRIPTION:Hora da sua leitura de hoje. Abra o Fita: ${url}`, `URL:${url}`,
    "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Leitura da Bíblia (Fita)", "TRIGGER:PT0M", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ];
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "fita-lembrete.ics";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
