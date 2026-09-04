import React from "react";
import { RefreshCw } from "lucide-react";

export function MiningEbitdaDashboard({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <div className="bg-white border border-slate-300 rounded shadow-xs p-2.5 text-slate-800 text-xs overflow-x-auto min-w-[1200px] selection:bg-cyan-100">
      
      {/* Top Controls Header */}
      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
          <h1 className="text-xs font-black tracking-wider uppercase text-slate-800">
            Finance & Operational EBITDA Performance Dashboard
          </h1>
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[10px]">
            Maret 2026
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-slate-500">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-1 px-2 py-0.5 border border-slate-300 rounded font-semibold hover:bg-slate-50 text-slate-700 transition"
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
            
            {/* Spanning Bracket + Badge: +185.82% (+0,34) */}
            <div className="absolute top-0 inset-x-2 flex flex-col items-center">
              <div className="inline-flex items-center gap-1 px-2.5 py-0.2 rounded-full bg-[#00a651] text-white font-black text-[10px] shadow-xs border border-emerald-700">
                <span>+185.82% (+0,34)</span>
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
                <text x="28" y="58" fontSize="10" fontWeight="bold" fill="#0f172a" textAnchor="middle">0,19</text>
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

                {/* 11. DB */}
                <rect x="415" y="26" width="22" height="1.5" fill="#94a3b8" />
                <text x="426" y="21" fontSize="9.5" fontWeight="bold" fill="#0f172a" textAnchor="middle">0,00</text>
                <line x1="437" y1="26" x2="455" y2="26" stroke="#64748b" strokeDasharray="1.5 1.5" strokeWidth="1" />

                {/* 12. RM */}
                <rect x="455" y="12.5" width="22" height="13.5" fill="#00a651" rx="1" />
                <text x="466" y="7" fontSize="9.5" fontWeight="bold" fill="#0f172a" textAnchor="middle">0,09</text>
                <line x1="477" y1="12.5" x2="495" y2="12.5" stroke="#64748b" strokeDasharray="1.5 1.5" strokeWidth="1" />

                {/* 13. OTHERS COST */}
                <rect x="495" y="11" width="22" height="2" fill="#00a651" rx="1" />
                <text x="506" y="6" fontSize="9.5" fontWeight="bold" fill="#0f172a" textAnchor="middle">0,01</text>
                <line x1="517" y1="12.5" x2="570" y2="12.5" stroke="#64748b" strokeDasharray="1.5 1.5" strokeWidth="1" />

                {/* 14. EBITDA ACT */}
                <rect x="570" y="12.5" width="26" height="79.5" fill="#94a3b8" rx="1" />
                <text x="583" y="7" fontSize="10" fontWeight="bold" fill="#0f172a" textAnchor="middle">0,53</text>

                {/* X-Axis Labels */}
                <g fontSize="7.5" fontWeight="bold" fill="#1e293b" textAnchor="middle">
                  <text x="28" y="103">EBITDA PLAN</text>
                  <text x="66" y="103">OB</text>
                  <text x="106" y="103">CM</text>
                  <text x="146" y="103">CT</text>
                  <text x="186" y="103">DIST.</text>
                  <text x="226" y="101">FUEL</text><text x="226" y="109">PASS</text>
                  <text x="266" y="101">RISE &</text><text x="266" y="109">FALL</text>
                  <text x="306" y="101">OTHERS</text><text x="306" y="109">REV</text>
                  <text x="346" y="103">EC</text>
                  <text x="386" y="103">TYRE</text>
                  <text x="426" y="103">DB</text>
                  <text x="466" y="103">RM</text>
                  <text x="506" y="101">OTHERS</text><text x="506" y="109">COST</text>
                  <text x="583" y="103">EBITDA ACT</text>
                </g>
              </svg>
            </div>

          </div>
        </div>

        {/* TOP RIGHT: Cost Profile (Cols 8-12) */}
        <div className="col-span-5 pl-1 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-black text-[#1e3a8a] tracking-tight">Cost Profile</h2>
          </div>

          <div className="grid grid-cols-12 gap-2 items-end">
            
            {/* Cost Profile Pure SVG Waterfall */}
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

            {/* $/Bcm Table */}
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
                  <tr className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="p-0.5 border border-slate-200 text-left font-sans font-semibold pl-1">EC</td>
                    <td className="p-0.5 border border-slate-200">0.28</td>
                    <td className="p-0.5 border border-slate-200">0.30</td>
                    <td className="p-0.5 border border-slate-200">0.31</td>
                    <td className="p-0.5 border border-slate-200">0.29</td>
                  </tr>
                  <tr className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="p-0.5 border border-slate-200 text-left font-sans font-semibold pl-1">Fuel</td>
                    <td className="p-0.5 border border-slate-200">0.90</td>
                    <td className="p-0.5 border border-slate-200 font-bold text-amber-700">1.17</td>
                    <td className="p-0.5 border border-slate-200">0.89</td>
                    <td className="p-0.5 border border-slate-200 font-bold text-amber-700">1.10</td>
                  </tr>
                  <tr className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="p-0.5 border border-slate-200 text-left font-sans font-semibold pl-1">Tyre</td>
                    <td className="p-0.5 border border-slate-200">0.09</td>
                    <td className="p-0.5 border border-slate-200">0.09</td>
                    <td className="p-0.5 border border-slate-200">0.09</td>
                    <td className="p-0.5 border border-slate-200">0.09</td>
                  </tr>
                  <tr className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="p-0.5 border border-slate-200 text-left font-sans font-semibold pl-1">RM</td>
                    <td className="p-0.5 border border-slate-200">0.57</td>
                    <td className="p-0.5 border border-slate-200">0.63</td>
                    <td className="p-0.5 border border-slate-200">0.57</td>
                    <td className="p-0.5 border border-slate-200">0.64</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-0.5 border border-slate-200 text-left font-sans font-semibold pl-1">Othr</td>
                    <td className="p-0.5 border border-slate-200">0.42</td>
                    <td className="p-0.5 border border-slate-200">0.40</td>
                    <td className="p-0.5 border border-slate-200">0.41</td>
                    <td className="p-0.5 border border-slate-200">0.36</td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>

        </div>

      </div>

      {/* Row 2: Middle (Revenue View & Volume) vs (BUMA Parameter & Control Milestone) */}
      <div className="grid grid-cols-12 gap-3 py-2 border-b border-slate-300">
        
        {/* MIDDLE LEFT: Revenue View & Volume (Cols 1-7) */}
        <div className="col-span-7 flex flex-col justify-between pr-1">
          
          <div className="flex items-center gap-2">
            <div className="w-14 font-black text-slate-800 text-[10px] leading-tight shrink-0 tracking-tight">
              revenue<br/>view
            </div>

            <div className="flex-1 grid grid-cols-3 gap-2">
              {/* AREA 1 */}
              <div className="bg-white border border-slate-200 rounded p-1">
                <div className="text-center font-bold text-slate-800 text-[9px] mb-0.5 uppercase">AREA 1</div>
                <div className="space-y-1">
                  <div className="flex items-center text-[8.5px]">
                    <span className="w-12 text-right pr-1 font-semibold text-slate-600 shrink-0">Plan</span>
                    <div className="flex-1 bg-slate-100 h-3.5 relative flex items-center">
                      <div className="bg-[#00c5cd] h-full" style={{ width: "45%" }}></div>
                      <span className="absolute right-1 text-[8px] font-mono font-semibold text-slate-800">66,562</span>
                    </div>
                  </div>
                  <div className="flex items-center text-[8.5px]">
                    <span className="w-12 text-right pr-1 font-semibold text-slate-600 shrink-0">Aktual</span>
                    <div className="flex-1 bg-slate-100 h-3.5 relative flex items-center">
                      <div className="bg-[#00c5cd] h-full" style={{ width: "50%" }}></div>
                      <span className="absolute right-1 text-[8px] font-mono font-semibold text-slate-800">71,220</span>
                    </div>
                  </div>
                  <div className="flex items-center text-[8.5px]">
                    <span className="w-12 text-right pr-1 font-semibold text-slate-600 shrink-0">Tomorrow</span>
                    <div className="flex-1 bg-slate-100 h-3.5 relative flex items-center">
                      <div className="bg-[#00c5cd] h-full" style={{ width: "95%" }}></div>
                      <span className="absolute right-1 text-[8px] font-mono font-semibold text-slate-800">142,065</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* AREA 2 */}
              <div className="bg-white border border-slate-200 rounded p-1">
                <div className="text-center font-bold text-slate-800 text-[9px] mb-0.5 uppercase">AREA 2</div>
                <div className="space-y-1">
                  <div className="flex items-center text-[8.5px]">
                    <span className="w-12 text-right pr-1 font-semibold text-slate-600 shrink-0">Plan</span>
                    <div className="flex-1 bg-slate-100 h-3.5 relative flex items-center">
                      <div className="bg-[#00c5cd] h-full" style={{ width: "63%" }}></div>
                      <span className="absolute right-1 text-[8px] font-mono font-semibold text-slate-800">714,438</span>
                    </div>
                  </div>
                  <div className="flex items-center text-[8.5px]">
                    <span className="w-12 text-right pr-1 font-semibold text-slate-600 shrink-0">Aktual</span>
                    <div className="flex-1 bg-slate-100 h-3.5 relative flex items-center">
                      <div className="bg-[#00c5cd] h-full" style={{ width: "60%" }}></div>
                      <span className="absolute right-1 text-[8px] font-mono font-semibold text-slate-800">682,058</span>
                    </div>
                  </div>
                  <div className="flex items-center text-[8.5px]">
                    <span className="w-12 text-right pr-1 font-semibold text-slate-600 shrink-0">Tomorrow</span>
                    <div className="flex-1 bg-slate-100 h-3.5 relative flex items-center">
                      <div className="bg-[#00c5cd] h-full" style={{ width: "98%" }}></div>
                      <span className="absolute right-1 text-[8px] font-mono font-semibold text-slate-800">1,133,226</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* AREA 3 */}
              <div className="bg-white border border-slate-200 rounded p-1">
                <div className="text-center font-bold text-slate-800 text-[9px] mb-0.5 uppercase">AREA 3</div>
                <div className="space-y-1">
                  <div className="flex items-center text-[8.5px]">
                    <span className="w-12 text-right pr-1 font-semibold text-slate-600 shrink-0">Plan</span>
                    <div className="flex-1 bg-slate-100 h-3.5 relative flex items-center">
                      <div className="bg-[#00c5cd] h-full" style={{ width: "44%" }}></div>
                      <span className="absolute right-1 text-[8px] font-mono font-semibold text-slate-800">186,565</span>
                    </div>
                  </div>
                  <div className="flex items-center text-[8.5px]">
                    <span className="w-12 text-right pr-1 font-semibold text-slate-600 shrink-0">Aktual</span>
                    <div className="flex-1 bg-slate-100 h-3.5 relative flex items-center">
                      <div className="bg-[#00c5cd] h-full" style={{ width: "55%" }}></div>
                      <span className="absolute right-1 text-[8px] font-mono font-semibold text-slate-800">231,445</span>
                    </div>
                  </div>
                  <div className="flex items-center text-[8.5px]">
                    <span className="w-12 text-right pr-1 font-semibold text-slate-600 shrink-0">Tomorrow</span>
                    <div className="flex-1 bg-slate-100 h-3.5 relative flex items-center">
                      <div className="bg-[#00c5cd] h-full" style={{ width: "95%" }}></div>
                      <span className="absolute right-1 text-[8px] font-mono font-semibold text-slate-800">417,037</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* VOLUME Table */}
          <div className="mt-2">
            <table className="w-full border-collapse text-[8.5px] text-center border border-slate-300">
              <thead>
                <tr className="bg-slate-50 font-bold border-b border-slate-300">
                  <th rowSpan={2} className="p-0.5 border-r border-slate-300 text-left font-black pl-1.5">VOLUME</th>
                  <th colSpan={2} className="p-0.5 border-r border-slate-300 uppercase">AREA 1</th>
                  <th colSpan={2} className="p-0.5 border-r border-slate-300 uppercase">AREA 2</th>
                  <th colSpan={2} className="p-0.5 uppercase">AREA 3</th>
                </tr>
                <tr className="bg-slate-50 font-bold border-b border-slate-300 text-slate-700 text-[8px]">
                  <th className="p-0.2 border-r border-slate-300">OB</th>
                  <th className="p-0.2 border-r border-slate-300">COAL</th>
                  <th className="p-0.2 border-r border-slate-300">OB</th>
                  <th className="p-0.2 border-r border-slate-300">COAL</th>
                  <th className="p-0.2 border-r border-slate-300">OB</th>
                  <th className="p-0.2">COAL</th>
                </tr>
              </thead>
              <tbody className="font-mono text-[8px]">
                <tr className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="p-0.5 border-r border-slate-200 text-left font-sans font-medium pl-1.5">Plan</td>
                  <td className="p-0.5 border-r border-slate-200">19,355</td>
                  <td className="p-0.5 border-r border-slate-200">645</td>
                  <td className="p-0.5 border-r border-slate-200">232,258</td>
                  <td className="p-0.5 border-r border-slate-200">49,032</td>
                  <td className="p-0.5 border-r border-slate-200">100,000</td>
                  <td className="p-0.5">38,710</td>
                </tr>
                <tr className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="p-0.5 border-r border-slate-200 text-left font-sans font-medium pl-1.5">Aktual</td>
                  <td className="p-0.5 border-r border-slate-200 font-bold text-emerald-700">31,820</td>
                  <td className="p-0.5 border-r border-slate-200">0</td>
                  <td className="p-0.5 border-r border-slate-200 font-bold text-emerald-700">307,674</td>
                  <td className="p-0.5 border-r border-slate-200 font-bold text-emerald-700">89,249</td>
                  <td className="p-0.5 border-r border-slate-200 font-bold text-emerald-700">149,687</td>
                  <td className="p-0.5 font-bold text-emerald-700">33,723</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-0.5 border-r border-slate-200 text-left font-sans font-medium pl-1.5">Plan 28 Maret</td>
                  <td className="p-0.5 border-r border-slate-200">28,363</td>
                  <td className="p-0.5 border-r border-slate-200">19,887</td>
                  <td className="p-0.5 border-r border-slate-200">358,092</td>
                  <td className="p-0.5 border-r border-slate-200">104,904</td>
                  <td className="p-0.5 border-r border-slate-200">160,618</td>
                  <td className="p-0.5">50,481</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>

        {/* MIDDLE RIGHT: BUMA Parameter & Control Milestone (Cols 8-12) */}
        <div className="col-span-5 pl-1 flex flex-col justify-between">
          
          {/* BUMA Header & Parameter Maret */}
          <div className="border border-slate-300 rounded-xs overflow-hidden">
            <div className="flex items-center justify-between px-1.5 py-0.5 bg-white border-b border-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black tracking-tight text-[#00a651]">BUMA</span>
                <span className="text-[9px] font-bold text-slate-800">Parameter Maret</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] font-bold text-slate-700 italic">Safety First , Production Follow</span>
                <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-cyan-500 via-emerald-400 to-amber-400 border border-slate-300 flex items-center justify-center">
                  <span className="text-[6px] font-black text-white">B</span>
                </div>
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
                  <td colSpan={4} className="p-0.5 text-left font-sans text-slate-600 font-semibold pl-3">Zero ( 0 )</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-0.5 text-left pl-1 font-sans font-medium">Vol CH</td>
                  <td className="p-0.5">1,400,000</td>
                  <td className="p-0.5">481</td>
                  <td className="p-0.5">2,909</td>
                  <td className="p-0.5 font-sans">45,161 Ton</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-0.5 text-left pl-1 font-sans font-medium">Vol CM</td>
                  <td className="p-0.5">2,740,000</td>
                  <td className="p-0.5">308</td>
                  <td className="p-0.5">8,885</td>
                  <td className="p-0.5 font-sans">88,387 Ton/Jam</td>
                </tr>
                <tr>
                  <td className="p-0.5 text-left pl-1 font-sans font-medium">Vol OB</td>
                  <td className="p-0.5 font-bold">10,900,000</td>
                  <td className="p-0.5">335</td>
                  <td className="p-0.5">32,537</td>
                  <td className="p-0.5 font-sans">351,613 Bcm/Jam</td>
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
                  <td className="p-0.2 border-r border-slate-200 text-right pr-1">$ 0.66</td>
                  <td className="p-0.2 border-r border-slate-200 text-right pr-1 font-bold text-emerald-700">$ 0.87</td>
                  <td className="p-0.2 border-r border-slate-200 text-slate-500">100%</td>
                  <td className="p-0.2 font-bold text-emerald-700">133%</td>
                </tr>
                <tr className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="p-0.2 text-left pl-1 font-sans font-medium border-r border-slate-200">2 Revenue CM ($Mio)</td>
                  <td className="p-0.2 border-r border-slate-200 text-right pr-1">$ 0.08</td>
                  <td className="p-0.2 border-r border-slate-200 text-right pr-1 font-bold text-emerald-700">$ 0.11</td>
                  <td className="p-0.2 border-r border-slate-200 text-slate-500">100%</td>
                  <td className="p-0.2 font-bold text-emerald-700">132%</td>
                </tr>
                <tr className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="p-0.2 text-left pl-1 font-sans font-medium border-r border-slate-200">3 Revenue CT ($Mio)</td>
                  <td className="p-0.2 border-r border-slate-200 text-right pr-1">$ 0.15</td>
                  <td className="p-0.2 border-r border-slate-200 text-right pr-1">$ 0.15</td>
                  <td className="p-0.2 border-r border-slate-200 text-slate-500">100%</td>
                  <td className="p-0.2 font-semibold">103%</td>
                </tr>
                <tr className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="p-0.2 text-left pl-1 font-sans font-medium border-r border-slate-200">4 Dist OB Area 1 (km)</td>
                  <td className="p-0.2 border-r border-slate-200 text-right pr-1">3.90</td>
                  <td className="p-0.2 border-r border-slate-200 text-right pr-1">3.46</td>
                  <td className="p-0.2 border-r border-slate-200 text-slate-500">100%</td>
                  <td className="p-0.2 font-bold text-amber-700">89%</td>
                </tr>
                <tr className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="p-0.2 text-left pl-1 font-sans font-medium border-r border-slate-200">5 Dist OB Area 2 (km)</td>
                  <td className="p-0.2 border-r border-slate-200 text-right pr-1">2.80</td>
                  <td className="p-0.2 border-r border-slate-200 text-right pr-1">2.74</td>
                  <td className="p-0.2 border-r border-slate-200 text-slate-500">100%</td>
                  <td className="p-0.2 font-semibold">98%</td>
                </tr>
                <tr className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="p-0.2 text-left pl-1 font-sans font-medium border-r border-slate-200">6 Dist OB Area 3 (km)</td>
                  <td className="p-0.2 border-r border-slate-200 text-right pr-1">1.66</td>
                  <td className="p-0.2 border-r border-slate-200 text-right pr-1">1.34</td>
                  <td className="p-0.2 border-r border-slate-200 text-slate-500">100%</td>
                  <td className="p-0.2 font-bold text-amber-700">81%</td>
                </tr>
                <tr className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="p-0.2 text-left pl-1 font-sans font-medium border-r border-slate-200">7 Fuel Ratio (Liter/Bcm)</td>
                  <td className="p-0.2 border-r border-slate-200 text-right pr-1">1.15</td>
                  <td className="p-0.2 border-r border-slate-200 text-right pr-1">1.16</td>
                  <td className="p-0.2 border-r border-slate-200 text-slate-500">100%</td>
                  <td className="p-0.2 font-bold text-amber-700">89%</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-0.2 text-left pl-1 font-sans font-medium border-r border-slate-200">8 RM Cost ($Mio)</td>
                  <td className="p-0.2 border-r border-slate-200 text-right pr-1">$ 0.27</td>
                  <td className="p-0.2 border-r border-slate-200 text-right pr-1 font-bold text-emerald-700">$ 0.18</td>
                  <td className="p-0.2 border-r border-slate-200 text-slate-500">100%</td>
                  <td className="p-0.2 font-bold text-emerald-700">147%</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>

      </div>

      {/* Row 3: Bottom (Trend EBITDA & FR OB) vs (Radar & Highlights) */}
      <div className="grid grid-cols-12 gap-3 pt-1.5">
        
        {/* BOTTOM LEFT: Trends (Cols 1-7) */}
        <div className="col-span-7 flex flex-col gap-1.5 pr-1">
          
          {/* 1. Trend EBITDA Maret 2026 */}
          <div className="bg-white border border-slate-200 rounded p-1">
            <div className="flex items-center justify-between mb-0.5">
              <h3 className="font-bold text-slate-800 text-[9.5px] tracking-tight">Trend EBITDA Maret 2026</h3>
              <div className="flex items-center gap-1 text-[8px]">
                <span className="inline-block w-2.5 h-0.5 bg-[#475569]"></span>
                <span className="text-slate-600 font-semibold">Outlook EoM</span>
              </div>
            </div>

            <div className="relative h-[62px] w-full">
              <svg className="w-full h-full" viewBox="0 0 650 75" preserveAspectRatio="none">
                <line x1="10" y1="45" x2="640" y2="45" stroke="#cbd5e1" strokeDasharray="2 2" strokeWidth="1" />
                <path d="M 15 62 C 80 68, 150 65, 230 52 C 320 38, 420 46, 520 49 C 570 51, 610 45, 640 40" 
                      fill="none" stroke="#64748b" strokeWidth="2" />
                <path d="M 25 30 L 48 48 L 71 42 L 94 50 L 117 62 L 140 70 L 163 60 L 186 45 L 209 41 L 232 36 L 255 38 L 278 24 L 301 32 L 324 40 L 347 26 L 370 46 L 393 60 L 416 41 L 439 61 L 462 31 L 485 52 L 508 64 L 531 40 L 554 36 L 577 23 L 600 21 L 623 10"
                      fill="none" stroke="#0ea5e9" strokeWidth="1.6" strokeDasharray="2 2" />
              </svg>

              <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none flex justify-between px-1 items-center">
                <span className="text-[6.5px] font-bold px-0.5 bg-[#e0f2fe] border border-cyan-300 rounded text-cyan-900 absolute left-[1%]" style={{ top: "24px" }}>213</span>
                <span className="text-[6.5px] font-bold px-0.5 bg-[#e0f2fe] border border-cyan-300 rounded text-cyan-900 absolute left-[4%]" style={{ top: "40px" }}>-65</span>
                <span className="text-[6.5px] font-bold px-0.5 bg-[#e0f2fe] border border-cyan-300 rounded text-cyan-900 absolute left-[7%]" style={{ top: "33px" }}>16</span>
                <span className="text-[6.5px] font-bold px-0.5 bg-[#e0f2fe] border border-cyan-300 rounded text-cyan-900 absolute left-[10%]" style={{ top: "42px" }}>-81</span>
                <span className="text-[6.5px] font-bold px-0.5 bg-[#e0f2fe] border border-cyan-300 rounded text-cyan-900 absolute left-[14%]" style={{ top: "50px" }}>-366</span>
                <span className="text-[6.5px] font-bold px-0.5 bg-[#e0f2fe] border border-cyan-300 rounded text-cyan-900 absolute left-[18%]" style={{ top: "58px" }}>-513</span>
                <span className="text-[6.5px] font-bold px-0.5 bg-[#e0f2fe] border border-cyan-300 rounded text-cyan-900 absolute left-[22%]" style={{ top: "50px" }}>-344</span>

                <span className="text-[6.5px] font-bold px-0.5 bg-[#e0f2fe] border border-cyan-300 rounded text-cyan-900 absolute left-[30%]" style={{ top: "33px" }}>40</span>
                <span className="text-[6.5px] font-bold px-0.5 bg-[#e0f2fe] border border-cyan-300 rounded text-cyan-900 absolute left-[34%]" style={{ top: "26px" }}>128</span>
                <span className="text-[6.5px] font-bold px-0.5 bg-[#e0f2fe] border border-cyan-300 rounded text-cyan-900 absolute left-[38%]" style={{ top: "30px" }}>89</span>
                <span className="text-[6.5px] font-bold px-0.5 bg-[#e0f2fe] border border-cyan-300 rounded text-cyan-900 absolute left-[42%]" style={{ top: "16px" }}>327</span>
                <span className="text-[6.5px] font-bold px-0.5 bg-[#e0f2fe] border border-cyan-300 rounded text-cyan-900 absolute left-[46%]" style={{ top: "25px" }}>167</span>
                <span className="text-[6.5px] font-bold px-0.5 bg-[#e0f2fe] border border-cyan-300 rounded text-cyan-900 absolute left-[49%]" style={{ top: "32px" }}>57</span>
                <span className="text-[6.5px] font-bold px-0.5 bg-[#e0f2fe] border border-cyan-300 rounded text-cyan-900 absolute left-[53%]" style={{ top: "18px" }}>291</span>
                <span className="text-[6.5px] font-bold px-0.5 bg-[#e0f2fe] border border-cyan-300 rounded text-cyan-900 absolute left-[56%]" style={{ top: "38px" }}>-33</span>
                <span className="text-[6.5px] font-bold px-0.5 bg-[#e0f2fe] border border-cyan-300 rounded text-cyan-900 absolute left-[60%]" style={{ top: "49px" }}>-319</span>
                <span className="text-[6.5px] font-bold px-0.5 bg-[#e0f2fe] border border-cyan-300 rounded text-cyan-900 absolute left-[63%]" style={{ top: "33px" }}>45</span>
                <span className="text-[6.5px] font-bold px-0.5 bg-[#e0f2fe] border border-cyan-300 rounded text-cyan-900 absolute left-[66%]" style={{ top: "50px" }}>-345</span>
                <span className="text-[6.5px] font-bold px-0.5 bg-[#e0f2fe] border border-cyan-300 rounded text-cyan-900 absolute left-[71%]" style={{ top: "23px" }}>209</span>
                <span className="text-[6.5px] font-bold px-0.5 bg-[#e0f2fe] border border-cyan-300 rounded text-cyan-900 absolute left-[75%]" style={{ top: "41px" }}>-124</span>
                <span className="text-[6.5px] font-bold px-0.5 bg-[#e0f2fe] border border-cyan-300 rounded text-cyan-900 absolute left-[79%]" style={{ top: "52px" }}>-388</span>
                <span className="text-[6.5px] font-bold px-0.5 bg-[#e0f2fe] border border-cyan-300 rounded text-cyan-900 absolute left-[83%]" style={{ top: "33px" }}>52</span>
                <span className="text-[6.5px] font-bold px-0.5 bg-[#e0f2fe] border border-cyan-300 rounded text-cyan-900 absolute left-[86%]" style={{ top: "29px" }}>98</span>
                <span className="text-[6.5px] font-bold px-0.5 bg-[#e0f2fe] border border-cyan-300 rounded text-cyan-900 absolute left-[89%]" style={{ top: "17px" }}>304</span>
                <span className="text-[6.5px] font-bold px-0.5 bg-[#e0f2fe] border border-cyan-300 rounded text-cyan-900 absolute left-[92%]" style={{ top: "15px" }}>322</span>
                <span className="text-[6.5px] font-bold px-0.5 bg-[#e0f2fe] border border-cyan-300 rounded text-cyan-900 absolute left-[95%]" style={{ top: "4px" }}>532</span>
              </div>
            </div>

            <div className="flex justify-between px-1 text-[7px] font-mono text-slate-500 border-t border-slate-200 pt-0.2">
              <span>01</span><span>02</span><span>03</span><span>04</span><span>05</span><span>06</span><span>07</span><span>08</span><span>09</span><span>10</span><span>11</span><span>12</span><span>13</span><span>14</span><span>15</span><span>16</span><span>17</span><span>18</span><span>19</span><span>20</span><span>21</span><span>22</span><span>23</span><span>24</span><span>25</span><span>26</span>
            </div>
          </div>

          {/* 2. Trend FR OB Maret 2026 */}
          <div className="bg-white border border-slate-200 rounded p-1">
            <div className="flex items-center justify-between mb-0.5">
              <h3 className="font-bold text-slate-800 text-[9.5px] tracking-tight">Trend FR OB Maret 2026</h3>
            </div>

            <div className="relative h-[62px] w-full">
              <svg className="w-full h-full" viewBox="0 0 650 75" preserveAspectRatio="none">
                <line x1="10" y1="15" x2="640" y2="15" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="10" y1="40" x2="640" y2="40" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="10" y1="60" x2="640" y2="60" stroke="#f1f5f9" strokeWidth="1" />

                {/* FR Allowance Line (Green) */}
                <path d="M 20 60 L 45 59 L 70 61 L 95 58 L 120 60 L 145 61 L 170 63 L 195 59 L 220 57 L 245 61 L 270 59 L 295 58 L 320 55 L 345 56 L 370 54 L 395 58 L 420 57 L 445 56 L 470 57 L 495 56 L 520 58 L 545 55 L 570 58 L 595 58 L 620 60"
                      fill="none" stroke="#00a651" strokeWidth="1.8" />
                <g fill="#00a651">
                  <rect x="18.5" y="58.5" width="3" height="3" /><rect x="43.5" y="57.5" width="3" height="3" /><rect x="68.5" y="59.5" width="3" height="3" />
                  <rect x="93.5" y="56.5" width="3" height="3" /><rect x="118.5" y="58.5" width="3" height="3" /><rect x="143.5" y="59.5" width="3" height="3" />
                  <rect x="168.5" y="61.5" width="3" height="3" /><rect x="193.5" y="57.5" width="3" height="3" /><rect x="218.5" y="55.5" width="3" height="3" />
                  <rect x="243.5" y="59.5" width="3" height="3" /><rect x="268.5" y="57.5" width="3" height="3" /><rect x="293.5" y="56.5" width="3" height="3" />
                  <rect x="318.5" y="53.5" width="3" height="3" /><rect x="343.5" y="54.5" width="3" height="3" /><rect x="368.5" y="52.5" width="3" height="3" />
                  <rect x="393.5" y="56.5" width="3" height="3" /><rect x="418.5" y="55.5" width="3" height="3" /><rect x="443.5" y="54.5" width="3" height="3" />
                  <rect x="468.5" y="55.5" width="3" height="3" /><rect x="493.5" y="54.5" width="3" height="3" /><rect x="518.5" y="56.5" width="3" height="3" />
                  <rect x="543.5" y="53.5" width="3" height="3" /><rect x="568.5" y="56.5" width="3" height="3" /><rect x="593.5" y="56.5" width="3" height="3" />
                  <rect x="618.5" y="58.5" width="3" height="3" />
                </g>

                {/* FR Actual Line (Blue) */}
                <path d="M 20 44 L 45 47 L 70 48 L 95 38 L 120 34 L 145 8 L 170 40 L 195 45 L 220 41 L 245 48 L 270 51 L 295 42 L 320 45 L 345 50 L 370 37 L 395 25 L 420 45 L 445 19 L 470 44 L 495 34 L 520 13 L 545 37 L 570 41 L 595 45 L 620 48"
                      fill="none" stroke="#0099cc" strokeWidth="2.2" />
                <g fill="#0099cc">
                  <circle cx="20" cy="44" r="2.2" /><circle cx="45" cy="47" r="2.2" /><circle cx="70" cy="48" r="2.2" /><circle cx="95" cy="38" r="2.2" />
                  <circle cx="120" cy="34" r="2.2" /><circle cx="145" cy="8" r="2.6" /><circle cx="170" cy="40" r="2.2" /><circle cx="195" cy="45" r="2.2" />
                  <circle cx="220" cy="41" r="2.2" /><circle cx="245" cy="48" r="2.2" /><circle cx="270" cy="51" r="2.2" /><circle cx="295" cy="42" r="2.2" />
                  <circle cx="320" cy="45" r="2.2" /><circle cx="345" cy="50" r="2.2" /><circle cx="370" cy="37" r="2.2" /><circle cx="395" cy="25" r="2.2" />
                  <circle cx="420" cy="45" r="2.2" /><circle cx="445" cy="19" r="2.2" /><circle cx="470" cy="44" r="2.2" /><circle cx="495" cy="34" r="2.2" />
                  <circle cx="520" cy="13" r="2.6" /><circle cx="545" cy="37" r="2.2" /><circle cx="570" cy="41" r="2.2" /><circle cx="595" cy="45" r="2.2" />
                  <circle cx="620" cy="48" r="2.2" />
                </g>

                <text x="145" y="5" fontSize="8.5" fontWeight="bold" fill="#0f172a" textAnchor="middle">2,87</text>
                <text x="445" y="14" fontSize="8.5" fontWeight="bold" fill="#0f172a" textAnchor="middle">2,46</text>
                <text x="520" y="9" fontSize="8.5" fontWeight="bold" fill="#0f172a" textAnchor="middle">2,72</text>
              </svg>
            </div>

            <div className="flex justify-between px-1 text-[7px] font-mono text-slate-500 border-t border-slate-200 pt-0.2">
              <span>01</span><span>02</span><span>03</span><span>04</span><span>05</span><span>06</span><span>07</span><span>08</span><span>09</span><span>10</span><span>11</span><span>12</span><span>13</span><span>14</span><span>15</span><span>16</span><span>17</span><span>18</span><span>19</span><span>20</span><span>21</span><span>22</span><span>23</span><span>24</span><span>25</span>
            </div>
            <div className="flex items-center justify-center gap-4 mt-0.5 text-[8px] font-semibold">
              <div className="flex items-center gap-1 text-[#0099cc]">
                <span className="inline-block w-2.5 h-0.5 bg-[#0099cc] relative"><span className="w-1 h-1 rounded-full bg-[#0099cc] absolute -top-0.5 left-1/2 -translate-x-1/2"></span></span>
                <span>FR Actual</span>
              </div>
              <div className="flex items-center gap-1 text-[#00a651]">
                <span className="inline-block w-2.5 h-0.5 bg-[#00a651] relative"><span className="w-1 h-1 bg-[#00a651] absolute -top-0.5 left-1/2 -translate-x-1/2"></span></span>
                <span>FR Allowance</span>
              </div>
            </div>
          </div>

        </div>

        {/* BOTTOM RIGHT: Radar & Highlights (Cols 8-12) */}
        <div className="col-span-5 pl-1 grid grid-cols-12 gap-2 items-center">
          
          {/* Radar Chart (7 cols) */}
          <div className="col-span-7 flex flex-col items-center">
            <div className="text-center font-bold text-slate-800 text-[9.5px] mb-0.5">Control Chart EBITDA</div>
            
            <div className="relative w-40 h-40">
              <svg className="w-full h-full" viewBox="0 0 200 200">
                <polygon points="100,20 156,43 180,100 156,157 100,180 44,157 20,100 44,43" fill="none" stroke="#e2e8f0" strokeWidth="0.9" />
                <polygon points="100,40 142,57 160,100 142,143 100,160 58,143 40,100 58,57" fill="none" stroke="#e2e8f0" strokeWidth="0.9" />
                <polygon points="100,60 128,71 140,100 128,129 100,140 72,129 60,100 72,71" fill="none" stroke="#e2e8f0" strokeWidth="0.9" />
                <polygon points="100,80 114,86 120,100 114,114 100,120 86,114 80,100 86,86" fill="none" stroke="#e2e8f0" strokeWidth="0.9" />
                
                <line x1="100" y1="100" x2="100" y2="20" stroke="#e2e8f0" strokeWidth="0.9" />
                <line x1="100" y1="100" x2="156" y2="43" stroke="#e2e8f0" strokeWidth="0.9" />
                <line x1="100" y1="100" x2="180" y2="100" stroke="#e2e8f0" strokeWidth="0.9" />
                <line x1="100" y1="100" x2="156" y2="157" stroke="#e2e8f0" strokeWidth="0.9" />
                <line x1="100" y1="100" x2="100" y2="180" stroke="#e2e8f0" strokeWidth="0.9" />
                <line x1="100" y1="100" x2="44" y2="157" stroke="#e2e8f0" strokeWidth="0.9" />
                <line x1="100" y1="100" x2="20" y2="100" stroke="#e2e8f0" strokeWidth="0.9" />
                <line x1="100" y1="100" x2="44" y2="43" stroke="#e2e8f0" strokeWidth="0.9" />

                {/* 100% Target Baseline */}
                <polygon points="100,45 139,61 155,100 139,139 100,155 61,139 45,100 61,61" fill="none" stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="2 2" />

                {/* Actual Performance Polygon */}
                <polygon points="100,28 152,48 157,100 135,135 100,154 69,131 46,100 42,42" 
                         fill="rgba(249, 115, 22, 0.08)" stroke="#f97316" strokeWidth="1.6" strokeDasharray="2.5 2" />
                
                <circle cx="100" cy="28" r="2" fill="#f97316" />
                <circle cx="152" cy="48" r="2" fill="#f97316" />
                <circle cx="157" cy="100" r="2.5" fill="#f97316" />
                <circle cx="135" cy="135" r="2" fill="#f97316" />
                <circle cx="100" cy="154" r="2" fill="#f97316" />
                <circle cx="69" cy="131" r="2" fill="#f97316" />
                <circle cx="46" cy="100" r="2" fill="#f97316" />
                <circle cx="42" cy="42" r="2" fill="#f97316" />
              </svg>

              <div className="absolute -top-3.5 inset-x-0 text-center text-[7px] font-bold text-slate-700 leading-tight">
                Revenue OB<br/>($Mio) 133%
              </div>
              <div className="absolute top-2 -right-9 text-[7px] font-bold text-slate-700 leading-tight text-left">
                Revenue CM<br/>($Mio) 132%
              </div>
              <div className="absolute top-1/2 -right-11 -translate-y-1/2 text-[7px] font-bold text-slate-700 leading-tight text-left">
                Revenue CT<br/>($Mio) 103%
              </div>
              <div className="absolute bottom-2 -right-8 text-[7px] font-bold text-slate-700 leading-tight text-left">
                Dist OB Area 1<br/>(km) 89%
              </div>
              <div className="absolute -bottom-3 inset-x-0 text-center text-[7px] font-bold text-slate-700 leading-tight">
                Dist OB Area 2 (km) 98%
              </div>
              <div className="absolute bottom-2 -left-8 text-[7px] font-bold text-slate-700 leading-tight text-right">
                Dist OB Area 3<br/>(km) 81%
              </div>
              <div className="absolute top-1/2 -left-11 -translate-y-1/2 text-[7px] font-bold text-slate-700 leading-tight text-right">
                Fuel Ratio<br/>(Liter/Bcm) 99%
              </div>
              <div className="absolute top-2 -left-9 text-[7px] font-bold text-slate-700 leading-tight text-right">
                RM Cost<br/>($Mio) 147%
              </div>
            </div>

            <div className="text-[7px] text-slate-400 mt-2 italic">
              *Based On Budget Master Budget Maret 2026
            </div>
          </div>

          {/* Highlight Daily EBITDA (5 cols) */}
          <div className="col-span-5 flex flex-col justify-center">
            <div className="border border-slate-300 rounded p-2 bg-white shadow-xs">
              <h4 className="font-bold text-slate-900 text-[9.5px] mb-1.5 border-b border-slate-200 pb-0.5">
                Highlight Daily EBITDA :
              </h4>
              <ul className="space-y-1.5 text-[8.5px] text-slate-700 leading-snug">
                <li className="flex items-start gap-1">
                  <span className="text-slate-400 mt-0.5">•</span>
                  <span>
                    Performance Ebitda gain <strong>187%</strong> eqv <strong>0,34 musd</strong> didrive dari tercapainya revenue <strong>28%</strong> dan saving cost <strong>14%</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-slate-400 mt-0.5">•</span>
                  <span>
                    Fuel Ratio Usage OB tgl 25 dengan dist. OB 2.25 km yaitu <strong>1.33 L/Bcm</strong> dengan pencapaian OB 426 kbcm, FR Allowance di <strong>0.91 L/Bcm</strong> sehingga over 0.42 L/Bcm.
                  </span>
                </li>
              </ul>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
