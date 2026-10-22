import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, BellRing, CheckCheck, X } from "lucide-react";
import { getNotifications, markAllNotificationsRead, markNotificationRead, type Notification } from "../lib/api";
import { viewPath } from "../data/navigation";

// Halaman tujuan per jenis dokumen notifikasi (refType dari backend).
const refView: Record<string, string> = {
  ba: "Berita Acara (BA) Tracker",
  invoice: "Invoice Management",
  tunai_po: "Tracking Tunai PO",
  voucher: "Voucher Payment",
  vendor_bank: "Master Vendor"
};

// vendor_bank dari modul tunai_po diverifikasi di detail Tunai PO, bukan Master Vendor.
export const notificationView = (n: Notification): string | undefined =>
  n.refType === "vendor_bank" && n.module === "tunai_po" ? "Tracking Tunai PO" : refView[n.refType ?? ""];

export function NotificationPanel({
  open,
  onClose,
  onChange
}: {
  open: boolean;
  onClose: () => void;
  onChange?: () => void;
}) {
  const navigate = useNavigate();
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
    const view = notificationView(n);
    if (view) {
      navigate(viewPath(view));
      onClose();
    }
    if (n.isRead) return;
    try {
      await markNotificationRead(n.id);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      onChange?.();
    } catch { /* ignore */ }
  }

  async function readAll() {
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
      onChange?.();
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
          {item.body && <span>{item.body}</span>}
          <small>{new Date(item.createdAt).toLocaleString("id-ID")}</small>
        </button>
      ))}
    </div>
  </aside>;
}
