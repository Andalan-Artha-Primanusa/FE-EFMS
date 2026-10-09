'use client';

export interface BankInfo {
  fullName: string;
  shortName: string;
  bic: string;
  sandi: string;
  kliring: string;
}

export const BANK_DICTIONARY: Record<string, BankInfo> = {
  // Top Indonesian Banks & Frequent Aliases
  'MANDIRI': { fullName: 'PT. BANK MANDIRI (PERSERO) TBK', shortName: 'BANK MANDIRI', bic: 'BMRIIDJA', sandi: '008', kliring: '0080017' },
  'BANK MANDIRI': { fullName: 'PT. BANK MANDIRI (PERSERO) TBK', shortName: 'BANK MANDIRI', bic: 'BMRIIDJA', sandi: '008', kliring: '0080017' },
  'BCA': { fullName: 'PT. BANK CENTRAL ASIA Tbk.', shortName: 'BCA', bic: 'CENAIDJA', sandi: '014', kliring: '0140397' },
  'BNI': { fullName: 'PT. BANK NEGARA INDONESIA (PERSERO)', shortName: 'BANK BNI', bic: 'BNINIDJA', sandi: '009', kliring: '0090010' },
  'BRI': { fullName: 'PT. BANK RAKYAT INDONESIA (PERSERO)', shortName: 'BRI', bic: 'BRINIDJA', sandi: '002', kliring: '0020307' },
  'BSI': { fullName: 'PT. BANK SYARIAH INDONESIA', shortName: 'BSI', bic: 'BSMDIDJA', sandi: '451', kliring: '4510017' },
  'BSM': { fullName: 'PT. BANK SYARIAH INDONESIA', shortName: 'BSI', bic: 'BSMDIDJA', sandi: '451', kliring: '4510017' },
  'CIMB': { fullName: 'PT. BANK CIMB NIAGA TBK', shortName: 'BANK CIMB', bic: 'BNIAIDJA', sandi: '022', kliring: '0220026' },
  'CIMB NIAGA': { fullName: 'PT. BANK CIMB NIAGA TBK', shortName: 'BANK CIMB', bic: 'BNIAIDJA', sandi: '022', kliring: '0220026' },
  'DBS': { fullName: 'PT. BANK DBS INDONESIA', shortName: 'DBS', bic: 'DBSBIDJA', sandi: '046', kliring: '0460307' },
  'BTN': { fullName: 'PT. BANK TABUNGAN NEGARA (PERSERO)', shortName: 'BTN', bic: 'BTANIDJA', sandi: '200', kliring: '2000150' },
  'DANAMON': { fullName: 'PT. BANK DANAMON INDONESIA Tbk.', shortName: 'BANK DANAMON', bic: 'BDINIDJA', sandi: '011', kliring: '0110042' },
  'PERMATA': { fullName: 'PT. BANK PERMATA,TBK', shortName: 'BANK PERMATA', bic: 'BBBAIDJA', sandi: '013', kliring: '0130475' },
  'OCBC': { fullName: 'PT. BANK OCBC NISP, Tbk.', shortName: 'BANK OCBC NISP', bic: 'NISPIDJA', sandi: '028', kliring: '0280024' },
  'OCBC NISP': { fullName: 'PT. BANK OCBC NISP, Tbk.', shortName: 'BANK OCBC NISP', bic: 'NISPIDJA', sandi: '028', kliring: '0280024' },
  'PANIN': { fullName: 'PT. PANIN BANK Tbk.', shortName: 'PANIN BANK', bic: 'PINBIDJA', sandi: '019', kliring: '0190017' },
  'PANIN BANK': { fullName: 'PT. PANIN BANK Tbk.', shortName: 'PANIN BANK', bic: 'PINBIDJA', sandi: '019', kliring: '0190017' },
  'MEGA': { fullName: 'PT. BANK MEGA Tbk.', shortName: 'BANK MEGA', bic: 'MEGAIDJA', sandi: '426', kliring: '4260121' },
  'MESTIKA': { fullName: 'PT. BANK MESTIKA DHARMA', shortName: 'BANK MESTIKA', bic: 'MEDHIDS1', sandi: '151', kliring: '1510010' },
  'MUFG': { fullName: 'MUFG BANK, LTD', shortName: 'MUFG', bic: 'BOTKIDJX', sandi: '042', kliring: '0420305' },
  'BTMU': { fullName: 'MUFG BANK, LTD', shortName: 'MUFG', bic: 'BOTKIDJX', sandi: '042', kliring: '0420305' },
  'SUMSEL': { fullName: 'PT. BPD SUMSEL DAN BABEL', shortName: 'BANK SUMSEL', bic: 'BSSPIDSP', sandi: '120', kliring: '1200016' },
  'BANK SUMSEL': { fullName: 'PT. BPD SUMSEL DAN BABEL', shortName: 'BANK SUMSEL', bic: 'BSSPIDSP', sandi: '120', kliring: '1200016' },
  'SEABANK': { fullName: 'PT BANK SEABANK INDONESIA', shortName: 'SEABANK', bic: 'SSPIIDJA', sandi: '535', kliring: '5350014' },
  'SEA BANK': { fullName: 'PT BANK SEABANK INDONESIA', shortName: 'SEABANK', bic: 'SSPIIDJA', sandi: '535', kliring: '5350014' },
  'JAGO': { fullName: 'PT. BANK JAGO, TBK', shortName: 'JAGO', bic: 'JAGBIDJA', sandi: '542', kliring: '5420012' },
  'ARTOS': { fullName: 'PT. BANK JAGO, TBK', shortName: 'JAGO', bic: 'JAGBIDJA', sandi: '542', kliring: '5420012' },
  'DKI': { fullName: 'PT. BANK DKI', shortName: 'BANK DKI', bic: 'BDKIIDJ1', sandi: '111', kliring: '1110012' },
  'BANK DKI': { fullName: 'PT. BANK DKI', shortName: 'BANK DKI', bic: 'BDKIIDJ1', sandi: '111', kliring: '1110012' },
  'ICBC': { fullName: 'PT. BANK ICBC INDONESIA', shortName: 'BANK ICBC', bic: 'ICBKIDJA', sandi: '164', kliring: '1640016' },
  'CITIBANK': { fullName: 'CITIBANK, NA', shortName: 'CITIBANK', bic: 'CITIIDJX', sandi: '031', kliring: '0310305' },
  'CITI': { fullName: 'CITIBANK, NA', shortName: 'CITIBANK', bic: 'CITIIDJX', sandi: '031', kliring: '0310305' },
  'HSBC': { fullName: 'THE HONGKONG & SHANGHAI BANKING CORP. LTD.', shortName: 'HSBC', bic: 'HSBCIDJA', sandi: '041', kliring: '0410302' },
  'UOB': { fullName: 'PT. BANK UOB INDONESIA', shortName: 'UOB INDONESIA', bic: 'BBIJIDJA', sandi: '023', kliring: '0230016' },
  'UNIVERSAL': { fullName: 'PT. BANK UOB INDONESIA', shortName: 'UNIVERSAL', bic: 'BBIJIDJA', sandi: '023', kliring: '0230016' },
  'JPMORGAN': { fullName: 'JP MORGAN CHASE BANK, N.A.', shortName: 'JPMORGAN', bic: 'CHASIDJX', sandi: '032', kliring: '0320308' },
  'JP MORGAN': { fullName: 'JP MORGAN CHASE BANK, N.A.', shortName: 'JPMORGAN', bic: 'CHASIDJX', sandi: '032', kliring: '0320308' },
  'ANZ': { fullName: 'PT. BANK ANZ INDONESIA', shortName: 'ANZ INDONESIA', bic: 'ANZBIDJX', sandi: '061', kliring: '0610306' },
  'STANDARD CHARTERED': { fullName: 'STANDARD CHARTERED BANK', shortName: 'STANDCHARD', bic: 'SCBLIDJX', sandi: '050', kliring: '0500306' },
  'STANDCHARD': { fullName: 'STANDARD CHARTERED BANK', shortName: 'STANDCHARD', bic: 'SCBLIDJX', sandi: '050', kliring: '0500306' },
  'BTPN': { fullName: 'PT. BANK TABUNGAN PENSIUNAN NASIONAL', shortName: 'BTPN', bic: 'TAPEIDJ1', sandi: '213', kliring: '2130101' },
  'BUKOPIN': { fullName: 'PT. BANK KB BUKOPIN TBK', shortName: 'BUKOPIN', bic: 'BBUKIDJA', sandi: '441', kliring: '4410010' },
  'SINARMAS': { fullName: 'PT. BANK SINARMAS', shortName: 'BANK SINARMAS', bic: 'SBJKIDJA', sandi: '153', kliring: '1530016' },
  'MAYBANK': { fullName: 'PT. BANK MAYBANK INDONESIA Tbk.', shortName: 'BANK MAYBANK', bic: 'IBBKIDJA', sandi: '016', kliring: '0160131' },
  'BPD JATIM': { fullName: 'PT. BANK PEMBANGUNAN DAERAH JAWA TIMUR TBK.', shortName: 'BANK JATIM', bic: 'PDJTIDJ1', sandi: '114', kliring: '1140383' },
  'BPD JATENG': { fullName: 'PT. BANK PEMBANGUNAN DAERAH JAWA TENGAH', shortName: 'BANK JATENG', bic: 'PDJGIDJ1', sandi: '113', kliring: '1130348' },
  'BPD JABAR': { fullName: 'PT. BANK PEMBANGUNAN DAERAH JAWA BARAT DAN BANTEN', shortName: 'BANK JABAR', bic: 'PDJBIDJA', sandi: '110', kliring: '1100323' },
  'BJB': { fullName: 'PT. BANK PEMBANGUNAN DAERAH JAWA BARAT DAN BANTEN', shortName: 'BANK JABAR', bic: 'PDJBIDJA', sandi: '110', kliring: '1100323' },
  'BPD BALI': { fullName: 'PT. BPD BALI', shortName: 'BPD BALI', bic: 'ABALIDBS', sandi: '129', kliring: '1290013' },
  'BPD KALBAR': { fullName: 'PT. BPD KALIMANTAN BARAT', shortName: 'BPD KALBAR', bic: 'PDKBIDJ1', sandi: '123', kliring: '1230015' },
  'BPD KALSEL': { fullName: 'PT. BPD KALIMANTAN SELATAN', shortName: 'BPD KALSEL', bic: 'PDKSIDJ1', sandi: '122', kliring: '1220012' },
  'BPD KALTIM': { fullName: 'PT. BPD KALIMANTAN TIMUR', shortName: 'BPD KALTIM', bic: 'PDKTIDJ1', sandi: '124', kliring: '1240018' },
};

function normalizeBankString(str: string): string {
  let s = str.toUpperCase().trim();
  s = s.replace(/^(VA|BG|AUTODEBET|AUDTODEBET|AUTO DEBET)\s+/i, '');
  s = s.replace(/\s+(VA|OP|DSA|KODE IURAN)$/i, '');
  return s.trim();
}

/** Returns true if the bank field indicates a non-transfer payment or COA indicates excluded category (giro, autodebet, ayat silang, gaji) */
export function isNonTransfer(bank: string, coas: string[] = []): boolean {
  const b = bank.toUpperCase().trim();
  if (/GIRO|BILYET|AUTO\s*DEBET|AUTODEBET|AUDTODEBET/.test(b)) return true;

  return coas.some(coa => {
    const c = coa.toUpperCase().trim();
    return c.includes('AYAT SILANG') || c.includes('GAJI');
  });
}

export function getBankInfo(bankStr: string): BankInfo {
  const clean = normalizeBankString(bankStr);

  if (BANK_DICTIONARY[clean]) {
    return BANK_DICTIONARY[clean];
  }

  for (const [key, info] of Object.entries(BANK_DICTIONARY)) {
    if (clean.includes(key) || key.includes(clean)) {
      return info;
    }
  }

  return { fullName: bankStr, shortName: bankStr, bic: '', sandi: '', kliring: '' };
}

export function getTransferMethod(bank: string, amount: number): 'In-House' | 'BI FAST' | 'SKN' | 'RTGS' {
  const key = normalizeBankString(bank);
  if (key.includes('MANDIRI')) return 'In-House';
  if (amount <= 250_000_000) return 'BI FAST';
  if (amount <= 1_000_000_000) return 'SKN';
  return 'RTGS';
}

export function getSwiftCode(bank: string): string {
  const key = normalizeBankString(bank);
  if (key.includes('MANDIRI')) return 'BMRIIDJA';
  return getBankInfo(bank).bic || 'BMRIIDJA';
}

export function getBeneficiaryType(vendor: string): number {
  const v = vendor.trim().toUpperCase();
  if (v.startsWith('PT') || v.startsWith('CV') || v.startsWith('UD') || v.startsWith('KOPERASI') || v.startsWith('TOKO')) {
    return 2; // Company
  }
  return 1; // Personal
}

export function isMandiriVA(bank: string, noRekening: string): boolean {
  const method = getTransferMethod(bank, 0);
  if (method !== 'In-House') return false;
  const acc = noRekening.replace(/\D/g, '');
  return acc.length > 13; // Mandiri regular accounts are exactly 13 digits
}
