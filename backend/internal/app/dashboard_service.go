package app

import "context"

func (s *Service) Dashboard(ctx context.Context) (Dashboard, error) {
	pending, err := s.Transactions(ctx, "Waiting Approval")
	if err != nil {
		return Dashboard{}, err
	}
	return Dashboard{
		KPIs: []KPI{
			{"Total saldo kas", 1825000000, 8.2, "good"},
			{"Total saldo bank", 7360000000, 3.7, "good"},
			{"Pendapatan bulan berjalan", 4280000000, 12.4, "good"},
			{"Pengeluaran bulan berjalan", 2890000000, -4.1, "warning"},
			{"Laba rugi sementara", 1390000000, 6.8, "good"},
			{"Total Account Payable", 1180000000, -2.5, "warning"},
			{"Total Account Receivable", 2140000000, 9.1, "good"},
			{"Transaksi menunggu approval", float64(len(pending)), 0, "info"},
		},
		MonthlyFinance: []ChartPoint{
			{"Jan", 3100, 2100, 0, 0, 0}, {"Feb", 3400, 2300, 0, 0, 0}, {"Mar", 3650, 2550, 0, 0, 0}, {"Apr", 3900, 2600, 0, 0, 0}, {"Mei", 4200, 2880, 0, 0, 0}, {"Jun", 4280, 2890, 0, 0, 0},
		},
		CashFlow: []ChartPoint{
			{"W1", 820, 620, 820, 620, 0}, {"W2", 960, 700, 960, 700, 0}, {"W3", 780, 840, 780, 840, 0}, {"W4", 1120, 730, 1120, 730, 0},
		},
		AgingReceivable:  []ChartPoint{{"0-30", 0, 0, 0, 0, 980}, {"31-60", 0, 0, 0, 0, 520}, {"61-90", 0, 0, 0, 0, 340}, {">90", 0, 0, 0, 0, 300}},
		AgingPayable:     []ChartPoint{{"0-30", 0, 0, 0, 0, 610}, {"31-60", 0, 0, 0, 0, 270}, {"61-90", 0, 0, 0, 0, 180}, {">90", 0, 0, 0, 0, 120}},
		PendingApprovals: pending,
		CashPosition:     []ChartPoint{{"Holding", 0, 0, 0, 0, 4100}, {"Site JKT", 0, 0, 0, 0, 2850}, {"Project", 0, 0, 0, 0, 1640}},
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
