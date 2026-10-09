import React, { useEffect, useState, Fragment } from "react";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Edit2,
  Eye,
  FileSpreadsheet,
  Flame,
  Layers,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  TrendingUp,
  X,
  ShieldCheck,
  Zap,
  Tag,
  ArrowUpRight
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { api } from "../lib/api";
import { customerKind, kursForPeriod } from "./finance/masterRegistry";
import { useNavigate, useLocation } from "react-router-dom";

const formatIDR = (val: number) => {
  if (!val && val !== 0) return "Rp 0";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 2 }).format(val);
};

export const normalizeSOWSiteCode = (code: string): string => customerKind(code);

/** Site & kontrak pemilik Variable SOW = Master Customer (BE). */
export async function loadSOWCustomerSites(): Promise<{ code: string; name: string; fullName: string; contractNo: string }[]> {
  const rows = await api<any[]>("/api/finance/customers").catch(() => []);
  return (Array.isArray(rows) ? rows : []).map((c) => ({
    code: normalizeSOWSiteCode(c.code),
    name: c.fullName || c.code,
    fullName: `${c.fullName || c.code} (${c.code})`,
    contractNo: c.contractNo || "",
  }));
}

/** M-Rate periode terbaru di Master Kurs BI (0 bila belum ada). */
export const latestPeriodMRate = (rates: any[]): number => {
  const period = Array.isArray(rates) && rates.length > 0 ? rates[rates.length - 1]?.period : "";
  return period ? kursForPeriod(period, rates) : 0;
};

export function VariableSOWPage({
  viewTitle,
  query,
  onNotice
}: {
  viewTitle: string;
  query: string;
  onNotice: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [sowRows, setSowRows] = useState<any[]>([]);
  const [mrateBi, setMrateBi] = useState<number>(0);
  const [contractsList, setContractsList] = useState<any[]>([]);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>("ALL");
  const [companyList, setCompanyList] = useState<any[]>([]);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.notice) {
      onNotice(location.state.notice);
      // Clear notice from state so it doesn't pop up again on refresh
      window.history.replaceState({}, document.title)
    }
  }, [location, onNotice]);

  async function loadData() {
    setLoading(true);
    try {
      const [resSow, resMrate, sites] = await Promise.all([
        api<any[]>("/api/master-data/variable-sow").catch(() => []),
        api<any[]>("/api/master-data/daily-exchange-rates").catch(() => []),
        loadSOWCustomerSites(),
      ]);

      const activeSows = Array.isArray(resSow) ? resSow : [];
      setSowRows(activeSows);

      setMrateBi(latestPeriodMRate(resMrate));

      // Kelompok SOW per customer di Master Customer (hanya data tersimpan; tanpa template tarif).
      const groupedMap: Record<string, any> = {};

      sites.forEach((site) => {
        const cCode = site.code;
        const siteDbItems = activeSows.filter(
          (item) => normalizeSOWSiteCode(item.customerCode || item.customer || "") === cCode
        );

        const finalItems = siteDbItems.map((it) => ({ ...it }));

        groupedMap[cCode] = {
          companyName: site.name,
          companyCode: site.code,
          contractNo: site.contractNo,
          type: cCode === "BGG" ? "coal" : "generic",
          badgeColor: "slate",
          desc: "",
          itemCount: finalItems.length,
          items: finalItems
        };
      });

      setContractsList(Object.values(groupedMap));
      setCompanyList(sites);
    } catch (err: any) {
      onNotice(err?.message || "Gagal memuat data Variable SOW");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const openCreateGridModal = () => {
    navigate("/variable-sow/new", { state: { mrateBi } });
  };

  const openEditGridModal = (contractGroup: any) => {
    navigate("/variable-sow/edit", { state: { contractGroup, mrateBi } });
  };

  const filteredContracts = contractsList.filter((c) => {
    if (selectedCompanyFilter !== "ALL" && c.companyCode !== selectedCompanyFilter) return false;
    const matchQ = JSON.stringify(c).toLowerCase().includes(query.toLowerCase());
    return matchQ;
  });

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto pb-12">
      {/* Top Header */}
      <PageHeader
        title="Master Data Variable SOW"
        description="Katalog tarif dan parameter komersial operasional per kontrak site pertambangan."
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData()}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition shadow-2xs active:scale-95 cursor-pointer"
            title="Perbarui Data"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={openCreateGridModal}
            className="px-3.5 py-2 rounded-lg bg-cyan-800 hover:bg-cyan-900 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Plus size={15} />
            <span>Input Tarif SOW Baru</span>
          </button>
        </div>
      </PageHeader>

      {/* KPI Cards Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Kurs Acuan BI (M-Rate)</span>
            <span className="p-0.5 px-2 bg-emerald-50 rounded text-emerald-700 font-bold text-[10px] border border-emerald-200">Live Sync</span>
          </div>
          <div className="text-xl font-black text-slate-900 font-mono tracking-tight pt-0.5">
            {formatIDR(mrateBi)}
            <span className="text-xs font-sans font-normal text-slate-400 ml-1">/ USD</span>
          </div>
          <p className="text-[11px] text-slate-500">Acuan konversi tarif USD (PT POS & PT DBK)</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Kontrak Aktif</span>
            <span className="p-0.5 px-2 bg-slate-100 rounded text-slate-700 font-bold text-[10px] border border-slate-200">{contractsList.length} Entitas</span>
          </div>
          <div className="text-xl font-black text-slate-900 font-mono tracking-tight pt-0.5">
            {contractsList.length} Site & Klien
          </div>
          <p className="text-[11px] text-slate-500">{companyList.map((c) => c.code).join(", ") || "Terdaftar di database"}</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Model Komersial</span>
            <span className="p-0.5 px-2 bg-cyan-50 rounded text-cyan-800 font-bold text-[10px] border border-cyan-200">Multi-Site</span>
          </div>
          <div className="text-sm font-bold text-slate-900 pt-1">
            Batubara (Tiering), Nikel (USD) & Rental (IDR)
          </div>
          <p className="text-[11px] text-slate-500">Tersinkronisasi ke BA Tracker & Invoice</p>
        </div>
      </div>

      {/* Filter Tabs by Company */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedCompanyFilter("ALL")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
            selectedCompanyFilter === "ALL"
              ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          }`}
        >
          Semua Kontrak ({contractsList.length})
        </button>
        {companyList.map((c) => (
          <button
            key={c.code}
            onClick={() => setSelectedCompanyFilter(c.code)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition cursor-pointer ${
              selectedCompanyFilter === c.code
                ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span>{c.name}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${selectedCompanyFilter === c.code ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}>
              {c.code}
            </span>
          </button>
        ))}
      </div>

      {/* Main Table Panel */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Daftar Master Variable SOW Berdasarkan Kontrak
            </h3>
            <p className="text-xs text-slate-500">
              Katalog tarif dasar yang otomatis dipakai saat pembuatan Berita Acara dan Invoice.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <th className="p-3 pl-4 text-center w-12">NO</th>
                <th className="p-3">NAMA PERUSAHAAN</th>
                <th className="p-3 text-center w-20">KODE</th>
                <th className="p-3 font-mono">NOMOR KONTRAK</th>
                <th className="p-3 text-center">KOMODITAS & MODEL</th>
                <th className="p-3 text-center w-28">JUMLAH SOW</th>
                <th className="p-3 pr-4 text-right w-36">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredContracts.map((c, idx) => (
                <tr key={c.companyCode || idx} className="hover:bg-slate-50 transition">
                  <td className="p-3 pl-4 text-center font-bold text-slate-400">{idx + 1}</td>
                  <td className="p-3">
                    <div className="font-bold text-slate-900">{c.companyName}</div>
                    {c.desc && <p className="text-[11px] text-slate-500 mt-0.5">{c.desc}</p>}
                  </td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                      {c.companyCode}
                    </span>
                  </td>
                  <td className="p-3 font-mono font-bold text-slate-700 text-xs">{c.contractNo || "-"}</td>
                  <td className="p-3 text-center">
                    {c.type === "coal" || c.companyCode === "BGG" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                        <Flame size={12} className="text-amber-600" /> Batubara (Multi-Tier)
                      </span>
                    ) : c.companyCode === "SBS" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-200">
                        <CheckCircle2 size={12} className="text-emerald-700" /> IDR (OB, Rental & Denda)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-cyan-50 text-cyan-900 border border-cyan-200">
                        <DollarSign size={12} className="text-cyan-700" /> Nikel (USD Presisi)
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-center font-bold text-slate-700">
                    <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono text-xs">
                      {c.itemCount} Item
                    </span>
                  </td>
                  <td className="p-3 pr-4 text-right">
                    <button
                      className="px-3 py-1.5 rounded-[3px] bg-[#A57C50] hover:bg-[#8e6941] text-white font-bold text-xs flex items-center gap-1.5 ml-auto transition shadow-xs cursor-pointer active:scale-95"
                      onClick={() => openEditGridModal(c)}
                    >
                      <Eye size={13} />
                      <span>Lihat & Edit Tarif</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
