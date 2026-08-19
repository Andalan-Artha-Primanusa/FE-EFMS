package app

import "context"

func (s *Service) Dashboard(ctx context.Context) (Dashboard, error) {
	pending, err := s.Transactions(ctx, "Waiting Approval")
	if err != nil {
		return Dashboard{}, err
	}

	st := getStore()
	st.mu.Lock()
	st.recalculateAllInvoices()
	invoices := make([]InvoiceMaster, len(st.invoices))
	copy(invoices, st.invoices)
	st.mu.Unlock()

	var totalAR float64
	var aging0_30, aging31_60, aging61_90, agingOver90 float64
	for _, inv := range invoices {
		if inv.Outstanding > 0 {
			totalAR += inv.Outstanding
			switch inv.AgingBucket {
			case "Not Due", "1-30":
				aging0_30 += inv.Outstanding
			case "31-60":
				aging31_60 += inv.Outstanding
			case "61-90":
				aging61_90 += inv.Outstanding
			case ">90":
				agingOver90 += inv.Outstanding
			}
		}
	}
	if totalAR == 0 {
		totalAR = 2140000000
		aging0_30 = 980000000
		aging31_60 = 520000000
		aging61_90 = 340000000
		agingOver90 = 300000000
	}

	return Dashboard{
		KPIs: []KPI{
			{"Total saldo kas", 1825000000, 8.2, "good"},
			{"Total saldo bank", 7360000000, 3.7, "good"},
			{"Pendapatan bulan berjalan", 4280000000, 12.4, "good"},
			{"Pengeluaran bulan berjalan", 2890000000, -4.1, "warning"},
			{"Laba rugi sementara", 1390000000, 6.8, "good"},
			{"Total Account Payable", 1180000000, -2.5, "warning"},
			{"Total Account Receivable", totalAR, 9.1, "good"},
			{"Transaksi menunggu approval", float64(len(pending)), 0, "info"},
		},
		MonthlyFinance: []ChartPoint{
			{"Jan", 3100000000, 2100000000, 0, 0, 0},
			{"Feb", 3400000000, 2300000000, 0, 0, 0},
			{"Mar", 3650000000, 2550000000, 0, 0, 0},
			{"Apr", 3900000000, 2600000000, 0, 0, 0},
			{"Mei", 4200000000, 2880000000, 0, 0, 0},
			{"Jun", 4280000000, 2890000000, 0, 0, 0},
		},
		CashFlow: []ChartPoint{
			{"W1", 0, 0, 820000000, 620000000, 0},
			{"W2", 0, 0, 960000000, 700000000, 0},
			{"W3", 0, 0, 780000000, 840000000, 0},
			{"W4", 0, 0, 1120000000, 730000000, 0},
		},
		AgingReceivable: []ChartPoint{
			{"0-30", 0, 0, 0, 0, aging0_30},
			{"31-60", 0, 0, 0, 0, aging31_60},
			{"61-90", 0, 0, 0, 0, aging61_90},
			{">90", 0, 0, 0, 0, agingOver90},
		},
		AgingPayable: []ChartPoint{
			{"0-30", 0, 0, 0, 0, 610000000},
			{"31-60", 0, 0, 0, 0, 270000000},
			{"61-90", 0, 0, 0, 0, 180000000},
			{">90", 0, 0, 0, 0, 120000000},
		},
		PendingApprovals: pending,
		CashPosition: []ChartPoint{
			{"Holding", 0, 0, 0, 0, 4100000000},
			{"Site JKT", 0, 0, 0, 0, 2850000000},
			{"Project", 0, 0, 0, 0, 1640000000},
		},
	}, nil
}

func (s *Service) Modules() []Module {
	return []Module{
		{"Dashboard", []string{"Executive Dashboard", "Finance Dashboard"}},
		{"Master Data", []string{"Chart of Accounts", "Company", "Site", "Department", "Cost Center", "Project", "Vendor", "Customer", "Employee", "Bank", "Tax", "Currency"}},
		{"Budget Management", []string{"Annual Budget", "Monthly Budget", "Budget Submission", "Budget Approval", "Budget Revision", "Budget Transfer", "Budget versus Actual"}},
		{"Transaction Request", []string{"Purchase Request", "Expense Request", "Cash Advance", "Reimbursement", "Payment Request"}},
		{"Account Payable", []string{"Vendor Invoice", "Payment Schedule", "Vendor Payment", "AP Aging", "Vendor Reconciliation"}},
		{"Account Receivable", []string{"Customer Invoice", "Customer Receipt", "Collection", "AR Aging", "Customer Reconciliation"}},
		{"Cash and Bank", []string{"Cash Receipt", "Cash Payment", "Bank Receipt", "Bank Payment", "Bank Transfer", "Bank Statement", "Bank Reconciliation", "Petty Cash"}},
		{"Accounting", []string{"Journal Entry", "Journal Approval", "Journal Posting", "General Ledger", "Trial Balance", "Closing Period"}},
		{"Governance", []string{"Fixed Assets", "Tax Management", "Project Accounting", "Reconciliation", "Financial Reports", "Management Reports", "Approval Center", "Notification Center", "Audit Trail", "User Management", "Role and Permission", "System Settings"}},
	}
}
