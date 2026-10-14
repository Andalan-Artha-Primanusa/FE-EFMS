import { useEffect, useMemo } from "react";
import { CheckCircle, CheckCircle2, Clock, DollarSign, Edit2, FileText, Info, Layers, Plus, Scale, Trash2, X } from "lucide-react";
import { formatIDR, getCustomerOfficialName } from "./helpers";
import { masterRegistry, contractParams, obSplitSOWs } from "./masterRegistry";
import { pendingAmount } from "./modals/PendingVolumeRecordModal";

const fmtBCM = (v: number) => (v || 0).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// Nilai sisa saldo dengan tarif periode asal ledger & porsi split OB dari Master Variable SOW.
const remainingValue = (l: any) => pendingAmount(l.remainingVolume || 0, l.ob1Rate || 0, l.ob2Rate || 0, l.customerCode);

export function PendingVolumeModal({ c }: { c: any }) {
  const {
    pendingVolumeLedgers, showPendingVolumeDrawer, setShowPendingVolumeDrawer, openCreateModal,
    openEditModal, handleDelete
  } = c as Record<string, any>;

  const ledgers: any[] = Array.isArray(pendingVolumeLedgers) ? pendingVolumeLedgers : [];

  // Log penyerapan: alokasi otomatis per invoice carry-over; invoice tanpa angka alokasi = saldo awal migrasi.
  const allocationLog = useMemo(() => ledgers.flatMap((l: any) => {
    const alloc: Record<string, number> = l.allocations || {};
    const invoices: string[] = Array.from(new Set([...(l.settledInvoices || []), ...Object.keys(alloc)]));
    return invoices.map((no) => ({ key: `${l.id}-${no}`, invoiceNo: no, volume: alloc[no], ledger: l }));
  }), [ledgers]);

  useEffect(() => {
    if (!showPendingVolumeDrawer) return;
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowPendingVolumeDrawer(false);
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [showPendingVolumeDrawer, setShowPendingVolumeDrawer]);

  if (!showPendingVolumeDrawer) return null;

  const activeLedgers = ledgers.filter((l: any) => l.remainingVolume > 0);
  const totalRemainingVol = activeLedgers.reduce((s: number, l: any) => s + (l.remainingVolume || 0), 0);
  const totalAbsorbedVol = ledgers.reduce((s: number, l: any) => s + (l.absorbedVolume || 0), 0);
  const totalNominalEst = activeLedgers.reduce((s: number, l: any) => s + remainingValue(l), 0);

  return (
    <div
      onClick={() => setShowPendingVolumeDrawer(false)}
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-slate-200 rounded-[4px] shadow-2xl w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6"
      >

        {/* Modal Header - AAP Brand Ink Header with Bronze Accent */}
        <div className="p-4 sm:p-5 bg-[#1A1612] text-white flex items-center justify-between border-b border-amber-900/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[3px] bg-[#A57C50]/20 border border-[#A57C50]/40 flex items-center justify-center text-[#A57C50]">
              <Scale size={20} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-2">
                <span>Kartu Kontrol Saldo Pending Volume</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-[3px] bg-[#A57C50]/25 text-amber-200 border border-[#A57C50]/40 font-mono uppercase tracking-wider">
                  Carry-Forward OB
                </span>
              </h3>
              <p className="text-[11px] text-amber-100/70 font-medium">
                Monitoring kuota rasio kontrak SOW (Stripping Ratio OB/Coal per customer) & penyerapan volume ke invoice
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowPendingVolumeDrawer(false)}
            className="w-8 h-8 rounded-[3px] bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            title="Tutup Modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto text-xs bg-slate-50/50">
          {/* Top 4 KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-[4px] bg-white border border-amber-300/80 shadow-2xs space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#A57C50] flex items-center gap-1.5">
                <Layers size={13} className="text-[#A57C50]" /> Saldo Pending Aktif
              </span>
              <div className="text-lg sm:text-xl font-black font-mono text-[#1A1612]">
                {fmtBCM(totalRemainingVol)} <span className="text-xs font-sans font-bold text-[#A57C50]">BCM</span>
              </div>
              <p className="text-[10px] text-slate-500">Sisa volume OB belum tertagih</p>
            </div>

            <div className="p-3.5 rounded-[4px] bg-white border border-emerald-200/90 shadow-2xs space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <DollarSign size={13} className="text-emerald-700" /> Estimasi Nilai Tertunda
              </span>
              <div className="text-lg sm:text-xl font-black font-mono text-emerald-950 truncate">
                {formatIDR(totalNominalEst)}
              </div>
              <p className="text-[10px] text-emerald-700">Tarif periode asal × split OB (Master SOW), sebelum RF & over distance</p>
            </div>

            <div className="p-3.5 rounded-[4px] bg-white border border-cyan-200/90 shadow-2xs space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-900 flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-cyan-700" /> Sudah Ditagih
              </span>
              <div className="text-lg sm:text-xl font-black font-mono text-cyan-950">
                {fmtBCM(totalAbsorbedVol)} <span className="text-xs font-sans font-bold text-cyan-700">BCM</span>
              </div>
              <p className="text-[10px] text-cyan-700">Volume terserap invoice carry-over</p>
            </div>

            <div className="p-3.5 rounded-[4px] bg-white border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Clock size={13} className="text-slate-600" /> Ledger Aktif
              </span>
              <div className="text-lg sm:text-xl font-black font-mono text-slate-900">
                {activeLedgers.length} <span className="text-xs font-sans font-bold text-slate-600">Periode</span>
              </div>
              <p className="text-[10px] text-slate-500">Menunggu kuota invoice berikutnya</p>
            </div>
          </div>

          {/* SOW Contract Rules Box */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start gap-2.5">
            <Info size={16} className="text-[#A57C50] shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-extrabold text-[#1A1612] uppercase tracking-wide text-[10.5px]">
                Aturan Rasio Kontrak SOW (Stripping Ratio Rule & Carry-Forward):
              </div>
              <p className="text-slate-700 leading-relaxed text-[11px]">
                Kapasitas penagihan langsung OB dibatasi kuota Stripping Ratio kontrak: <strong>{masterRegistry.customers.filter((cu: any) => contractParams(cu.code).maxStrippingRatio > 0).map((cu: any) => `${cu.code} ${contractParams(cu.code).maxStrippingRatio} : 1`).join(", ") || "belum ada customer dengan kuota SR"}</strong>. Volume survei OB yang melebihi kuota dicatat otomatis sebagai saldo pending saat BA ditagih, dengan tarif periode asalnya. <strong>Saat invoice berikutnya masih punya sisa kuota, saldo pending diserap otomatis (periode asal terlama lebih dulu)</strong> sebagai baris Carryover dan ledger dipotong; menghapus invoice draft mengembalikan saldonya.
              </p>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="space-y-2.5 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#1A1612] flex items-center gap-1.5">
                <FileText size={14} className="text-[#A57C50]" /> Rincian Buku Besar Pending Volume (Carry-Forward OB)
              </h4>
              <button
                type="button"
                onClick={() => {
                  setShowPendingVolumeDrawer(false);
                  openCreateModal("pending_volume");
                }}
                className="px-3 py-1.5 rounded-lg bg-[#A57C50] hover:bg-[#8C6740] text-white font-bold text-xs flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
              >
                <Plus size={13} /> Catat Pending Volume Baru
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#FBF6F0] text-[#1A1612] font-extrabold uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 px-3 whitespace-nowrap">Customer / Project</th>
                    <th className="p-2.5 px-3 text-center whitespace-nowrap">Periode Asal</th>
                    <th className="p-2.5 px-3 whitespace-nowrap">Ref. No BA</th>
                    <th className="p-2.5 px-3 text-right whitespace-nowrap">Volume Awal</th>
                    <th className="p-2.5 px-3 text-right whitespace-nowrap">Terserap</th>
                    <th className="p-2.5 px-3 text-right whitespace-nowrap">Sisa Saldo</th>
                    <th className="p-2.5 px-3 text-right whitespace-nowrap">Tarif Asal SOW</th>
                    <th className="p-2.5 px-3 text-right whitespace-nowrap">Estimasi Nominal (Rp)</th>
                    <th className="p-2.5 px-3 text-center whitespace-nowrap">Status</th>
                    <th className="p-2.5 px-3 text-center whitespace-nowrap">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {ledgers.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-6 text-center text-slate-400 italic">
                        Belum ada entri pending volume yang tercatat.
                      </td>
                    </tr>
                  ) : (
                    ledgers.map((item: any, idx: number) => {
                      const isSettled = item.remainingVolume <= 0 || item.status === "Settled";
                      const isPartially = item.absorbedVolume > 0 && item.remainingVolume > 0;
                      const [sow1, sow2] = obSplitSOWs(item.customerCode);

                      return (
                        <tr key={item.id || idx} className={`hover:bg-amber-50/30 transition ${isSettled ? "bg-slate-50/50 opacity-70" : ""}`}>
                          <td className="p-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-950 font-mono font-black text-[10px]">
                                {item.customerCode}
                              </span>
                              <span>{getCustomerOfficialName(item.customerCode)}</span>
                            </div>
                          </td>
                          <td className="p-2.5 px-3 text-center font-mono font-bold text-slate-800 whitespace-nowrap">
                            <span className="px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200 text-[11px]">
                              {item.sourcePeriod}
                            </span>
                          </td>
                          <td className="p-2.5 px-3 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                            {item.sourceBaRef || "-"}
                          </td>
                          <td className="p-2.5 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                            {fmtBCM(item.originalOBVolume)} <span className="text-[10px] text-slate-500 font-sans">BCM</span>
                          </td>
                          <td className="p-2.5 px-3 text-right font-mono font-bold text-cyan-800 whitespace-nowrap">
                            {fmtBCM(item.absorbedVolume)} <span className="text-[10px] text-cyan-700 font-sans font-normal">BCM</span>
                          </td>
                          <td className="p-2.5 px-3 text-right font-mono font-black text-[#1A1612] whitespace-nowrap">
                            <span className={item.remainingVolume > 0 ? "px-2 py-0.5 rounded bg-amber-50 border border-amber-300/80 inline-block" : ""}>
                              {fmtBCM(item.remainingVolume)} <span className="text-[10px] text-amber-800 font-sans font-bold">BCM</span>
                            </span>
                          </td>
                          <td className="p-2.5 px-3 text-right font-mono text-[11px] text-slate-600 whitespace-nowrap">
                            <div>{Number(sow1?.splitPercentage || 0)}%: Rp {(item.ob1Rate || 0).toLocaleString("id-ID")}</div>
                            <div className="text-[10px] text-slate-400">{Number(sow2?.splitPercentage || 0)}%: Rp {(item.ob2Rate || 0).toLocaleString("id-ID")}</div>
                          </td>
                          <td className="p-2.5 px-3 text-right font-mono font-black text-emerald-800 whitespace-nowrap">
                            {formatIDR(remainingValue(item))}
                          </td>
                          <td className="p-2.5 px-3 text-center whitespace-nowrap">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider border whitespace-nowrap ${
                              isSettled
                                ? "bg-slate-100 text-slate-700 border-slate-300"
                                : isPartially
                                ? "bg-amber-100 text-amber-900 border-amber-300"
                                : "bg-emerald-50 text-emerald-800 border-emerald-300"
                            }`}>
                              {item.status || (isSettled ? "Settled" : "Active")}
                            </span>
                          </td>
                          <td className="p-2.5 px-3 text-center whitespace-nowrap">
                            <div className="inline-flex items-center justify-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowPendingVolumeDrawer(false);
                                  if (typeof openEditModal === "function") openEditModal("pending_volume", item);
                                }}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-md text-[11px] transition cursor-pointer"
                                title="Edit Catatan Pending Volume"
                              >
                                <Edit2 size={13} />
                              </button>
                              {!(item.absorbedVolume > 0) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (typeof handleDelete === "function") handleDelete("pending_volume", item.id);
                                  }}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-md text-[11px] transition cursor-pointer"
                                  title="Hapus Catatan Pending Volume"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Riwayat penyerapan carry-over ke invoice */}
          <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2">
            <div className="font-extrabold uppercase tracking-wider text-slate-700 text-[10px] flex items-center gap-1.5">
              <CheckCircle size={13} className="text-emerald-700" /> Riwayat Penyerapan Carry-Forward ke Invoice:
            </div>
            {allocationLog.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic">Belum ada invoice yang menyerap saldo pending.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 font-mono text-[11px]">
                {allocationLog.map((a) => (
                  <div key={a.key} className="p-2.5 bg-slate-50/70 rounded-lg border border-slate-200 flex justify-between items-center gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block">Invoice #{a.invoiceNo}</span>
                      <strong className="text-slate-800">
                        {a.ledger.customerCode} {a.ledger.sourcePeriod}: {a.volume ? `${fmtBCM(a.volume)} BCM` : "saldo awal migrasi"}
                      </strong>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full shrink-0">Ditagih</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-white border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={() => setShowPendingVolumeDrawer(false)}
            className="px-5 py-2 bg-[#1A1612] hover:bg-black text-white font-bold rounded-lg transition text-xs shadow-xs cursor-pointer"
          >
            Tutup Kartu Kontrol
          </button>
        </div>

      </div>
    </div>
  );
}
