// AuditTimeline — Shared approval flow visualization & activity log
// Source: extracted from FinancePage.tsx L441–L688

import { formatIDR } from "../../../utils/finance/formatters";
import { CheckCircle2, Clock, AlertCircle, Eye, Edit2, Upload, Zap } from "lucide-react";

const formatDateDisplay = (val: any): string => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

// ── Timeline Step Data Generators ─────────────────────────────────────────

export function generateAuditTimeline(type: string, item: any): any[] {
  if (type === "ba") {
    const isVerified = Boolean(item.verifiedBy || ["Verified", "Ready to Invoice", "Approved"].includes(item.statusBA));
    const isReadyToInvoice = Boolean(item.statusBA === "Ready to Invoice" || item.statusBA === "Approved" || item.verifiedBy);
    const isRejected = item.statusBA === "Revisi" || item.statusBA === "Rejected";

    return [
      {
        step: 1, title: "BA Dibuat (Site Entri)",
        user: item.picAAP || "Admin Finance Site", role: "Finance Site",
        time: item.createdAt ? formatDateDisplay(item.createdAt) : item.workEndDate ? formatDateDisplay(item.workEndDate) : "31/01/2026",
        status: "completed",
        desc: `Draft Berita Acara #${item.baNumber || item.draftBARefNo || "Draft"} dibuat oleh Finance Site. Jurnal Tahap 1 (Pengakuan Pendapatan Belum Ditagih) diposting otomatis.`
      },
      {
        step: 2, title: "Verifikasi Finance Specialist",
        user: item.verifiedBy ? item.verifiedBy : (isVerified ? "Finance Specialist (Verified)" : "Belum Diverifikasi"),
        role: "Finance Specialist",
        time: item.verifiedAt ? formatDateDisplay(item.verifiedAt) : (isVerified ? "Terverifikasi" : "Menunggu Specialist"),
        status: isVerified ? "completed" : (isRejected ? "rejected" : "pending"),
        desc: item.verifiedBy
          ? `Volume & nilai klaim BA disahkan oleh: ${item.verifiedBy}. Jurnal Tahap 2 diposting. Status: Siap Terbit Invoice.`
          : (isVerified ? "Pemeriksaan fisik & data BA telah disahkan oleh Finance Specialist." : "Menunggu verifikasi & pengesahan nilai klaim oleh Finance Specialist.")
      },
      {
        step: 3, title: "Penerbitan Invoice",
        user: item.invoiceNoLinked ? "Finance Site" : "Menunggu Pembuatan",
        role: "Finance Site",
        time: item.invoiceIssuedDate ? formatDateDisplay(item.invoiceIssuedDate) : "Belum Dibuat",
        status: item.invoiceNoLinked ? "completed" : (isReadyToInvoice ? "pending" : "pending"),
        desc: item.invoiceNoLinked ? `Draft Invoice #${item.invoiceNoLinked} berhasil dibuat dari BA ini.` : "Siap dibuatkan Form Invoice oleh Finance Site."
      },
      {
        step: 4, title: "Approval FATB Manager & Jurnal AR",
        user: "FATB Manager", role: "FATB Manager",
        time: "Pada Dokumen Invoice",
        status: item.invoiceNoLinked ? "pending" : "pending",
        desc: "Approval penagihan invoice resmi dan posting Jurnal Tahap 3 (Piutang Usaha AR) dilakukan di level Invoice Master oleh FATB Manager."
      }
    ];
  }

  if (type === "invoice") {
    const isVerified = Boolean(item.verifiedBy || ["Verified", "Approved_Tier1", "Issued", "Paid"].includes(item.status));
    const isTier1 = Boolean(item.approvedManagerBy || ["Approved_Tier1", "Issued", "Paid"].includes(item.status));
    const isTier2 = Boolean(item.approvedDirectorBy || ["Issued", "Paid"].includes(item.status));
    const isRejected = item.status === "Rejected";

    return [
      {
        step: 1, title: "Invoice Diterbitkan (Draft)",
        user: item.createdBy || "Admin Finance Site / HO", role: "Admin Finance",
        time: item.createdAt ? formatDateDisplay(item.createdAt) : formatDateDisplay(item.invoiceDate),
        status: "completed",
        desc: `Master Invoice ${item.invoiceNo} dibuat berdasarkan BA Ref: ${item.baNoReference || "-"}.`
      },
      {
        step: 2, title: "Verifikasi SPV Site",
        user: item.verifiedBy ? item.verifiedBy : (isVerified ? "SPV Verifikator (Verified)" : "Belum Diverifikasi"),
        role: "SPV Verifikator",
        time: item.verifiedAt ? formatDateDisplay(item.verifiedAt) : (isVerified ? "Terverifikasi" : "Menunggu SPV"),
        status: isVerified ? "completed" : (isRejected ? "rejected" : "pending"),
        desc: item.verifiedBy
          ? `Rincian Invoice & kesesuaian BA diverifikasi oleh: ${item.verifiedBy}.`
          : (isVerified ? "Verifikasi rincian volume & nilai invoice disetujui SPV." : "Menunggu verifikasi rincian invoice oleh SPV Site.")
      },
      {
        step: 3, title: "Approval Tier 1 (Manager)",
        user: item.approvedManagerBy ? item.approvedManagerBy : (isTier1 ? "Finance Manager (Approved T1)" : "Belum Disetujui"),
        role: "Manager",
        time: item.approvedManagerAt ? formatDateDisplay(item.approvedManagerAt) : (isTier1 ? "Disetujui T1" : "Menunggu Manager"),
        status: isTier1 ? "completed" : (isRejected ? "rejected" : "pending"),
        desc: item.approvedManagerBy
          ? `Persetujuan Tier 1 diberikan oleh: ${item.approvedManagerBy}.`
          : (isTier1 ? "Approval Tier 1 Manager selesai." : "Menunggu persetujuan utama (Tier 1) Finance Manager.")
      },
      {
        step: 4, title: "Approval Tier 2 (Direktur)",
        user: item.approvedDirectorBy ? item.approvedDirectorBy : (isTier2 ? "Direktur Utama (Approved T2)" : "Belum Disetujui"),
        role: "Direktur",
        time: item.approvedDirectorAt ? formatDateDisplay(item.approvedDirectorAt) : (isTier2 ? "Disetujui T2" : "Menunggu Direktur"),
        status: isTier2 ? "completed" : (isRejected ? "rejected" : "pending"),
        desc: item.approvedDirectorBy
          ? `Persetujuan Tier 2 (Eksekutif) disahkan oleh: ${item.approvedDirectorBy}. Status resmi: Issued.`
          : (isTier2 ? "Approval Tier 2 Direktur selesai. Invoice terbit resmi (Issued)." : "Menunggu persetujuan eksekutif (Tier 2) Direktur.")
      }
    ];
  }

  if (type === "payment") {
    return [
      { step: 1, title: "Uang Masuk Dicatat", user: "Rina Setyowati", role: "Treasury Admin", time: item.paymentDate ? new Date(item.paymentDate).toLocaleDateString("id-ID") : "11/03/2026", status: "completed", desc: `Menerima dana ${formatIDR(item.amountPaid)} melalui ${item.receivingBank}.` },
      { step: 2, title: "Rekonsiliasi Bank", user: "Deni Arisandi", role: "Bank Reconciliation", time: item.paymentDate ? new Date(item.paymentDate).toLocaleDateString("id-ID") : "11/03/2026", status: "completed", desc: `Nomor referensi transfer ${item.refNo} terkonfirmasi di mutasi bank.` },
      { step: 3, title: "Credit Matching ke Invoice", user: "System Engine", role: "Auto Settlement", time: item.paymentDate ? new Date(item.paymentDate).toLocaleDateString("id-ID") : "11/03/2026", status: "completed", desc: `Kredit otomatis dialokasikan ke Invoice ${item.invoiceNo} (${item.customerCode}).` }
    ];
  }

  return [
    { step: 1, title: "Registrasi Customer", user: "Legal Commercial AAP", role: "Commercial Dept", time: "01/01/2024", status: "completed", desc: `Pendaftaran entitas pelanggan ${item.fullName} (${item.code}).` },
    { step: 2, title: "Approval Credit Terms", user: "Chief Financial Officer (CFO)", role: "Board Executive", time: "05/01/2024", status: "completed", desc: `Persetujuan termin pembayaran ${item.terminDays} Hari.` },
    { step: 3, title: "Kontrak Kerjasama Aktif", user: "Legal Compliance Manager", role: "Legal Dept", time: "15/01/2024", status: "completed", desc: `Kontrak #${item.contractNo} nilai ${formatIDR(item.contractValue)} berjalan.` }
  ];
}

export function generateUserActivityLogs(type: string, item: any, realLogs?: any[]): any[] {
  if (Array.isArray(realLogs) && realLogs.length > 0) {
    return realLogs.map((log) => {
      const act = (log.action || "").toLowerCase();
      let actionType: "view" | "create" | "edit" | "verify" | "upload" | "system" = "system";
      let actionLabel = log.action;

      if (act.includes("view")) { actionType = "view"; actionLabel = "View Dokumen & Intelligence Hub"; }
      else if (act.includes("verify") || act.includes("sah")) { actionType = "verify"; actionLabel = "Verifikasi Nilai BA & Approval Specialist"; }
      else if (act.includes("upload")) { actionType = "upload"; actionLabel = "Upload Berkas Dokumen PDF"; }
      else if (act.includes("save") || act.includes("update") || act.includes("edit")) { actionType = "edit"; actionLabel = "Simpan Perubahan Data / Survey BA"; }
      else if (act.includes("create") || act.includes("generate")) { actionType = "create"; actionLabel = "Entri / Pembuatan Berita Acara"; }

      return {
        id: `real-log-${log.id}`,
        action: actionLabel, actionType,
        user: log.user || "System",
        role: log.user === "System" ? "System Engine" : "Verified User",
        timestamp: formatDateDisplay(log.createdAt),
        details: log.ipAddress ? `Aktivitas tercatat dari IP: ${log.ipAddress} (${log.device || "Browser Client"})` : "Aktivitas tercatat dalam database audit trail FEMS."
      };
    });
  }

  const logs: any[] = [];

  logs.push({
    id: "act-view-now", action: "View Dokumen & Intelligence Hub", actionType: "view",
    user: "Current User", role: "Finance / Auditor",
    timestamp: new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
    details: `Membuka detail BA #${item?.baNumber || item?.draftBARefNo || "Draft"} untuk audit & monitoring data.`
  });

  if (item?.verifiedBy || item?.verifiedAt || item?.statusBA === "Ready to Invoice") {
    logs.push({
      id: "act-verify", action: "Verifikasi Nilai BA & Approval Specialist", actionType: "verify",
      user: item.verifiedBy || "Finance Specialist AAP", role: "Finance Specialist",
      timestamp: item.verifiedAt ? formatDateDisplay(item.verifiedAt) : formatDateDisplay(item.updatedAt || new Date()),
      details: "Memvalidasi hasil survey lapangan & mengesahkan status BA menjadi Ready to Invoice. Jurnal Tahap 2 tercatat."
    });
  }

  if (item?.finalBAPath || item?.baSignedDate) {
    logs.push({
      id: "act-upload-final", action: "Upload Final Signed BA Document", actionType: "upload",
      user: item.picAAP || "Operations / Site Engineer", role: "Operations Site",
      timestamp: item.baSignedDate ? formatDateDisplay(item.baSignedDate) : formatDateDisplay(item.updatedAt || item.createdAt),
      details: "Mengunggah berkas PDF Berita Acara yang telah ditandatangani bersama."
    });
  } else if (item?.draftBAPath) {
    logs.push({
      id: "act-upload-draft", action: "Upload Draft BA Document", actionType: "upload",
      user: item.picAAP || "Operations / Site Engineer", role: "Operations Site",
      timestamp: formatDateDisplay(item.createdAt),
      details: "Mengunggah lampiran berkas draft BA hasil perhitungan awal lapangan."
    });
  }

  if (item?.updatedAt && item?.updatedAt !== item?.createdAt) {
    logs.push({
      id: "act-edit-last", action: "Update Data & Penyesuaian Survey", actionType: "edit",
      user: item.picAAP || "Site Engineer / Surveyor", role: "Operations Site",
      timestamp: formatDateDisplay(item.updatedAt),
      details: "Melakukan penyesuaian volume hasil joint survey dan jarak angkut (distance / overhaul)."
    });
  }

  logs.push({
    id: "act-create-initial", action: "Entri & Pembuatan Draft BA Baru", actionType: "create",
    user: item?.picAAP || "Admin Finance Site", role: "Finance Site",
    timestamp: item?.createdAt ? formatDateDisplay(item?.createdAt) : item?.baSubmittedDate ? formatDateDisplay(item?.baSubmittedDate) : "31/01/2026 09:00",
    details: `Draft Berita Acara dibuat pertama kali untuk customer ${item?.customerCode || "POS"}. Mengakui Unbilled Revenue Tahap 1.`
  });

  return logs;
}

// ── Visual Timeline Component ──────────────────────────────────────────────

const ACTION_ICON: Record<string, React.ReactNode> = {
  view: <Eye size={12} />,
  create: <Zap size={12} />,
  edit: <Edit2 size={12} />,
  verify: <CheckCircle2 size={12} />,
  upload: <Upload size={12} />,
  system: <Clock size={12} />,
};

export function AuditTimeline({ steps }: { steps: any[] }) {
  return (
    <div className="relative space-y-0">
      {steps.map((log, idx) => (
        <div key={log.step ?? log.id ?? idx} className="flex gap-3 items-start">
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0 ${log.status === "completed" ? "bg-emerald-500" : log.status === "rejected" ? "bg-rose-500" : "bg-slate-300"}`}>
              {log.status === "completed" ? <CheckCircle2 size={14} /> : log.status === "rejected" ? <AlertCircle size={14} /> : <Clock size={12} />}
            </div>
            {idx < steps.length - 1 && <div className={`w-0.5 flex-1 min-h-[20px] ${log.status === "completed" ? "bg-emerald-300" : "bg-slate-200"}`} />}
          </div>
          <div className="pb-4 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] font-extrabold ${log.status === "completed" ? "text-emerald-800" : log.status === "rejected" ? "text-rose-700" : "text-slate-500"}`}>
                {log.step !== undefined ? `Step ${log.step}:` : ""} {log.title || log.action}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">{log.user} <span className="text-slate-400">({log.role})</span></p>
            <p className="text-[10px] text-slate-400">{log.time || log.timestamp}</p>
            {(log.desc || log.details) && <p className="text-[10px] text-slate-600 mt-0.5 leading-relaxed">{log.desc || log.details}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ActivityLog({ logs }: { logs: any[] }) {
  return (
    <div className="space-y-2">
      {logs.map((log, idx) => (
        <div key={log.id ?? idx} className="flex gap-2.5 items-start p-2.5 bg-white rounded-xl border border-slate-100">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white flex-shrink-0 text-[10px]
            ${log.actionType === "verify" ? "bg-emerald-500"
            : log.actionType === "upload" ? "bg-cyan-500"
            : log.actionType === "edit" ? "bg-amber-500"
            : log.actionType === "view" ? "bg-slate-400"
            : "bg-indigo-500"}`}>
            {ACTION_ICON[log.actionType] ?? <Zap size={12} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-slate-800 truncate">{log.action}</p>
            <p className="text-[10px] text-slate-500">{log.user} <span className="text-slate-400">({log.role})</span></p>
            <p className="text-[10px] text-slate-400">{log.timestamp}</p>
            {log.details && <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{log.details}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
