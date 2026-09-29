export interface SiteAreaMetric {
  name: string;
  planRevenue: number;
  actualRevenue: number;
  tomorrowRevenue: number;
  planOb: number;
  actualOb: number;
  forecastOb: number;
  planCoal: number;
  actualCoal: number;
  forecastCoal: number;
}

export interface SiteOperationalParameter {
  k3lh: string;
  volCh: number;
  ewhCh: number;
  prodJamCh: number;
  prodDayCh: string;
  volCm: number;
  ewhCm: number;
  prodJamCm: number;
  prodDayCm: string;
  volOb: number;
  ewhOb: number;
  prodJamOb: number;
  prodDayOb: string;
}

export interface SiteControlMilestone {
  revenueObPlan: string;
  revenueObAct: string;
  revenueObAch: string;
  revenueCmPlan: string;
  revenueCmAct: string;
  revenueCmAch: string;
  revenueCtPlan: string;
  revenueCtAct: string;
  revenueCtAch: string;
  distObArea1Plan: string;
  distObArea1Act: string;
  distObArea1Ach: string;
  distObArea2Plan: string;
  distObArea2Act: string;
  distObArea2Ach: string;
  distObArea3Plan?: string;
  distObArea3Act?: string;
  distObArea3Ach?: string;
  fuelRatioPlan: string;
  fuelRatioAct: string;
  fuelRatioAch: string;
  rmCostPlan: string;
  rmCostAct: string;
  rmCostAch: string;
}

export interface SiteCostProfileItem {
  name: string;
  mtdPlan: number;
  mtdAct: number;
  ytdPlan: number;
  ytdAct: number;
  delta: number;
}

export interface SiteEbitdaConfig {
  code: string;
  name: string;
  clientName: string;
  ebitdaPlan: number;
  ebitdaAct: number;
  ebitdaGrowth: string;
  ebitdaDelta: string;
  areas: SiteAreaMetric[];
  parameters: SiteOperationalParameter;
  milestone: SiteControlMilestone;
  costProfile: SiteCostProfileItem[];
  highlight: string[];
}

export const SITE_EBITDA_DATASET: Record<string, SiteEbitdaConfig> = {
  ALL: {
    code: "ALL",
    name: "Konsolidasi All Sites",
    clientName: "PT Andalan Artha Primanusa (Corporate)",
    ebitdaPlan: 0.19,
    ebitdaAct: 0.53,
    ebitdaGrowth: "+185.82%",
    ebitdaDelta: "+0,34",
    areas: [
      {
        name: "AREA 1 (SBS)",
        planRevenue: 66562,
        actualRevenue: 71220,
        tomorrowRevenue: 142065,
        planOb: 19355,
        actualOb: 31820,
        forecastOb: 28363,
        planCoal: 645,
        actualCoal: 0,
        forecastCoal: 19887
      },
      {
        name: "AREA 2 (DBK)",
        planRevenue: 714438,
        actualRevenue: 682058,
        tomorrowRevenue: 1133226,
        planOb: 232258,
        actualOb: 307674,
        forecastOb: 358092,
        planCoal: 49032,
        actualCoal: 89249,
        forecastCoal: 104904
      },
      {
        name: "AREA 3 (BGG)",
        planRevenue: 186565,
        actualRevenue: 231445,
        tomorrowRevenue: 417037,
        planOb: 100000,
        actualOb: 149687,
        forecastOb: 160618,
        planCoal: 38710,
        actualCoal: 33723,
        forecastCoal: 50481
      }
    ],
    parameters: {
      k3lh: "Zero ( 0 )",
      volCh: 1400000,
      ewhCh: 481,
      prodJamCh: 2909,
      prodDayCh: "45,161 Ton",
      volCm: 2740000,
      ewhCm: 308,
      prodJamCm: 8885,
      prodDayCm: "88,387 Ton/Jam",
      volOb: 10900000,
      ewhOb: 335,
      prodJamOb: 32537,
      prodDayOb: "351,613 Bcm/Jam"
    },
    milestone: {
      revenueObPlan: "$ 0.66",
      revenueObAct: "$ 0.87",
      revenueObAch: "133%",
      revenueCmPlan: "$ 0.08",
      revenueCmAct: "$ 0.11",
      revenueCmAch: "132%",
      revenueCtPlan: "$ 0.15",
      revenueCtAct: "$ 0.15",
      revenueCtAch: "103%",
      distObArea1Plan: "3.90",
      distObArea1Act: "3.46",
      distObArea1Ach: "89%",
      distObArea2Plan: "2.80",
      distObArea2Act: "2.74",
      distObArea2Ach: "98%",
      distObArea3Plan: "1.66",
      distObArea3Act: "1.34",
      distObArea3Ach: "81%",
      fuelRatioPlan: "1.15",
      fuelRatioAct: "1.16",
      fuelRatioAch: "89%",
      rmCostPlan: "$ 0.27",
      rmCostAct: "$ 0.18",
      rmCostAch: "147%"
    },
    costProfile: [
      { name: "EC", mtdPlan: 0.28, mtdAct: 0.30, ytdPlan: 0.31, ytdAct: 0.29, delta: -0.09 },
      { name: "Fuel", mtdPlan: 0.90, mtdAct: 1.17, ytdPlan: 0.89, ytdAct: 1.10, delta: 0.07 },
      { name: "Tyre", mtdPlan: 0.09, mtdAct: 0.09, ytdPlan: 0.09, ytdAct: 0.09, delta: -0.07 },
      { name: "RM", mtdPlan: 0.57, mtdAct: 0.63, ytdPlan: 0.57, ytdAct: 0.64, delta: -0.28 },
      { name: "Othr", mtdPlan: 0.42, mtdAct: 0.40, ytdPlan: 0.41, ytdAct: 0.36, delta: -0.13 }
    ],
    highlight: [
      "Performance EBITDA gain 187% eqv 0,34 mssd didrive dari tercapainya revenue 28% dan saving cost 14%.",
      "Fuel Ratio Usage OB tgl 25 dengan dist. OB 2.25 km yaitu 1.33 L/Bcm dengan pencapaian OB 426 kbcm, FR Allowance di 0.91 L/Bcm sehingga over 0.42 L/Bcm."
    ]
  },
  SBS: {
    code: "SBS",
    name: "Site SBS (Pit E)",
    clientName: "PT Samindo Utama Kaltim",
    ebitdaPlan: 0.24,
    ebitdaAct: 0.61,
    ebitdaGrowth: "+154.17%",
    ebitdaDelta: "+0,37",
    areas: [
      {
        name: "PIT E AREA 1",
        planRevenue: 34500,
        actualRevenue: 41200,
        tomorrowRevenue: 78500,
        planOb: 12500,
        actualOb: 18400,
        forecastOb: 21000,
        planCoal: 420,
        actualCoal: 0,
        forecastCoal: 11200
      },
      {
        name: "PIT E AREA 2",
        planRevenue: 428000,
        actualRevenue: 465200,
        tomorrowRevenue: 680000,
        planOb: 145000,
        actualOb: 189500,
        forecastOb: 220000,
        planCoal: 31000,
        actualCoal: 54200,
        forecastCoal: 65000
      },
      {
        name: "DISPOSAL AREA 3",
        planRevenue: 112000,
        actualRevenue: 145000,
        tomorrowRevenue: 260000,
        planOb: 65000,
        actualOb: 92400,
        forecastOb: 105000,
        planCoal: 22000,
        actualCoal: 19800,
        forecastCoal: 31000
      }
    ],
    parameters: {
      k3lh: "Zero ( 0 )",
      volCh: 850000,
      ewhCh: 420,
      prodJamCh: 2024,
      prodDayCh: "27,419 Ton",
      volCm: 1650000,
      ewhCm: 290,
      prodJamCm: 5690,
      prodDayCm: "53,226 Ton/Jam",
      volOb: 6800000,
      ewhOb: 310,
      prodJamOb: 21935,
      prodDayOb: "219,355 Bcm/Jam"
    },
    milestone: {
      revenueObPlan: "$ 0.42",
      revenueObAct: "$ 0.55",
      revenueObAch: "131%",
      revenueCmPlan: "$ 0.05",
      revenueCmAct: "$ 0.07",
      revenueCmAch: "140%",
      revenueCtPlan: "$ 0.09",
      revenueCtAct: "$ 0.10",
      revenueCtAch: "111%",
      distObArea1Plan: "3.20",
      distObArea1Act: "2.85",
      distObArea1Ach: "89%",
      distObArea2Plan: "2.40",
      distObArea2Act: "2.30",
      distObArea2Ach: "96%",
      distObArea3Plan: "1.50",
      distObArea3Act: "1.25",
      distObArea3Ach: "83%",
      fuelRatioPlan: "1.10",
      fuelRatioAct: "1.08",
      fuelRatioAch: "98%",
      rmCostPlan: "$ 0.16",
      rmCostAct: "$ 0.11",
      rmCostAch: "145%"
    },
    costProfile: [
      { name: "EC", mtdPlan: 0.25, mtdAct: 0.27, ytdPlan: 0.28, ytdAct: 0.26, delta: -0.08 },
      { name: "Fuel", mtdPlan: 0.85, mtdAct: 1.05, ytdPlan: 0.84, ytdAct: 0.98, delta: 0.06 },
      { name: "Tyre", mtdPlan: 0.08, mtdAct: 0.08, ytdPlan: 0.08, ytdAct: 0.08, delta: -0.06 },
      { name: "RM", mtdPlan: 0.52, mtdAct: 0.58, ytdPlan: 0.52, ytdAct: 0.57, delta: -0.24 },
      { name: "Othr", mtdPlan: 0.38, mtdAct: 0.35, ytdPlan: 0.36, ytdAct: 0.32, delta: -0.11 }
    ],
    highlight: [
      "Pencapaian Volume OB SBS Pit E melampaui target bulanan sebesar 31% dengan optimalisasi armada CAT 395.",
      "Rental alat berat CAT D10 & CAT 395 beroperasi dengan utilisasi tinggi (EWH 310 jam) tanpa penalti keterlambatan."
    ]
  },
  DBK: {
    code: "DBK",
    name: "Site DBK (Petrosea)",
    clientName: "PT Petrosea Tbk",
    ebitdaPlan: 0.28,
    ebitdaAct: 0.72,
    ebitdaGrowth: "+157.14%",
    ebitdaDelta: "+0,44",
    areas: [
      {
        name: "PIT WEST",
        planRevenue: 380000,
        actualRevenue: 410000,
        tomorrowRevenue: 620000,
        planOb: 120000,
        actualOb: 165000,
        forecastOb: 190000,
        planCoal: 26000,
        actualCoal: 48000,
        forecastCoal: 56000
      },
      {
        name: "PIT EAST",
        planRevenue: 334438,
        actualRevenue: 272058,
        tomorrowRevenue: 513226,
        planOb: 112258,
        actualOb: 142674,
        forecastOb: 168092,
        planCoal: 23032,
        actualCoal: 41249,
        forecastCoal: 48904
      }
    ],
    parameters: {
      k3lh: "Zero ( 0 )",
      volCh: 920000,
      ewhCh: 460,
      prodJamCh: 2000,
      prodDayCh: "29,677 Ton",
      volCm: 1820000,
      ewhCm: 300,
      prodJamCm: 6067,
      prodDayCm: "58,710 Ton/Jam",
      volOb: 7400000,
      ewhOb: 330,
      prodJamOb: 22424,
      prodDayOb: "238,710 Bcm/Jam"
    },
    milestone: {
      revenueObPlan: "$ 0.48",
      revenueObAct: "$ 0.62",
      revenueObAch: "129%",
      revenueCmPlan: "$ 0.06",
      revenueCmAct: "$ 0.08",
      revenueCmAch: "133%",
      revenueCtPlan: "$ 0.11",
      revenueCtAct: "$ 0.12",
      revenueCtAch: "109%",
      distObArea1Plan: "3.60",
      distObArea1Act: "3.20",
      distObArea1Ach: "89%",
      distObArea2Plan: "2.60",
      distObArea2Act: "2.45",
      distObArea2Ach: "94%",
      fuelRatioPlan: "1.14",
      fuelRatioAct: "1.12",
      fuelRatioAch: "98%",
      rmCostPlan: "$ 0.20",
      rmCostAct: "$ 0.14",
      rmCostAch: "143%"
    },
    costProfile: [
      { name: "EC", mtdPlan: 0.27, mtdAct: 0.29, ytdPlan: 0.30, ytdAct: 0.28, delta: -0.08 },
      { name: "Fuel", mtdPlan: 0.88, mtdAct: 1.12, ytdPlan: 0.87, ytdAct: 1.04, delta: 0.06 },
      { name: "Tyre", mtdPlan: 0.09, mtdAct: 0.09, ytdPlan: 0.09, ytdAct: 0.09, delta: -0.07 },
      { name: "RM", mtdPlan: 0.55, mtdAct: 0.60, ytdPlan: 0.55, ytdAct: 0.61, delta: -0.26 },
      { name: "Othr", mtdPlan: 0.40, mtdAct: 0.38, ytdPlan: 0.39, ytdAct: 0.34, delta: -0.12 }
    ],
    highlight: [
      "Skema dual-currency Petrosea (USD/IDR) berkontribusi positif terhadap margin EBITDA berkat penguatan kurs transaksi.",
      "Overhaul C1/C2 berjalan sesuai jadwal dengan efisiensi konsumsi suku cadang mekanikal 8% di bawah plafon."
    ]
  },
  BGG: {
    code: "BGG",
    name: "Site BGG (Global Prima)",
    clientName: "PT Batubara Global Prima",
    ebitdaPlan: 0.21,
    ebitdaAct: 0.48,
    ebitdaGrowth: "+128.57%",
    ebitdaDelta: "+0,27",
    areas: [
      {
        name: "NORTH PIT",
        planRevenue: 85000,
        actualRevenue: 105000,
        tomorrowRevenue: 190000,
        planOb: 45000,
        actualOb: 68000,
        forecastOb: 72000,
        planCoal: 18000,
        actualCoal: 15500,
        forecastCoal: 23000
      },
      {
        name: "SOUTH PIT",
        planRevenue: 62000,
        actualRevenue: 78000,
        tomorrowRevenue: 140000,
        planOb: 35000,
        actualOb: 52000,
        forecastOb: 56000,
        planCoal: 12000,
        actualCoal: 11200,
        forecastCoal: 16500
      },
      {
        name: "CENTRAL PIT",
        planRevenue: 39565,
        actualRevenue: 48445,
        tomorrowRevenue: 87037,
        planOb: 20000,
        actualOb: 29687,
        forecastOb: 32618,
        planCoal: 8710,
        actualCoal: 7023,
        forecastCoal: 10981
      }
    ],
    parameters: {
      k3lh: "Zero ( 0 )",
      volCh: 620000,
      ewhCh: 440,
      prodJamCh: 1409,
      prodDayCh: "20,000 Ton",
      volCm: 1240000,
      ewhCm: 280,
      prodJamCm: 4429,
      prodDayCm: "40,000 Ton/Jam",
      volOb: 4800000,
      ewhOb: 320,
      prodJamOb: 15000,
      prodDayOb: "154,839 Bcm/Jam"
    },
    milestone: {
      revenueObPlan: "$ 0.31",
      revenueObAct: "$ 0.40",
      revenueObAch: "129%",
      revenueCmPlan: "$ 0.04",
      revenueCmAct: "$ 0.05",
      revenueCmAch: "125%",
      revenueCtPlan: "$ 0.07",
      revenueCtAct: "$ 0.08",
      revenueCtAch: "114%",
      distObArea1Plan: "3.40",
      distObArea1Act: "3.00",
      distObArea1Ach: "88%",
      distObArea2Plan: "2.50",
      distObArea2Act: "2.35",
      distObArea2Ach: "94%",
      distObArea3Plan: "1.60",
      distObArea3Act: "1.30",
      distObArea3Ach: "81%",
      fuelRatioPlan: "1.12",
      fuelRatioAct: "1.10",
      fuelRatioAch: "98%",
      rmCostPlan: "$ 0.13",
      rmCostAct: "$ 0.09",
      rmCostAch: "144%"
    },
    costProfile: [
      { name: "EC", mtdPlan: 0.26, mtdAct: 0.28, ytdPlan: 0.29, ytdAct: 0.27, delta: -0.07 },
      { name: "Fuel", mtdPlan: 0.86, mtdAct: 1.08, ytdPlan: 0.85, ytdAct: 1.00, delta: 0.06 },
      { name: "Tyre", mtdPlan: 0.08, mtdAct: 0.08, ytdPlan: 0.08, ytdAct: 0.08, delta: -0.06 },
      { name: "RM", mtdPlan: 0.53, mtdAct: 0.59, ytdPlan: 0.53, ytdAct: 0.58, delta: -0.25 },
      { name: "Othr", mtdPlan: 0.39, mtdAct: 0.36, ytdPlan: 0.37, ytdAct: 0.33, delta: -0.11 }
    ],
    highlight: [
      "Struktur 6-section hierarchy BGG & Coal Index Tier berjalan optimal dengan penyesuaian Raise & Fall 0.56.",
      "Deduction DP Solar terkendali dengan efisiensi armada hauler di lintasan North Pit."
    ]
  },
  POS: {
    code: "POS",
    name: "Site POS (Prima Perkasa)",
    clientName: "PT Pelayaran Prima Perkasa",
    ebitdaPlan: 0.18,
    ebitdaAct: 0.42,
    ebitdaGrowth: "+133.33%",
    ebitdaDelta: "+0,24",
    areas: [
      {
        name: "PIT STRIPPING",
        planRevenue: 120000,
        actualRevenue: 155000,
        tomorrowRevenue: 280000,
        planOb: 55000,
        actualOb: 82000,
        forecastOb: 90000,
        planCoal: 16000,
        actualCoal: 14000,
        forecastCoal: 21000
      },
      {
        name: "STOCKPILE AREA",
        planRevenue: 85000,
        actualRevenue: 110000,
        tomorrowRevenue: 195000,
        planOb: 38000,
        actualOb: 56000,
        forecastOb: 62000,
        planCoal: 11000,
        actualCoal: 9800,
        forecastCoal: 14500
      }
    ],
    parameters: {
      k3lh: "Zero ( 0 )",
      volCh: 510000,
      ewhCh: 430,
      prodJamCh: 1186,
      prodDayCh: "16,452 Ton",
      volCm: 1020000,
      ewhCm: 270,
      prodJamCm: 3778,
      prodDayCm: "32,903 Ton/Jam",
      volOb: 3900000,
      ewhOb: 310,
      prodJamOb: 12581,
      prodDayOb: "125,806 Bcm/Jam"
    },
    milestone: {
      revenueObPlan: "$ 0.25",
      revenueObAct: "$ 0.33",
      revenueObAch: "132%",
      revenueCmPlan: "$ 0.03",
      revenueCmAct: "$ 0.04",
      revenueCmAch: "133%",
      revenueCtPlan: "$ 0.06",
      revenueCtAct: "$ 0.06",
      revenueCtAch: "100%",
      distObArea1Plan: "3.10",
      distObArea1Act: "2.75",
      distObArea1Ach: "89%",
      distObArea2Plan: "2.30",
      distObArea2Act: "2.15",
      distObArea2Ach: "93%",
      fuelRatioPlan: "1.10",
      fuelRatioAct: "1.09",
      fuelRatioAch: "99%",
      rmCostPlan: "$ 0.11",
      rmCostAct: "$ 0.07",
      rmCostAch: "157%"
    },
    costProfile: [
      { name: "EC", mtdPlan: 0.24, mtdAct: 0.26, ytdPlan: 0.27, ytdAct: 0.25, delta: -0.06 },
      { name: "Fuel", mtdPlan: 0.82, mtdAct: 1.02, ytdPlan: 0.81, ytdAct: 0.95, delta: 0.05 },
      { name: "Tyre", mtdPlan: 0.07, mtdAct: 0.07, ytdPlan: 0.07, ytdAct: 0.07, delta: -0.05 },
      { name: "RM", mtdPlan: 0.50, mtdAct: 0.55, ytdPlan: 0.50, ytdAct: 0.54, delta: -0.22 },
      { name: "Othr", mtdPlan: 0.36, mtdAct: 0.33, ytdPlan: 0.34, ytdAct: 0.30, delta: -0.10 }
    ],
    highlight: [
      "Formula 3-Factor DLF Fuel, Labor, Forex POS berjalan akurat dengan verifikasi BA Tracker terkini.",
      "Produksi Pit Stripping mencapai 149% dari target harian dengan zero incident LTI."
    ]
  }
};
