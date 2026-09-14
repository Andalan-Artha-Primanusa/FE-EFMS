import { useCallback, useEffect, useState } from "react";
import { Bell, BellRing, CheckCheck, MailOpen, RefreshCw } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { getNotifications, markAllNotificationsRead, markNotificationRead, type Notification } from "../lib/api";

export function NotificationCenterPage({ onNotice }: { onNotice?: (m: string) => void }) {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNotifications(unreadOnly);
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [unreadOnly]);

  useEffect(() => { load(); }, [load]);

  const unread = items.filter((n) => !n.isRead).length;

  async function read(n: Notification) {
    if (n.isRead) return;
    try {
      await markNotificationRead(n.id);
      await load();
    } catch { /* ignore */ }
  }

  async function readAll() {
    try {
      await markAllNotificationsRead();
      onNotice?.("Semua notifikasi ditandai sudah dibaca.");
      await load();
    } catch (err: any) {
      onNotice?.(err?.message || "Gagal menandai semua sebagai dibaca.");
    }
  }

  return (
    <section className="space-y-4">
      <PageHeader
        title="Notification Center"
        description="Pusat notifikasi sistem: pengajuan budget, persetujuan, dan event penting lainnya."
        meta={
          <div className="flex items-center gap-2 flex-wrap">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />
              Hanya belum dibaca
            </label>
            <button className="ghost" onClick={() => load()}><RefreshCw size={14} /> Muat Ulang</button>
            <button className="primary" onClick={readAll} disabled={unread === 0}><CheckCheck size={14} /> Tandai Semua Dibaca</button>
          </div>
        }
      />

      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 px-1">
        <Bell size={15} /> {items.length} notifikasi {unreadOnly ? "(belum dibaca)" : ""} • {unread} belum dibaca
      </div>

      {loading ? (
        <div className="rounded-[4px] border border-slate-200 bg-white p-8 text-center text-xs text-slate-400">Memuat...</div>
      ) : items.length === 0 ? (
        <div className="rounded-[4px] border border-slate-200 bg-white p-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
          <BellRing size={24} className="text-slate-300" />
          Tidak ada notifikasi.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => read(n)}
              className={`w-full text-left rounded-[4px] border p-4 transition flex gap-3 ${n.isRead ? "border-slate-200 bg-white" : "border-[#A57C50] bg-amber-50/50 hover:bg-amber-100/50"}`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${n.isRead ? "bg-slate-100 text-slate-400" : "bg-[#20a6b8] text-white"}`}>
                {n.isRead ? <MailOpen size={16} /> : <Bell size={16} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className={`text-sm ${n.isRead ? "text-slate-700" : "text-slate-900 font-extrabold"}`}>{n.title}</h3>
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">{new Date(n.createdAt).toLocaleString("id-ID")}</span>
                </div>
                <p className="text-xs text-slate-600 mt-1">{n.body}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {n.module && <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold uppercase">{n.module}</span>}
                  {!n.isRead && <span className="inline-flex px-2 py-0.5 rounded-full bg-[#20a6b8] text-white text-[10px] font-bold">Baru</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
