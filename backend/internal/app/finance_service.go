package app

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/xml"
	"errors"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

type FinanceDashboardSummary struct {
	KPIs               []KPI                 `json:"kpis"`
	AgingMatrix        []AgingMatrixRow      `json:"agingMatrix"`
	TopOverdueInvoices []InvoiceMaster       `json:"topOverdueInvoices"`
	BABottlenecks      []BABottleneckSummary `json:"baBottlenecks"`
}

type AgingMatrixRow struct {
	Customer     string  `json:"customer"`
	NotDue       float64 `json:"notDue"`
	Bucket1_30   float64 `json:"bucket1_30"`
	Bucket31_60  float64 `json:"bucket31_60"`
	Bucket61_90  float64 `json:"bucket61_90"`
	BucketOver90 float64 `json:"bucketOver90"`
	Total        float64 `json:"total"`
	InvoiceCount int     `json:"invoiceCount"`
}

type BABottleneckSummary struct {
	Customer          string  `json:"customer"`
	AvgLeadTimeBA     float64 `json:"avgLeadTimeBA"`
	AvgLagBAToInvoice float64 `json:"avgLagBAToInvoice"`
	BACount           int     `json:"baCount"`
}

type financeStore struct {
	mu            sync.RWMutex
	invoices      []InvoiceMaster
	baList        []BATracker
	payments      []PaymentLog
	customers     []CustomerMaster
	bankAccounts  []BankAccountMaster
	variableSOWs  []VariableSOW
	raiseFallList []RaiseFallMaster
	exchangeRates []DailyExchangeRate
	nextID        int64
}

var globalFinanceStore *financeStore
var storeOnce sync.Once

func getStore() *financeStore {
	storeOnce.Do(func() {
		now := time.Now()
		date := func(s string) time.Time {
			t, _ := time.Parse("2006-01-02", s)
			return t
		}
		pdate := func(s string) *time.Time {
			t := date(s)
			return &t
		}

		globalFinanceStore = &financeStore{
			nextID: 100,
			bankAccounts: []BankAccountMaster{
				{ID: 1, BankCode: "MND-ESCROW", BankName: "Bank Mandiri Escrow", AccountNo: "118-00-1092837-1", AccountHolder: "PT Andalan Artha Primanusa", Branch: "Jakarta Plaza Mandiri", COAAccountID: 1011, Currency: "IDR", Status: "Active", CreatedAt: now},
				{ID: 2, BankCode: "BRI-ESCROW", BankName: "BRI Escrow", AccountNo: "0341-01-000293-30-2", AccountHolder: "PT Andalan Artha Primanusa", Branch: "Jakarta Veteran", COAAccountID: 1012, Currency: "IDR", Status: "Active", CreatedAt: now},
				{ID: 3, BankCode: "MND-OP", BankName: "Mandiri Operational 0000 OP", AccountNo: "118-00-9988112-4", AccountHolder: "PT Andalan Artha Primanusa", Branch: "Jakarta Sudirman", COAAccountID: 1010, Currency: "IDR", Status: "Active", CreatedAt: now},
				{ID: 4, BankCode: "BCA-OP", BankName: "BCA Operational Utama", AccountNo: "531-0988771", AccountHolder: "PT Andalan Artha Primanusa", Branch: "KCU Wisma Asia", COAAccountID: 1013, Currency: "IDR", Status: "Active", CreatedAt: now},
			},
			customers: []CustomerMaster{
				{ID: 1, Code: "BGG", FullName: "PT Budi Gema Gempita", GroupParent: "Petrindo Jaya Kreasi Tbk", TerminDays: 30, ContactAR: "Finance AR BGG", EmailAR: "ar@bgg.co.id", Phone: "+62 21 555 0192", ContractNo: "09/BGG-AAP/VIII/2018 + Addendum 02/ADDM-BGG-AAP/I/2022", ContractValue: 87689932460, AvgPaymentDays: 168.4, Notes: "Termin per pekerjaan, double rate, 7 tahun", CreatedAt: now},
				{ID: 2, Code: "SBS", FullName: "PT Satria Bahana Sarana", GroupParent: "Bukit Asam Tbk (PTBA)", TerminDays: 30, ContactAR: "Finance AR SBS", EmailAR: "ar@sbs.co.id", Phone: "+62 734 451 022", ContractNo: "230/AAP-SBS/EXT/XII/24 + Addendum II 258/AAPSBS/EXT/XII/2025", ContractValue: 7244125540, AvgPaymentDays: 18.2, Notes: "Tarif Rp 1.980.000/jam, 60 bulan", CreatedAt: now},
				{ID: 3, Code: "DBK", FullName: "PT Daya Bumindo Karunia", GroupParent: "Harum Energy Tbk", TerminDays: 45, ContactAR: "Finance AR DBK", EmailAR: "ar@dbk.co.id", Phone: "+62 21 290 8890", ContractNo: "001/DBK-AAP/2024", ContractValue: 45000000000, AvgPaymentDays: 42.5, Notes: "Site nikel - kontrak via ABN sebelum merger", CreatedAt: now},
				{ID: 4, Code: "POS", FullName: "PT Position", GroupParent: "Arkara Prathama Energi", TerminDays: 30, ContactAR: "Finance AR POS", EmailAR: "ar@position.co.id", Phone: "+62 21 789 2210", ContractNo: "002/POS-AAP/2025", ContractValue: 12000000000, AvgPaymentDays: -3.5, Notes: "Site Position - kontrak via ABC sebelum merger", CreatedAt: now},
				{ID: 5, Code: "ABN", FullName: "PT Andalan Bhumi Nusantara", GroupParent: "Related Party (Afiliasi)", TerminDays: 30, ContactAR: "Internal AAP", EmailAR: "internal@andalan-nusantara.com", Phone: "+62 21 800 1122", ContractNo: "001/AAP-ABN/IV/25", ContractValue: 5000000000, AvgPaymentDays: 0.0, Notes: "Sewa alat berat (D8R, D85ESS, Motor Grader 160K, dll)", CreatedAt: now},
			},
			variableSOWs: []VariableSOW{
				{ID: 1, Category: "Operation & Mining", ItemName: "Clear & Grub", RateUSD: 0.381, Unit: "USD/m2", Customer: "POS", Description: "Pembersihan lahan awal", Status: "Active", CreatedAt: now},
				{ID: 2, Category: "Operation & Mining", ItemName: "Topsoil Removal - Base Rate (1000m)", RateUSD: 3.380, Unit: "USD/BCM", Customer: "POS", Description: "Pengupasan tanah pucuk", Status: "Active", CreatedAt: now},
				{ID: 3, Category: "Operation & Mining", ItemName: "Topsoil Removal - over/underhaul", RateUSD: 0.538, Unit: "USD/1KM", Customer: "POS", Description: "Jarak angkut tambahan topsoil", Status: "Active", CreatedAt: now},
				{ID: 4, Category: "Operation & Mining", ItemName: "Overburden/Waste - Base Rate (1000m)", RateUSD: 3.327, Unit: "USD/BCM", Customer: "POS", Description: "Pengupasan OB tambang nikel", Status: "Active", CreatedAt: now},
				{ID: 5, Category: "Operation & Mining", ItemName: "OB/Waste - over/underhaul", RateUSD: 0.538, Unit: "USD/1KM", Customer: "POS", Description: "Jarak angkut tambahan OB", Status: "Active", CreatedAt: now},
				{ID: 6, Category: "Operation & Mining", ItemName: "Limonite - Base Rate (1000m)", RateUSD: 3.363, Unit: "USD/BCM", Customer: "POS", Description: "Penggalian bijih nikel limonite", Status: "Active", CreatedAt: now},
				{ID: 7, Category: "Operation & Mining", ItemName: "Limonite - over/underhaul", RateUSD: 0.526, Unit: "USD/1KM", Customer: "POS", Description: "Jarak angkut tambahan limonite", Status: "Active", CreatedAt: now},
				{ID: 8, Category: "Operation & Mining", ItemName: "Saprolite - Base Rate (1000m)", RateUSD: 3.472, Unit: "USD/BCM", Customer: "POS", Description: "Penggalian bijih nikel saprolite High-Grade", Status: "Active", CreatedAt: now},
				{ID: 9, Category: "Operation & Mining", ItemName: "Saprolite - over/underhaul", RateUSD: 0.526, Unit: "USD/1KM", Customer: "POS", Description: "Jarak angkut tambahan saprolite", Status: "Active", CreatedAt: now},
				{ID: 10, Category: "Rehabilitation", ItemName: "Topsoil Reclaim/Haul/Spread - Base Rate (1000m)", RateUSD: 3.258, Unit: "USD/BCM", Customer: "POS", Description: "Reklamasi & perataan tanah pucuk", Status: "Active", CreatedAt: now},
				{ID: 11, Category: "Rehabilitation", ItemName: "Topsoil Reclaim/Haul/Spread - overhaul", RateUSD: 0.538, Unit: "USD/1KM", Customer: "POS", Description: "Jarak angkut tambahan reklamasi", Status: "Active", CreatedAt: now},
				{ID: 12, Category: "Mine Development (MDO)", ItemName: "Cut - Base Rate (1000m)", RateUSD: 2.129, Unit: "USD/BCM", Customer: "POS", Description: "Pemotongan jalan tambang", Status: "Active", CreatedAt: now},
				{ID: 15, Category: "Mine Development (MDO)", ItemName: "Cut or Fill under/overhaul", RateUSD: 0.521, Unit: "USD/1KM", Customer: "POS", Description: "Jarak angkut tambahan MDO", Status: "Active", CreatedAt: now},
				{ID: 16, Category: "Mine Development (MDO)", ItemName: "Uncrushed rocks for construction - Base Rate (1000m)", RateUSD: 7.938, Unit: "USD/BCM", Customer: "POS", Description: "Batu konstruksi tanpa penghancuran", Status: "Active", CreatedAt: now},
				{ID: 17, Category: "Mine Development (MDO)", ItemName: "Crusher rocks - Base Rate (1000m)", RateUSD: 13.050, Unit: "USD/BCM", Customer: "POS", Description: "Batu konstruksi dengan crusher", Status: "Active", CreatedAt: now},
				{ID: 18, Category: "Mine Development (MDO)", ItemName: "Rocks for construction - under/overhaul", RateUSD: 0.526, Unit: "USD/1KM", Customer: "POS", Description: "Jarak angkut batu konstruksi", Status: "Active", CreatedAt: now},
				{ID: 19, Category: "Mine Development (MDO)", ItemName: "Geotextile", RateUSD: 2.003, Unit: "USD/m2", Customer: "POS", Description: "Pemasangan geotextile jalan", Status: "Active", CreatedAt: now},

				// BGG SOW Master (Gambar 2)
				{ID: 20, Category: "OB Removal", ItemName: "OVER BURDEN REMOVAL 1 (75%) (Feb-26)", RateIDR: 27250, Unit: "Bcm", Customer: "BGG", CustomerCode: "BGG", Description: "OB Removal 75% Feb 2026", Status: "Active", CreatedAt: now},
				{ID: 21, Category: "OB Removal", ItemName: "OVER BURDEN REMOVAL 1 (75%) (Jun-26)", RateIDR: 29500, Unit: "Bcm", Customer: "BGG", CustomerCode: "BGG", Description: "OB Removal 75% Jun 2026", Status: "Active", CreatedAt: now},
				{ID: 22, Category: "OB Removal", ItemName: "OVER BURDEN REMOVAL 2 (25%) (Feb-26)", RateIDR: 26500, Unit: "Bcm", Customer: "BGG", CustomerCode: "BGG", Description: "OB Removal 25% Feb 2026", Status: "Active", CreatedAt: now},
				{ID: 23, Category: "OB Removal", ItemName: "OVER BURDEN REMOVAL 2 (25%) (Jun-26)", RateIDR: 28750, Unit: "Bcm", Customer: "BGG", CustomerCode: "BGG", Description: "OB Removal 25% Jun 2026", Status: "Active", CreatedAt: now},
				{ID: 24, Category: "Coal Winning", ItemName: "Coal Winning Pit Kungkilan", RateIDR: 17500, Unit: "Ton", Customer: "BGG", CustomerCode: "BGG", Description: "Coal Winning Pit Kungkilan", Status: "Active", CreatedAt: now},
				{ID: 25, Category: "Over Distance", ItemName: "Over Distance For OB Removal (Feb-26)", RateIDR: 1393, Unit: "Bcm", Customer: "BGG", CustomerCode: "BGG", Description: "Over Distance OB Feb 2026", Status: "Active", CreatedAt: now},
				{ID: 26, Category: "Over Distance", ItemName: "Over Distance For OB Removal (Jun-26)", RateIDR: 1550, Unit: "Bcm", Customer: "BGG", CustomerCode: "BGG", Description: "Over Distance OB Jun 2026", Status: "Active", CreatedAt: now},
				{ID: 27, Category: "Over Distance", ItemName: "Over Distance For Coal Winning (Jun-26)", RateIDR: 19700, Unit: "Ton", Customer: "BGG", CustomerCode: "BGG", Description: "Over Distance Coal Jun 2026", Status: "Active", CreatedAt: now},

				// DBK SOW Master (Gambar 3)
				{ID: 28, Category: "OB Removal", ItemName: "PIT SAPAN OB Removal", RateUSD: 1.831, Unit: "Bcm", Customer: "DBK", CustomerCode: "DBK", Description: "OB Removal Pit Sapan Rate USD", Status: "Active", CreatedAt: now},
				{ID: 29, Category: "Coal Winning", ItemName: "PIT SAPAN Coal Winning", RateUSD: 0.887, Unit: "Ton", Customer: "DBK", CustomerCode: "DBK", Description: "Coal Winning Pit Sapan Rate USD", Status: "Active", CreatedAt: now},
				{ID: 30, Category: "Over Distance", ItemName: "PIT SAPAN Overhaul OB (per 100m)", RateIDR: 296.86, Unit: "Bcm", Customer: "DBK", CustomerCode: "DBK", Description: "Over Distance OB Rate IDR", Status: "Active", CreatedAt: now},
				{ID: 31, Category: "Over Distance", ItemName: "PIT SAPAN Overhaul Coal (per 100m)", RateIDR: 1042.84, Unit: "Ton", Customer: "DBK", CustomerCode: "DBK", Description: "Over Distance Coal Rate IDR", Status: "Active", CreatedAt: now},

				// SBS SOW Master (Gambar 4)
				{ID: 32, Category: "OB Removal", ItemName: "PIT E - DISPOSAL SEKATAN", RateIDR: 22654, Unit: "BCM", Customer: "SBS", CustomerCode: "SBS", Description: "OB Removal Disposal Sekatan", Status: "Active", CreatedAt: now},
				{ID: 33, Category: "OB Removal", ItemName: "PIT E - RENCANA JALAN", RateIDR: 12638, Unit: "BCM", Customer: "SBS", CustomerCode: "SBS", Description: "OB Removal Rencana Jalan", Status: "Active", CreatedAt: now},
				{ID: 34, Category: "OB Removal", ItemName: "PIT E - RENCANA CSA", RateIDR: 8346, Unit: "BCM", Customer: "SBS", CustomerCode: "SBS", Description: "OB Removal Rencana CSA", Status: "Active", CreatedAt: now},
				{ID: 35, Category: "OB Removal", ItemName: "PIT E - JALAN BARITO", RateIDR: 15500, Unit: "BCM", Customer: "SBS", CustomerCode: "SBS", Description: "OB Removal Jalan Barito", Status: "Active", CreatedAt: now},
				{ID: 36, Category: "OB Removal", ItemName: "PIT E - SEKATAN", RateIDR: 16931, Unit: "BCM", Customer: "SBS", CustomerCode: "SBS", Description: "OB Removal Sekatan", Status: "Active", CreatedAt: now},
				{ID: 37, Category: "OB Removal", ItemName: "PIT E - TS MAHONI", RateIDR: 22654, Unit: "BCM", Customer: "SBS", CustomerCode: "SBS", Description: "OB Removal TS Mahoni", Status: "Active", CreatedAt: now},
				{ID: 38, Category: "OB Removal", ItemName: "PIT E - IPD WARWEFILL", RateIDR: 8346, Unit: "BCM", Customer: "SBS", CustomerCode: "SBS", Description: "OB Removal IPD Warwefill", Status: "Active", CreatedAt: now},
				{ID: 39, Category: "Jasa Penunjang", ItemName: "Dozer CAT D10", RateIDR: 1980000, Unit: "Hours", Customer: "SBS", CustomerCode: "SBS", Description: "Sewa Dozer CAT D10", Status: "Active", CreatedAt: now},
				{ID: 40, Category: "Jasa Penunjang", ItemName: "Excavator CAT 395", RateIDR: 1425000, Unit: "Hours", Customer: "SBS", CustomerCode: "SBS", Description: "Sewa Excavator CAT 395", Status: "Active", CreatedAt: now},
			},
			raiseFallList: []RaiseFallMaster{
				{
					ID:            1,
					Period:        "Juni 2026",
					CustomerCode:  "POS",
					ProjectSite:   "POS PROJECT",
					ContractNo:    "002/POS-AAP/2025",
					WeightFuelA:   0.34,
					WeightLaborB:  0.25,
					WeightFixedC:  0.41,
					BaseFuelFo:    10699.97,
					BaseLaborLo:   3594536.0,
					BaseForexXo:   15388.75,
					ActualFuelFn:  1.422,
					ActualLaborLn: 3721423.0,
					ActualMRateXn: 17923.30,
					RFIndexResult: 1.521,
					Notes:         "Master Perhitungan Raise & Fall POS Project Juni 2026",
					UpdatedAt:     now,
				},
				{
					ID:            2,
					Period:        "Juni 2026",
					CustomerCode:  "SBS",
					ProjectSite:   "PT Satria Bahana Sarana Site",
					ContractNo:    "230/AAP-SBS/EXT/XII/24 + Addendum II 258/AAPSBS/EXT/XII/2025",
					WeightFuelA:   0.30,
					WeightLaborB:  0.30,
					WeightFixedC:  0.40,
					BaseFuelFo:    11200.00,
					BaseLaborLo:   3500000.0,
					BaseForexXo:   15500.00,
					ActualFuelFn:  1.422,
					ActualLaborLn: 3721423.0,
					ActualMRateXn: 17923.30,
					RFIndexResult: 1.485,
					Notes:         "Master Perhitungan Raise & Fall PT SBS Juni 2026",
					UpdatedAt:     now,
				},
				{
					ID:            3,
					Period:        "Juni 2026",
					CustomerCode:  "BGG",
					ProjectSite:   "PT Budi Gema Gempita Site",
					ContractNo:    "09/BGG-AAP/VIII/2018 + Addendum 02/ADDM-BGG-AAP/I/2022",
					WeightFuelA:   0.35,
					WeightLaborB:  0.25,
					WeightFixedC:  0.40,
					BaseFuelFo:    10500.00,
					BaseLaborLo:   3600000.0,
					BaseForexXo:   15400.00,
					ActualFuelFn:  1.422,
					ActualLaborLn: 3721423.0,
					ActualMRateXn: 17923.30,
					RFIndexResult: 1.510,
					Notes:         "Master Perhitungan Raise & Fall PT BGG Juni 2026",
					UpdatedAt:     now,
				},
				{
					ID:            4,
					Period:        "Juni 2026",
					CustomerCode:  "DBK",
					ProjectSite:   "PT Daya Bumindo Karunia Site",
					ContractNo:    "001/DBK-AAP/2024",
					WeightFuelA:   0.32,
					WeightLaborB:  0.28,
					WeightFixedC:  0.40,
					BaseFuelFo:    10800.00,
					BaseLaborLo:   3550000.0,
					BaseForexXo:   15450.00,
					ActualFuelFn:  1.422,
					ActualLaborLn: 3721423.0,
					ActualMRateXn: 17923.30,
					RFIndexResult: 1.495,
					Notes:         "Master Perhitungan Raise & Fall PT DBK Juni 2026",
					UpdatedAt:     now,
				},
				{
					ID:            5,
					Period:        "Juni 2026",
					CustomerCode:  "ABN",
					ProjectSite:   "PT Andalan Bhumi Nusantara Site",
					ContractNo:    "001/AAP-ABN/IV/25",
					WeightFuelA:   0.33,
					WeightLaborB:  0.27,
					WeightFixedC:  0.40,
					BaseFuelFo:    10750.00,
					BaseLaborLo:   3580000.0,
					BaseForexXo:   15420.00,
					ActualFuelFn:  1.422,
					ActualLaborLn: 3721423.0,
					ActualMRateXn: 17923.30,
					RFIndexResult: 1.505,
					Notes:         "Master Perhitungan Raise & Fall PT ABN Juni 2026",
					UpdatedAt:     now,
				},
			},
			exchangeRates: []DailyExchangeRate{
				{ID: 1, Period: "Juni 2026", No: 1, DateStr: "30/06/2026", KursJual: 17945.28, KursBeli: 17766.72, KursTengah: 17856.00},
				{ID: 2, Period: "Juni 2026", No: 2, DateStr: "29/06/2026", KursJual: 18051.81, KursBeli: 17872.19, KursTengah: 17962.00},
				{ID: 3, Period: "Juni 2026", No: 3, DateStr: "26/06/2026", KursJual: 18031.71, KursBeli: 17852.29, KursTengah: 17942.00},
				{ID: 4, Period: "Juni 2026", No: 4, DateStr: "25/06/2026", KursJual: 18044.78, KursBeli: 17865.22, KursTengah: 17955.00},
				{ID: 5, Period: "Juni 2026", No: 5, DateStr: "24/06/2026", KursJual: 17957.34, KursBeli: 17778.66, KursTengah: 17868.00},
				{ID: 6, Period: "Juni 2026", No: 6, DateStr: "23/06/2026", KursJual: 17908.10, KursBeli: 17729.90, KursTengah: 17819.00},
				{ID: 7, Period: "Juni 2026", No: 7, DateStr: "22/06/2026", KursJual: 17915.13, KursBeli: 17736.87, KursTengah: 17826.00},
				{ID: 8, Period: "Juni 2026", No: 8, DateStr: "19/06/2026", KursJual: 17915.13, KursBeli: 17736.87, KursTengah: 17826.00},
				{ID: 9, Period: "Juni 2026", No: 9, DateStr: "18/06/2026", KursJual: 17841.76, KursBeli: 17664.24, KursTengah: 17753.00},
				{ID: 10, Period: "Juni 2026", No: 10, DateStr: "17/06/2026", KursJual: 17807.60, KursBeli: 17630.40, KursTengah: 17719.00},
				{ID: 11, Period: "Juni 2026", No: 11, DateStr: "15/06/2026", KursJual: 18010.60, KursBeli: 17831.40, KursTengah: 17921.00},
				{ID: 12, Period: "Juni 2026", No: 12, DateStr: "12/06/2026", KursJual: 18070.90, KursBeli: 17891.10, KursTengah: 17981.00},
				{ID: 13, Period: "Juni 2026", No: 13, DateStr: "11/06/2026", KursJual: 18060.85, KursBeli: 17881.15, KursTengah: 17971.00},
				{ID: 14, Period: "Juni 2026", No: 14, DateStr: "10/06/2026", KursJual: 18231.71, KursBeli: 18050.29, KursTengah: 18141.00},
				{ID: 15, Period: "Juni 2026", No: 15, DateStr: "09/06/2026", KursJual: 18261.85, KursBeli: 18080.15, KursTengah: 18171.00},
				{ID: 16, Period: "Juni 2026", No: 16, DateStr: "08/06/2026", KursJual: 18129.19, KursBeli: 17948.81, KursTengah: 18039.00},
				{ID: 17, Period: "Juni 2026", No: 17, DateStr: "05/06/2026", KursJual: 18129.19, KursBeli: 17948.81, KursTengah: 18039.00},
				{ID: 18, Period: "Juni 2026", No: 18, DateStr: "04/06/2026", KursJual: 18020.65, KursBeli: 17841.35, KursTengah: 17931.00},
				{ID: 19, Period: "Juni 2026", No: 19, DateStr: "03/06/2026", KursJual: 17952.31, KursBeli: 17773.69, KursTengah: 17863.00},
				{ID: 20, Period: "Juni 2026", No: 20, DateStr: "02/06/2026", KursJual: 17972.42, KursBeli: 17793.58, KursTengah: 17883.00},
			},
			baList: []BATracker{
				{ID: 1, BANumber: "20/BAP-AAP-KKLII/26", CustomerCode: "BGG", WorkPeriod: "Jan-26", WorkAmount: 6660392676, WorkEndDate: pdate("2026-01-31"), BASubmittedDate: pdate("2026-01-31"), BASignedDate: pdate("2026-01-31"), LeadTimeDays: 0, StatusBA: "Ready to Invoice", PICAAP: "Operations", InvoiceNoLinked: "086/BGG-AAP/I/2026", InvoiceIssuedDate: pdate("2026-02-25"), LagBAToInvoiceDays: 25, NotesBottleneck: "🐢 Slow: Lag BA Invoice >5 hari", Notes: "Tanggal pengajuan BA dan ttd BA normal", DraftBAPath: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", FinalBAPath: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", CreatedAt: now},
				{ID: 2, BANumber: "21/BAP-AAP-KKL/II/26", CustomerCode: "BGG", WorkPeriod: "Feb-26", WorkAmount: 7850000000, WorkEndDate: pdate("2026-02-28"), BASubmittedDate: pdate("2026-02-28"), BASignedDate: pdate("2026-02-28"), LeadTimeDays: 0, StatusBA: "Ready to Invoice", PICAAP: "Operations", InvoiceNoLinked: "087/BGG-AAP/II/2026", InvoiceIssuedDate: pdate("2026-03-25"), LagBAToInvoiceDays: 25, NotesBottleneck: "🐢 Slow: Lag BA Invoice >5 hari", Notes: "Tanggal pengajuan BA dan ttd BA normal", DraftBAPath: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", FinalBAPath: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", CreatedAt: now},
				{ID: 3, BANumber: "22/BAP-AAP-KKL/III/26", CustomerCode: "BGG", WorkPeriod: "Mar-26", WorkAmount: 20299536335, WorkEndDate: pdate("2026-03-31"), BASubmittedDate: pdate("2026-03-31"), BASignedDate: pdate("2026-03-31"), LeadTimeDays: 0, StatusBA: "Ready to Invoice", PICAAP: "Operations", InvoiceNoLinked: "088/BGG-AAP/II/2026", InvoiceIssuedDate: pdate("2026-04-20"), LagBAToInvoiceDays: 20, NotesBottleneck: "🐢 Slow: Lag BA Invoice >5 hari", Notes: "Pending Nov & Des 2025", DraftBAPath: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", FinalBAPath: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", CreatedAt: now},
				{ID: 4, BANumber: "127-128/SBS-Banko/PRO/III/2026", CustomerCode: "SBS", WorkPeriod: "Jan-26", WorkAmount: 4850000000, WorkEndDate: pdate("2026-01-31"), BASubmittedDate: pdate("2026-03-11"), BASignedDate: pdate("2026-03-13"), LeadTimeDays: 41, StatusBA: "Ready to Invoice", PICAAP: "Site Engineer", InvoiceNoLinked: "014/SBS-AAP/I/2026", InvoiceIssuedDate: pdate("2026-04-07"), LagBAToInvoiceDays: 25, NotesBottleneck: "🐢 Slow: Lead time BA >14 hari", Notes: "Keterlambatan verifikasi customer", DraftBAPath: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", FinalBAPath: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", CreatedAt: now},
				{ID: 5, BANumber: "55-56/SBS-Banko/PRO/I/2026", CustomerCode: "SBS", WorkPeriod: "Dec-25", WorkAmount: 3231259551, WorkEndDate: pdate("2025-12-31"), BASubmittedDate: pdate("2026-02-23"), BASignedDate: pdate("2026-02-25"), LeadTimeDays: 56, StatusBA: "Ready to Invoice", PICAAP: "Site Engineer", InvoiceNoLinked: "013/SBS-AAP/XII/2025", InvoiceIssuedDate: pdate("2026-03-27"), LagBAToInvoiceDays: 30, NotesBottleneck: "🐢 Slow: Lead time BA >14 hari", Notes: "Revisi volume HM", DraftBAPath: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", FinalBAPath: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", CreatedAt: now},
				{ID: 6, BANumber: "01/DBK-AAP/I/2026", CustomerCode: "DBK", WorkPeriod: "Jan-26", WorkAmount: 5400000000, WorkEndDate: pdate("2026-01-31"), BASubmittedDate: pdate("2026-02-04"), BASignedDate: pdate("2026-05-25"), LeadTimeDays: 114, StatusBA: "Ready to Invoice", PICAAP: "Mining Manager", InvoiceNoLinked: "008/PTRO-ABN/I/2026", InvoiceIssuedDate: pdate("2026-06-24"), LagBAToInvoiceDays: 30, NotesBottleneck: "🐢 Slow: Lead time BA >14 hari", Notes: "Invoice terbit Juni 2026", DraftBAPath: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", FinalBAPath: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", CreatedAt: now},
				{ID: 7, BANumber: "270-273/SBS-Banko/PRO/III/2026", CustomerCode: "SBS", WorkPeriod: "Feb-26", WorkAmount: 3950000000, WorkEndDate: pdate("2026-02-28"), BASubmittedDate: nil, BASignedDate: nil, LeadTimeDays: 0, StatusBA: "Submit", PICAAP: "Operations", InvoiceNoLinked: "015/SBS-AAP/II/2026", InvoiceIssuedDate: nil, LagBAToInvoiceDays: 0, NotesBottleneck: "⚠️ Internal: BA belum diajukan", Notes: "Belum TTD customer", DraftBAPath: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", FinalBAPath: "", CreatedAt: now},
				{ID: 8, BANumber: "050/BA-HRGA/AAP-POS/V/2026", CustomerCode: "POS", WorkPeriod: "May-26", WorkAmount: 4754595031, WorkEndDate: pdate("2026-05-20"), BASubmittedDate: pdate("2026-05-26"), BASignedDate: pdate("2026-05-28"), LeadTimeDays: 8, StatusBA: "Ready to Invoice", PICAAP: "HRGA", InvoiceNoLinked: "002/POS-AAP/BC-MESS/VI/2026", InvoiceIssuedDate: pdate("2026-06-02"), LagBAToInvoiceDays: 5, NotesBottleneck: "OK", Notes: "Mess Facility claim", DraftBAPath: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", FinalBAPath: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", CreatedAt: now},
				{ID: 9, BANumber: "051/BA-POS-NIKEL/VI/2026", CustomerCode: "POS", WorkPeriod: "Jun-26", WorkAmount: 42150000000, WorkEndDate: pdate("2026-06-30"), BASubmittedDate: pdate("2026-06-30"), BASignedDate: pdate("2026-07-02"), LeadTimeDays: 2, StatusBA: "Ready to Invoice", PICAAP: "Site Manager", InvoiceNoLinked: "003/POS-AAP/RF/VI/2026", InvoiceIssuedDate: pdate("2026-07-05"), LagBAToInvoiceDays: 3, NotesBottleneck: "OK", Notes: "Mining OB Removal & Nikel Ore Jun-26", DraftBAPath: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", FinalBAPath: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", CreatedAt: now},
				{ID: 10, BANumber: "052/BA-POS-NIKEL/VII/2026", CustomerCode: "POS", WorkPeriod: "Jul-26", WorkAmount: 44448368475, WorkEndDate: pdate("2026-07-31"), BASubmittedDate: pdate("2026-07-31"), BASignedDate: pdate("2026-08-03"), LeadTimeDays: 3, StatusBA: "Ready to Invoice", PICAAP: "Operations", InvoiceNoLinked: "", InvoiceIssuedDate: nil, LagBAToInvoiceDays: 0, NotesBottleneck: "OK: Dalam Proses Penagihan", Notes: "Klaim Utama Tambang Nikel POS Juli 2026", DraftBAPath: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", FinalBAPath: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", CreatedAt: now},
				{ID: 11, BANumber: "053/BA-POS-PENDING-VOL/VII/2026", CustomerCode: "POS", WorkPeriod: "Jul-26", WorkAmount: 1873994494, WorkEndDate: pdate("2026-07-31"), BASubmittedDate: nil, BASignedDate: nil, LeadTimeDays: 0, StatusBA: "Submit", PICAAP: "Surveyor", InvoiceNoLinked: "", InvoiceIssuedDate: nil, LagBAToInvoiceDays: 0, NotesBottleneck: "⚠️ Pending: Joint Survey Tambahan", Notes: "Pending Volume Hasil Joint Survey Juli 2026", DraftBAPath: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", FinalBAPath: "", CreatedAt: now},
			},
			payments: []PaymentLog{
				{ID: 1, InvoiceNo: "012/SBS-AAP/XI/2025", CustomerCode: "SBS", AmountPaid: 1568339432, PaymentDate: date("2026-03-11"), ReceivingBank: "BRI Escrow", RefNo: "TRF-BRI-00129", PaymentPeriod: "Mar-26", Notes: "Lunas (Telat 11 Hari)", DaysLateOrEarly: 11, CreatedBy: "Treasury Admin", VerificationStatus: "Verified", VerifiedBy: "Hendra Wijaya (Finance Specialist)", CreatedAt: now},
				{ID: 2, InvoiceNo: "013/SBS-AAP/XII/2025", CustomerCode: "SBS", AmountPaid: 3231259551, PaymentDate: date("2026-05-11"), ReceivingBank: "BRI Escrow", RefNo: "TRF-BRI-00481", PaymentPeriod: "May-26", Notes: "Lunas (Telat 15 Hari)", DaysLateOrEarly: 15, CreatedBy: "Treasury Admin", VerificationStatus: "Verified", VerifiedBy: "Hendra Wijaya (Finance Specialist)", CreatedAt: now},
				{ID: 3, InvoiceNo: "001/POS-AAP/BC-MOB/II/2026", CustomerCode: "POS", AmountPaid: 4050239795, PaymentDate: date("2026-05-13"), ReceivingBank: "Mandiri 0000 OP", RefNo: "TRF-MND-99120", PaymentPeriod: "May-26", Notes: "Lunas On-time", DaysLateOrEarly: -7, CreatedBy: "Treasury Admin", VerificationStatus: "Verified", VerifiedBy: "Hendra Wijaya (Finance Specialist)", CreatedAt: now},
				{ID: 4, InvoiceNo: "079/BGG-AAP/VI/2025", CustomerCode: "BGG", AmountPaid: 2500000000, PaymentDate: date("2025-12-09"), ReceivingBank: "Bank Mandiri Escow", RefNo: "ESC-BGG-001", PaymentPeriod: "Dec-25", Notes: "Cicilan 1 BGG", DaysLateOrEarly: 116, CreatedBy: "Rina Setyowati (AR Admin)", VerificationStatus: "Verified", VerifiedBy: "Hendra Wijaya (Finance Specialist)", CreatedAt: now},
				{ID: 5, InvoiceNo: "079/BGG-AAP/VI/2025", CustomerCode: "BGG", AmountPaid: 2500000000, PaymentDate: date("2025-12-10"), ReceivingBank: "Bank Mandiri Escow", RefNo: "ESC-BGG-002", PaymentPeriod: "Dec-25", Notes: "Cicilan 2 BGG", DaysLateOrEarly: 117, CreatedBy: "Rina Setyowati (AR Admin)", VerificationStatus: "Verified", VerifiedBy: "Hendra Wijaya (Finance Specialist)", CreatedAt: now},
				{ID: 6, InvoiceNo: "079/BGG-AAP/VI/2025", CustomerCode: "BGG", AmountPaid: 1814754172, PaymentDate: date("2026-01-26"), ReceivingBank: "Bank Mandiri Escow", RefNo: "ESC-BGG-010", PaymentPeriod: "Jan-26", Notes: "Pelunasan BGG Juni 2025", DaysLateOrEarly: 194, CreatedBy: "Rina Setyowati (AR Admin)", VerificationStatus: "Verified", VerifiedBy: "Hendra Wijaya (Finance Specialist)", CreatedAt: now},
			},
			invoices: []InvoiceMaster{
				{
					ID: 1, InvoiceNo: "088/BGG-AAP/II/2026", CustomerCode: "BGG", ProjectSite: "BGG Site",
					BANoReference: "22/BAP-AAP-KKL/III/26", BADate: pdate("2026-03-31"), WorkPeriod: "Mar-26",
					JobType: "OB Removal + Coal Getting", VolumeUnit: "BCM", Volume: 927797, Rate: 38501,
					RevenueGross: 35721322870, SolarDeduction: 17097895040, SubTotalDPP: 18623427830,
					PPN11: 2048577061, PPh23: 372468557, TotalInvoice: 20299536335, OtherDeduction: 0,
					TotalReceipt: 20299536335, InvoiceDate: date("2026-04-20"), TerminDays: 30, DueDate: date("2026-05-20"),
					TotalPaid: 0, Outstanding: 20299536335, Status: "Overdue", AgingDays: 86, AgingBucket: "61-90",
					Notes: "Inv terdiri dari pending Nov & Des 2025 serta progress Maret 2026", CreatedAt: now,
				},
				{
					ID: 2, InvoiceNo: "089/BGG-AAP/IV/2026", CustomerCode: "BGG", ProjectSite: "BGG Site",
					BANoReference: "23/BAP-AAP-KKL/IV/26", BADate: pdate("2026-04-30"), WorkPeriod: "Apr-26",
					JobType: "OB Removal + Coal Getting", VolumeUnit: "BCM", Volume: 398733, Rate: 52727,
					RevenueGross: 21024062836, SolarDeduction: 9056998400, SubTotalDPP: 11967064436,
					PPN11: 1316377088, PPh23: 239341289, TotalInvoice: 13044100235, OtherDeduction: 0,
					TotalReceipt: 13044100235, InvoiceDate: date("2026-05-18"), TerminDays: 30, DueDate: date("2026-06-17"),
					TotalPaid: 0, Outstanding: 13044100235, Status: "Overdue", AgingDays: 58, AgingBucket: "31-60",
					Notes: "Inv terdiri dari pending Des 2025 serta progress April 2026", CreatedAt: now,
				},
				{
					ID: 3, InvoiceNo: "090/BGG-AAP/V/2026", CustomerCode: "BGG", ProjectSite: "BGG Site",
					BANoReference: "24/BAP-AAP-KKL/V/26", BADate: pdate("2026-05-31"), WorkPeriod: "May-26",
					JobType: "OB Removal + Coal Getting", VolumeUnit: "BCM", Volume: 321192, Rate: 82230,
					RevenueGross: 26411705464, SolarDeduction: 16803558400, SubTotalDPP: 9608147064,
					PPN11: 1056896177, PPh23: 192162941, TotalInvoice: 10472880300, OtherDeduction: 0,
					TotalReceipt: 10472880300, InvoiceDate: date("2026-06-17"), TerminDays: 30, DueDate: date("2026-07-17"),
					TotalPaid: 0, Outstanding: 10472880300, Status: "Overdue", AgingDays: 28, AgingBucket: "1-30",
					Notes: "Inv terdiri dari progress Mei dan Pending Jan & Feb", CreatedAt: now,
				},
				{
					ID: 4, InvoiceNo: "086/BGG-AAP/I/2026", CustomerCode: "BGG", ProjectSite: "BGG Site",
					BANoReference: "20/BAP-AAP-KKLII/26", BADate: pdate("2026-01-31"), WorkPeriod: "Jan-26",
					JobType: "OB Removal + Coal Getting", VolumeUnit: "BCM", Volume: 155775, Rate: 39226,
					RevenueGross: 6110451996, SolarDeduction: 0, SubTotalDPP: 6110451996,
					PPN11: 672149720, PPh23: 122209040, TotalInvoice: 6660392676, OtherDeduction: 0,
					TotalReceipt: 6660392676, InvoiceDate: date("2026-02-25"), TerminDays: 30, DueDate: date("2026-03-27"),
					TotalPaid: 0, Outstanding: 6660392676, Status: "Overdue", AgingDays: 140, AgingBucket: ">90",
					Notes: "Pending pembayaran BGG", CreatedAt: now,
				},
				{
					ID: 5, InvoiceNo: "008/PTRO-AAP/I/2026", CustomerCode: "DBK", ProjectSite: "DBK Site",
					BANoReference: "008/DBK/I/2026", BADate: pdate("2026-02-04"), WorkPeriod: "Jan-26",
					JobType: "OB Removal + Coal Getting", VolumeUnit: "BCM", Volume: 202117, Rate: 26721,
					RevenueGross: 5400807322, SolarDeduction: 0, SubTotalDPP: 5400807322,
					PPN11: 594088805, PPh23: 108016146, TotalInvoice: 5886879981, OtherDeduction: 1993875000,
					TotalReceipt: 3893004981, InvoiceDate: date("2026-06-24"), TerminDays: 45, DueDate: date("2026-08-08"),
					TotalPaid: 0, Outstanding: 3893004981, Status: "Overdue", AgingDays: 6, AgingBucket: "1-30",
					Notes: "Potongan klaim solar Petrosea", CreatedAt: now,
				},
				{
					ID: 6, InvoiceNo: "016/SBS-AAP/III/2026", CustomerCode: "SBS", ProjectSite: "SBS USTE-Tanjung Enim",
					BANoReference: "274/SBS-Banko/PRO/III/2026", BADate: pdate("2026-04-06"), WorkPeriod: "Mar-26",
					JobType: "OB Removal + Heavy Equipment Rental", VolumeUnit: "Jam HM", Volume: 1079, Rate: 3112775,
					RevenueGross: 3358684395, SolarDeduction: 0, SubTotalDPP: 3358684395,
					PPN11: 369455284, PPh23: 67173688, TotalInvoice: 3660965991, OtherDeduction: 471583647,
					TotalReceipt: 3189382344, InvoiceDate: date("2026-06-23"), TerminDays: 30, DueDate: date("2026-07-23"),
					TotalPaid: 0, Outstanding: 3660965991, Status: "Overdue", AgingDays: 22, AgingBucket: "1-30",
					Notes: "Progres SBS Banko", CreatedAt: now,
				},
				{
					ID: 7, InvoiceNo: "002/POS-AAP/BC-MESS/VI/2026", CustomerCode: "POS", ProjectSite: "Position Site",
					BANoReference: "050/BA-HRGA/AAP-POS/V/2026", BADate: pdate("2026-05-28"), WorkPeriod: "May-26",
					JobType: "Mess Facility", VolumeUnit: "Unit", Volume: 1, Rate: 2313397963,
					RevenueGross: 2313397963, SolarDeduction: 0, SubTotalDPP: 2313397963,
					PPN11: 254473776, PPh23: 0, TotalInvoice: 2567871739, OtherDeduction: 0,
					TotalReceipt: 2567871739, InvoiceDate: date("2026-06-02"), TerminDays: 30, DueDate: date("2026-07-02"),
					TotalPaid: 0, Outstanding: 2567871739, Status: "Overdue", AgingDays: 43, AgingBucket: "31-60",
					Notes: "Mess facility claim", CreatedAt: now,
				},
				{
					ID: 8, InvoiceNo: "012/SBS-AAP/XI/2025", CustomerCode: "SBS", ProjectSite: "SBS USTE-Tanjung Enim",
					BANoReference: "1503-1504/SBS-Banko/PRO/XII/2025", BADate: pdate("2026-01-19"), WorkPeriod: "Nov-25",
					JobType: "Bulldozer Rental", VolumeUnit: "Jam HM", Volume: 763, Rate: 1900000,
					RevenueGross: 1449700000, SolarDeduction: 0, SubTotalDPP: 1449700000,
					PPN11: 159467000, PPh23: 28994000, TotalInvoice: 1580173000, OtherDeduction: 11833568,
					TotalReceipt: 1568339432, InvoiceDate: date("2026-01-29"), TerminDays: 30, DueDate: date("2026-02-28"),
					TotalPaid: 1568339432, Outstanding: 0, Status: "Paid", AgingDays: 0, AgingBucket: "Lunas",
					Notes: "Lunas terbayar Maret 2026", CreatedAt: now,
				},
			},
		}
	})
	return globalFinanceStore
}

func getAgingBucket(days int, outstanding float64) string {
	if outstanding <= 0 {
		return "Lunas"
	}
	if days <= 0 {
		return "Not Due"
	} else if days <= 30 {
		return "1-30"
	} else if days <= 60 {
		return "31-60"
	} else if days <= 90 {
		return "61-90"
	}
	return ">90"
}

func recalculateBA(ba *BATracker) {
	if ba.BASignedDate != nil && ba.BASubmittedDate != nil {
		ba.LeadTimeDays = int(ba.BASignedDate.Sub(*ba.BASubmittedDate).Hours() / 24)
		if ba.LeadTimeDays < 0 {
			ba.LeadTimeDays = 0
		}
	} else if ba.BASignedDate != nil && ba.WorkEndDate != nil {
		ba.LeadTimeDays = int(ba.BASignedDate.Sub(*ba.WorkEndDate).Hours() / 24)
		if ba.LeadTimeDays < 0 {
			ba.LeadTimeDays = 0
		}
	}
	if ba.InvoiceIssuedDate != nil && ba.BASignedDate != nil {
		ba.LagBAToInvoiceDays = int(ba.InvoiceIssuedDate.Sub(*ba.BASignedDate).Hours() / 24)
		if ba.LagBAToInvoiceDays < 0 {
			ba.LagBAToInvoiceDays = 0
		}
	}

	s := ba.StatusBA
	if s == "Draft" || len(s) >= 5 && s[:5] == "Draft" {
		ba.NotesBottleneck = "⚠️ Internal: BA belum diajukan (Draft)"
	} else if s == "Submitted" || len(s) >= 9 && s[:9] == "Submitted" {
		ba.NotesBottleneck = "📤 External: Dikirim ke Customer"
	} else if s == "Rejected" || len(s) >= 8 && s[:8] == "Rejected" {
		ba.NotesBottleneck = "❌ External: Di-reject customer, perlu revisi"
	} else if ba.LeadTimeDays > 14 {
		ba.NotesBottleneck = "🐢 Slow: Lead time BA >14 hari"
	} else if ba.LagBAToInvoiceDays > 5 {
		ba.NotesBottleneck = "🐢 Slow: Lag BA Invoice >5 hari"
	} else {
		ba.NotesBottleneck = "OK"
	}
}

func (st *financeStore) recalculateAllInvoices() {
	customerMap := make(map[string]int)
	for _, c := range st.customers {
		customerMap[c.Code] = c.TerminDays
	}

	now := time.Now()
	for i := range st.invoices {
		inv := &st.invoices[i]
		if inv.RevenueGross == 0 && inv.Volume > 0 && inv.Rate > 0 {
			inv.RevenueGross = inv.Volume * inv.Rate
		}
		if inv.SubTotalDPP == 0 {
			inv.SubTotalDPP = inv.RevenueGross - inv.SolarDeduction
		}
		if inv.PPN11 == 0 && inv.SubTotalDPP > 0 {
			inv.PPN11 = inv.SubTotalDPP * 0.11
		}
		if inv.PPh23 == 0 && inv.SubTotalDPP > 0 {
			inv.PPh23 = inv.SubTotalDPP * 0.02
		}
		if inv.TotalInvoice == 0 {
			inv.TotalInvoice = inv.SubTotalDPP + inv.PPN11 - inv.PPh23
		}
		if inv.TotalReceipt == 0 {
			inv.TotalReceipt = inv.TotalInvoice - inv.OtherDeduction
		}

		termin, exists := customerMap[inv.CustomerCode]
		if exists && termin > 0 {
			inv.TerminDays = termin
		} else if inv.TerminDays == 0 {
			inv.TerminDays = 30
		}
		if !inv.InvoiceDate.IsZero() {
			inv.DueDate = inv.InvoiceDate.AddDate(0, 0, inv.TerminDays)
		}

		var totalPaid float64
		for _, p := range st.payments {
			if p.InvoiceNo == inv.InvoiceNo && (p.VerificationStatus == "" || p.VerificationStatus == "Verified") {
				totalPaid += p.AmountPaid
			}
		}
		inv.TotalPaid = totalPaid
		inv.Outstanding = inv.TotalReceipt - inv.TotalPaid
		if inv.Outstanding < 0 {
			inv.Outstanding = 0
		}

		if inv.Outstanding == 0 && inv.TotalPaid > 0 {
			inv.Status = "Paid"
			inv.AgingDays = 0
			inv.AgingBucket = "Lunas"
		} else if inv.TotalPaid > 0 {
			inv.Status = "Partial"
			if now.After(inv.DueDate) {
				inv.AgingDays = int(now.Sub(inv.DueDate).Hours() / 24)
			} else {
				inv.AgingDays = 0
			}
			inv.AgingBucket = getAgingBucket(inv.AgingDays, inv.Outstanding)
		} else if now.After(inv.DueDate) {
			inv.Status = "Overdue"
			inv.AgingDays = int(now.Sub(inv.DueDate).Hours() / 24)
			inv.AgingBucket = getAgingBucket(inv.AgingDays, inv.Outstanding)
		} else {
			inv.Status = "Open"
			inv.AgingDays = 0
			inv.AgingBucket = "Not Due"
		}
	}
}

// ================= READ & DASHBOARD =================

func (s *Service) GetFinanceDashboard(ctx context.Context) (FinanceDashboardSummary, error) {
	st := getStore()
	st.mu.Lock()
	st.recalculateAllInvoices()
	invoices := make([]InvoiceMaster, len(st.invoices))
	copy(invoices, st.invoices)
	baList := make([]BATracker, len(st.baList))
	copy(baList, st.baList)
	st.mu.Unlock()

	var totalAR, totalOverdueAR, totalOver90AR float64
	var overdueCount, totalAgingDays, outstandingCount int

	for _, inv := range invoices {
		if inv.Outstanding > 0 {
			totalAR += inv.Outstanding
			outstandingCount++
			totalAgingDays += inv.AgingDays
			if inv.AgingDays > 0 || inv.AgingBucket != "Not Due" || inv.Status == "Overdue" {
				overdueCount++
				totalOverdueAR += inv.Outstanding
			}
			if inv.AgingBucket == ">90" || inv.AgingDays > 90 {
				totalOver90AR += inv.Outstanding
			}
		}
	}

	avgDSO := 0.0
	if outstandingCount > 0 {
		avgDSO = float64(totalAgingDays) / float64(outstandingCount)
	}

	baPending := 0
	for _, ba := range baList {
		if ba.StatusBA == "Draft" || ba.StatusBA == "Rejected" || ba.StatusBA == "Revisi" {
			baPending++
		}
	}

	pctOverdue := 0.0
	if totalAR > 0 {
		pctOverdue = (totalOverdueAR / totalAR) * 100.0
	}

	toneAR := "good"
	if totalAR > 100_000_000_000 {
		toneAR = "critical"
	} else if totalAR > 50_000_000_000 {
		toneAR = "warning"
	}

	tonePct := "good"
	if pctOverdue > 50 {
		tonePct = "critical"
	} else if pctOverdue > 20 {
		tonePct = "warning"
	}

	toneOver90 := "good"
	if totalOver90AR > 0 {
		toneOver90 = "critical"
	}

	toneDSO := "good"
	if avgDSO > 60 {
		toneDSO = "critical"
	} else if avgDSO > 30 {
		toneDSO = "warning"
	}

	toneBAPending := "good"
	if baPending > 5 {
		toneBAPending = "critical"
	} else if baPending > 0 {
		toneBAPending = "warning"
	}

	kpis := []KPI{
		{Label: "TOTAL AR OUTSTANDING", Value: totalAR, Delta: 0, Tone: toneAR},
		{Label: "% AR OVERDUE", Value: pctOverdue, Delta: 0, Tone: tonePct},
		{Label: "AR CRITICAL > 90 HARI", Value: totalOver90AR, Delta: 0, Tone: toneOver90},
		{Label: "AVG DSO (DAYS SALES OUTSTANDING)", Value: avgDSO, Delta: 0, Tone: toneDSO},
		{Label: "BA PENDING (INTERNAL ISSUE)", Value: float64(baPending), Delta: 0, Tone: toneBAPending},
	}

	// Calculate Matrix dynamically
	custMatrixMap := make(map[string]*AgingMatrixRow)
	customers := []string{"BGG", "SBS", "DBK", "POS", "ABN"}
	for _, c := range customers {
		custMatrixMap[c] = &AgingMatrixRow{Customer: c}
	}

	topOverdue := []InvoiceMaster{}
	for _, inv := range invoices {
		if inv.Outstanding > 0 && (inv.AgingDays > 0 || inv.AgingBucket != "Not Due" || inv.Status == "Overdue") {
			topOverdue = append(topOverdue, inv)
		}
		row, exists := custMatrixMap[inv.CustomerCode]
		if !exists {
			row = &AgingMatrixRow{Customer: inv.CustomerCode}
			custMatrixMap[inv.CustomerCode] = row
		}
		if inv.Outstanding > 0 {
			row.InvoiceCount++
			row.Total += inv.Outstanding
			switch inv.AgingBucket {
			case "Not Due":
				row.NotDue += inv.Outstanding
			case "1-30":
				row.Bucket1_30 += inv.Outstanding
			case "31-60":
				row.Bucket31_60 += inv.Outstanding
			case "61-90":
				row.Bucket61_90 += inv.Outstanding
			case ">90":
				row.BucketOver90 += inv.Outstanding
			}
		}
	}

	// Sort topOverdue by agingDays DESC, then Outstanding DESC
	sort.Slice(topOverdue, func(i, j int) bool {
		if topOverdue[i].AgingDays != topOverdue[j].AgingDays {
			return topOverdue[i].AgingDays > topOverdue[j].AgingDays
		}
		return topOverdue[i].Outstanding > topOverdue[j].Outstanding
	})

	matrix := []AgingMatrixRow{}
	for _, c := range customers {
		if row, ok := custMatrixMap[c]; ok {
			matrix = append(matrix, *row)
		}
	}

	// Dynamically calculate bottlenecks from baList
	custBAMap := make(map[string][]BATracker)
	for _, ba := range baList {
		custBAMap[ba.CustomerCode] = append(custBAMap[ba.CustomerCode], ba)
	}
	bottlenecks := []BABottleneckSummary{}
	for _, c := range customers {
		list := custBAMap[c]
		if len(list) == 0 {
			continue
		}
		totalLead := 0
		totalLag := 0
		validLeadCount := 0
		validLagCount := 0
		for _, ba := range list {
			if ba.LeadTimeDays > 0 {
				totalLead += ba.LeadTimeDays
				validLeadCount++
			}
			if ba.LagBAToInvoiceDays > 0 {
				totalLag += ba.LagBAToInvoiceDays
				validLagCount++
			}
		}
		avgLead := 0.0
		if validLeadCount > 0 {
			avgLead = float64(totalLead) / float64(validLeadCount)
		}
		avgLag := 0.0
		if validLagCount > 0 {
			avgLag = float64(totalLag) / float64(validLagCount)
		}
		bottlenecks = append(bottlenecks, BABottleneckSummary{
			Customer:          c,
			AvgLeadTimeBA:     avgLead,
			AvgLagBAToInvoice: avgLag,
			BACount:           len(list),
		})
	}

	return FinanceDashboardSummary{
		KPIs:               kpis,
		AgingMatrix:        matrix,
		TopOverdueInvoices: topOverdue,
		BABottlenecks:      bottlenecks,
	}, nil
}

// ================= BA TRACKER CRUD =================

func (s *Service) GetBATrackers(ctx context.Context) ([]BATracker, error) {
	st := getStore()
	st.mu.RLock()
	defer st.mu.RUnlock()
	res := make([]BATracker, len(st.baList))
	copy(res, st.baList)
	return res, nil
}

func (s *Service) SaveBATracker(ctx context.Context, item BATracker) (BATracker, error) {
	st := getStore()
	st.mu.Lock()
	defer st.mu.Unlock()

	now := time.Now()
	if item.CustomerCode == "" {
		item.CustomerCode = "POS"
	}
	if item.WorkPeriod == "" {
		item.WorkPeriod = "Juni 2026"
	}

	// Hitung total dari baris material jika ada
	var initSum, adjSum float64
	for _, it := range item.Items {
		if it.SubtotalInitial > 0 {
			initSum += it.SubtotalInitial
		} else if it.InitialVolume > 0 && it.Rate > 0 {
			initSum += it.InitialVolume * it.Rate
		}
		if it.SubtotalAdjusted > 0 {
			adjSum += it.SubtotalAdjusted
		} else if it.AdjustedVolume > 0 && it.Rate > 0 {
			adjSum += it.AdjustedVolume * it.Rate
		}
	}
	if initSum > 0 && item.InitialWorkAmount == 0 {
		item.InitialWorkAmount = initSum
	}
	if adjSum > 0 && item.AdjustedWorkAmount == 0 {
		item.AdjustedWorkAmount = adjSum
	}

	if item.AdjustedWorkAmount > 0 {
		item.WorkAmount = item.AdjustedWorkAmount
	} else if item.InitialWorkAmount > 0 {
		item.WorkAmount = item.InitialWorkAmount
	}

	if item.ID == 0 {
		st.nextID++
		item.ID = st.nextID
		item.CreatedAt = now
		if item.DraftBARefNo == "" {
			item.DraftBARefNo = fmt.Sprintf("BA-REF/%s/%s-%03d", item.CustomerCode, now.Format("2006/01"), item.ID)
		}
		if item.BANumber == "" {
			item.BANumber = item.DraftBARefNo
		}
		if item.StatusBA == "" {
			item.StatusBA = "Submit"
		}
		if item.BASubmittedDate == nil {
			item.BASubmittedDate = &now
		}
		recalculateBA(&item)
		st.baList = append([]BATracker{item}, st.baList...)

		// Auto generate unbilled revenue journal
		ref := item.BANumber
		go func() {
			_, _ = s.GenerateJournal(context.Background(), User{ID: 1, Name: item.PICAAP, Role: "Super Admin"}, "Berita Acara - Pengakuan Pendapatan Belum Ditagih (Unbilled Revenue)", ref, "127.0.0.1", "EFMS Web")
		}()
	} else {
		found := false
		var prev BATracker
		for i, existing := range st.baList {
			if existing.ID == item.ID {
				prev = existing
				item.CreatedAt = existing.CreatedAt
				if item.DraftBARefNo == "" {
					item.DraftBARefNo = existing.DraftBARefNo
				}
				if item.BANumber == "" {
					item.BANumber = existing.BANumber
				}
				if item.SignedBANumber != "" && existing.SignedBANumber != item.SignedBANumber {
					item.BANumber = item.SignedBANumber
				}
				recalculateBA(&item)
				st.baList[i] = item
				found = true
				break
			}
		}
		if !found {
			if item.CreatedAt.IsZero() {
				item.CreatedAt = now
			}
			recalculateBA(&item)
			st.baList = append([]BATracker{item}, st.baList...)
		} else {
			// Trigger jurnal penyesuaian jika nilai survey disesuaikan
			if item.AdjustedWorkAmount > 0 && item.AdjustedWorkAmount != prev.AdjustedWorkAmount {
				ref := item.BANumber
				go func() {
					_, _ = s.GenerateJournal(context.Background(), User{ID: 1, Name: item.PICAAP, Role: "Super Admin"}, "Berita Acara - Jurnal Penyesuaian Hasil Survey Lapangan", ref, "127.0.0.1", "EFMS Web")
				}()
			}
		}
	}
	return item, nil
}

func (s *Service) DeleteBATracker(ctx context.Context, id int64) error {
	st := getStore()
	st.mu.Lock()
	defer st.mu.Unlock()

	var target *BATracker
	for i := range st.baList {
		if st.baList[i].ID == id {
			target = &st.baList[i]
			break
		}
	}
	if target == nil {
		return errors.New("Berita Acara tidak ditemukan")
	}
	for _, inv := range st.invoices {
		if (inv.BANoReference != "" && inv.BANoReference == target.BANumber) || (target.DraftBARefNo != "" && inv.BANoReference == target.DraftBARefNo) {
			return fmt.Errorf("Berita Acara '%s' tidak dapat dihapus karena sudah memiliki invoice terhubung (%s)", target.BANumber, inv.InvoiceNo)
		}
	}

	newList := []BATracker{}
	for _, ba := range st.baList {
		if ba.ID != id {
			newList = append(newList, ba)
		}
	}
	st.baList = newList
	return nil
}

// ================= INVOICE CRUD =================

func (s *Service) GetFinanceInvoices(ctx context.Context) ([]InvoiceMaster, error) {
	st := getStore()
	st.mu.Lock()
	st.recalculateAllInvoices()
	res := make([]InvoiceMaster, len(st.invoices))
	copy(res, st.invoices)
	st.mu.Unlock()
	return res, nil
}

func (s *Service) SaveInvoice(ctx context.Context, item InvoiceMaster) (InvoiceMaster, error) {
	st := getStore()
	st.mu.Lock()
	defer st.mu.Unlock()

	now := time.Now()
	if item.InvoiceDate.IsZero() {
		item.InvoiceDate = now
	}

	if item.ID == 0 {
		st.nextID++
		item.ID = st.nextID
		item.CreatedAt = now
		st.invoices = append([]InvoiceMaster{item}, st.invoices...)
	} else {
		found := false
		for i, existing := range st.invoices {
			if existing.ID == item.ID {
				if item.CreatedAt.IsZero() {
					item.CreatedAt = existing.CreatedAt
				}
				st.invoices[i] = item
				found = true
				break
			}
		}
		if !found {
			if item.CreatedAt.IsZero() {
				item.CreatedAt = now
			}
			st.invoices = append([]InvoiceMaster{item}, st.invoices...)
		}
	}
	st.recalculateAllInvoices()
	return item, nil
}

func (s *Service) DeleteInvoice(ctx context.Context, id int64) error {
	st := getStore()
	st.mu.Lock()
	defer st.mu.Unlock()

	var target *InvoiceMaster
	for i := range st.invoices {
		if st.invoices[i].ID == id {
			target = &st.invoices[i]
			break
		}
	}
	if target == nil {
		return errors.New("Invoice tidak ditemukan")
	}
	if target.TotalPaid > 0 {
		return errors.New("Invoice tidak dapat dihapus karena sudah memiliki riwayat pembayaran (Total Paid > 0)")
	}
	for _, p := range st.payments {
		if p.InvoiceNo == target.InvoiceNo {
			return errors.New("Invoice tidak dapat dihapus karena terdapat log pembayaran terhubung")
		}
	}

	newList := []InvoiceMaster{}
	for _, inv := range st.invoices {
		if inv.ID != id {
			newList = append(newList, inv)
		}
	}
	st.invoices = newList
	st.recalculateAllInvoices()
	return nil
}

// ================= PAYMENT LOG CRUD =================

func (s *Service) GetFinancePayments(ctx context.Context) ([]PaymentLog, error) {
	st := getStore()
	st.mu.RLock()
	defer st.mu.RUnlock()
	res := make([]PaymentLog, len(st.payments))
	copy(res, st.payments)
	return res, nil
}

func (s *Service) SavePayment(ctx context.Context, item PaymentLog) (PaymentLog, error) {
	st := getStore()
	st.mu.Lock()
	defer st.mu.Unlock()

	now := time.Now()
	if item.PaymentDate.IsZero() {
		item.PaymentDate = now
	}

	if item.VerificationStatus == "" {
		item.VerificationStatus = "Pending"
	}
	if item.CreatedBy == "" {
		item.CreatedBy = "AR Treasury Dept"
	}

	if item.ID == 0 {
		st.nextID++
		item.ID = st.nextID
		item.CreatedAt = now
		st.payments = append([]PaymentLog{item}, st.payments...)
	} else {
		found := false
		for i, existing := range st.payments {
			if existing.ID == item.ID {
				item.CreatedAt = existing.CreatedAt
				if item.VerificationStatus == "Verified" && existing.VerificationStatus != "Verified" && item.VerifiedBy == "" {
					item.VerifiedBy = "Hendra Wijaya (Finance Specialist)"
					item.VerifiedAt = &now
				}
				st.payments[i] = item
				found = true
				break
			}
		}
		if !found {
			return PaymentLog{}, errors.New("Payment not found")
		}
	}
	st.recalculateAllInvoices()
	return item, nil
}

func (s *Service) VerifyPayment(ctx context.Context, id int64, verifiedBy string) (PaymentLog, error) {
	st := getStore()
	st.mu.Lock()

	now := time.Now()
	if verifiedBy == "" {
		verifiedBy = "Hendra Wijaya (Finance Specialist)"
	}

	var updated PaymentLog
	found := false
	for i, existing := range st.payments {
		if existing.ID == id {
			st.payments[i].VerificationStatus = "Verified"
			st.payments[i].VerifiedBy = verifiedBy
			st.payments[i].VerifiedAt = &now
			updated = st.payments[i]
			found = true
			st.recalculateAllInvoices()
			break
		}
	}
	st.mu.Unlock()

	if !found {
		return PaymentLog{}, errors.New("Payment not found")
	}

	// Trigger Auto GL Posting for Verified Payment
	user := User{ID: 1, Name: verifiedBy, Role: "Finance Specialist"}
	ref := fmt.Sprintf("INV: %s | REF: %s", updated.InvoiceNo, updated.RefNo)
	_, _ = s.GenerateJournal(ctx, user, "Payment Verification", ref, "127.0.0.1", "EFMS Web")

	return updated, nil
}

func (s *Service) DeletePayment(ctx context.Context, id int64) error {
	st := getStore()
	st.mu.Lock()
	defer st.mu.Unlock()
	newList := []PaymentLog{}
	for _, p := range st.payments {
		if p.ID != id {
			newList = append(newList, p)
		}
	}
	st.payments = newList
	st.recalculateAllInvoices()
	return nil
}

// ================= BANK ACCOUNTS MASTER CRUD =================

func (s *Service) GetBankAccounts(ctx context.Context) ([]BankAccountMaster, error) {
	st := getStore()
	st.mu.RLock()
	defer st.mu.RUnlock()
	res := make([]BankAccountMaster, len(st.bankAccounts))
	copy(res, st.bankAccounts)
	return res, nil
}

func (s *Service) SaveBankAccount(ctx context.Context, item BankAccountMaster) (BankAccountMaster, error) {
	st := getStore()
	st.mu.Lock()
	defer st.mu.Unlock()

	now := time.Now()
	if item.Status == "" {
		item.Status = "Active"
	}
	if item.ID == 0 {
		st.nextID++
		item.ID = st.nextID
		item.CreatedAt = now
		st.bankAccounts = append(st.bankAccounts, item)
	} else {
		found := false
		for i, existing := range st.bankAccounts {
			if existing.ID == item.ID {
				item.CreatedAt = existing.CreatedAt
				st.bankAccounts[i] = item
				found = true
				break
			}
		}
		if !found {
			return BankAccountMaster{}, errors.New("Bank account not found")
		}
	}
	return item, nil
}

func (s *Service) DeleteBankAccount(ctx context.Context, id int64) error {
	st := getStore()
	st.mu.Lock()
	defer st.mu.Unlock()
	newList := []BankAccountMaster{}
	for _, b := range st.bankAccounts {
		if b.ID != id {
			newList = append(newList, b)
		}
	}
	st.bankAccounts = newList
	return nil
}

// ================= CUSTOMER MASTER CRUD =================

func (s *Service) GetFinanceCustomers(ctx context.Context) ([]CustomerMaster, error) {
	st := getStore()
	st.mu.RLock()
	defer st.mu.RUnlock()
	res := make([]CustomerMaster, len(st.customers))
	copy(res, st.customers)
	return res, nil
}

func (s *Service) SaveCustomer(ctx context.Context, item CustomerMaster) (CustomerMaster, error) {
	st := getStore()
	st.mu.Lock()
	defer st.mu.Unlock()

	now := time.Now()
	if item.ID == 0 {
		st.nextID++
		item.ID = st.nextID
		item.CreatedAt = now
		st.customers = append(st.customers, item)
	} else {
		found := false
		for i, existing := range st.customers {
			if existing.ID == item.ID {
				item.CreatedAt = existing.CreatedAt
				st.customers[i] = item
				found = true
				break
			}
		}
		if !found {
			return CustomerMaster{}, errors.New("Customer not found")
		}
	}
	st.recalculateAllInvoices()
	return item, nil
}

func (s *Service) DeleteCustomer(ctx context.Context, id int64) error {
	st := getStore()
	st.mu.Lock()
	defer st.mu.Unlock()
	newList := []CustomerMaster{}
	for _, c := range st.customers {
		if c.ID != id {
			newList = append(newList, c)
		}
	}
	st.customers = newList
	st.recalculateAllInvoices()
	return nil
}

func (s *Service) GetVariableSOWs(ctx context.Context) ([]VariableSOW, error) {
	st := getStore()
	st.mu.RLock()
	defer st.mu.RUnlock()
	res := make([]VariableSOW, len(st.variableSOWs))
	copy(res, st.variableSOWs)
	return res, nil
}

func (s *Service) SaveVariableSOW(ctx context.Context, item VariableSOW) (VariableSOW, error) {
	st := getStore()
	st.mu.Lock()
	defer st.mu.Unlock()

	now := time.Now()
	if item.ID == 0 {
		st.nextID++
		item.ID = st.nextID
		item.CreatedAt = now
		if item.Status == "" {
			item.Status = "Active"
		}
		st.variableSOWs = append(st.variableSOWs, item)
	} else {
		found := false
		for i, existing := range st.variableSOWs {
			if existing.ID == item.ID {
				item.CreatedAt = existing.CreatedAt
				st.variableSOWs[i] = item
				found = true
				break
			}
		}
		if !found {
			return VariableSOW{}, errors.New("Variable SOW not found")
		}
	}
	return item, nil
}

func (s *Service) DeleteVariableSOW(ctx context.Context, id int64) error {
	st := getStore()
	st.mu.Lock()
	defer st.mu.Unlock()
	newList := []VariableSOW{}
	for _, item := range st.variableSOWs {
		if item.ID != id {
			newList = append(newList, item)
		}
	}
	st.variableSOWs = newList
	return nil
}

// ================= RAISE & FALL MASTER SERVICE =================

func (s *Service) GetRaiseFallMasters(ctx context.Context) ([]RaiseFallMaster, error) {
	st := getStore()
	st.mu.RLock()
	defer st.mu.RUnlock()
	return st.raiseFallList, nil
}

func (s *Service) SaveRaiseFallMaster(ctx context.Context, item RaiseFallMaster) (RaiseFallMaster, error) {
	st := getStore()
	st.mu.Lock()
	defer st.mu.Unlock()

	now := time.Now()
	// Recalculate RF Index dynamically: RF = D + L + F
	// D = [Rate * a * (Fn * Xn)] / (Fo * Xo)  where Rate=1
	// L = [Rate * b * (Ln * Xn)] / (Lo * Xo)
	// F = Rate * c
	var d, l, f float64
	if item.BaseFuelFo > 0 {
		d = (item.WeightFuelA * item.ActualFuelFn * item.ActualMRateXn) / item.BaseFuelFo
	}
	if item.BaseLaborLo > 0 && item.BaseForexXo > 0 {
		l = (item.WeightLaborB * item.ActualLaborLn * item.ActualMRateXn) / (item.BaseLaborLo * item.BaseForexXo)
	}
	f = item.WeightFixedC
	item.RFIndexResult = d + l + f
	item.UpdatedAt = now

	if item.ID == 0 {
		st.nextID++
		item.ID = st.nextID
		st.raiseFallList = append(st.raiseFallList, item)
	} else {
		found := false
		for i, existing := range st.raiseFallList {
			if existing.ID == item.ID {
				st.raiseFallList[i] = item
				found = true
				break
			}
		}
		if !found {
			return RaiseFallMaster{}, errors.New("Raise & Fall Master not found")
		}
	}
	return item, nil
}

func (s *Service) DeleteRaiseFallMaster(ctx context.Context, id int64) error {
	st := getStore()
	st.mu.Lock()
	defer st.mu.Unlock()
	newList := []RaiseFallMaster{}
	for _, item := range st.raiseFallList {
		if item.ID != id {
			newList = append(newList, item)
		}
	}
	st.raiseFallList = newList
	return nil
}

// ================= DAILY EXCHANGE RATE SERVICE =================

func (s *Service) GetDailyExchangeRates(ctx context.Context) ([]DailyExchangeRate, error) {
	st := getStore()
	st.mu.RLock()
	defer st.mu.RUnlock()
	return st.exchangeRates, nil
}

func (s *Service) SaveDailyExchangeRate(ctx context.Context, item DailyExchangeRate) (DailyExchangeRate, error) {
	st := getStore()
	st.mu.Lock()
	defer st.mu.Unlock()

	item.KursTengah = (item.KursJual + item.KursBeli) / 2.0

	if item.ID == 0 {
		st.nextID++
		item.ID = st.nextID
		item.No = len(st.exchangeRates) + 1
		st.exchangeRates = append(st.exchangeRates, item)
	} else {
		found := false
		for i, existing := range st.exchangeRates {
			if existing.ID == item.ID {
				st.exchangeRates[i] = item
				found = true
				break
			}
		}
		if !found {
			return DailyExchangeRate{}, errors.New("Exchange Rate record not found")
		}
	}
	return item, nil
}

func (s *Service) ImportBIExchangeRatesFromBytes(ctx context.Context, fileBytes []byte, period string) (float64, float64, int, error) {
	st := getStore()
	st.mu.Lock()
	defer st.mu.Unlock()

	zr, err := zip.NewReader(bytes.NewReader(fileBytes), int64(len(fileBytes)))
	if err != nil {
		return 0, 0, 0, errors.New("Format file Excel tidak valid")
	}

	var sharedStrings []string
	var sheetFile *zip.File

	for _, f := range zr.File {
		if f.Name == "xl/sharedStrings.xml" {
			rc, err := f.Open()
			if err == nil {
				var ss struct {
					SI []struct {
						T string `xml:"t"`
					} `xml:"si"`
				}
				_ = xml.NewDecoder(rc).Decode(&ss)
				rc.Close()
				for _, si := range ss.SI {
					sharedStrings = append(sharedStrings, si.T)
				}
			}
		}
		if strings.HasPrefix(f.Name, "xl/worksheets/sheet") {
			sheetFile = f
		}
	}

	if sheetFile == nil {
		return 0, 0, 0, errors.New("Sheet data tidak ditemukan di file Excel BI")
	}

	rc, err := sheetFile.Open()
	if err != nil {
		return 0, 0, 0, errors.New("Gagal membuka sheet Excel BI")
	}
	defer rc.Close()

	var sd struct {
		Rows []struct {
			R int `xml:"r,attr"`
			C []struct {
				R string `xml:"r,attr"`
				T string `xml:"t,attr"`
				V string `xml:"v"`
			} `xml:"c"`
		} `xml:"sheetData>row"`
	}

	if err := xml.NewDecoder(rc).Decode(&sd); err != nil {
		return 0, 0, 0, errors.New("Gagal membaca struktur XML file Excel BI")
	}

	getVal := func(tVal, vVal string) string {
		if tVal == "s" {
			idx, _ := strconv.Atoi(vVal)
			if idx >= 0 && idx < len(sharedStrings) {
				return sharedStrings[idx]
			}
		}
		return vVal
	}

	var imported []DailyExchangeRate
	var sumTengah float64

	for _, row := range sd.Rows {
		if row.R < 5 {
			continue
		}
		var noStr, kjStr, kbStr, dateStr string
		for _, c := range row.C {
			val := getVal(c.T, c.V)
			colLetter := strings.TrimRight(c.R, "0123456789")
			switch colLetter {
			case "A":
				noStr = val
			case "C":
				kjStr = val
			case "D":
				kbStr = val
			case "E":
				dateStr = val
			}
		}

		kj, _ := strconv.ParseFloat(kjStr, 64)
		kb, _ := strconv.ParseFloat(kbStr, 64)

		if kj > 0 && kb > 0 {
			kt := (kj + kb) / 2.0
			sumTengah += kt
			noVal, _ := strconv.Atoi(noStr)
			if dateStr == "" {
				dateStr = fmt.Sprintf("Data-%d", len(imported)+1)
			}
			if idx := strings.Index(dateStr, " "); idx != -1 {
				dateStr = dateStr[:idx]
			}
			imported = append(imported, DailyExchangeRate{
				Period:     period,
				No:         noVal,
				DateStr:    dateStr,
				KursJual:   kj,
				KursBeli:   kb,
				KursTengah: kt,
			})
		}
	}

	if len(imported) == 0 {
		return 0, 0, 0, errors.New("Tidak ditemukan baris data kurs valid di file Excel BI")
	}

	avgMRate := sumTengah / float64(len(imported))

	for i := range imported {
		st.nextID++
		imported[i].ID = st.nextID
	}

	filteredRates := []DailyExchangeRate{}
	for _, existing := range st.exchangeRates {
		if existing.Period != period {
			filteredRates = append(filteredRates, existing)
		}
	}
	st.exchangeRates = append(filteredRates, imported...)

	var rfResult float64
	for i, rf := range st.raiseFallList {
		rf.ActualMRateXn = avgMRate
		var d, l, f float64
		if rf.BaseFuelFo > 0 {
			d = (rf.WeightFuelA * rf.ActualFuelFn * rf.ActualMRateXn) / rf.BaseFuelFo
		}
		if rf.BaseLaborLo > 0 && rf.BaseForexXo > 0 {
			l = (rf.WeightLaborB * rf.ActualLaborLn * rf.ActualMRateXn) / (rf.BaseLaborLo * rf.BaseForexXo)
		}
		f = rf.WeightFixedC
		rf.RFIndexResult = d + l + f
		rf.UpdatedAt = time.Now()
		st.raiseFallList[i] = rf
		if i == 0 {
			rfResult = rf.RFIndexResult
		}
	}

	return avgMRate, rfResult, len(imported), nil
}

func (s *Service) VerifyBATracker(ctx context.Context, id int64, action string, note string, actor string) (BATracker, error) {
	st := getStore()
	st.mu.Lock()
	defer st.mu.Unlock()

	now := time.Now()
	for i, item := range st.baList {
		if item.ID == id {
			if action == "reject" {
				st.baList[i].StatusBA = "Revisi"
				st.baList[i].NotesBottleneck = fmt.Sprintf("Ditolak SPV (%s): %s", actor, note)
			} else {
				st.baList[i].StatusBA = "Pending Berita Acara"
				st.baList[i].VerifiedBy = actor
				st.baList[i].VerifiedAt = &now
				st.baList[i].NotesBottleneck = "Terverifikasi SPV - Menunggu Approval Manager"
			}
			return st.baList[i], nil
		}
	}

	status := "Pending Berita Acara"
	notes := "Terverifikasi SPV - Menunggu Approval Manager"
	if action == "reject" {
		status = "Revisi"
		notes = fmt.Sprintf("Ditolak SPV (%s): %s", actor, note)
	}
	newItem := BATracker{
		ID:              id,
		BANumber:        fmt.Sprintf("BA-%d/AAP/2026", id),
		CustomerCode:    "POS",
		WorkPeriod:      "Jul-26",
		WorkAmount:      1000000000,
		StatusBA:        status,
		VerifiedBy:      actor,
		VerifiedAt:      &now,
		NotesBottleneck: notes,
		CreatedAt:       now,
	}
	st.baList = append([]BATracker{newItem}, st.baList...)
	return newItem, nil
}

func (s *Service) ApproveBATracker(ctx context.Context, id int64, action string, note string, actor string) (BATracker, error) {
	st := getStore()
	st.mu.Lock()
	defer st.mu.Unlock()

	now := time.Now()
	for i, item := range st.baList {
		if item.ID == id {
			if action == "reject" {
				st.baList[i].StatusBA = "Revisi"
				st.baList[i].NotesBottleneck = fmt.Sprintf("Ditolak Manager (%s): %s", actor, note)
			} else {
				st.baList[i].StatusBA = "Ready to Invoice"
				st.baList[i].ApprovedBy = actor
				st.baList[i].ApprovedAt = &now
				st.baList[i].BASignedDate = &now
				st.baList[i].NotesBottleneck = "Approved by Manager - Siap Terbit Invoice"
			}
			return st.baList[i], nil
		}
	}

	status := "Ready to Invoice"
	notes := "Approved by Manager - Siap Terbit Invoice"
	if action == "reject" {
		status = "Revisi"
		notes = fmt.Sprintf("Ditolak Manager (%s): %s", actor, note)
	}
	newItem := BATracker{
		ID:              id,
		BANumber:        fmt.Sprintf("BA-%d/AAP/2026", id),
		CustomerCode:    "POS",
		WorkPeriod:      "Jul-26",
		WorkAmount:      1000000000,
		StatusBA:        status,
		ApprovedBy:      actor,
		ApprovedAt:      &now,
		BASignedDate:    &now,
		NotesBottleneck: notes,
		CreatedAt:       now,
	}
	st.baList = append([]BATracker{newItem}, st.baList...)
	return newItem, nil
}

func (s *Service) VerifyInvoice(ctx context.Context, id int64, action string, note string, actor string) (InvoiceMaster, error) {
	st := getStore()
	st.mu.Lock()
	defer st.mu.Unlock()

	now := time.Now()
	for i, item := range st.invoices {
		if item.ID == id {
			if action == "reject" {
				st.invoices[i].Status = "Rejected"
				st.invoices[i].Notes = fmt.Sprintf("Ditolak Verifikator SPV (%s): %s", actor, note)
			} else {
				st.invoices[i].Status = "Verified"
				st.invoices[i].VerifiedBy = actor
				st.invoices[i].VerifiedAt = &now
				st.invoices[i].Notes = "Verifikasi SPV selesai - Menunggu Approval Manager (Tier 1)"
			}
			return st.invoices[i], nil
		}
	}

	status := "Verified"
	notes := "Verifikasi SPV selesai - Menunggu Approval Manager (Tier 1)"
	if action == "reject" {
		status = "Rejected"
		notes = fmt.Sprintf("Ditolak Verifikator SPV (%s): %s", actor, note)
	}
	newItem := InvoiceMaster{
		ID:           id,
		InvoiceNo:    fmt.Sprintf("INV-%d/AAP/2026", id),
		CustomerCode: "POS",
		WorkPeriod:   "Jul-26",
		TotalInvoice: 1000000000,
		Outstanding:  1000000000,
		Status:       status,
		VerifiedBy:   actor,
		VerifiedAt:   &now,
		Notes:        notes,
		CreatedAt:    now,
	}
	st.invoices = append([]InvoiceMaster{newItem}, st.invoices...)
	return newItem, nil
}

func (s *Service) ApproveInvoiceTier1(ctx context.Context, id int64, action string, note string, actor string) (InvoiceMaster, error) {
	st := getStore()
	st.mu.Lock()
	defer st.mu.Unlock()

	now := time.Now()
	for i, item := range st.invoices {
		if item.ID == id {
			if action == "reject" {
				st.invoices[i].Status = "Rejected"
				st.invoices[i].Notes = fmt.Sprintf("Ditolak Manager (%s): %s", actor, note)
			} else {
				st.invoices[i].Status = "Approved_Tier1"
				st.invoices[i].ApprovedManagerBy = actor
				st.invoices[i].ApprovedManagerAt = &now
				st.invoices[i].Notes = "Disetujui Manager - Menunggu Approval Direktur (Tier 2)"
			}
			return st.invoices[i], nil
		}
	}

	status := "Approved_Tier1"
	notes := "Disetujui Manager - Menunggu Approval Direktur (Tier 2)"
	if action == "reject" {
		status = "Rejected"
		notes = fmt.Sprintf("Ditolak Manager (%s): %s", actor, note)
	}
	newItem := InvoiceMaster{
		ID:                id,
		InvoiceNo:         fmt.Sprintf("INV-%d/AAP/2026", id),
		CustomerCode:      "POS",
		WorkPeriod:        "Jul-26",
		TotalInvoice:      1000000000,
		Outstanding:       1000000000,
		Status:            status,
		ApprovedManagerBy: actor,
		ApprovedManagerAt: &now,
		Notes:             notes,
		CreatedAt:         now,
	}
	st.invoices = append([]InvoiceMaster{newItem}, st.invoices...)
	return newItem, nil
}

func (s *Service) ApproveInvoiceTier2(ctx context.Context, id int64, action string, note string, actor string) (InvoiceMaster, error) {
	st := getStore()
	st.mu.Lock()
	defer st.mu.Unlock()

	now := time.Now()
	for i, item := range st.invoices {
		if item.ID == id {
			if action == "reject" {
				st.invoices[i].Status = "Rejected"
				st.invoices[i].Notes = fmt.Sprintf("Ditolak Direktur (%s): %s", actor, note)
			} else {
				st.invoices[i].Status = "Issued"
				st.invoices[i].ApprovedDirectorBy = actor
				st.invoices[i].ApprovedDirectorAt = &now
				st.invoices[i].Notes = "Approved oleh Direktur - Invoice Terbit Resmi"
			}
			return st.invoices[i], nil
		}
	}

	status := "Issued"
	notes := "Approved oleh Direktur - Invoice Terbit Resmi"
	if action == "reject" {
		status = "Rejected"
		notes = fmt.Sprintf("Ditolak Direktur (%s): %s", actor, note)
	}
	newItem := InvoiceMaster{
		ID:                 id,
		InvoiceNo:          fmt.Sprintf("INV-%d/AAP/2026", id),
		CustomerCode:       "POS",
		WorkPeriod:         "Jul-26",
		TotalInvoice:       1000000000,
		Outstanding:        1000000000,
		Status:             status,
		ApprovedDirectorBy: actor,
		ApprovedDirectorAt: &now,
		Notes:              notes,
		CreatedAt:          now,
	}
	st.invoices = append([]InvoiceMaster{newItem}, st.invoices...)
	return newItem, nil
}
