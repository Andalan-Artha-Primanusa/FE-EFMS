import React, { useState } from "react";
import { RefreshCw, MapPin, Building2 } from "lucide-react";
import andalanLogo from "../assets/andalan-logo.png";
import { SITE_EBITDA_DATASET, type SiteEbitdaConfig } from "../data/siteEbitdaData";

export function MiningEbitdaDashboard({
  onRefresh,
  initialSite = "ALL"
}: {
  onRefresh?: () => void;
  initialSite?: string;
}) {
  const [selectedSiteKey, setSelectedSiteKey] = useState<string>(initialSite);

  const currentSite: SiteEbitdaConfig =
    SITE_EBITDA_DATASET[selectedSiteKey] || SITE_EBITDA_DATASET.ALL;

  const formatNumber = (val: number) =>
    new Intl.NumberFormat("id-ID").format(val);

  return (
    <div className="w-full overflow-x-auto border border-slate-300 rounded shadow-xs bg-white selection:bg-cyan-100">
      <div className="p-2.5 text-slate-800 text-xs min-w-[980px] xl:min-w-full">
        
        {/* Top Controls Header */}
        <div className="flex flex-wrap items-center justify-between pb-2 mb-2 border-b border-slate-200 gap-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            <h1 className="text-xs font-black tracking-wider uppercase text-slate-800">
              Finance & Operational EBITDA Performance Dashboard
            </h1>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[10px]">
              Maret 2026
            </span>

            {/* Site Selector Dropdown */}
            <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-300">
              <MapPin size={13} className="text-[#a57c50]" />
              <label htmlFor="site-select" className="text-[10px] font-bold text-slate-700">
                Site:
              </label>
              <select
                id="site-select"
                value={selectedSiteKey}
                onChange={(e) => setSelectedSiteKey(e.target.value)}
                className="bg-white border border-slate-300 text-slate-900 text-[10.5px] font-bold rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#a57c50] cursor-pointer shadow-xs"
              >
                <option value="ALL">🏢 Konsolidasi (All Sites)</option>
                <option value="SBS">⛏️ Site SBS (Pit E - Samindo)</option>
                <option value="DBK">⛏️ Site DBK (Petrosea Project)</option>
                <option value="BGG">⛏️ Site BGG (Global Prima)</option>
                <option value="POS">⛏️ Site POS (Prima Perkasa)</option>
              </select>
            </div>

            {/* Active Client Badge */}
            <div className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-200/80 text-amber-900 text-[9.5px] font-semibold">
              <Building2 size={11} className="text-amber-700" />
              <span>{currentSite.clientName}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[10px] text-slate-500">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="inline-flex items-center gap-1 px-2.5 py-1 border border-slate-300 rounded font-semibold hover:bg-slate-50 text-slate-700 transition shadow-xs"
              >
                <RefreshCw size={11} /> Refresh
              </button>
            )}
            <span className="font-medium">Based on Master Budget Maret 2026</span>
          </div>
        </div>

        {/* Row 1: EBITDA Bridge (Left ~58%) & Cost Profile (Right ~42%) */}
        <div className="grid grid-cols-12 gap-3 pb-2 border-b border-slate-300">
          
          {/* TOP LEFT: EBITDA Bridge Waterfall (Cols 1-7) */}
          <div className="col-span-7 flex flex-col justify-between pr-1">
            <div className="relative pt-4">
              
              {/* Spanning Bracket + Badge */}
              <div className="absolute top-0 inset-x-2 flex flex-col items-center">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.2 rounded-full bg-[#00a651] text-white font-black text-[10px] shadow-xs border border-emerald-700">
                  <span>{currentSite.ebitdaGrowth} ({currentSite.ebitdaDelta})</span>
                </div>
                <svg className="w-full h-3 mt-0.5" viewBox="0 0 600 12" preserveAspectRatio="none">
                  <path d="M 18 10 L 18 2 L 280 2 M 320 2 L 582 2 L 582 10" stroke="#0f172a" strokeWidth="1.6" fill="none" />
                  <line x1="300" y1="2" x2="300" y2="0" stroke="#0f172a" strokeWidth="1.6" />
                </svg>
              </div>

              {/* Pure SVG EBITDA Bridge Waterfall */}
              <div className="w-full h-[112px] mt-2">
                <svg className="w-full h-full" viewBox="0 0 620 110" preserveAspectRatio="none">
                  <line x1="10" y1="92" x2="610" y2="92" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="2 2" />

                  {/* 1. EBITDA PLAN */}
                  <rect x="15" y="63.5" width="26" height="28.5" fill="#94a3b8" rx="1" />
                  <text x="28" y="58" fontSize="10" fontWeight="bold" fill="#0f172a" textAnchor="middle">
                    {currentSite.ebitdaPlan.toFixed(2).replace(".", ",")}
                  </text>
                  <line x1="41" y1="63.5" x2="55" y2="63.5" stroke="#64748b" strokeDasharray="1.5 1.5" strokeWidth="1" />

                  {/* 2. OB */}
                  <rect x="55" y="24.5" width="22" height="39" fill="#00a651" rx="1" />
                  <text x="66" y="19" fontSize="10" fontWeight="bold" fill="#0f172a" textAnchor="middle">0,26</text>
                  <line x1="77" y1="24.5" x2="95" y2="24.5" stroke="#64748b" strokeDasharray="1.5 1.5" strokeWidth="1" />

                  {/* 3. CM */}
                  <rect x="95" y="20" width="22" height="4.5" fill="#00a651" rx="1" />
                  <text x="106" y="15" fontSize="9.5" fontWeight="bold" fill="#0f172a" textAnchor="middle">0,03</text>
                  <line x1="117" y1="20" x2="135" y2="20" stroke="#64748b" strokeDasharray="1.5 1.5" strokeWidth="1" />

                  {/* 4. CT */}
                  <rect x="135" y="20" width="22" height="1.5" fill="#94a3b8" />
                  <text x="146" y="15" fontSize="9.5" fontWeight="bold" fill="#0f172a" textAnchor="middle">0,00</text>
                  <line x1="157" y1="20" x2="175" y2="20" stroke="#64748b" strokeDasharray="1.5 1.5" strokeWidth="1" />

                  {/* 5. DIST. */}
                  <rect x="175" y="20" width="22" height="6" fill="#f58220" rx="1" />
                  <text x="186" y="32" fontSize="9" fontWeight="bold" fill="#0f172a" textAnchor="middle">-0,04</text>
                  <line x1="197" y1="26" x2="215" y2="26" stroke="#64748b" strokeDasharray="1.5 1.5" strokeWidth="1" />

                  {/* 6. FUEL PASS */}
                  <rect x="215" y="26" width="22" height="6" fill="#f58220" rx="1" />
                  <text x="226" y="38" fontSize="9" fontWeight="bold" fill="#0f172a" textAnchor="middle">-0,04</text>
                  <line x1="237" y1="32" x2="255" y2="32" stroke="#64748b" strokeDasharray="1.5 1.5" strokeWidth="1" />

                  {/* 7. RISE & FALL */}
                  <rect x="255" y="32" width="22" height="1.5" fill="#94a3b8" />
                  <text x="266" y="27" fontSize="9.5" fontWeight="bold" fill="#0f172a" textAnchor="middle">0,00</text>
                  <line x1="277" y1="32" x2="295" y2="32" stroke="#64748b" strokeDasharray="1.5 1.5" strokeWidth="1" />

                  {/* 8. OTHERS REV */}
                  <rect x="295" y="30.5" width="22" height="2" fill="#00a651" rx="1" />
                  <text x="306" y="25" fontSize="9.5" fontWeight="bold" fill="#0f172a" textAnchor="middle">0,01</text>
                  <line x1="317" y1="30.5" x2="335" y2="30.5" stroke="#64748b" strokeDasharray="1.5 1.5" strokeWidth="1" />

                  {/* 9. EC */}
                  <rect x="335" y="26" width="22" height="4.5" fill="#00a651" rx="1" />
                  <text x="346" y="21" fontSize="9.5" fontWeight="bold" fill="#0f172a" textAnchor="middle">0,03</text>
                  <line x1="357" y1="26" x2="375" y2="26" stroke="#64748b" strokeDasharray="1.5 1.5" strokeWidth="1" />

                  {/* 10. TYRE */}
                  <rect x="375" y="26" width="22" height="1.5" fill="#94a3b8" />
                  <text x="386" y="21" fontSize="9.5" fontWeight="bold" fill="#0f172a" textAnchor="middle">0,00</text>
                  <line x1="397" y1="26" x2="415" y2="26" stroke="#64748b" strokeDasharray="1.5 1.5" strokeWidth="1" />

                  {/* 11. OH */}
                  <rect x="415" y="26" width="22" height="1.5" fill="#94a3b8" />
                  <text x="426" y="21" fontSize="9.5" fontWeight="bold" fill="#0f172a" textAnchor="middle">0,00</text>
                  <line x1="437" y1="26" x2="455" y2="26" stroke="#64748b" strokeDasharray="1.5 1.5" strokeWidth="1" />

                  {/* 12. RM */}
                  <rect x="455" y="16.5" width="22" height="9.5" fill="#00a651" rx="1" />
                  <text x="466" y="12" fontSize="9.5" fontWeight="bold" fill="#0f172a" textAnchor="middle">0,09</text>
                  <line x1="477" y1="16.5" x2="495" y2="16.5" stroke="#64748b" strokeDasharray="1.5 1.5" strokeWidth="1" />

                  {/* 13. OTHERS COST */}
                  <rect x="495" y="15" width="22" height="1.5" fill="#00a651" rx="1" />
                  <text x="506" y="10.5" fontSize="9.5" fontWeight="bold" fill="#0f172a" textAnchor="middle">0,01</text>
                  <line x1="517" y1="15" x2="560" y2="15" stroke="#64748b" strokeDasharray="1.5 1.5" strokeWidth="1" />

                  {/* 14. EBITDA ACT */}
                  <rect x="560" y="15" width="28" height="77" fill="#64748b" rx="1" />
                  <text x="574" y="9.5" fontSize="10" fontWeight="bold" fill="#0f172a" textAnchor="middle">
                    {currentSite.ebitdaAct.toFixed(2).replace(".", ",")}
                  </text>

                  {/* Category Labels */}
                  <g fontSize="7.5" fontWeight="bold" fill="#1e293b" textAnchor="middle">
                    <text x="28" y="102">EBITDA PLAN</text>
                    <text x="66" y="102">OB</text>
                    <text x="106" y="102">CM</text>
                    <text x="146" y="102">CT</text>
                    <text x="186" y="102">DIST.</text>
                    <text x="226" y="100">FUEL</text><text x="226" y="107">PASS</text>
                    <text x="266" y="100">RISE &</text><text x="266" y="107">FALL</text>
                    <text x="306" y="100">OTHERS</text><text x="306" y="107">REV</text>
                    <text x="346" y="102">EC</text>
                    <text x="386" y="102">TYRE</text>
                    <text x="426" y="102">OH</text>
                    <text x="466" y="102">RM</text>
                    <text x="506" y="100">OTHERS</text><text x="506" y="107">COST</text>
                    <text x="574" y="102">EBITDA ACT</text>
                  </g>
                </svg>
              </div>

            </div>
          </div>

          {/* TOP RIGHT: Cost Profile (Cols 8-12) */}
          <div className="col-span-5 pl-1 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-black text-[#1e3a8a] tracking-tight">Cost Profile</h2>
              <span className="text-[9px] font-bold text-slate-500">Unit: $/Bcm</span>
            </div>

            <div className="grid grid-cols-12 gap-2 items-end">
              
              {/* Cost Profile Waterfall Visual */}
              <div className="col-span-7 h-[112px]">
                <svg className="w-full h-full" viewBox="0 0 250 110" preserveAspectRatio="none">
                  <line x1="5" y1="92" x2="245" y2="92" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="2 2" />

                  {/* Plan $/Bcm */}
                  <rect x="10" y="25" width="18" height="67" fill="#64748b" rx="1" />
                  <line x1="8" y1="58" x2="30" y2="54" stroke="#ffffff" strokeWidth="2.2" />
                  <line x1="8" y1="62" x2="30" y2="58" stroke="#ffffff" strokeWidth="2.2" />
                  <text x="19" y="19" fontSize="9" fontWeight="bold" fill="#0f172a" textAnchor="middle">2,25</text>
                  <line x1="28" y1="25" x2="45" y2="25" stroke="#64748b" strokeDasharray="1.5 1.5" strokeWidth="1" />

                  {/* EmComp */}
                  <rect x="45" y="25" width="16" height="11" fill="#00a651" rx="1" />
                  <text x="53" y="21" fontSize="8.5" fontWeight="bold" fill="#0f172a" textAnchor="middle">-0,09</text>
                  <line x1="61" y1="36" x2="78" y2="36" stroke="#64748b" strokeDasharray="1.5 1.5" strokeWidth="1" />

                  {/* Fuel */}
                  <rect x="78" y="27" width="16" height="9" fill="#f58220" rx="1" />
                  <text x="86" y="23" fontSize="8.5" fontWeight="bold" fill="#0f172a" textAnchor="middle">0,07</text>
                  <line x1="94" y1="27" x2="111" y2="27" stroke="#64748b" strokeDasharray="1.5 1.5" strokeWidth="1" />

                  {/* Tyre */}
                  <rect x="111" y="27" width="16" height="9" fill="#00a651" rx="1" />
                  <text x="119" y="23" fontSize="8.5" fontWeight="bold" fill="#0f172a" textAnchor="middle">-0,07</text>
                  <line x1="127" y1="36" x2="144" y2="36" stroke="#64748b" strokeDasharray="1.5 1.5" strokeWidth="1" />

                  {/* RM */}
                  <rect x="144" y="36" width="16" height="26" fill="#00a651" rx="1" />
                  <text x="152" y="32" fontSize="8.5" fontWeight="bold" fill="#0f172a" textAnchor="middle">-0,28</text>
                  <line x1="160" y1="62" x2="177" y2="62" stroke="#64748b" strokeDasharray="1.5 1.5" strokeWidth="1" />

                  {/* Other */}
                  <rect x="177" y="62" width="16" height="14" fill="#00a651" rx="1" />
                  <text x="185" y="58" fontSize="8.5" fontWeight="bold" fill="#0f172a" textAnchor="middle">-0,13</text>
                  <line x1="193" y1="76" x2="215" y2="76" stroke="#64748b" strokeDasharray="1.5 1.5" strokeWidth="1" />

                  {/* Act $/Bcm */}
                  <rect x="215" y="42" width="18" height="50" fill="#64748b" rx="1" />
                  <line x1="213" y1="68" x2="235" y2="64" stroke="#ffffff" strokeWidth="2.2" />
                  <line x1="213" y1="72" x2="235" y2="68" stroke="#ffffff" strokeWidth="2.2" />
                  <text x="224" y="37" fontSize="9" fontWeight="bold" fill="#0f172a" textAnchor="middle">1,74</text>

                  {/* Labels */}
                  <g fontSize="7.5" fontWeight="bold" fill="#1e293b" textAnchor="middle">
                    <text x="19" y="101">Plan</text><text x="19" y="108" fontSize="6.5" fill="#64748b">$/Bcm</text>
                    <text x="53" y="103">EmComp</text>
                    <text x="86" y="103">Fuel</text>
                    <text x="119" y="103">Tyre</text>
                    <text x="152" y="103">RM</text>
                    <text x="185" y="103">Other</text>
                    <text x="224" y="101">Act</text><text x="224" y="108" fontSize="6.5" fill="#64748b">$/Bcm</text>
                  </g>
                </svg>
              </div>

              {/* Dynamic $/Bcm Table */}
              <div className="col-span-5">
                <table className="w-full border-collapse text-center text-[9px]">
                  <thead>
                    <tr className="bg-[#e0f2fe] text-slate-800 font-bold border border-slate-300">
                      <th rowSpan={2} className="p-0.5 border border-slate-300 text-left pl-1">$/Bcm</th>
                      <th colSpan={2} className="p-0.5 border border-slate-300">MTD</th>
                      <th colSpan={2} className="p-0.5 border border-slate-300">YTD</th>
                    </tr>
                    <tr className="bg-[#f0f9ff] text-slate-700 font-semibold border border-slate-300 text-[8px]">
                      <th className="p-0.2 border border-slate-300">[Plan]</th>
                      <th className="p-0.2 border border-slate-300">[Act]</th>
                      <th className="p-0.2 border border-slate-300">[Plan]</th>
                      <th className="p-0.2 border border-slate-300">[Act]</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-[8.5px]">
                    {currentSite.costProfile.map((cost) => (
                      <tr key={cost.name} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="p-0.5 border border-slate-200 text-left font-sans font-semibold pl-1">
                          {cost.name}
                        </td>
                        <td className="p-0.5 border border-slate-200">{cost.mtdPlan.toFixed(2)}</td>
                        <td className={`p-0.5 border border-slate-200 ${cost.mtdAct > cost.mtdPlan ? "font-bold text-amber-700" : ""}`}>
                          {cost.mtdAct.toFixed(2)}
                        </td>
                        <td className="p-0.5 border border-slate-200">{cost.ytdPlan.toFixed(2)}</td>
                        <td className={`p-0.5 border border-slate-200 ${cost.ytdAct > cost.ytdPlan ? "font-bold text-amber-700" : ""}`}>
                          {cost.ytdAct.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          </div>

        </div>

        {/* Row 2: Middle (Revenue View & Volume) vs (ANDALAN Parameter & Control Milestone) */}
        <div className="grid grid-cols-12 gap-3 py-2 border-b border-slate-300">
          
          {/* MIDDLE LEFT: Dynamic Revenue View & Volume (Cols 1-7) */}
          <div className="col-span-7 flex flex-col justify-between pr-1">
            
            {/* Revenue View Bar Area */}
            <div className="flex items-center gap-2">
              <div className="w-14 font-black text-slate-800 text-[10px] leading-tight shrink-0 tracking-tight">
                revenue<br/>view
              </div>

              <div
                className={`flex-1 grid gap-2 ${
                  currentSite.areas.length === 2
                    ? "grid-cols-2"
                    : currentSite.areas.length === 4
                    ? "grid-cols-4"
                    : "grid-cols-3"
                }`}
              >
                {currentSite.areas.map((area) => {
                  const maxVal = Math.max(area.planRevenue, area.actualRevenue, area.tomorrowRevenue, 1);
                  const planPct = Math.min(100, Math.round((area.planRevenue / maxVal) * 100));
                  const actPct = Math.min(100, Math.round((area.actualRevenue / maxVal) * 100));
                  const tomPct = Math.min(100, Math.round((area.tomorrowRevenue / maxVal) * 100));

                  return (
                    <div key={area.name} className="bg-white border border-slate-200 rounded p-1 shadow-2xs">
                      <div className="text-center font-bold text-slate-800 text-[9px] mb-0.5 uppercase truncate" title={area.name}>
                        {area.name}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center text-[8.5px]">
                          <span className="w-12 text-right pr-1 font-semibold text-slate-600 shrink-0">Plan</span>
                          <div className="flex-1 bg-slate-100 h-3.5 relative flex items-center rounded-2xs overflow-hidden">
                            <div className="bg-[#00c5cd] h-full" style={{ width: `${planPct}%` }}></div>
                            <span className="absolute right-1 text-[8px] font-mono font-semibold text-slate-800">
                              {formatNumber(area.planRevenue)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center text-[8.5px]">
                          <span className="w-12 text-right pr-1 font-semibold text-slate-600 shrink-0">Aktual</span>
                          <div className="flex-1 bg-slate-100 h-3.5 relative flex items-center rounded-2xs overflow-hidden">
                            <div className="bg-[#00c5cd] h-full" style={{ width: `${actPct}%` }}></div>
                            <span className="absolute right-1 text-[8px] font-mono font-semibold text-slate-800">
                              {formatNumber(area.actualRevenue)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center text-[8.5px]">
                          <span className="w-12 text-right pr-1 font-semibold text-slate-600 shrink-0">Tomorrow</span>
                          <div className="flex-1 bg-slate-100 h-3.5 relative flex items-center rounded-2xs overflow-hidden">
                            <div className="bg-[#00c5cd] h-full" style={{ width: `${tomPct}%` }}></div>
                            <span className="absolute right-1 text-[8px] font-mono font-semibold text-slate-800">
                              {formatNumber(area.tomorrowRevenue)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dynamic VOLUME Table */}
            <div className="mt-2 overflow-x-auto">
              <table className="w-full border-collapse text-[8.5px] text-center border border-slate-300">
                <thead>
                  <tr className="bg-slate-50 font-bold border-b border-slate-300">
                    <th rowSpan={2} className="p-0.5 border-r border-slate-300 text-left font-black pl-1.5">VOLUME</th>
                    {currentSite.areas.map((area, idx) => (
                      <th
                        key={area.name}
                        colSpan={2}
                        className={`p-0.5 uppercase ${idx < currentSite.areas.length - 1 ? "border-r border-slate-300" : ""}`}
                      >
                        {area.name}
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-slate-50 font-bold border-b border-slate-300 text-slate-700 text-[8px]">
                    {currentSite.areas.map((area, idx) => (
                      <React.Fragment key={`${area.name}-sub`}>
                        <th className="p-0.2 border-r border-slate-300">OB</th>
                        <th className={`p-0.2 ${idx < currentSite.areas.length - 1 ? "border-r border-slate-300" : ""}`}>
                          COAL
                        </th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody className="font-mono text-[8px]">
                  {/* Plan Row */}
                  <tr className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="p-0.5 border-r border-slate-200 text-left font-sans font-medium pl-1.5">Plan</td>
                    {currentSite.areas.map((area, idx) => (
                      <React.Fragment key={`${area.name}-plan`}>
                        <td className="p-0.5 border-r border-slate-200">{formatNumber(area.planOb)}</td>
                        <td className={`p-0.5 ${idx < currentSite.areas.length - 1 ? "border-r border-slate-200" : ""}`}>
                          {formatNumber(area.planCoal)}
                        </td>
                      </React.Fragment>
                    ))}
                  </tr>

                  {/* Aktual Row */}
                  <tr className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="p-0.5 border-r border-slate-200 text-left font-sans font-medium pl-1.5">Aktual</td>
                    {currentSite.areas.map((area, idx) => (
                      <React.Fragment key={`${area.name}-act`}>
                        <td className="p-0.5 border-r border-slate-200 font-bold text-emerald-700">
                          {formatNumber(area.actualOb)}
                        </td>
                        <td className={`p-0.5 font-bold ${area.actualCoal > 0 ? "text-emerald-700" : "text-slate-500"} ${idx < currentSite.areas.length - 1 ? "border-r border-slate-200" : ""}`}>
                          {formatNumber(area.actualCoal)}
                        </td>
                      </React.Fragment>
                    ))}
                  </tr>

                  {/* Forecast / Plan 28 Maret Row */}
                  <tr className="hover:bg-slate-50">
                    <td className="p-0.5 border-r border-slate-200 text-left font-sans font-medium pl-1.5">Plan 28 Maret</td>
                    {currentSite.areas.map((area, idx) => (
                      <React.Fragment key={`${area.name}-fc`}>
                        <td className="p-0.5 border-r border-slate-200">{formatNumber(area.forecastOb)}</td>
                        <td className={`p-0.5 ${idx < currentSite.areas.length - 1 ? "border-r border-slate-200" : ""}`}>
                          {formatNumber(area.forecastCoal)}
                        </td>
                      </React.Fragment>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

          </div>

          {/* MIDDLE RIGHT: ANDALAN Parameter & Control Milestone (Cols 8-12) */}
          <div className="col-span-5 pl-1 flex flex-col justify-between">
            
            {/* ANDALAN Header & Parameter Maret */}
            <div className="border border-slate-300 rounded-xs overflow-hidden">
              <div className="flex items-center justify-between px-1.5 py-0.5 bg-white border-b border-slate-300">
                <div className="flex items-center gap-1.5">
                  <img src={andalanLogo} alt="Andalan" className="h-4.5 max-h-4.5 w-auto object-contain" />
                  <span className="text-[9px] font-bold text-slate-800">Parameter Maret</span>
                  <span className="text-[8px] font-semibold text-slate-500">({currentSite.name})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] font-bold text-slate-700 italic">Safety First , Production Follow</span>
                </div>
              </div>

              <table className="w-full border-collapse text-[8px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-semibold border-b border-slate-300 text-center">
                    <th className="p-0.5 text-left pl-1 font-bold">PARAMETER MARET</th>
                    <th className="p-0.5 font-bold">VOL</th>
                    <th className="p-0.5 font-bold">EWH EFFEKTIP</th>
                    <th className="p-0.5 font-bold">PROD/JAM</th>
                    <th className="p-0.5 font-bold">PROD/DAY</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-right">
                  <tr className="border-b border-slate-200">
                    <td className="p-0.5 text-left pl-1 font-sans font-medium">Vol K3LH</td>
                    <td colSpan={4} className="p-0.5 text-left font-sans text-slate-600 font-semibold pl-3">
                      {currentSite.parameters.k3lh}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-0.5 text-left pl-1 font-sans font-medium">Vol CH</td>
                    <td className="p-0.5">{formatNumber(currentSite.parameters.volCh)}</td>
                    <td className="p-0.5">{currentSite.parameters.ewhCh}</td>
                    <td className="p-0.5">{formatNumber(currentSite.parameters.prodJamCh)}</td>
                    <td className="p-0.5 font-sans">{currentSite.parameters.prodDayCh}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-0.5 text-left pl-1 font-sans font-medium">Vol CM</td>
                    <td className="p-0.5">{formatNumber(currentSite.parameters.volCm)}</td>
                    <td className="p-0.5">{currentSite.parameters.ewhCm}</td>
                    <td className="p-0.5">{formatNumber(currentSite.parameters.prodJamCm)}</td>
                    <td className="p-0.5 font-sans">{currentSite.parameters.prodDayCm}</td>
                  </tr>
                  <tr>
                    <td className="p-0.5 text-left pl-1 font-sans font-medium">Vol OB</td>
                    <td className="p-0.5 font-bold">{formatNumber(currentSite.parameters.volOb)}</td>
                    <td className="p-0.5">{currentSite.parameters.ewhOb}</td>
                    <td className="p-0.5">{formatNumber(currentSite.parameters.prodJamOb)}</td>
                    <td className="p-0.5 font-sans">{currentSite.parameters.prodDayOb}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Control Milestone PERFORMANCE EBITDA MARET */}
            <div className="mt-1">
              <div className="bg-[#0099cc] text-white font-bold text-[9px] px-1.5 py-0.5 tracking-tight flex items-center justify-between">
                <span>Control Milestone PERFORMANCE EBITDA MARET</span>
                <span className="text-[8px] font-semibold text-cyan-100">Day</span>
              </div>
              
              <table className="w-full border-collapse text-[8px] border border-slate-300">
                <thead>
                  <tr className="bg-slate-50 font-bold border-b border-slate-300 text-center">
                    <th className="p-0.5 text-left pl-1 font-bold border-r border-slate-300">PARAMETER</th>
                    <th className="p-0.5 font-bold border-r border-slate-300">PLAN</th>
                    <th className="p-0.5 font-bold border-r border-slate-300">ACTUAL</th>
                    <th className="p-0.5 font-bold border-r border-slate-300">PLAN</th>
                    <th className="p-0.5 font-bold">ACTUAL</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-center">
                  <tr className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="p-0.2 text-left pl-1 font-sans font-medium border-r border-slate-200">1 Revenue OB ($Mio)</td>
                    <td className="p-0.2 border-r border-slate-200 text-right pr-1">{currentSite.milestone.revenueObPlan}</td>
                    <td className="p-0.2 border-r border-slate-200 text-right pr-1 font-bold text-emerald-700">{currentSite.milestone.revenueObAct}</td>
                    <td className="p-0.2 border-r border-slate-200 text-slate-500">100%</td>
                    <td className="p-0.2 font-bold text-emerald-700">{currentSite.milestone.revenueObAch}</td>
                  </tr>
                  <tr className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="p-0.2 text-left pl-1 font-sans font-medium border-r border-slate-200">2 Revenue CM ($Mio)</td>
                    <td className="p-0.2 border-r border-slate-200 text-right pr-1">{currentSite.milestone.revenueCmPlan}</td>
                    <td className="p-0.2 border-r border-slate-200 text-right pr-1 font-bold text-emerald-700">{currentSite.milestone.revenueCmAct}</td>
                    <td className="p-0.2 border-r border-slate-200 text-slate-500">100%</td>
                    <td className="p-0.2 font-bold text-emerald-700">{currentSite.milestone.revenueCmAch}</td>
                  </tr>
                  <tr className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="p-0.2 text-left pl-1 font-sans font-medium border-r border-slate-200">3 Revenue CT ($Mio)</td>
                    <td className="p-0.2 border-r border-slate-200 text-right pr-1">{currentSite.milestone.revenueCtPlan}</td>
                    <td className="p-0.2 border-r border-slate-200 text-right pr-1">{currentSite.milestone.revenueCtAct}</td>
                    <td className="p-0.2 border-r border-slate-200 text-slate-500">100%</td>
                    <td className="p-0.2 font-semibold">{currentSite.milestone.revenueCtAch}</td>
                  </tr>
                  <tr className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="p-0.2 text-left pl-1 font-sans font-medium border-r border-slate-200">4 Dist OB Area 1 (km)</td>
                    <td className="p-0.2 border-r border-slate-200 text-right pr-1">{currentSite.milestone.distObArea1Plan}</td>
                    <td className="p-0.2 border-r border-slate-200 text-right pr-1">{currentSite.milestone.distObArea1Act}</td>
                    <td className="p-0.2 border-r border-slate-200 text-slate-500">100%</td>
                    <td className="p-0.2 font-semibold text-emerald-700">{currentSite.milestone.distObArea1Ach}</td>
                  </tr>
                  <tr className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="p-0.2 text-left pl-1 font-sans font-medium border-r border-slate-200">5 Dist OB Area 2 (km)</td>
                    <td className="p-0.2 border-r border-slate-200 text-right pr-1">{currentSite.milestone.distObArea2Plan}</td>
                    <td className="p-0.2 border-r border-slate-200 text-right pr-1">{currentSite.milestone.distObArea2Act}</td>
                    <td className="p-0.2 border-r border-slate-200 text-slate-500">100%</td>
                    <td className="p-0.2 font-semibold text-emerald-700">{currentSite.milestone.distObArea2Ach}</td>
                  </tr>
                  {currentSite.milestone.distObArea3Plan && (
                    <tr className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="p-0.2 text-left pl-1 font-sans font-medium border-r border-slate-200">6 Dist OB Area 3 (km)</td>
                      <td className="p-0.2 border-r border-slate-200 text-right pr-1">{currentSite.milestone.distObArea3Plan}</td>
                      <td className="p-0.2 border-r border-slate-200 text-right pr-1">{currentSite.milestone.distObArea3Act}</td>
                      <td className="p-0.2 border-r border-slate-200 text-slate-500">100%</td>
                      <td className="p-0.2 font-semibold text-emerald-700">{currentSite.milestone.distObArea3Ach}</td>
                    </tr>
                  )}
                  <tr className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="p-0.2 text-left pl-1 font-sans font-medium border-r border-slate-200">7 Fuel Ratio (Liter/Bcm)</td>
                    <td className="p-0.2 border-r border-slate-200 text-right pr-1">{currentSite.milestone.fuelRatioPlan}</td>
                    <td className="p-0.2 border-r border-slate-200 text-right pr-1">{currentSite.milestone.fuelRatioAct}</td>
                    <td className="p-0.2 border-r border-slate-200 text-slate-500">100%</td>
                    <td className="p-0.2 font-semibold text-emerald-700">{currentSite.milestone.fuelRatioAch}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-0.2 text-left pl-1 font-sans font-medium border-r border-slate-200">8 RM Cost ($Mio)</td>
                    <td className="p-0.2 border-r border-slate-200 text-right pr-1">{currentSite.milestone.rmCostPlan}</td>
                    <td className="p-0.2 border-r border-slate-200 text-right pr-1 font-bold text-emerald-700">{currentSite.milestone.rmCostAct}</td>
                    <td className="p-0.2 border-r border-slate-200 text-slate-500">100%</td>
                    <td className="p-0.2 font-bold text-emerald-700">{currentSite.milestone.rmCostAch}</td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>

        </div>

        {/* Row 3: Bottom Analytics Grid */}
        <div className="grid grid-cols-12 gap-3 pt-2">
          
          {/* Trend EBITDA & Trend FR (7 cols) */}
          <div className="col-span-7 pr-1 space-y-3">
            
            {/* Trend EBITDA */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-bold text-slate-900 text-[10px]">Trend EBITDA Maret 2026</h4>
                <div className="flex items-center gap-1 text-[8px] text-slate-600">
                  <span className="w-3 h-0.5 bg-slate-400 inline-block"></span>
                  <span>Outlook EoM: <strong className="text-slate-800">533</strong></span>
                </div>
              </div>

              <div className="h-[75px] w-full border border-slate-200 rounded p-1 bg-slate-50/50">
                <svg className="w-full h-full" viewBox="0 0 500 70" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="10" y1="35" x2="490" y2="35" stroke="#e2e8f0" strokeWidth="1" />
                  <line x1="10" y1="55" x2="490" y2="55" stroke="#e2e8f0" strokeWidth="1" />
                  
                  {/* EBITDA Trend Curve */}
                  <path
                    d="M 15 50 Q 50 55, 75 35 T 140 38 T 200 25 T 260 45 T 320 28 T 380 35 T 440 20 L 485 15"
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="2"
                  />
                  
                  {/* Target Reference Line */}
                  <line x1="15" y1="32" x2="485" y2="32" stroke="#cbd5e1" strokeWidth="1.2" strokeDasharray="3 3" />

                  {/* Marker Nodes */}
                  <circle cx="75" cy="35" r="2.5" fill="#0284c7" />
                  <circle cx="200" cy="25" r="2.5" fill="#0284c7" />
                  <circle cx="320" cy="28" r="2.5" fill="#0284c7" />
                  <circle cx="485" cy="15" r="3" fill="#0369a1" />
                </svg>
              </div>
            </div>

            {/* Trend FR OB */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-bold text-slate-900 text-[10px]">Trend FR OB Maret 2026</h4>
                <div className="flex items-center gap-3 text-[8px]">
                  <span className="flex items-center gap-1 font-semibold text-[#0284c7]">
                    <span className="w-2 h-2 bg-[#0284c7] inline-block rounded-full"></span> FR Actual (1.16)
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-[#10b981]">
                    <span className="w-2 h-2 bg-[#10b981] inline-block rounded-full"></span> FR Allowance (1.15)
                  </span>
                </div>
              </div>

              <div className="h-[65px] w-full border border-slate-200 rounded p-1 bg-slate-50/50">
                <svg className="w-full h-full" viewBox="0 0 500 60" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="10" y1="20" x2="490" y2="20" stroke="#e2e8f0" strokeWidth="1" />
                  <line x1="10" y1="45" x2="490" y2="45" stroke="#e2e8f0" strokeWidth="1" />
                  
                  {/* FR Allowance Green Line */}
                  <line x1="15" y1="36" x2="485" y2="36" stroke="#10b981" strokeWidth="1.6" strokeDasharray="4 2" />

                  {/* FR Actual Curve */}
                  <path
                    d="M 15 42 Q 60 40, 110 20 T 200 48 T 300 38 T 400 24 L 485 28"
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="2"
                  />
                  
                  <circle cx="110" cy="20" r="2.5" fill="#0284c7" />
                  <circle cx="400" cy="24" r="2.5" fill="#0284c7" />
                </svg>
              </div>
            </div>

          </div>

          {/* Radar Chart & Highlights (5 cols) */}
          <div className="col-span-5 grid grid-cols-12 gap-2">
            
            {/* Control Chart Radar Visual (7 cols) */}
            <div className="col-span-6 flex flex-col items-center justify-center p-1 bg-slate-50 border border-slate-200 rounded">
              <h4 className="font-bold text-slate-800 text-[9px] mb-1">Control Chart EBITDA</h4>
              
              <div className="w-32 h-32 relative">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  {/* Hexagon Background Webs */}
                  <polygon points="50,10 85,30 85,70 50,90 15,70 15,30" fill="none" stroke="#cbd5e1" strokeWidth="0.8" />
                  <polygon points="50,22 75,36 75,64 50,78 25,64 25,36" fill="none" stroke="#e2e8f0" strokeWidth="0.8" />
                  <polygon points="50,34 65,42 65,58 50,66 35,58 35,42" fill="none" stroke="#f1f5f9" strokeWidth="0.8" />

                  {/* Dynamic Radar Polygon Shape */}
                  <polygon points="50,15 80,32 78,65 50,75 22,66 26,32" fill="#f97316" fillOpacity="0.18" stroke="#f97316" strokeWidth="1.5" />
                  
                  {/* Spokes */}
                  <line x1="50" y1="50" x2="50" y2="10" stroke="#cbd5e1" strokeWidth="0.6" />
                  <line x1="50" y1="50" x2="85" y2="30" stroke="#cbd5e1" strokeWidth="0.6" />
                  <line x1="50" y1="50" x2="85" y2="70" stroke="#cbd5e1" strokeWidth="0.6" />
                  <line x1="50" y1="50" x2="50" y2="90" stroke="#cbd5e1" strokeWidth="0.6" />
                  <line x1="50" y1="50" x2="15" y2="70" stroke="#cbd5e1" strokeWidth="0.6" />
                  <line x1="50" y1="50" x2="15" y2="30" stroke="#cbd5e1" strokeWidth="0.6" />
                </svg>
              </div>

              <div className="text-[7.5px] text-slate-400 mt-1 italic text-center">
                *Normalized Scale vs Budget
              </div>
            </div>

            {/* Highlights (6 cols) */}
            <div className="col-span-6 flex flex-col justify-center">
              <div className="border border-slate-300 rounded p-2 bg-white shadow-xs h-full flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-[9px] mb-1 border-b border-slate-200 pb-0.5 flex items-center justify-between">
                    <span>Highlight Daily:</span>
                    <span className="text-[8px] font-bold text-[#a57c50]">{currentSite.code}</span>
                  </h4>
                  <ul className="space-y-1.5 text-[8px] text-slate-700 leading-snug">
                    {currentSite.highlight.map((hl, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-[#a57c50] font-bold">•</span>
                        <span>{hl}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="text-[7px] text-slate-400 mt-1 italic text-right border-t border-slate-100 pt-1">
                  Updated: Real-time Live Sync
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
