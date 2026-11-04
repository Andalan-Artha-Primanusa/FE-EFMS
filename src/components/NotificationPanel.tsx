import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, BellRing, CheckCheck, X } from "lucide-react";
import { api, getNotifications, markAllNotificationsRead, markNotificationRead, type Notification } from "../lib/api";
import { viewPath } from "../data/navigation";
import type { TPORequest } from "../pages/tunai-po/types";

// Halaman tujuan per jenis dokumen notifikasi (refType dari backend).
const refView: Record<string, string> = {
  ba: "Berita Acara (BA) Tracker",
  ba_pending: "Berita Acara (BA) Tracker",
  invoice: "Invoice Management",
  voucher: "Voucher Payment",
  vendor_bank: "Master Vendor"
};

// Tunai PO mengikuti status terkini: tugas voucher (modul payment) ke Voucher Payment, selain itu detailnya dibuka via ?open=id.
export async function notificationPath(n: Notification): Promise<string | undefined> {
  // vendor_bank dari modul tunai_po diverifikasi di detail Tunai PO, bukan Master Vendor.
  if (n.refType === "vendor_bank" && n.module === "tunai_po") return viewPath("Pengajuan Tunai PO");
  if (n.refType === "tunai_po") {
    const r = await api<{ request: TPORequest }>(`/api/tunai-po/requests/${n.refId}`).then((x) => x.request).catch(() => null);
    if (n.module === "payment") return viewPath("Voucher Payment") + (r?.status === "verified" ? `?create=${r.kind}` : "");
    if (!r) return viewPath("Pengajuan Tunai PO");
    const view = r.status === "paid" || r.status === "posted" ? "Tracking Tunai PO" : r.kind === "FUEL" ? "Fuel" : "Pengajuan Tunai PO";
    return `${viewPath(view)}?open=${r.id}`;
  }
  const view = refView[n.refType ?? ""];
  return view && viewPath(view);
}

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
    const path = await notificationPath(n);
    if (path) {
      navigate(path);
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
