export type StatusTone = "ok" | "wait" | "bad" | "info" | "neutral";

const OK = ["approved", "available", "paid", "posted", "active", "completed", "verified", "closed", "received", "matched", "success"];
const WAIT = ["warning", "waiting approval", "submitted", "draft", "pending", "in review", "on hold", "revision", "processing"];
const BAD = ["rejected", "blocked", "overdue", "void", "cancelled", "canceled", "failed", "inactive", "expired"];
const INFO = ["open", "in progress", "scheduled", "new"];

export function statusTone(status: string): StatusTone {
  const norm = (status ?? "").toLowerCase().trim();
  if (OK.includes(norm)) return "ok";
  if (WAIT.includes(norm)) return "wait";
  if (BAD.includes(norm)) return "bad";
  if (INFO.includes(norm)) return "info";
  return "neutral";
}

export const STATUS_CONFIG: Record<string, { tone: StatusTone; label: string }> = new Proxy({} as Record<string, { tone: StatusTone; label: string }>, {
  get(_t, key: string) {
    return { tone: statusTone(key), label: key ? key.toUpperCase() : "" };
  }
});

export function StatusBadge({ status, title }: { status?: string | null; title?: string }) {
  if (!status) return null;
  const tone = statusTone(status);
  return (
    <span className={`badge ${tone === "neutral" ? "" : tone}`} title={title ?? status}>
      {status.toUpperCase()}
    </span>
  );
}
