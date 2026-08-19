package database

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"financeerp/backend/internal/app"

	"golang.org/x/crypto/bcrypt"
)

func Seed(ctx context.Context, db *sql.DB) error {
	roles := []string{
		"Super Admin", "Finance Admin", "SPV Verificator", "Admin Finance Site", "Admin Finance HO",
		"Accounting", "Account Payable Officer", "Account Receivable Officer", "Cashier", "Treasury",
		"Budget Controller", "Tax Officer", "Department User", "Department Head", "Finance Manager",
		"General Manager", "Director", "Auditor",
	}
	for _, role := range roles {
		if _, err := db.ExecContext(ctx, `INSERT IGNORE INTO roles (name, description) VALUES (?, ?)`, role, role+" access profile"); err != nil {
			return err
		}
	}
	for _, permission := range app.PermissionCatalog() {
		if _, err := db.ExecContext(ctx, `INSERT IGNORE INTO permissions (module, action, description) VALUES (?, ?, ?)`, permission.Module, permission.Action, permission.Description); err != nil {
			return err
		}
	}
	for _, roleAccess := range app.RoleAccessCatalog() {
		for _, permission := range roleAccess.Permissions {
			if _, err := db.ExecContext(ctx, `INSERT IGNORE INTO role_permissions (role_id, permission_id)
				SELECT r.id, p.id FROM roles r JOIN permissions p ON p.module=? AND p.action=? WHERE r.name=?`, permission.Module, permission.Action, roleAccess.Role); err != nil {
				return err
			}
		}
	}

	hash, err := bcrypt.GenerateFromPassword([]byte("Admin@12345"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	if _, err := db.ExecContext(ctx, `INSERT IGNORE INTO users (role_id, name, email, password_hash) SELECT id, 'ERP Super Admin', 'admin@financeerp.local', ? FROM roles WHERE name='Super Admin'`, string(hash)); err != nil {
		return err
	}
	loginSeeds := []struct {
		role  string
		name  string
		email string
	}{
		{"Super Admin", "ERP Super Admin", "admin@financeerp.local"},
		{"Finance Admin", "Finance Admin", "finance.admin@financeerp.local"},
		{"SPV Verificator", "SPV Site Verificator", "spv@financeerp.local"},
		{"Admin Finance Site", "Admin Finance Site", "admin.site@financeerp.local"},
		{"Admin Finance HO", "Admin Finance HO", "admin.ho@financeerp.local"},
		{"Finance Manager", "Finance Manager", "finance.manager@financeerp.local"},
		{"Director", "Direktur Utama", "director@financeerp.local"},
		{"General Manager", "General Manager", "general.manager@financeerp.local"},
		{"Accounting", "Accounting Officer", "accounting@financeerp.local"},
		{"Account Payable Officer", "AP Officer", "ap@financeerp.local"},
		{"Account Receivable Officer", "AR Officer", "ar@financeerp.local"},
		{"Cashier", "Cashier", "cashier@financeerp.local"},
		{"Treasury", "Treasury Officer", "treasury@financeerp.local"},
		{"Budget Controller", "Budget Controller", "budget.controller@financeerp.local"},
		{"Tax Officer", "Tax Officer", "tax@financeerp.local"},
		{"Department User", "Department User", "department.user@financeerp.local"},
		{"Department Head", "Department Head", "department.head@financeerp.local"},
		{"Auditor", "Auditor", "auditor@financeerp.local"},
	}
	for _, user := range loginSeeds {
		if _, err := db.ExecContext(ctx, `INSERT IGNORE INTO users (role_id, name, email, password_hash)
			SELECT id, ?, ?, ? FROM roles WHERE name=?`, user.name, user.email, string(hash), user.role); err != nil {
			return err
		}
	}

	if _, err := db.ExecContext(ctx, `INSERT IGNORE INTO companies (code, name) VALUES ('FIN', 'Finance ERP Holding')`); err != nil {
		return err
	}
	numberRanges := []struct {
		objectCode, objectType, prefix string
		padding                        int
	}{
		{"master_records", "chart_of_accounts", "COA", 6},
		{"master_records", "vendor", "VND", 6},
		{"master_records", "customer", "CUS", 6},
		{"master_records", "employee", "EMP", 6},
		{"master_records", "cost_center_department", "CCD", 6},
		{"master_records", "project_site", "PRJ", 6},
		{"master_records", "bank_account", "BNK", 6},
		{"master_records", "tax_term_payment", "TAX", 6},
		{"master_records", "other_master_data", "MST", 6},
		{"transaction_requests", "*", "TRX", 8},
		{"operational_transactions", "purchase_to_pay_ap", "AP", 8},
		{"operational_transactions", "order_to_cash_ar", "AR", 8},
		{"operational_transactions", "cash_bank_management", "CB", 8},
		{"operational_transactions", "asset_management", "AST", 8},
		{"operational_transactions", "tax_management", "TAXOP", 8},
		{"accounting_runs", "*", "ACR", 8},
		{"journals", "*", "JRN", 8},
	}
	for _, item := range numberRanges {
		if _, err := db.ExecContext(ctx, `INSERT IGNORE INTO number_ranges (object_code, object_type, prefix, padding) VALUES (?, ?, ?, ?)`, item.objectCode, item.objectType, item.prefix, item.padding); err != nil {
			return err
		}
	}
	for _, stage := range app.FinanceFlowCatalog() {
		modules := mustJSON(stage.Modules)
		if _, err := db.ExecContext(ctx, `INSERT INTO finance_flow_stages (stage_order, code, name, description, modules)
			VALUES (?, ?, ?, ?, CAST(? AS JSON))
			ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), modules=VALUES(modules)`, stage.Order, stage.Code, stage.Name, stage.Description, modules); err != nil {
			return err
		}
	}
	orgs := []struct{ typ, code, name string }{
		{"site", "JKT", "Jakarta Head Office"},
		{"department", "FIN-AP", "Finance - Account Payable"},
		{"department", "FIN-AR", "Finance - Account Receivable"},
		{"cost_center", "CC-MINING", "Mining Operation Cost Center"},
		{"project", "PRJ-HAULING", "Hauling Optimization Project"},
	}
	for _, org := range orgs {
		if _, err := db.ExecContext(ctx, `INSERT IGNORE INTO org_units (company_id, type, code, name) SELECT id, ?, ?, ? FROM companies WHERE code='FIN'`, org.typ, org.code, org.name); err != nil {
			return err
		}
	}

	accounts := []struct {
		code, name, typ, normal, mapping string
	}{
		{"1000", "Cash on Hand", "asset", "debit", "Balance Sheet"},
		{"1010", "Bank Account", "asset", "debit", "Balance Sheet"},
		{"1200", "Account Receivable", "asset", "debit", "Balance Sheet"},
		{"2000", "Account Payable", "liability", "credit", "Balance Sheet"},
		{"4000", "Revenue", "revenue", "credit", "Profit and Loss"},
		{"5000", "Operational Expense", "expense", "debit", "Profit and Loss"},
	}
	for _, account := range accounts {
		if _, err := db.ExecContext(ctx, `INSERT IGNORE INTO chart_accounts (code, name, account_type, normal_balance, report_mapping) VALUES (?, ?, ?, ?, ?)`, account.code, account.name, account.typ, account.normal, account.mapping); err != nil {
			return err
		}
	}

	masters := []struct {
		typ, code, name string
		metadata        map[string]any
	}{
		{"chart_of_accounts", "1000", "Cash on Hand", map[string]any{"normalBalance": "debit"}},
		{"vendor", "VND-HAUL", "PT Hauling Services Indonesia", map[string]any{"category": "Contractor", "taxIdentity": "01.234.567.8-999.000"}},
		{"customer", "CUS-MINE", "PT Mineral Buyer Nusantara", map[string]any{"category": "Strategic Customer"}},
		{"employee", "EMP-FIN-001", "Finance Requester", map[string]any{"department": "Finance"}},
		{"cost_center_department", "FIN-AP", "Finance - Account Payable", map[string]any{"site": "JKT"}},
		{"project_site", "PRJ-HAULING", "Hauling Optimization Project", map[string]any{"site": "JKT"}},
		{"bank_account", "BCA-OPER", "BCA Operating Account", map[string]any{"currency": "IDR"}},
		{"tax_term_payment", "PPN11-N30", "PPN 11% Net 30", map[string]any{"tax": "PPN", "term": "Net 30"}},
		{"other_master_data", "CUR-IDR", "Indonesian Rupiah", map[string]any{"symbol": "Rp"}},
	}
	for _, master := range masters {
		if _, err := db.ExecContext(ctx, `INSERT INTO master_records (type, code, name, metadata)
			VALUES (?, ?, ?, CAST(? AS JSON))
			ON DUPLICATE KEY UPDATE name=VALUES(name), metadata=VALUES(metadata)`, master.typ, master.code, master.name, mustJSON(master.metadata)); err != nil {
			return err
		}
	}

	for month := 1; month <= 12; month++ {
		if _, err := db.ExecContext(ctx, `INSERT INTO budgets (fiscal_year, period_month, company_id, account_id, amount, utilized, reserved, status)
			SELECT 2026, ?, c.id, a.id, 250000000.00, 64000000.00, 18000000.00, 'Published'
			FROM companies c JOIN chart_accounts a ON a.code='5000'
			WHERE c.code='FIN' AND NOT EXISTS (
				SELECT 1 FROM budgets b WHERE b.fiscal_year=2026 AND b.period_month=? AND b.company_id=c.id AND b.account_id=a.id
			)`, month, month); err != nil {
			return fmt.Errorf("seed budget month %d: %w", month, err)
		}
	}

	workflowRoles := mustJSON([]string{"Supervisor", "Department Head", "Finance / Budget Controller", "Finance Manager", "Director / GM"})
	for _, trxType := range []string{"Purchase Request", "Expense Request", "Cash Advance", "Reimbursement", "Payment Request"} {
		if _, err := db.ExecContext(ctx, `INSERT IGNORE INTO workflow_templates (transaction_type, min_amount, max_amount, company_scope, roles)
			VALUES (?, 0, NULL, '*', CAST(? AS JSON))`, trxType, workflowRoles); err != nil {
			return err
		}
	}

	ops := []struct {
		flow, step, ref, partner, status, accounting string
		amount                                       float64
	}{
		{"purchase_to_pay_ap", "Vendor Invoice", "AP-INV-2026-0001", "PT Hauling Services Indonesia", "Approved", "Pending Journal", 185000000},
		{"order_to_cash_ar", "Customer Invoice", "AR-INV-2026-0001", "PT Mineral Buyer Nusantara", "In Process", "Journal Generated", 420000000},
		{"cash_bank_management", "Bank Transfer", "BNK-TRF-2026-0001", "BCA Operating Account", "Paid / Received", "Posted to GL", 95000000},
		{"asset_management", "Asset Registration", "AST-REG-2026-0001", "Fleet Loader Unit", "Approved", "Journal Generated", 780000000},
		{"tax_management", "Withholding & Tax Invoice", "TAX-PPH23-2026-0001", "PT Hauling Services Indonesia", "Submitted", "Pending Journal", 3700000},
	}
	for _, item := range ops {
		if _, err := db.ExecContext(ctx, `INSERT IGNORE INTO operational_transactions (flow, step, reference_number, partner_name, amount, status, accounting_state)
			VALUES (?, ?, ?, ?, ?, ?, ?)`, item.flow, item.step, item.ref, item.partner, item.amount, item.status, item.accounting); err != nil {
			return err
		}
	}

	for _, item := range []struct {
		typ, period, status string
		matched, unmatched  int
	}{
		{"Bank Reconciliation", "2026-07", "In Process", 184, 6},
		{"Vendor Reconciliation", "2026-07", "Draft", 91, 11},
		{"Customer Reconciliation", "2026-07", "In Process", 72, 4},
		{"Tax Reconciliation", "2026-07", "Draft", 38, 3},
		{"Intercompany Reconciliation", "2026-07", "Draft", 17, 2},
	} {
		if _, err := db.ExecContext(ctx, `INSERT INTO reconciliation_jobs (type, period, matched_count, unmatched_count, status)
			VALUES (?, ?, ?, ?, ?)
			ON DUPLICATE KEY UPDATE matched_count=VALUES(matched_count), unmatched_count=VALUES(unmatched_count), status=VALUES(status)`, item.typ, item.period, item.matched, item.unmatched, item.status); err != nil {
			return err
		}
	}

	if _, err := db.ExecContext(ctx, `INSERT IGNORE INTO period_closings (period, step, progress, status)
		VALUES ('2026-07', 'Review Trial Balance', 62, 'In Process')`); err != nil {
		return err
	}

	reports := []struct {
		code, name, category, description string
	}{
		{"financial_statement", "Financial Statement (PL, BS, CF)", "Financial Reporting", "Laporan utama keuangan perusahaan."},
		{"ap_ar_aging", "AP & AR Aging", "Financial Reporting", "Aging utang dan piutang."},
		{"cash_flow", "Cash Flow Report", "Financial Reporting", "Arus kas masuk dan keluar."},
		{"budget_actual", "Budget vs Actual Report", "Financial Reporting", "Monitoring realisasi terhadap budget."},
		{"tax_report", "Tax Report", "Financial Reporting", "Laporan pajak dan rekonsiliasi."},
		{"project_profitability", "Project Profitability Report", "Financial Reporting", "Profitabilitas per project/site."},
	}
	for _, report := range reports {
		if _, err := db.ExecContext(ctx, `INSERT INTO report_catalog (code, name, category, exports, filters, description)
			VALUES (?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), ?)
			ON DUPLICATE KEY UPDATE name=VALUES(name), category=VALUES(category), exports=VALUES(exports), filters=VALUES(filters), description=VALUES(description)`,
			report.code, report.name, report.category, mustJSON([]string{"Excel", "PDF", "Print"}), mustJSON([]string{"date", "company", "site", "department", "project", "cost_center"}), report.description); err != nil {
			return err
		}
	}

	for _, indicator := range []struct {
		code, label, unit, status string
		value                     float64
	}{
		{"cash_position", "Cash Position", "IDR", "good", 9185000000},
		{"revenue_target", "Revenue vs Target", "%", "good", 94.6},
		{"expense_budget", "Expense vs Budget", "%", "warning", 83.2},
		{"ar_overdue", "AR Overdue", "IDR", "warning", 318000000},
		{"ap_overdue", "AP Overdue", "IDR", "critical", 146000000},
		{"net_profit", "Net Profit", "IDR", "good", 1390000000},
		{"key_ratio", "Key Ratio", "score", "good", 1.84},
	} {
		if _, err := db.ExecContext(ctx, `INSERT INTO management_indicators (code, label, value, unit, status)
			VALUES (?, ?, ?, ?, ?)
			ON DUPLICATE KEY UPDATE label=VALUES(label), value=VALUES(value), unit=VALUES(unit), status=VALUES(status)`, indicator.code, indicator.label, indicator.value, indicator.unit, indicator.status); err != nil {
			return err
		}
	}

	return nil
}

func mustJSON(value any) string {
	data, err := json.Marshal(value)
	if err != nil {
		return "null"
	}
	return string(data)
}
