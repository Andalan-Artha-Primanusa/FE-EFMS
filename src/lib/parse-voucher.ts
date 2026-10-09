import type { VoucherRow, VoucherGroup, Supplier } from '../types';
import { getTransferMethod } from './bank-codes';
import { findSupplier, findEmail } from './supplier-store';
import * as XLSX from 'xlsx';

const COL_MAP: Record<string, keyof VoucherRow> = {
  'NO VOUCHER': 'noVoucher',
  'TGL': 'tgl',
  'SITE': 'site',
  'VENDOR': 'vendor',
  'KETERANGAN': 'keterangan',
  'PO': 'po',
  'KATEGORI': 'kategori',
  'COA': 'coa',
  'NOMINAL': 'nominal',
  'BANK': 'bank',
  'NO REKENING': 'noRekening',
  'NAMA REKENING': 'namaRekening',
};

function excelDateToJS(serial: number): Date {
  return new Date((serial - 25569) * 86400 * 1000);
}

function extractPoPrefix(po: string): string {
  if (!po) return '';
  return po.replace(/\/.*/g, '').trim().substring(0, 5);
}

export function parseVoucherExcel(data: ArrayBuffer, suppliers: Supplier[]): VoucherGroup[] {
  const wb = XLSX.read(data, { type: 'array' });

  // Find the sheet with voucher data — look for "NO VOUCHER" header
  let ws: XLSX.WorkSheet | null = null;
  let headerRowIdx = -1;
  const colIndices: Partial<Record<keyof VoucherRow, number>> = {};

  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const row = rows[i];
      let found = false;
      for (let j = 0; j < row.length; j++) {
        const val = String(row[j]).trim().toUpperCase();
        if (val === 'NO VOUCHER') {
          found = true;
          break;
        }
      }
      if (found) {
        // Map all columns
        for (let j = 0; j < row.length; j++) {
          const val = String(row[j]).trim().toUpperCase();
          const field = COL_MAP[val];
          if (field) colIndices[field] = j;
        }
        ws = sheet;
        headerRowIdx = i;
        break;
      }
    }
    if (ws) break;
  }

  if (!ws || headerRowIdx < 0) {
    throw new Error('Tidak ditemukan sheet dengan header "NO VOUCHER". Pastikan file yang diupload adalah Rekap Voucher.');
  }

  const allRows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  // Parse rows
  const vouchers: VoucherRow[] = [];
  for (let i = headerRowIdx + 1; i < allRows.length; i++) {
    const row = allRows[i];
    const noVoucher = String(row[colIndices.noVoucher ?? 0] ?? '').trim();
    const nominal = Number(row[colIndices.nominal ?? 8] ?? 0);

    if (!noVoucher || !nominal) continue;

    const tglRaw = row[colIndices.tgl ?? 1];
    let tgl: Date;
    if (typeof tglRaw === 'number') {
      tgl = excelDateToJS(tglRaw);
    } else {
      tgl = new Date(String(tglRaw));
    }

    vouchers.push({
      noVoucher,
      tgl,
      site: String(row[colIndices.site ?? 2] ?? '').trim(),
      vendor: String(row[colIndices.vendor ?? 3] ?? '').trim(),
      keterangan: String(row[colIndices.keterangan ?? 4] ?? '').trim(),
      po: String(row[colIndices.po ?? 5] ?? '').trim(),
      kategori: String(row[colIndices.kategori ?? 6] ?? '').trim(),
      coa: String(row[colIndices.coa ?? 7] ?? '').trim(),
      nominal,
      bank: String(row[colIndices.bank ?? 9] ?? '').trim(),
      noRekening: String(row[colIndices.noRekening ?? 10] ?? '').trim(),
      namaRekening: String(row[colIndices.namaRekening ?? 11] ?? '').trim(),
    });
  }

  // Group by noVoucher
  const groupMap = new Map<string, VoucherRow[]>();
  for (const v of vouchers) {
    const arr = groupMap.get(v.noVoucher) || [];
    arr.push(v);
    groupMap.set(v.noVoucher, arr);
  }

  const groups: VoucherGroup[] = [];
  for (const [noVoucher, txns] of groupMap) {
    const first = txns[0];
    const totalNominal = txns.reduce((sum, t) => sum + t.nominal, 0);
    const poNumbers = [...new Set(txns.map(t => extractPoPrefix(t.po)).filter(Boolean))];
    const coaCategories = [...new Set(txns.map(t => t.coa).filter(Boolean))];
    const sites = [...new Set(txns.map(t => t.site).filter(Boolean))];

    const matchedSupplier = findSupplier(first.vendor, suppliers);
    const bank = first.bank || matchedSupplier?.namaBank || '';
    const noRekening = first.noRekening || matchedSupplier?.noRekening || '';
    const namaRekening = first.namaRekening || matchedSupplier?.namaRekening || '';
    const email = matchedSupplier?.email || '';

    groups.push({
      noVoucher,
      vendor: first.vendor,
      totalNominal,
      bank,
      noRekening,
      namaRekening,
      site: sites.join(', '),
      transactions: txns,
      poNumbers,
      coaCategories,
      email,
      transferMethod: getTransferMethod(bank, totalNominal),
    });
  }

  // Sort by voucher number (numeric if possible)
  groups.sort((a, b) => {
    const na = parseInt(a.noVoucher, 10);
    const nb = parseInt(b.noVoucher, 10);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return a.noVoucher.localeCompare(b.noVoucher);
  });

  return groups;
}
