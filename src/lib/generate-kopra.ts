import type { VoucherGroup, ExportSettings } from '../types';
import { getTransferMethod, getBankInfo, getBeneficiaryType, isNonTransfer, isMandiriVA } from './bank-codes';

function buildReference(group: VoucherGroup): string {
  const v = group.noVoucher;
  if (group.poNumbers.length === 0) return v;

  const all = `${v}/${group.poNumbers.join(',')}`;
  if (all.length <= 19) return all;

  if (group.poNumbers.length >= 2) {
    const first = group.poNumbers[0];
    const last = group.poNumbers[group.poNumbers.length - 1];
    const abbr = `${v}/${first},...,${last}`;
    if (abbr.length <= 19) return abbr;
    const shorter = `${v}/${first}`;
    return shorter.substring(0, 19);
  }

  return all.substring(0, 19);
}

function buildRemark(group: VoucherGroup): string {
  const coas = group.coaCategories.join(', ');
  const remark = `Byr ${coas} - ${group.site}`;
  return remark.substring(0, 140);
}

export async function generateKopra(
  groups: VoucherGroup[],
  settings: ExportSettings
): Promise<void> {
  const fromNum = parseInt(settings.voucherFrom, 10);
  const toNum = parseInt(settings.voucherTo, 10);
  const filtered = groups.filter(g => {
    if (isNonTransfer(g.bank, g.coaCategories)) return false;
    if (isMandiriVA(g.bank, g.noRekening)) return false; // Exclude VA > 13 digits
    const n = parseInt(g.noVoucher, 10);
    if (!isNaN(fromNum) && !isNaN(toNum) && !isNaN(n)) {
      return n >= fromNum && n <= toNum;
    }
    return g.noVoucher >= settings.voucherFrom && g.noVoucher <= settings.voucherTo;
  });

  if (filtered.length === 0) {
    throw new Error('Tidak ada voucher dalam rentang yang dipilih');
  }

  // Lazy load exceljs to avoid blocking main thread
  const ExcelJS = await import('exceljs').then(m => m.default || m);
  const wb = new ExcelJS.Workbook();

  try {
    const res = await fetch('/kopra_template.xlsx');
    if (!res.ok) throw new Error('Template not reachable');
    const buf = await res.arrayBuffer();
    await wb.xlsx.load(buf);
  } catch {
    throw new Error('Gagal memuat template KOPRA. Pastikan file template.xlsx tersedia.');
  }

  const ws = wb.getWorksheet('INPUT TRANSACTION HERE');
  if (!ws) throw new Error('Sheet "INPUT TRANSACTION HERE" tidak ditemukan');

  // Clear existing sample data starting from row 19 to 20000
  for (let r = 19; r <= 20050; r++) {
    const row = ws.getRow(r);
    if (row.hasValues) {
      row.values = [];
    } else {
      break; // Stop clearing if we hit empty rows to save time
    }
  }

  // Header Date & Account (Row 14)
  const dateNum = parseInt(settings.transferDate, 10);
  ws.getCell('B14').value = isNaN(dateNum) ? settings.transferDate : dateNum;
  ws.getCell('C14').value = settings.debitAccountNo.trim().replace(/\D/g, '');

  // Write detail rows starting at Row 19
  filtered.forEach((group, idx) => {
    const rowNum = 19 + idx;
    const method = getTransferMethod(group.bank, group.totalNominal);
    const swift = getBankInfo(group.bank).bic || ''; // Empty string if unknown, don't use BMRIIDJA for non-Mandiri
    const benType = getBeneficiaryType(group.vendor);
    
    // Clean fields
    let email = group.email ? group.email.replace(/\s+/g, '').replace(/;/g, ',') : '';
    if (email === '-') email = '';
    
    let accNo = group.noRekening.replace(/\D/g, '');
    if (method === 'In-House' && accNo.length < 13) {
      accNo = accNo.padStart(13, '0');
    }
    const accName = (group.namaRekening || group.vendor).trim().substring(0, 70);

    const row = ws.getRow(rowNum);
    row.getCell('A').value = idx + 1;
    row.getCell('B').value = method;
    row.getCell('C').value = accNo;
    row.getCell('D').value = 'IDR';
    row.getCell('E').value = Math.round(group.totalNominal);
    row.getCell('F').value = accName;
    row.getCell('G').value = 'Jakarta';
    
    if (method !== 'In-House') {
      row.getCell('H').value = swift;
    } else {
      row.getCell('H').value = '';
    }

    row.getCell('I').value = 'OUR';
    row.getCell('J').value = buildReference(group);
    row.getCell('K').value = buildRemark(group);

    if (email) {
      row.getCell('L').value = email;
    }

    // Column R (Beneficiary Type)
    row.getCell('R').value = benType;

    // Column S & T for SKN & RTGS
    if (method === 'SKN' || method === 'RTGS') {
      row.getCell('S').value = 'Y';
      row.getCell('T').value = 'Y';
    }

    // Column U & V
    row.getCell('U').value = 'N';
    row.getCell('V').value = 'N';
    
    row.commit();
  });

  const outBuf = await wb.xlsx.writeBuffer();
  const blob = new Blob([outBuf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `KOPRA_${settings.transferDate}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
