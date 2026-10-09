'use client';

import { useState, useMemo, useEffect } from 'react';
import type { VoucherGroup, ExportSettings } from '../types';
import { generateKopra } from '../lib/generate-kopra';
import { isNonTransfer, isMandiriVA } from '../lib/bank-codes';
import { Loader2, Download, FileText, X, Printer } from 'lucide-react';

const fmt = new Intl.NumberFormat('id-ID');

interface Props {
  groups: VoucherGroup[];
  isOpen: boolean;
  onClose: () => void;
}

export default function ExportModal({ groups, isOpen, onClose }: Props) {
  const today = new Date();
  const todayStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

  const [transferDate, setTransferDate] = useState(todayStr);
  const [debitAccountNo, setDebitAccountNo] = useState('0700018880000');
  const [voucherFrom, setVoucherFrom] = useState('');
  const [voucherTo, setVoucherTo] = useState('');
  const [exportError, setExportError] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Load last used debit account from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('kopra_debit_account');
    if (saved) setDebitAccountNo(saved);
  }, []);

  const sortedVouchers = useMemo(() =>
    groups.filter(g => !isNonTransfer(g.bank, g.coaCategories)).map(g => g.noVoucher), [groups]
  );

  // Set initial default range when opened
  useEffect(() => {
    if (isOpen && sortedVouchers.length > 0) {
      if (!voucherFrom) setVoucherFrom(sortedVouchers[0]);
      if (!voucherTo) setVoucherTo(sortedVouchers[sortedVouchers.length - 1]);
    }
  }, [isOpen, sortedVouchers, voucherFrom, voucherTo]);

  const handleResetRange = () => {
    if (sortedVouchers.length > 0) {
      setVoucherFrom(sortedVouchers[0]);
      setVoucherTo(sortedVouchers[sortedVouchers.length - 1]);
    }
  };

  const preview = useMemo(() => {
    if (!voucherFrom || !voucherTo) return { count: 0, total: 0, missingEmail: 0, vaCount: 0, vaTotal: 0, filtered: [] };
    const fromNum = parseInt(voucherFrom, 10);
    const toNum = parseInt(voucherTo, 10);
    const filtered = groups.filter(g => {
      if (isNonTransfer(g.bank, g.coaCategories)) return false;
      const n = parseInt(g.noVoucher, 10);
      if (!isNaN(fromNum) && !isNaN(toNum) && !isNaN(n)) return n >= fromNum && n <= toNum;
      return g.noVoucher >= voucherFrom && g.noVoucher <= voucherTo;
    });
    
    const tfGroups = filtered.filter(g => !isMandiriVA(g.bank, g.noRekening));
    const vaGroups = filtered.filter(g => isMandiriVA(g.bank, g.noRekening));

    return {
      count: tfGroups.length,
      total: tfGroups.reduce((s, g) => s + g.totalNominal, 0),
      missingEmail: tfGroups.filter(g => !g.email).length,
      vaCount: vaGroups.length,
      vaTotal: vaGroups.reduce((s, g) => s + g.totalNominal, 0),
      filtered
    };
  }, [groups, voucherFrom, voucherTo]);

  const handleExport = async (format: 'xlsx' | 'va') => {
    try {
      setExportError('');
      setIsExporting(true);
      const cleanAccount = debitAccountNo.trim();
      localStorage.setItem('kopra_debit_account', cleanAccount);

      const settings: ExportSettings = {
        transferDate,
        debitAccountNo: cleanAccount,
        voucherFrom,
        voucherTo
      };
      
      if (format === 'xlsx') {
        await generateKopra(groups, settings);
      } else {
        const { generateKopraBill } = await import('../lib/generate-kopra-bill');
        await generateKopraBill(groups, settings);
      }
      
      onClose();
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Gagal mengekspor file');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = async () => {
    if (!preview.filtered || preview.filtered.length === 0) return;
    const { printVouchers } = await import('../lib/print-vouchers');
    const cleanAccount = debitAccountNo.trim();
    localStorage.setItem('kopra_debit_account', cleanAccount);
    printVouchers(preview.filtered, transferDate, cleanAccount);
  };

  const formatDateInput = (val: string) => {
    if (val.length === 8) {
      return `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}`;
    }
    return val;
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/-/g, '');
    setTransferDate(v);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#1A1612]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-[4px] shadow-2xl border border-gray-200 p-6 w-full max-w-lg transition-all" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-extrabold text-[#1A1612]">Export File KOPRA</h2>
            <p className="text-xs text-gray-500 font-medium">Format Template Transfer & Bill Payment</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-[3px] flex items-center justify-center text-gray-400 hover:text-[#1A1612] hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {exportError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-[3px] font-medium">
            {exportError}
          </div>
        )}

        <div className="space-y-4">
          {/* Transfer Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Transfer</label>
            <input
              type="date"
              value={formatDateInput(transferDate)}
              onChange={handleDateChange}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
            />
          </div>

          {/* Debit Account (Source of Funds) */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">
                No. Rekening Debit Mandiri (Source of Funds)
              </label>
            </div>
            <input
              type="text"
              value={debitAccountNo}
              onChange={e => setDebitAccountNo(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 font-mono text-sm"
              placeholder="Masukkan no rekening debit terdaftar di KOPRA"
            />
            <div className="mt-1.5">
              <span className="text-[11px] text-gray-500 block mb-1">Pilihan cepat rekening perusahaan:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setDebitAccountNo('0700018880000')}
                  className={`text-[11px] px-2 py-0.5 rounded font-mono border transition-colors ${
                    debitAccountNo === '0700018880000'
                      ? 'bg-blue-100 border-blue-400 text-blue-800 font-bold'
                      : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  0700018880000 (Mandiri OP)
                </button>
                <button
                  type="button"
                  onClick={() => setDebitAccountNo('0700028880008')}
                  className={`text-[11px] px-2 py-0.5 rounded font-mono border transition-colors ${
                    debitAccountNo === '0700028880008'
                      ? 'bg-blue-100 border-blue-400 text-blue-800 font-bold'
                      : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  0700028880008 (Mandiri EC)
                </button>
                <button
                  type="button"
                  onClick={() => setDebitAccountNo('0700080088086')}
                  className={`text-[11px] px-2 py-0.5 rounded font-mono border transition-colors ${
                    debitAccountNo === '0700080088086'
                      ? 'bg-blue-100 border-blue-400 text-blue-800 font-bold'
                      : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  0700080088086 (Mandiri DSRA)
                </button>
                <button
                  type="button"
                  onClick={() => setDebitAccountNo('700018880000')}
                  className={`text-[11px] px-2 py-0.5 rounded font-mono border transition-colors ${
                    debitAccountNo === '700018880000'
                      ? 'bg-blue-100 border-blue-400 text-blue-800 font-bold'
                      : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
                  }`}
                  title="Format tanpa 0 di depan"
                >
                  700018880000 (tanpa 0)
                </button>
              </div>
              <p className="text-[11px] text-amber-700 mt-1">
                ⚠️ Pastikan nomor rekening ini aktif dan terdaftar pada hak akses user KOPRA Anda.
              </p>
            </div>
          </div>

          {/* Voucher Range Selector with Direct Typing + Dropdown */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">Rentang Voucher</label>
              <button
                type="button"
                onClick={handleResetRange}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Pilih Semua Voucher ({sortedVouchers.length})
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Voucher Dari */}
              <div>
                <span className="text-xs text-gray-500 mb-1 block">Voucher Dari</span>
                <div className="relative flex rounded-lg shadow-sm border border-gray-300 focus-within:ring-2 focus-within:ring-blue-300 focus-within:border-blue-500">
                  <input
                    type="text"
                    list="vouchers-from-list"
                    value={voucherFrom}
                    onChange={e => setVoucherFrom(e.target.value.trim())}
                    placeholder="Ketik angka..."
                    className="w-full px-3 py-2 rounded-l-lg focus:outline-none font-mono text-sm"
                  />
                  <select
                    value={sortedVouchers.includes(voucherFrom) ? voucherFrom : ''}
                    onChange={e => setVoucherFrom(e.target.value)}
                    className="px-2 py-2 border-l bg-gray-50 text-gray-600 text-xs focus:outline-none cursor-pointer rounded-r-lg hover:bg-gray-100"
                    title="Pilih dari daftar voucher"
                  >
                    <option value="" disabled>Pilih</option>
                    {sortedVouchers.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <datalist id="vouchers-from-list">
                  {sortedVouchers.map(v => <option key={v} value={v} />)}
                </datalist>
              </div>

              {/* Voucher Sampai */}
              <div>
                <span className="text-xs text-gray-500 mb-1 block">Voucher Sampai</span>
                <div className="relative flex rounded-lg shadow-sm border border-gray-300 focus-within:ring-2 focus-within:ring-blue-300 focus-within:border-blue-500">
                  <input
                    type="text"
                    list="vouchers-to-list"
                    value={voucherTo}
                    onChange={e => setVoucherTo(e.target.value.trim())}
                    placeholder="Ketik angka..."
                    className="w-full px-3 py-2 rounded-l-lg focus:outline-none font-mono text-sm"
                  />
                  <select
                    value={sortedVouchers.includes(voucherTo) ? voucherTo : ''}
                    onChange={e => setVoucherTo(e.target.value)}
                    className="px-2 py-2 border-l bg-gray-50 text-gray-600 text-xs focus:outline-none cursor-pointer rounded-r-lg hover:bg-gray-100"
                    title="Pilih dari daftar voucher"
                  >
                    <option value="" disabled>Pilih</option>
                    {sortedVouchers.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <datalist id="vouchers-to-list">
                  {sortedVouchers.map(v => <option key={v} value={v} />)}
                </datalist>
              </div>
            </div>
          </div>

          {/* Preview Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-1.5 border border-gray-200">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Transfer KOPRA (.xlsx):</span>
              <span className="font-semibold text-gray-900">{preview.count} data (Rp {fmt.format(Math.round(preview.total))})</span>
            </div>
            {preview.vaCount > 0 && (
              <div className="flex justify-between text-sm text-orange-700 font-medium">
                <span>Bill Payment VA (.csv):</span>
                <span>{preview.vaCount} data (Rp {fmt.format(Math.round(preview.vaTotal))})</span>
              </div>
            )}
            {preview.missingEmail > 0 && (
              <p className="text-xs text-[#1A1612] bg-gray-100 px-2 py-1.5 rounded-[3px] border border-gray-300 mt-2 font-medium">
                Peringatan: {preview.missingEmail} voucher transfer belum memiliki email pemasok.
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={() => handleExport('xlsx')}
            disabled={preview.count === 0 || isExporting}
            className="w-full px-5 py-2.5 bg-[#A57C50] text-white rounded-[3px] hover:bg-[#8e6941] disabled:opacity-50 disabled:cursor-not-allowed font-extrabold text-sm flex items-center justify-center gap-2 transition-all"
          >
            {isExporting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Memproses...</>
            ) : (
              <><Download className="w-4 h-4" /> Download File KOPRA (.xlsx)</>
            )}
          </button>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleExport('va')}
              disabled={preview.vaCount === 0 || isExporting}
              className="w-full px-5 py-2.5 bg-[#1A1612] text-white rounded-[3px] hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm flex items-center justify-center gap-2 transition-all"
            >
              <FileText className="w-4 h-4" /> Bill Payment VA
            </button>
            <button
              onClick={handlePrint}
              disabled={preview.filtered.length === 0 || isExporting}
              className="w-full px-5 py-2.5 bg-white border border-[#1A1612] text-[#1A1612] rounded-[3px] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm flex items-center justify-center gap-2 transition-all"
            >
              <Printer className="w-4 h-4" /> Cetak Dokumen
            </button>
          </div>

          <button
            onClick={onClose}
            disabled={isExporting}
            className="w-full px-6 py-2.5 bg-slate-100 border border-slate-200 rounded-[3px] text-slate-700 hover:bg-slate-200 text-sm font-medium transition-colors mt-1"
          >
            Batal
          </button>
        </div>

        <p className="text-[11px] text-gray-500 mt-3 text-center leading-relaxed font-medium">
          Format Excel (.xlsx) untuk KOPRA Multiple Transfer.<br/>
          Format CSV (.csv) untuk KOPRA Multiple Bill Payment.
        </p>
      </div>
    </div>
  );
}
