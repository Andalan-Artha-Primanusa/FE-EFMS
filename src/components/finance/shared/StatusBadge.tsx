// StatusBadge — Shared UI component for BA & Invoice status display
// Source: extracted from FinancePage.tsx L154–L360

import { Archive } from "lucide-react";

// ── BA Invoice Status Logic ────────────────────────────────────────────────

export interface BAInvoiceStatus {
  isFullyInvoiced: boolean;
  isPartiallyInvoiced: boolean;
  createdMiningInv: any | null;
  createdMDOInv: any | null;
  createdInvoices: any[];
  remainingCount: number;
}

export function getBAInvoiceStatus(ba: any, allInvoices: any[]): BAInvoiceStatus {
  if (!ba) {
    return { isFullyInvoiced: false, isPartiallyInvoiced: false, createdMiningInv: null, createdMDOInv: null, createdInvoices: [], remainingCount: 0 };
  }

  const baNum = (ba.baNumber || "").trim().toLowerCase();
  const linkedNo = (ba.invoiceNoLinked || "").trim().toLowerCase();

  const matchedInvoices = (allInvoices || []).filter((inv) => {
    const invRef = (inv.baNoReference || "").trim().toLowerCase();
    const invNo = (inv.invoiceNo || "").trim().toLowerCase();
    if (baNum && invRef === baNum) return true;
    if (linkedNo && linkedNo !== "-" && invNo === linkedNo) return true;
    return false;
  });

  const isPOS = (ba.customerCode || "POS") === "POS";

  if (isPOS) {
    const createdMiningInv = matchedInvoices.find((inv) =>
      inv.invoiceCategory === "Operation & Mining" ||
      inv.activityGroup === "OPERATION & MINING" ||
      (inv.invoiceNo || "").includes("MINING") ||
      (inv.invoiceNo || "").includes("RF")
    ) || null;

    const createdMDOInv = matchedInvoices.find((inv) =>
      inv.invoiceCategory === "MDO" ||
      (inv.activityGroup || "").includes("MDO") ||
      (inv.invoiceNo || "").includes("MDO")
    ) || null;

    const isFullyInvoiced = Boolean(createdMiningInv && createdMDOInv);
    const isPartiallyInvoiced = Boolean((createdMiningInv || createdMDOInv) && !isFullyInvoiced);

    return {
      isFullyInvoiced,
      isPartiallyInvoiced,
      createdMiningInv,
      createdMDOInv,
      createdInvoices: matchedInvoices,
      remainingCount: (createdMiningInv ? 0 : 1) + (createdMDOInv ? 0 : 1),
    };
  } else {
    const isFullyInvoiced = matchedInvoices.length > 0;
    return {
      isFullyInvoiced,
      isPartiallyInvoiced: false,
      createdMiningInv: matchedInvoices[0] || null,
      createdMDOInv: null,
      createdInvoices: matchedInvoices,
      remainingCount: isFullyInvoiced ? 0 : 1,
    };
  }
}

export function getBAStatusForExport(ba: any, allInvoices: any[]): { label: string; badgeClass: string; subtext: string } {
  const invStatus = getBAInvoiceStatus(ba, allInvoices);
  const s = (ba?.statusBA || "Submit").trim();
  const isPOS = (ba?.customerCode || "POS") === "POS";

  if (isPOS) {
    if (invStatus.isFullyInvoiced) {
      return { label: "ARSIP (2/2 TERBIT)", badgeClass: "bg-purple", subtext: `${invStatus.createdMiningInv?.invoiceNo || ""} & ${invStatus.createdMDOInv?.invoiceNo || ""}` };
    }
    if (invStatus.isPartiallyInvoiced) {
      const created = invStatus.createdMiningInv ? "MINING" : "MDO";
      const missing = invStatus.createdMiningInv ? "MDO" : "MINING";
      const invNo = invStatus.createdMiningInv?.invoiceNo || invStatus.createdMDOInv?.invoiceNo || "";
      return { label: "1/2 INV TERBIT", badgeClass: "bg-amber", subtext: `✓ ${created}: ${invNo} | ⏳ Belum: ${missing}` };
    }
  } else {
    if (invStatus.isFullyInvoiced || s === "Arsip" || s === "Invoiced") {
      return { label: "ARSIP", badgeClass: "bg-purple", subtext: ba?.invoiceNoLinked || "" };
    }
  }

  if (s === "Ready to Invoice" || s === "Approved") return { label: "READY TO INVOICE", badgeClass: "bg-emerald", subtext: "" };
  if (s === "Pending Berita Acara" || s === "Verified" || s === "Pending") return { label: "PENDING BERITA ACARA", badgeClass: "bg-amber", subtext: "" };
  if (s === "Revisi" || s.startsWith("Reject")) return { label: "REVISI", badgeClass: "bg-rose", subtext: "" };
  return { label: "SUBMIT", badgeClass: "bg-slate", subtext: "" };
}

// ── React Badge Components ─────────────────────────────────────────────────

export function BAStatusBadge({ status, invoiceNoLinked, isInvoiced, baRow, allInvoices }: {
  status: string;
  invoiceNoLinked?: string;
  isInvoiced?: boolean;
  baRow?: any;
  allInvoices?: any[];
}) {
  const s = (status || "").trim();
  const isPOS = baRow?.customerCode === "POS";

  if (isPOS && allInvoices && baRow) {
    const invStatus = getBAInvoiceStatus(baRow, allInvoices);
    if (invStatus.isFullyInvoiced) {
      return (
        <div className="flex flex-col items-center gap-0.5">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-100 text-purple-900 border border-purple-300 inline-flex items-center gap-1 shadow-2xs">
            <Archive size={11} className="text-purple-700" /> Arsip (2/2 Terbit)
          </span>
          <span className="text-[9px] font-mono text-purple-800 font-bold text-center leading-tight">
            {invStatus.createdMiningInv?.invoiceNo} &<br />{invStatus.createdMDOInv?.invoiceNo}
          </span>
        </div>
      );
    } else if (invStatus.isPartiallyInvoiced) {
      const created = invStatus.createdMiningInv ? "Mining" : "MDO";
      const missing = invStatus.createdMiningInv ? "MDO" : "Mining";
      const createdInvNo = invStatus.createdMiningInv?.invoiceNo || invStatus.createdMDOInv?.invoiceNo;
      return (
        <div className="flex flex-col items-center gap-0.5">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            1/2 Inv Terbit
          </span>
          <div className="text-[9px] flex flex-col items-center leading-tight">
            <span className="text-emerald-700 font-bold">✓ {created}: {createdInvNo}</span>
            <span className="text-amber-800 font-extrabold">⏳ Belum: Inv {missing}</span>
          </div>
        </div>
      );
    }
  }

  const linked = (invoiceNoLinked || "").trim();
  if (isInvoiced || s === "Arsip" || s === "Invoiced") {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-100 text-purple-900 border border-purple-300 inline-flex items-center gap-1 shadow-2xs">
          <Archive size={11} className="text-purple-700" /> Arsip
        </span>
        {linked && linked !== "-" && (
          <span className="text-[10px] font-mono text-purple-700 font-bold">{linked}</span>
        )}
      </div>
    );
  }

  if (s === "Submit" || s.startsWith("Draft") || s.startsWith("Siap") || s.startsWith("Submited") || s.startsWith("Submitted")) {
    return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 inline-block whitespace-nowrap shadow-2xs">Submit</span>;
  }
  if (s === "Pending Berita Acara" || s.startsWith("Pending") || s.startsWith("Verified")) {
    return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 inline-block whitespace-nowrap shadow-2xs">Pending Berita Acara</span>;
  }
  if (s === "Ready to Invoice" || s.startsWith("Approved")) {
    return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-block whitespace-nowrap shadow-2xs">Ready to Invoice</span>;
  }
  if (s === "Revisi" || s.startsWith("Reject")) {
    return <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 inline-block whitespace-nowrap shadow-2xs">Revisi</span>;
  }
  return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 inline-block whitespace-nowrap shadow-2xs">{status || "Submit"}</span>;
}

export function InvoiceStatusBadge({ status }: { status: string }) {
  const s = (status || "").trim();
  if (s === "Paid") return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-block whitespace-nowrap">Paid</span>;
  if (s === "Overdue") return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 inline-block whitespace-nowrap">Overdue</span>;
  if (s === "Verified") return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-100 text-cyan-800 border border-cyan-300 inline-block whitespace-nowrap">Verified SPV</span>;
  if (s === "Approved_Tier1") return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-300 inline-block whitespace-nowrap">Approved Mgr (Tier 1)</span>;
  if (s === "Issued" || s === "Approved_Tier2") return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300 font-extrabold inline-block whitespace-nowrap">Issued (Approved Dir)</span>;
  if (s === "Rejected") return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 inline-block whitespace-nowrap">Rejected</span>;
  return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 inline-block whitespace-nowrap">{status || "Draft"}</span>;
}
