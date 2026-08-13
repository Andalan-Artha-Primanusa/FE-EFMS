import { Bell, X } from "lucide-react";
import type { AuditLog } from "../lib/api";
import { humanize } from "../lib/format";

export function NotificationPanel({
  items,
  open,
  onClose
}: {
  items: AuditLog[];
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return <aside className="notification-panel">
    <div className="panel-head">
      <h3><Bell size={17} /> Notifikasi proses</h3>
      <button className="icon-btn" onClick={onClose}><X size={16} /></button>
    </div>
    <div className="notification-list">
      {items.slice(0, 12).map((item) => <button key={item.id} className="notification-item">
        <strong>{humanize(item.action)} {item.module}</strong>
        <span>{item.user || "System"} menjalankan proses #{item.referenceId}</span>
        <small>{new Date(item.createdAt).toLocaleString("id-ID")}</small>
      </button>)}
      {!items.length && <div className="empty">Belum ada notifikasi proses dari audit log.</div>}
    </div>
  </aside>;
}
