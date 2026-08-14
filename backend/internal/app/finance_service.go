package app

import (
	"context"
	"errors"
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
	mu        sync.RWMutex
	invoices  []InvoiceMaster
	baList    []BATracker
	payments     []PaymentLog
	customers    []CustomerMaster
	variableSOWs []VariableSOW
	nextID       int64
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
				{ID: 12, Category: "Mine Development (MDO)", ItemName: "Cut - Base Rate (1000m)", RateUSD: 2.129, Unit: "USD/BCM", Customer: "POS", Description: "Pemotongan jalan tambang MDO", Status: "Active", CreatedAt: now},
				{ID: 13, Category: "Mine Development (MDO)", ItemName: "Uncrushed rocks for construction - Base Rate (1000m)", RateUSD: 7.938, Unit: "USD/BCM", Customer: "POS", Description: "Batu konstruksi jalan haulage", Status: "Active", CreatedAt: now},
				{ID: 14, Category: "Mine Development (MDO)", ItemName: "Crusher rocks - Base Rate (1000m)", RateUSD: 13.050, Unit: "USD/BCM", Customer: "POS", Description: "Batu split olahan crusher", Status: "Active", CreatedAt: now},
				{ID: 15, Category: "Mine Development (MDO)", ItemName: "Rocks for construction - under/overhaul", RateUSD: 0.526, Unit: "USD/1KM", Customer: "POS", Description: "Jarak angkut tambahan batu", Status: "Active", CreatedAt: now},
				{ID: 16, Category: "Mine Development (MDO)", ItemName: "Geotextile", RateUSD: 2.003, Unit: "USD/m2", Customer: "POS", Description: "Pemasangan geotextile jalan tambang", Status: "Active", CreatedAt: now},
			},
			baList: []BATracker{
				{ID: 1, BANumber: "20/BAP-AAP-KKLII/26", CustomerCode: "BGG", WorkPeriod: "Jan-26", WorkAmount: 6660392676, WorkEndDate: pdate("2026-01-31"), BASubmittedDate: pdate("2026-01-31"), BASignedDate: pdate("2026-01-31"), LeadTimeDays: 0, StatusBA: "Approved", PICAAP: "Operations", InvoiceNoLinked: "086/BGG-AAP/I/2026", InvoiceIssuedDate: pdate("2026-02-25"), LagBAToInvoiceDays: 25, NotesBottleneck: "🐢 Slow: Lag BA Invoice >5 hari", Notes: "Tanggal pengajuan BA dan ttd BA normal", DraftBAPath: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", FinalBAPath: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", CreatedAt: now},
				{ID: 2, BANumber: "21/BAP-AAP-KKL/II/26", CustomerCode: "BGG", WorkPeriod: "Feb-26", WorkAmount: 7850000000, WorkEndDate: pdate("2026-02-28"), BASubmittedDate: pdate("2026-02-28"), BASignedDate: pdate("2026-02-28"), LeadTimeDays: 0, StatusBA: "Approved", PICAAP: "Operations", InvoiceNoLinked: "087/BGG-AAP/II/2026", InvoiceIssuedDate: pdate("2026-03-25"), LagBAToInvoiceDays: 25, NotesBottleneck: "🐢 Slow: Lag BA Invoice >5 hari", Notes: "Tanggal pengajuan BA dan ttd BA normal", DraftBAPath: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", FinalBAPath: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", CreatedAt: now},
				{ID: 3, BANumber: "22/BAP-AAP-KKL/III/26", CustomerCode: "BGG", WorkPeriod: "Mar-26", WorkAmount: 20299536335, WorkEndDate: pdate("2026-03-31"), BASubmittedDate: pdate("2026-03-31"), BASignedDate: pdate("2026-03-31"), LeadTimeDays: 0, StatusBA: "Approved", PICAAP: "Operations", InvoiceNoLinked: "088/BGG-AAP/II/2026", InvoiceIssuedDate: pdate("2026-04-20"), LagBAToInvoiceDays: 20, NotesBottleneck: "🐢 Slow: Lag BA Invoice >5 hari", Notes: "Pending Nov & Des 2025", DraftBAPath: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", FinalBAPath: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", CreatedAt: now},
				{ID: 4, BANumber: "127-128/SBS-Banko/PRO/III/2026", CustomerCode: "SBS", WorkPeriod: "Jan-26", WorkAmount: 4850000000, WorkEndDate: pdate("2026-01-31"), BASubmittedDate: pdate("2026-03-11"), BASignedDate: pdate("2026-03-13"), LeadTimeDays: 41, StatusBA: "Approved", PICAAP: "Site Engineer", InvoiceNoLinked: "014/SBS-AAP/I/2026", InvoiceIssuedDate: pdate("2026-04-07"), LagBAToInvoiceDays: 25, NotesBottleneck: "🐢 Slow: Lead time BA >14 hari", Notes: "Keterlambatan verifikasi customer", DraftBAPath: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", FinalBAPath: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", CreatedAt: now},
				{ID: 5, BANumber: "55-56/SBS-Banko/PRO/I/2026", CustomerCode: "SBS", WorkPeriod: "Dec-25", WorkAmount: 3231259551, WorkEndDate: pdate("2025-12-31"), BASubmittedDate: pdate("2026-02-23"), BASignedDate: pdate("2026-02-25"), LeadTimeDays: 56, StatusBA: "Approved", PICAAP: "Site Engineer", InvoiceNoLinked: "013/SBS-AAP/XII/2025", InvoiceIssuedDate: pdate("2026-03-27"), LagBAToInvoiceDays: 30, NotesBottleneck: "🐢 Slow: Lead time BA >14 hari", Notes: "Revisi volume HM", DraftBAPath: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", FinalBAPath: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", CreatedAt: now},
				{ID: 6, BANumber: "01/DBK-AAP/I/2026", CustomerCode: "DBK", WorkPeriod: "Jan-26", WorkAmount: 5400000000, WorkEndDate: pdate("2026-01-31"), BASubmittedDate: pdate("2026-02-04"), BASignedDate: pdate("2026-05-25"), LeadTimeDays: 114, StatusBA: "Approved", PICAAP: "Mining Manager", InvoiceNoLinked: "008/PTRO-ABN/I/2026", InvoiceIssuedDate: pdate("2026-06-24"), LagBAToInvoiceDays: 30, NotesBottleneck: "🐢 Slow: Lead time BA >14 hari", Notes: "Invoice terbit Juni 2026", DraftBAPath: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", FinalBAPath: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", CreatedAt: now},
				{ID: 7, BANumber: "270-273/SBS-Banko/PRO/III/2026", CustomerCode: "SBS", WorkPeriod: "Feb-26", WorkAmount: 3950000000, WorkEndDate: pdate("2026-02-28"), BASubmittedDate: nil, BASignedDate: nil, LeadTimeDays: 0, StatusBA: "Draft", PICAAP: "Operations", InvoiceNoLinked: "015/SBS-AAP/II/2026", InvoiceIssuedDate: nil, LagBAToInvoiceDays: 0, NotesBottleneck: "⚠️ Internal: BA belum diajukan", Notes: "Belum TTD customer", DraftBAPath: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", FinalBAPath: "", CreatedAt: now},
				{ID: 8, BANumber: "050/BA-HRGA/AAP-POS/V/2026", CustomerCode: "POS", WorkPeriod: "May-26", WorkAmount: 4754595031, WorkEndDate: pdate("2026-05-20"), BASubmittedDate: pdate("2026-05-26"), BASignedDate: pdate("2026-05-28"), LeadTimeDays: 8, StatusBA: "Approved", PICAAP: "HRGA", InvoiceNoLinked: "002/POS-AAP/BC-MESS/VI/2026", InvoiceIssuedDate: pdate("2026-06-02"), LagBAToInvoiceDays: 5, NotesBottleneck: "OK", Notes: "Mess Facility claim", DraftBAPath: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", FinalBAPath: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", CreatedAt: now},
				{ID: 9, BANumber: "051/BA-POS-NIKEL/VI/2026", CustomerCode: "POS", WorkPeriod: "Jun-26", WorkAmount: 42150000000, WorkEndDate: pdate("2026-06-30"), BASubmittedDate: pdate("2026-06-30"), BASignedDate: pdate("2026-07-02"), LeadTimeDays: 2, StatusBA: "Approved", PICAAP: "Site Manager", InvoiceNoLinked: "003/POS-AAP/RF/VI/2026", InvoiceIssuedDate: pdate("2026-07-05"), LagBAToInvoiceDays: 3, NotesBottleneck: "OK", Notes: "Mining OB Removal & Nikel Ore Jun-26", DraftBAPath: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", FinalBAPath: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", CreatedAt: now},
				{ID: 10, BANumber: "052/BA-POS-NIKEL/VII/2026", CustomerCode: "POS", WorkPeriod: "Jul-26", WorkAmount: 44448368475, WorkEndDate: pdate("2026-07-31"), BASubmittedDate: pdate("2026-07-31"), BASignedDate: pdate("2026-08-03"), LeadTimeDays: 3, StatusBA: "Approved", PICAAP: "Operations", InvoiceNoLinked: "", InvoiceIssuedDate: nil, LagBAToInvoiceDays: 0, NotesBottleneck: "OK: Dalam Proses Penagihan", Notes: "Klaim Utama Tambang Nikel POS Juli 2026", DraftBAPath: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", FinalBAPath: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", CreatedAt: now},
				{ID: 11, BANumber: "053/BA-POS-PENDING-VOL/VII/2026", CustomerCode: "POS", WorkPeriod: "Jul-26", WorkAmount: 1873994494, WorkEndDate: pdate("2026-07-31"), BASubmittedDate: nil, BASignedDate: nil, LeadTimeDays: 0, StatusBA: "Draft", PICAAP: "Surveyor", InvoiceNoLinked: "", InvoiceIssuedDate: nil, LagBAToInvoiceDays: 0, NotesBottleneck: "⚠️ Pending: Joint Survey Tambahan", Notes: "Pending Volume Hasil Joint Survey Juli 2026", DraftBAPath: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", FinalBAPath: "", CreatedAt: now},
			},
			payments: []PaymentLog{
				{ID: 1, InvoiceNo: "012/SBS-AAP/XI/2025", CustomerCode: "SBS", AmountPaid: 1568339432, PaymentDate: date("2026-03-11"), ReceivingBank: "BRI Escrow", RefNo: "TRF-BRI-00129", PaymentPeriod: "Mar-26", Notes: "Lunas (Telat 11 Hari)", DaysLateOrEarly: 11, CreatedAt: now},
				{ID: 2, InvoiceNo: "013/SBS-AAP/XII/2025", CustomerCode: "SBS", AmountPaid: 3231259551, PaymentDate: date("2026-05-11"), ReceivingBank: "BRI Escrow", RefNo: "TRF-BRI-00481", PaymentPeriod: "May-26", Notes: "Lunas (Telat 15 Hari)", DaysLateOrEarly: 15, CreatedAt: now},
				{ID: 3, InvoiceNo: "001/POS-AAP/BC-MOB/II/2026", CustomerCode: "POS", AmountPaid: 4050239795, PaymentDate: date("2026-05-13"), ReceivingBank: "Mandiri 0000 OP", RefNo: "TRF-MND-99120", PaymentPeriod: "May-26", Notes: "Lunas On-time", DaysLateOrEarly: -7, CreatedAt: now},
				{ID: 4, InvoiceNo: "079/BGG-AAP/VI/2025", CustomerCode: "BGG", AmountPaid: 2500000000, PaymentDate: date("2025-12-09"), ReceivingBank: "Bank Mandiri Escow", RefNo: "ESC-BGG-001", PaymentPeriod: "Dec-25", Notes: "Cicilan 1 BGG", DaysLateOrEarly: 116, CreatedAt: now},
				{ID: 5, InvoiceNo: "079/BGG-AAP/VI/2025", CustomerCode: "BGG", AmountPaid: 2500000000, PaymentDate: date("2025-12-10"), ReceivingBank: "Bank Mandiri Escow", RefNo: "ESC-BGG-002", PaymentPeriod: "Dec-25", Notes: "Cicilan 2 BGG", DaysLateOrEarly: 117, CreatedAt: now},
				{ID: 6, InvoiceNo: "079/BGG-AAP/VI/2025", CustomerCode: "BGG", AmountPaid: 1814754172, PaymentDate: date("2026-01-26"), ReceivingBank: "Bank Mandiri Escow", RefNo: "ESC-BGG-010", PaymentPeriod: "Jan-26", Notes: "Pelunasan BGG Juni 2025", DaysLateOrEarly: 194, CreatedAt: now},
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
	if ba.BASignedDate != nil && ba.WorkEndDate != nil {
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

	if ba.StatusBA == "Draft" {
		ba.NotesBottleneck = "⚠️ Internal: BA belum diajukan"
	} else if ba.StatusBA == "Rejected" {
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
			if p.InvoiceNo == inv.InvoiceNo {
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

	var totalAR float64
	var overdueCount, totalAgingDays, outstandingCount int

	for _, inv := range invoices {
		if inv.Outstanding > 0 {
			totalAR += inv.Outstanding
			outstandingCount++
			totalAgingDays += inv.AgingDays
			if inv.Status == "Overdue" {
				overdueCount++
			}
		}
	}

	avgDSO := 0.0
	if outstandingCount > 0 {
		avgDSO = float64(totalAgingDays) / float64(outstandingCount)
	}

	baPending := 0
	for _, ba := range baList {
		if ba.StatusBA == "Draft" || ba.StatusBA == "Rejected" {
			baPending++
		}
	}

	pctOverdue := 100.0
	if totalAR > 0 {
		pctOverdue = 100.0
	}

	kpis := []KPI{
		{Label: "TOTAL AR OUTSTANDING", Value: totalAR, Delta: 0, Tone: "critical"},
		{Label: "% AR OVERDUE", Value: pctOverdue, Delta: 0, Tone: "warning"},
		{Label: "AR CRITICAL > 90 HARI", Value: 0, Delta: 0, Tone: "good"},
		{Label: "AVG DSO (DAYS SALES OUTSTANDING)", Value: avgDSO, Delta: 0, Tone: "warning"},
		{Label: "BA PENDING (INTERNAL ISSUE)", Value: float64(baPending), Delta: 0, Tone: "critical"},
	}

	// Calculate Matrix dynamically
	custMatrixMap := make(map[string]*AgingMatrixRow)
	customers := []string{"BGG", "SBS", "DBK", "POS", "ABN"}
	for _, c := range customers {
		custMatrixMap[c] = &AgingMatrixRow{Customer: c}
	}

	topOverdue := []InvoiceMaster{}
	for _, inv := range invoices {
		if inv.Outstanding > 0 {
			topOverdue = append(topOverdue, inv)
		}
		row, exists := custMatrixMap[inv.CustomerCode]
		if !exists {
			row = &AgingMatrixRow{Customer: inv.CustomerCode}
			custMatrixMap[inv.CustomerCode] = row
		}
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

	matrix := []AgingMatrixRow{}
	for _, c := range customers {
		if row, ok := custMatrixMap[c]; ok {
			matrix = append(matrix, *row)
		}
	}

	bottlenecks := []BABottleneckSummary{
		{Customer: "BGG", AvgLeadTimeBA: 0, AvgLagBAToInvoice: 18, BACount: 14},
		{Customer: "SBS", AvgLeadTimeBA: 49, AvgLagBAToInvoice: 22, BACount: 6},
		{Customer: "DBK", AvgLeadTimeBA: 35, AvgLagBAToInvoice: 70, BACount: 8},
		{Customer: "POS", AvgLeadTimeBA: 8, AvgLagBAToInvoice: 5, BACount: 2},
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

	recalculateBA(&item)
	now := time.Now()

	if item.ID == 0 {
		st.nextID++
		item.ID = st.nextID
		item.CreatedAt = now
		st.baList = append([]BATracker{item}, st.baList...)
	} else {
		found := false
		for i, existing := range st.baList {
			if existing.ID == item.ID {
				item.CreatedAt = existing.CreatedAt
				st.baList[i] = item
				found = true
				break
			}
		}
		if !found {
			if item.CreatedAt.IsZero() {
				item.CreatedAt = now
			}
			st.baList = append([]BATracker{item}, st.baList...)
		}
	}
	return item, nil
}

func (s *Service) DeleteBATracker(ctx context.Context, id int64) error {
	st := getStore()
	st.mu.Lock()
	defer st.mu.Unlock()
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
