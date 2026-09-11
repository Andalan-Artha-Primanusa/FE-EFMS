import { useState, useEffect } from "react";
import { StickyNote, X, Save, Loader2 } from "lucide-react";
import { api } from "../../../lib/api";

interface BANotesUpdateModalProps {
  isOpen: boolean;
  baItem: any | null;
  onClose: () => void;
  onSuccess: (updatedBA: any) => void;
  onNotice: (msg: string) => void;
}

export function BANotesUpdateModal({
  isOpen,
  baItem,
  onClose,
  onSuccess,
  onNotice,
}: BANotesUpdateModalProps) {
  const [noteText, setNoteText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (baItem) {
      setNoteText(baItem.notes || "");
    } else {
      setNoteText("");
    }
  }, [baItem, isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !baItem) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    onNotice("Menyimpan catatan...");

    try {
      const payload = {
        notes: noteText.trim(),
        notesBottleneck: baItem.notesBottleneck || "",
      };

      const updated = await api<any>(`/api/finance/ba-trackers/${baItem.id}/notes`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }).catch(async () => {
        // Fallback to PUT /api/finance/ba-trackers/:id
        return await api<any>(`/api/finance/ba-trackers/${baItem.id}`, {
          method: "PUT",
          body: JSON.stringify({
            ...baItem,
            notes: noteText.trim(),
          }),
        });
      });

      onNotice("Catatan Berita Acara berhasil diperbarui");
      onSuccess(updated || { ...baItem, ...payload });
      onClose();
    } catch (err: any) {
      onNotice(err?.message || "Gagal memperbarui catatan");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-slate-200 rounded-[4px] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6"
      >
        {/* Modal Header - AAP Brand Ink Header with Bronze Accent */}
        <div className="p-4 sm:p-4.5 bg-[#1A1612] text-white flex items-center justify-between border-b border-amber-900/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[3px] bg-[#A57C50]/20 border border-[#A57C50]/40 flex items-center justify-center text-[#A57C50]">
              <StickyNote size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight text-white flex items-center gap-2">
                <span>Catatan / Keterangan Berita Acara</span>
              </h3>
              <p className="text-[11px] text-amber-100/70 font-medium font-mono">
                {baItem.baNumber || baItem.draftBARefNo || `BA #${baItem.id}`} • {baItem.customerCode} ({baItem.workPeriod})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-[3px] bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            title="Tutup Modal"
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Body */}
        <form
          onSubmit={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
              if ((e.target as HTMLElement).tagName?.toLowerCase() === "textarea") {
                return; // allow normal multiline enter
              }
              e.preventDefault();
            }
          }}
          className="p-5 space-y-4 text-xs bg-slate-50/50"
        >
          <div>
            <label className="block text-[11px] font-extrabold uppercase text-[#1A1612] mb-1.5 tracking-wide">
              Catatan / Keterangan Progres
            </label>
            <textarea
              rows={4}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
                  e.stopPropagation();
                }
              }}
              placeholder="Masukkan catatan atau keterangan Berita Acara..."
              className="w-full bg-white border border-slate-300 text-xs p-3 rounded-[3px] outline-none focus:border-[#A57C50] focus:ring-1 focus:ring-[#A57C50]/30 transition text-slate-800 placeholder-slate-400 font-normal resize-y min-h-[90px]"
              autoFocus
            />
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 text-xs rounded-[3px] transition cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-[#A57C50] hover:bg-[#8e6941] text-white font-extrabold text-xs rounded-[3px] shadow-2xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              <span>{isSaving ? "Menyimpan..." : "Simpan Catatan"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
