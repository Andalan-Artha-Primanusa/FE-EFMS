package app

import "strings"

var flowStages = []FlowStage{
	{Order: 1, Code: "master-data", Name: "Master Data", Description: "Data dasar seluruh proses finance.", Modules: []string{"Chart of Accounts", "Vendor", "Customer", "Employee", "Cost Center / Dept", "Project / Site", "Bank & Account", "Tax & Term of Payment", "Other Master Data"}},
	{Order: 2, Code: "budget-management", Name: "Budget Management", Description: "Perencanaan, approval, publish, lock, control, dan monitoring budget.", Modules: []string{"Buat Budget Annual/Monthly", "Budget Approval", "Budget Publish & Lock", "Budget Control & Monitoring", "Budget vs Actual Real-time"}},
	{Order: 3, Code: "transaction-request", Name: "Transaction Request", Description: "Pengajuan transaksi oleh user sebelum masuk validasi budget dan approval.", Modules: []string{"Purchase Request", "Expense Request", "Cash Advance Request", "Reimbursement Request", "Payment Request"}},
	{Order: 4, Code: "approval-workflow", Name: "Approval Workflow", Description: "Approval bertingkat sesuai kebijakan perusahaan.", Modules: []string{"Requester", "Supervisor", "Department Head", "Finance / Budget Controller", "Finance Manager", "Director / GM"}},
	{Order: 5, Code: "operational-transaction", Name: "Operational Transaction", Description: "Proses transaksi operasional AP, AR, cash bank, asset, dan tax.", Modules: []string{"Purchase to Pay (AP)", "Order to Cash (AR)", "Cash & Bank Management", "Asset Management", "Tax Management"}},
	{Order: 6, Code: "accounting-engine", Name: "Accounting Engine", Description: "Pencatatan akuntansi otomatis sampai update buku besar.", Modules: []string{"Automatic Journal Generation", "Journal Review & Approval", "Posting to General Ledger", "Update Subsidiary AP/AR/Asset", "Update Budget vs Actual"}},
	{Order: 7, Code: "reconciliation", Name: "Reconciliation", Description: "Rekonsiliasi untuk memastikan data akurat.", Modules: []string{"Bank Reconciliation", "Vendor Reconciliation", "Customer Reconciliation", "Tax Reconciliation", "Intercompany Reconciliation"}},
	{Order: 8, Code: "period-closing", Name: "Period Closing", Description: "Penutupan periode akuntansi.", Modules: []string{"Accrual & Adjustment Journal", "Depreciation Posting", "Review Trial Balance", "Financial Review & Approval", "Close Period Lock"}},
	{Order: 9, Code: "financial-reporting", Name: "Financial Reporting", Description: "Penyajian laporan keuangan dan manajemen.", Modules: []string{"Financial Statement", "AP & AR Aging", "Cash Flow Report", "Budget vs Actual Report", "Tax Report", "Project Profitability Report", "Other Management Report"}},
	{Order: 10, Code: "management-dashboard", Name: "Management Dashboard", Description: "Informasi ringkas real-time untuk keputusan.", Modules: []string{"Cash Position", "Revenue vs Target", "Expense vs Budget", "AR Overdue", "AP Overdue", "Net Profit", "Key Ratio"}},
}

var permissions = []Permission{
	{"master_data", "read", "Melihat master data"},
	{"master_data", "write", "Membuat dan mengubah master data"},
	{"master_data", "delete", "Menghapus master data"},
	{"budget", "read", "Melihat budget"},
	{"budget", "submit", "Mengajukan budget"},
	{"budget", "approve", "Approve budget"},
	{"budget", "lock", "Publish dan lock budget"},
	{"transaction_request", "read", "Melihat pengajuan transaksi"},
	{"transaction_request", "submit", "Membuat pengajuan transaksi"},
	{"approval", "act", "Approve, reject, hold, atau revision"},
	{"operational_transaction", "read", "Melihat transaksi operasional"},
	{"operational_transaction", "write", "Membuat transaksi operasional"},
	{"ba_tracker", "read", "Melihat data BA Tracker"},
	{"ba_tracker", "write", "Membuat dan mengupdate status BA"},
	{"ba_tracker", "delete", "Menghapus data BA Tracker"},
	{"ba_tracker", "verify", "Memverifikasi BA operasional (SPV)"},
	{"ba_tracker", "approve", "Approve BA operasional (Manager)"},
	{"invoice", "read", "Melihat data invoice penagihan"},
	{"invoice", "write", "Membuat draft invoice penagihan"},
	{"invoice", "delete", "Menghapus draft invoice penagihan"},
	{"invoice", "verify", "Memverifikasi draft invoice (SPV)"},
	{"invoice", "approve_tier1", "Approval Tier 1 invoice (Manager)"},
	{"invoice", "approve_tier2", "Approval Tier 2 invoice (Direktur)"},
	{"payment", "read", "Melihat log pembayaran"},
	{"payment", "write", "Mencatat log pembayaran baru"},
	{"payment", "delete", "Menghapus log pembayaran"},
	{"payment", "verify", "Memverifikasi transfer pembayaran (Treasury/Finance Specialist)"},
	{"accounting", "read", "Melihat proses accounting engine"},
	{"accounting", "generate", "Generate jurnal otomatis"},
	{"accounting", "approve", "Review dan approve jurnal"},
	{"accounting", "post", "Posting jurnal ke general ledger"},
	{"reconciliation", "run", "Menjalankan rekonsiliasi"},
	{"period_closing", "review", "Review closing period"},
	{"period_closing", "close", "Lock periode"},
	{"financial_report", "read", "Melihat laporan keuangan"},
	{"management_dashboard", "read", "Melihat dashboard manajemen"},
	{"user_management", "manage", "Mengelola user, role, dan permission"},
	{"audit_trail", "read", "Melihat audit trail"},
}

var rolePermissionMap = map[string][]string{
	"Super Admin":                {"*:*"},
	"Director":                   {"management_dashboard:read", "financial_report:read", "ba_tracker:read", "ba_tracker:approve", "invoice:read", "invoice:approve_tier2", "period_closing:close", "approval:act"},
	"Direktur":                   {"management_dashboard:read", "financial_report:read", "ba_tracker:read", "ba_tracker:approve", "invoice:read", "invoice:approve_tier2", "period_closing:close", "approval:act"},
	"Finance Manager":            {"master_data:*", "budget:*", "ba_tracker:*", "invoice:*", "payment:*", "approval:act", "accounting:*", "reconciliation:run", "period_closing:review", "financial_report:read", "management_dashboard:read", "audit_trail:read"},
	"Manager":                    {"master_data:*", "budget:*", "ba_tracker:*", "invoice:*", "payment:*", "approval:act", "accounting:*", "reconciliation:run", "period_closing:review", "financial_report:read", "management_dashboard:read", "audit_trail:read"},
	"FATB Manager":               {"master_data:*", "budget:*", "ba_tracker:*", "invoice:*", "payment:*", "approval:act", "accounting:*", "reconciliation:run", "period_closing:review", "financial_report:read", "management_dashboard:read", "audit_trail:read"},
	"SPV Verificator":            {"master_data:read", "ba_tracker:read", "ba_tracker:write", "ba_tracker:verify", "invoice:read", "invoice:write", "invoice:verify", "payment:read", "payment:verify", "operational_transaction:read", "financial_report:read"},
	"SPV":                        {"master_data:read", "ba_tracker:read", "ba_tracker:write", "ba_tracker:verify", "invoice:read", "invoice:write", "invoice:verify", "payment:read", "payment:verify", "operational_transaction:read", "financial_report:read"},
	"SPV Site":                   {"master_data:read", "ba_tracker:read", "ba_tracker:write", "ba_tracker:verify", "invoice:read", "invoice:write", "invoice:verify", "payment:read", "payment:verify", "operational_transaction:read", "financial_report:read"},
	"Finance Specialist":         {"master_data:read", "ba_tracker:read", "ba_tracker:write", "ba_tracker:verify", "invoice:read", "invoice:write", "invoice:verify", "payment:read", "payment:verify", "operational_transaction:read", "financial_report:read"},
	"Finance Specialist AAP":     {"master_data:read", "ba_tracker:read", "ba_tracker:write", "ba_tracker:verify", "invoice:read", "invoice:write", "invoice:verify", "payment:read", "payment:verify", "operational_transaction:read", "financial_report:read"},
	"Admin Finance Site":         {"master_data:read", "ba_tracker:read", "ba_tracker:write", "invoice:read", "invoice:write", "payment:read", "operational_transaction:read"},
	"Admin Finance HO":           {"master_data:*", "ba_tracker:read", "ba_tracker:write", "invoice:read", "invoice:write", "payment:read", "payment:write", "operational_transaction:*", "accounting:generate", "reconciliation:run", "financial_report:read"},
	"Finance Admin":              {"master_data:*", "budget:*", "transaction_request:*", "approval:act", "ba_tracker:*", "invoice:*", "payment:*", "operational_transaction:*", "accounting:*", "reconciliation:*", "period_closing:*", "financial_report:read", "management_dashboard:read", "audit_trail:read"},
	"Accounting":                 {"master_data:read", "transaction_request:read", "ba_tracker:read", "invoice:read", "payment:read", "accounting:*", "reconciliation:run", "period_closing:review", "financial_report:read"},
	"Account Payable Officer":    {"master_data:read", "transaction_request:read", "operational_transaction:read", "operational_transaction:write", "accounting:generate", "reconciliation:run", "financial_report:read"},
	"Account Receivable Officer": {"master_data:read", "ba_tracker:read", "invoice:read", "invoice:write", "payment:*", "operational_transaction:read", "operational_transaction:write", "accounting:generate", "reconciliation:run", "financial_report:read"},
	"AR Admin":                   {"master_data:read", "ba_tracker:read", "invoice:read", "invoice:write", "payment:*", "operational_transaction:read", "operational_transaction:write", "accounting:generate", "reconciliation:run", "financial_report:read"},
	"Cashier":                    {"transaction_request:read", "payment:read", "payment:write", "operational_transaction:read", "operational_transaction:write", "accounting:generate"},
	"Treasury":                   {"transaction_request:read", "payment:*", "approval:act", "operational_transaction:*", "reconciliation:run", "management_dashboard:read", "accounting:generate"},
	"Treasury Admin":             {"transaction_request:read", "payment:*", "approval:act", "operational_transaction:*", "reconciliation:run", "management_dashboard:read", "accounting:generate"},
	"Budget Controller":          {"budget:*", "transaction_request:read", "approval:act", "financial_report:read", "management_dashboard:read"},
	"Tax Officer":                {"master_data:read", "invoice:read", "operational_transaction:read", "operational_transaction:write", "accounting:generate", "reconciliation:run", "financial_report:read"},
	"Department User":            {"master_data:read", "budget:read", "transaction_request:read", "transaction_request:submit"},
	"Department Head":            {"budget:read", "transaction_request:read", "approval:act", "management_dashboard:read"},
	"General Manager":            {"approval:act", "ba_tracker:approve", "invoice:approve_tier1", "invoice:approve_tier2", "period_closing:review", "financial_report:read", "management_dashboard:read"},
	"Auditor":                    {"master_data:read", "transaction_request:read", "ba_tracker:read", "invoice:read", "payment:read", "operational_transaction:read", "accounting:read", "reconciliation:run", "period_closing:review", "financial_report:read", "audit_trail:read"},
}

func FinanceFlowCatalog() []FlowStage {
	return flowStages
}

func PermissionCatalog() []Permission {
	return permissions
}

func RoleAccessCatalog() []RoleAccess {
	access := make([]RoleAccess, 0, len(rolePermissionMap))
	for role, grants := range rolePermissionMap {
		item := RoleAccess{Role: role, Scopes: []string{"company", "site", "department", "project"}}
		for _, grant := range grants {
			if grant == "*:*" {
				item.Permissions = permissions
				break
			}
			parts := strings.Split(grant, ":")
			if len(parts) != 2 {
				continue
			}
			for _, permission := range permissions {
				if permission.Module == parts[0] && (parts[1] == "*" || permission.Action == parts[1]) {
					item.Permissions = append(item.Permissions, permission)
				}
			}
		}
		access = append(access, item)
	}
	return access
}

func RoleGrants(role string) []string {
	return rolePermissionMap[role]
}

func IsSuperAdminRole(role string) bool {
	r := strings.ToLower(strings.TrimSpace(role))
	return r == "super admin" || r == "erp super admin" || strings.Contains(r, "super admin") || strings.Contains(r, "superadmin")
}
