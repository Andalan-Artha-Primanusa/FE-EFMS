import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api, API_BASE } from '../lib/api';
import { Loader2, Upload, FileText, Download } from 'lucide-react';

export function KopraPage() {
  const [tab, setTab] = useState<'voucher' | 'supplier'>('voucher');
  const [file, setFile] = useState<File | null>(null);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState({
    voucherFrom: '',
    voucherTo: '',
    transferDate: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
    debitAccountNo: ''
  });

  const [suppliers, setSuppliers] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('feastkop_suppliers') || '[]');
    } catch {
      return [];
    }
  });

  const [search, setSearch] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [syncMessage, setSyncMessage] = useState('');

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    setSyncMessage('');
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await api<{data: any[]}>('/api/kopra/parse-voucher', {
        method: 'POST',
        body: formData
      });
      
      const parsedGroups = res.data || [];
      setVouchers(parsedGroups);
      
      // Sync suppliers logic
      let updatedCount = 0;
      const suppliersMap = new Map(suppliers.map(s => [s.nama.toUpperCase(), s]));
      
      parsedGroups.forEach(v => {
        if (!v.vendor) return;
        const norm = v.vendor.toUpperCase();
        const existing = suppliersMap.get(norm);
        if (existing) {
          if (v.bank && v.bank !== existing.namaBank) { existing.namaBank = v.bank; updatedCount++; }
          if (v.noRekening && v.noRekening !== existing.noRekening) { existing.noRekening = v.noRekening; updatedCount++; }
        } else {
          suppliersMap.set(norm, {
            nama: v.vendor,
            email: v.email || '',
            namaBank: v.bank || '',
            noRekening: v.noRekening || ''
          });
          updatedCount++;
        }
      });
      
      if (updatedCount > 0) {
        const newSuppliers = Array.from(suppliersMap.values());
        setSuppliers(newSuppliers);
        localStorage.setItem('feastkop_suppliers', JSON.stringify(newSuppliers));
        setSyncMessage(`✓ ${updatedCount} rekening bank pemasok otomatis disinkronkan ke database.`);
      }

    } catch (err: any) {
      setError(err.message || 'Gagal memproses voucher');
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (noVoucher: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(noVoucher)) newSet.delete(noVoucher);
    else newSet.add(noVoucher);
    setExpandedRows(newSet);
  };

  const filteredVouchers = vouchers.filter(v => {
    if (filterMethod) {
      if (filterMethod === 'Tanpa Email' && v.email) return false;
      if (filterMethod !== 'Tanpa Email' && v.transferMethod !== filterMethod) return false;
    }
    if (search) {
      const s = search.toLowerCase();
      if (!v.vendor?.toLowerCase().includes(s) && !v.noVoucher?.toLowerCase().includes(s) && !v.bank?.toLowerCase().includes(s)) {
        return false;
      }
    }
    return true;
  });

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('financeerp.token');
      const response = await fetch(`${API_BASE}/api/kopra/generate-bill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ groups: vouchers, settings, suppliers })
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Gagal membuat file Kopra');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `KOPRA_VA_${settings.transferDate}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="flex-none bg-[#1A1612] px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-[#A57C50]">FEAST</span> KOPRA
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Konverter Rekap Voucher → Bulk Transfer KOPRA Bank Mandiri
          </p>
        </div>
        <div className="flex bg-[#2A241D] p-1 rounded-[3px]">
          <button 
            onClick={() => setTab('voucher')}
            className={`px-4 py-1.5 text-sm font-bold rounded-[3px] transition-colors ${tab === 'voucher' ? 'bg-[#A57C50] text-white' : 'text-slate-300 hover:text-white'}`}
          >
            📋 Rekap Voucher
          </button>
          <button 
            onClick={() => setTab('supplier')}
            className={`px-4 py-1.5 text-sm font-bold rounded-[3px] transition-colors ${tab === 'supplier' ? 'bg-[#A57C50] text-white' : 'text-slate-300 hover:text-white'}`}
          >
            👥 Daftar Pemasok ({suppliers.length})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {tab === 'voucher' ? (
            <>
              <div className="bg-white rounded-[4px] border border-slate-200 shadow-sm p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-[#A57C50]" /> Upload Rekap Voucher
                </h2>
            <div className="flex items-center gap-4">
              <input 
                type="file" 
                accept=".xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-slate-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-[3px] file:border-0
                  file:text-sm file:font-semibold
                  file:bg-slate-100 file:text-slate-700
                  hover:file:bg-slate-200"
              />
              <button 
                onClick={handleUpload}
                disabled={!file || loading}
                className="bg-[#A57C50] hover:bg-[#8e6941] text-white px-4 py-2 rounded-[3px] font-bold text-sm disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Proses Voucher
              </button>
            </div>
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-[3px] text-sm">
                {error}
              </div>
            )}
          </div>

          {vouchers.length > 0 && (
            <div className="bg-white rounded-[4px] border border-slate-200 shadow-sm p-6">
              {syncMessage && (
                <div className="mb-6 px-4 py-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-[3px] text-sm font-medium flex justify-between items-center">
                  <span>{syncMessage}</span>
                  <button onClick={() => setSyncMessage('')} className="text-emerald-800 opacity-60 hover:opacity-100">✕</button>
                </div>
              )}
              
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    {vouchers.length} Voucher <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-[3px] text-xs font-semibold ml-2">Siap Transfer</span>
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Total: <span className="font-bold text-slate-700">Rp {vouchers.reduce((acc, v) => acc + (v.totalNominal || 0), 0).toLocaleString('id-ID')}</span> · 
                    {vouchers.filter(v => v.email).length} email terisi, <span className="text-orange-600 font-medium">{vouchers.filter(v => !v.email).length} belum ada</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => {setVouchers([]); setFile(null);}} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-[3px] text-sm font-bold hover:bg-slate-50">
                    Ganti File
                  </button>
                  <button onClick={handleGenerate} disabled={loading} className="bg-[#A57C50] hover:bg-[#8e6941] text-white px-6 py-2 rounded-[3px] font-bold text-sm disabled:opacity-50 flex items-center gap-2">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Export KOPRA
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
                <input 
                  type="text" 
                  placeholder="🔍 Cari no voucher, vendor, bank..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-[3px] text-sm min-w-[200px]"
                />
                <button onClick={() => setFilterMethod('')} className={`px-3 py-1.5 text-xs font-bold rounded-[3px] border whitespace-nowrap ${!filterMethod ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>Semua Transfer ({vouchers.length})</button>
                <button onClick={() => setFilterMethod('Giro')} className={`px-3 py-1.5 text-xs font-bold rounded-[3px] border whitespace-nowrap ${filterMethod === 'Giro' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>Giro/Autodebet</button>
                <button onClick={() => setFilterMethod('Mandiri VA')} className={`px-3 py-1.5 text-xs font-bold rounded-[3px] border whitespace-nowrap ${filterMethod === 'Mandiri VA' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>Mandiri VA</button>
                <button onClick={() => setFilterMethod('Tanpa Email')} className={`px-3 py-1.5 text-xs font-bold rounded-[3px] border whitespace-nowrap ${filterMethod === 'Tanpa Email' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>Tanpa Email ({vouchers.filter(v => !v.email).length})</button>
                <button onClick={() => setFilterMethod('In-House')} className={`px-3 py-1.5 text-xs font-bold rounded-[3px] border whitespace-nowrap ${filterMethod === 'In-House' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>In House</button>
                <button onClick={() => setFilterMethod('BI FAST')} className={`px-3 py-1.5 text-xs font-bold rounded-[3px] border whitespace-nowrap ${filterMethod === 'BI FAST' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>BI FAST</button>
                <button onClick={() => setFilterMethod('SKN')} className={`px-3 py-1.5 text-xs font-bold rounded-[3px] border whitespace-nowrap ${filterMethod === 'SKN' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>SKN</button>
                <button onClick={() => setFilterMethod('RTGS')} className={`px-3 py-1.5 text-xs font-bold rounded-[3px] border whitespace-nowrap ${filterMethod === 'RTGS' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>RTGS</button>
                <button onClick={() => setExpandedRows(new Set())} className="px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-[3px] whitespace-nowrap ml-auto">Tutup Rincian</button>
              </div>

              <div className="overflow-x-auto mb-6 border border-slate-200 rounded-[3px]">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs font-bold border-b border-slate-200 uppercase">
                      <th className="py-3 px-3 w-8"></th>
                      <th className="py-3 px-3">No Voucher</th>
                      <th className="py-3 px-3">Vendor</th>
                      <th className="py-3 px-3">Site</th>
                      <th className="py-3 px-3">Total Nominal</th>
                      <th className="py-3 px-3">Bank</th>
                      <th className="py-3 px-3 text-center">Metode</th>
                      <th className="py-3 px-3 text-center">Email Pemasok</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredVouchers.map((v, i) => {
                      const isExpanded = expandedRows.has(v.noVoucher);
                      return (
                        <React.Fragment key={i}>
                          <tr className={`hover:bg-slate-50 cursor-pointer ${isExpanded ? 'bg-blue-50/30' : ''}`} onClick={() => toggleRow(v.noVoucher)}>
                            <td className="py-3 px-3 text-slate-400">
                              <span className={`inline-block transition-transform ${isExpanded ? 'rotate-90' : ''}`}>›</span>
                            </td>
                            <td className="py-3 px-3 font-semibold text-blue-600">{v.noVoucher}</td>
                            <td className="py-3 px-3 font-medium text-slate-700">{v.vendor}</td>
                            <td className="py-3 px-3">
                              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-[3px] text-xs font-bold border border-slate-200">{v.site || 'N/A'}</span>
                            </td>
                            <td className="py-3 px-3 font-bold text-slate-800 whitespace-nowrap">Rp {v.totalNominal?.toLocaleString('id-ID')}</td>
                            <td className="py-3 px-3 font-medium text-slate-600">{v.bank}</td>
                            <td className="py-3 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${
                                v.transferMethod === 'BI FAST' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                v.transferMethod === 'In-House' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                v.transferMethod === 'Mandiri VA' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}>{v.transferMethod || 'UNKNOWN'}</span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              {v.email ? (
                                <span className="text-slate-600 text-xs">{v.email}</span>
                              ) : (
                                <span className="bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-[3px] text-xs font-bold flex items-center justify-center gap-1 w-fit mx-auto">
                                  ⚠️ belum ada
                                </span>
                              )}
                            </td>
                          </tr>
                          {isExpanded && v.transactions && (
                            <tr className="bg-slate-50 border-b border-slate-200">
                              <td colSpan={8} className="p-0">
                                <div className="p-4 border-l-2 border-blue-400 m-2 bg-white rounded-[3px] shadow-sm">
                                  <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Rincian Transaksi <span className="text-blue-600">{v.transactions.length} item</span></h4>
                                    <span className="text-xs text-slate-500 font-medium">No. Rek: <span className="font-bold text-slate-700">{v.noRekening || '-'}</span> ({v.namaRekening || '-'})</span>
                                  </div>
                                  <table className="w-full text-xs text-left">
                                    <thead>
                                      <tr className="text-slate-500 border-b border-slate-100">
                                        <th className="py-2 px-2 font-semibold">Nomor PO</th>
                                        <th className="py-2 px-2 font-semibold">Keterangan</th>
                                        <th className="py-2 px-2 font-semibold">Akun COA</th>
                                        <th className="py-2 px-2 font-semibold text-right">Nominal</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {v.transactions.map((t: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-slate-50">
                                          <td className="py-2 px-2 text-slate-600 font-mono">{t.po || '-'}</td>
                                          <td className="py-2 px-2 text-slate-700">{t.keterangan || '-'}</td>
                                          <td className="py-2 px-2 text-slate-600">{t.coa || '-'}</td>
                                          <td className="py-2 px-2 text-slate-800 font-medium text-right whitespace-nowrap">Rp {t.nominal?.toLocaleString('id-ID')}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          </>
          ) : (
            <div className="bg-white rounded-[4px] border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Daftar Pemasok & Rekening</h2>
              <p className="text-sm text-slate-500 mb-6">Database rekening lokal (disimpan di browser) untuk sinkronisasi otomatis KOPRA.</p>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-y border-slate-200">
                      <th className="py-2 px-3 font-bold">Pemasok</th>
                      <th className="py-2 px-3 font-bold">Bank</th>
                      <th className="py-2 px-3 font-bold">No Rekening</th>
                      <th className="py-2 px-3 font-bold">Atas Nama</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((s, i) => (
                      <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2 px-3 font-medium">{s.nama}</td>
                        <td className="py-2 px-3">{s.namaBank || '-'}</td>
                        <td className="py-2 px-3 font-mono">{s.noRekening || '-'}</td>
                        <td className="py-2 px-3">{s.namaRekening || '-'}</td>
                      </tr>
                    ))}
                    {suppliers.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400">Belum ada pemasok.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
