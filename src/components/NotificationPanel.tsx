import { useEffect, useState } from "react";
import { Bell, BellRing, CheckCheck, X } from "lucide-react";
import { getNotifications, markAllNotificationsRead, markNotificationRead, type Notification } from "../lib/api";

export function NotificationPanel({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getNotifications()
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [open]);

  const unread = items.filter((n) => !n.isRead).length;

  async function read(n: Notification) {
    if (n.isRead) return;
    try {
      await markNotificationRead(n.id);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    } catch { /* ignore */ }
  }

  async function readAll() {
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
    } catch { /* ignore */ }
  }

  if (!open) return null;
  return <aside className="notification-panel">
    <div className="panel-head">
      <h3><Bell size={17} /> Notifikasi</h3>
      <div className="flex items-center gap-1">
        {unread > 0 && <button className="icon-btn" title="Tandai semua dibaca" onClick={readAll}><CheckCheck size={16} /></button>}
        <button className="icon-btn" onClick={onClose}><X size={16} /></button>
      </div>
    </div>
    <div className="notification-list">
      {loading && <div className="empty">Memuat...</div>}
      {!loading && items.length === 0 && <div className="empty"><BellRing size={18} /> Belum ada notifikasi.</div>}
      {!loading && items.slice(0, 20).map((item) => (
        <button key={item.id} className={`notification-item ${!item.isRead ? "unread" : ""}`} onClick={() => read(item)}>
          <strong>{item.title}</strong>
          <span>{item.body}</span>
          <small>{new Date(item.createdAt).toLocaleString("id-ID")}</small>
        </button>
      ))}
    </div>
  </aside>;
}
