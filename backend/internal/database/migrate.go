package database

import (
	"context"
	"database/sql"
)

var statements = []string{
	`CREATE TABLE IF NOT EXISTS roles (
		id BIGINT PRIMARY KEY AUTO_INCREMENT,
		name VARCHAR(80) NOT NULL UNIQUE,
		description VARCHAR(255) NOT NULL,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
	)`,
	`CREATE TABLE IF NOT EXISTS permissions (
		id BIGINT PRIMARY KEY AUTO_INCREMENT,
		module VARCHAR(80) NOT NULL,
		action VARCHAR(80) NOT NULL,
		description VARCHAR(255) NOT NULL,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		UNIQUE KEY uniq_permission (module, action)
	)`,
	`CREATE TABLE IF NOT EXISTS role_permissions (
		role_id BIGINT NOT NULL,
		permission_id BIGINT NOT NULL,
		PRIMARY KEY (role_id, permission_id),
		CONSTRAINT fk_role_permission_role FOREIGN KEY (role_id) REFERENCES roles(id),
		CONSTRAINT fk_role_permission_permission FOREIGN KEY (permission_id) REFERENCES permissions(id)
	)`,
	`CREATE TABLE IF NOT EXISTS users (
		id BIGINT PRIMARY KEY AUTO_INCREMENT,
		role_id BIGINT NOT NULL,
		name VARCHAR(120) NOT NULL,
		email VARCHAR(180) NOT NULL UNIQUE,
		password_hash VARCHAR(255) NOT NULL,
		status ENUM('active','inactive','locked') NOT NULL DEFAULT 'active',
		failed_logins INT NOT NULL DEFAULT 0,
		two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
		last_login_at TIMESTAMP NULL,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
	)`,
	`CREATE TABLE IF NOT EXISTS login_history (
		id BIGINT PRIMARY KEY AUTO_INCREMENT,
		user_id BIGINT NULL,
		email VARCHAR(180) NOT NULL,
		ip_address VARCHAR(80) NOT NULL,
		device VARCHAR(255) NOT NULL,
		success BOOLEAN NOT NULL,
		reason VARCHAR(255) NOT NULL,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
	)`,
	`CREATE TABLE IF NOT EXISTS audit_logs (
		id BIGINT PRIMARY KEY AUTO_INCREMENT,
		user_id BIGINT NULL,
		module VARCHAR(80) NOT NULL,
		action VARCHAR(80) NOT NULL,
		reference_type VARCHAR(80) NOT NULL,
		reference_id VARCHAR(80) NOT NULL,
		before_data JSON NULL,
		after_data JSON NULL,
		ip_address VARCHAR(80) NOT NULL,
		device VARCHAR(255) NOT NULL,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
	)`,
	`CREATE TABLE IF NOT EXISTS companies (
		id BIGINT PRIMARY KEY AUTO_INCREMENT,
		code VARCHAR(30) NOT NULL UNIQUE,
		name VARCHAR(160) NOT NULL,
		status ENUM('active','inactive') NOT NULL DEFAULT 'active'
	)`,
	`CREATE TABLE IF NOT EXISTS number_ranges (
		id BIGINT PRIMARY KEY AUTO_INCREMENT,
		object_code VARCHAR(80) NOT NULL,
		object_type VARCHAR(80) NOT NULL DEFAULT '*',
		prefix VARCHAR(30) NOT NULL,
		next_number BIGINT NOT NULL DEFAULT 1,
		padding INT NOT NULL DEFAULT 5,
		fiscal_year INT NULL,
		status ENUM('active','inactive') NOT NULL DEFAULT 'active',
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		UNIQUE KEY uniq_number_range (object_code, object_type, fiscal_year)
	)`,
	`CREATE TABLE IF NOT EXISTS finance_flow_stages (
		id BIGINT PRIMARY KEY AUTO_INCREMENT,
		stage_order INT NOT NULL UNIQUE,
		code VARCHAR(80) NOT NULL UNIQUE,
		name VARCHAR(120) NOT NULL,
		description VARCHAR(255) NOT NULL,
		modules JSON NOT NULL,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
	)`,
	`CREATE TABLE IF NOT EXISTS master_records (
		id BIGINT PRIMARY KEY AUTO_INCREMENT,
		type ENUM('chart_of_accounts','vendor','customer','employee','cost_center_department','project_site','bank_account','tax_term_payment','other_master_data') NOT NULL,
		code VARCHAR(80) NOT NULL,
		name VARCHAR(180) NOT NULL,
		status ENUM('active','inactive') NOT NULL DEFAULT 'active',
		metadata JSON NULL,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		UNIQUE KEY uniq_master_record (type, code)
	)`,
	`CREATE TABLE IF NOT EXISTS org_units (
		id BIGINT PRIMARY KEY AUTO_INCREMENT,
		company_id BIGINT NOT NULL,
		type ENUM('business_unit','branch','site','department','division','cost_center','profit_center','project') NOT NULL,
		code VARCHAR(50) NOT NULL,
		name VARCHAR(160) NOT NULL,
		parent_id BIGINT NULL,
		status ENUM('active','inactive') NOT NULL DEFAULT 'active',
		UNIQUE KEY uniq_org_unit (company_id,type,code),
		CONSTRAINT fk_org_company FOREIGN KEY (company_id) REFERENCES companies(id)
	)`,
	`CREATE TABLE IF NOT EXISTS chart_accounts (
		id BIGINT PRIMARY KEY AUTO_INCREMENT,
		code VARCHAR(40) NOT NULL UNIQUE,
		name VARCHAR(160) NOT NULL,
		account_type ENUM('asset','liability','equity','revenue','expense') NOT NULL,
		parent_id BIGINT NULL,
		normal_balance ENUM('debit','credit') NOT NULL,
		report_mapping VARCHAR(80) NOT NULL,
		status ENUM('active','inactive') NOT NULL DEFAULT 'active'
	)`,
	`CREATE TABLE IF NOT EXISTS budgets (
		id BIGINT PRIMARY KEY AUTO_INCREMENT,
		fiscal_year INT NOT NULL,
		period_month INT NOT NULL,
		company_id BIGINT NOT NULL,
		department_id BIGINT NULL,
		project_id BIGINT NULL,
		cost_center_id BIGINT NULL,
		account_id BIGINT NOT NULL,
		amount DECIMAL(18,2) NOT NULL,
		utilized DECIMAL(18,2) NOT NULL DEFAULT 0,
		reserved DECIMAL(18,2) NOT NULL DEFAULT 0,
		status ENUM('Draft','Submitted','Waiting Approval','Approved','Published','Locked','Revised','Rejected','Cancelled') NOT NULL DEFAULT 'Draft',
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		CONSTRAINT fk_budget_company FOREIGN KEY (company_id) REFERENCES companies(id),
		CONSTRAINT fk_budget_account FOREIGN KEY (account_id) REFERENCES chart_accounts(id)
	)`,
	`CREATE TABLE IF NOT EXISTS budget_events (
		id BIGINT PRIMARY KEY AUTO_INCREMENT,
		budget_id BIGINT NOT NULL,
		event_type ENUM('Create','Submit','Approve','Publish','Lock','Control','Utilize','Reserve','Release','Reject','Revise') NOT NULL,
		amount DECIMAL(18,2) NOT NULL DEFAULT 0,
		note VARCHAR(255) NOT NULL,
		created_by BIGINT NULL,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		CONSTRAINT fk_budget_event_budget FOREIGN KEY (budget_id) REFERENCES budgets(id)
	)`,
	`CREATE TABLE IF NOT EXISTS transaction_requests (
		id BIGINT PRIMARY KEY AUTO_INCREMENT,
		number VARCHAR(40) NOT NULL UNIQUE,
		type ENUM('Purchase Request','Expense Request','Cash Advance','Reimbursement','Payment Request') NOT NULL,
		requester_id BIGINT NOT NULL,
		company_id BIGINT NOT NULL,
		department_id BIGINT NULL,
		project_id BIGINT NULL,
		cost_center_id BIGINT NULL,
		account_id BIGINT NULL,
		description TEXT NOT NULL,
		amount DECIMAL(18,2) NOT NULL,
		status ENUM('Draft','Submitted','Waiting Approval','Partially Approved','Approved','In Process','Partially Paid','Paid','Received','Posted','Closed','Overdue','On Hold','Revision Required','Rejected','Cancelled') NOT NULL DEFAULT 'Draft',
		budget_status ENUM('Not Checked','Available','Warning','Blocked') NOT NULL DEFAULT 'Not Checked',
		needed_at DATE NULL,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		CONSTRAINT fk_trx_user FOREIGN KEY (requester_id) REFERENCES users(id),
		CONSTRAINT fk_trx_company FOREIGN KEY (company_id) REFERENCES companies(id)
	)`,
	`CREATE TABLE IF NOT EXISTS approval_steps (
		id BIGINT PRIMARY KEY AUTO_INCREMENT,
		transaction_id BIGINT NOT NULL,
		step_order INT NOT NULL,
		approver_role VARCHAR(80) NOT NULL,
		approver_id BIGINT NULL,
		status ENUM('Waiting Approval','Approved','Rejected','Revision Required','On Hold','Delegated') NOT NULL DEFAULT 'Waiting Approval',
		note TEXT NULL,
		acted_at TIMESTAMP NULL,
		CONSTRAINT fk_approval_trx FOREIGN KEY (transaction_id) REFERENCES transaction_requests(id)
	)`,
	`CREATE TABLE IF NOT EXISTS workflow_templates (
		id BIGINT PRIMARY KEY AUTO_INCREMENT,
		transaction_type VARCHAR(80) NOT NULL,
		min_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
		max_amount DECIMAL(18,2) NULL,
		company_scope VARCHAR(80) NOT NULL DEFAULT '*',
		roles JSON NOT NULL,
		status ENUM('active','inactive') NOT NULL DEFAULT 'active',
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		UNIQUE KEY uniq_workflow_template (transaction_type, min_amount, company_scope)
	)`,
	`CREATE TABLE IF NOT EXISTS operational_transactions (
		id BIGINT PRIMARY KEY AUTO_INCREMENT,
		flow ENUM('purchase_to_pay_ap','order_to_cash_ar','cash_bank_management','asset_management','tax_management') NOT NULL,
		step VARCHAR(120) NOT NULL,
		reference_number VARCHAR(80) NOT NULL UNIQUE,
		partner_name VARCHAR(180) NOT NULL,
		amount DECIMAL(18,2) NOT NULL,
		status ENUM('Draft','Submitted','Waiting Approval','Approved','In Process','Paid / Received','Posted','Closed','Rejected / Cancelled') NOT NULL DEFAULT 'Draft',
		accounting_state ENUM('Pending Journal','Journal Generated','Journal Approved','Posted to GL') NOT NULL DEFAULT 'Pending Journal',
		created_by BIGINT NULL,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
	)`,
	`CREATE TABLE IF NOT EXISTS accounting_runs (
		id BIGINT PRIMARY KEY AUTO_INCREMENT,
		run_number VARCHAR(80) NOT NULL UNIQUE,
		source_module VARCHAR(80) NOT NULL,
		source_reference VARCHAR(80) NOT NULL,
		journal_number VARCHAR(80) NOT NULL,
		status ENUM('Automatic Journal Generation','Journal Review & Approval','Posting to General Ledger','Update Subsidiary','Update Budget vs Actual','Completed','Rejected') NOT NULL DEFAULT 'Automatic Journal Generation',
		created_by BIGINT NULL,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
	)`,
	`CREATE TABLE IF NOT EXISTS reconciliation_jobs (
		id BIGINT PRIMARY KEY AUTO_INCREMENT,
		type ENUM('Bank Reconciliation','Vendor Reconciliation','Customer Reconciliation','Tax Reconciliation','Intercompany Reconciliation') NOT NULL,
		period VARCHAR(20) NOT NULL,
		matched_count INT NOT NULL DEFAULT 0,
		unmatched_count INT NOT NULL DEFAULT 0,
		status ENUM('Draft','In Process','Closed','Rejected / Cancelled') NOT NULL DEFAULT 'Draft',
		created_by BIGINT NULL,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		UNIQUE KEY uniq_reconciliation_job (type, period)
	)`,
	`CREATE TABLE IF NOT EXISTS period_closings (
		id BIGINT PRIMARY KEY AUTO_INCREMENT,
		period VARCHAR(20) NOT NULL UNIQUE,
		step ENUM('Accrual & Adjustment Journal','Depreciation Posting','Review Trial Balance','Financial Review & Approval','Close Period Lock') NOT NULL DEFAULT 'Accrual & Adjustment Journal',
		progress INT NOT NULL DEFAULT 0,
		status ENUM('Draft','In Process','Waiting Approval','Closed','Rejected / Cancelled') NOT NULL DEFAULT 'Draft',
		locked_at TIMESTAMP NULL,
		created_by BIGINT NULL,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
	)`,
	`CREATE TABLE IF NOT EXISTS report_catalog (
		id BIGINT PRIMARY KEY AUTO_INCREMENT,
		code VARCHAR(80) NOT NULL UNIQUE,
		name VARCHAR(140) NOT NULL,
		category ENUM('Financial Reporting','Management Dashboard') NOT NULL,
		exports JSON NOT NULL,
		filters JSON NOT NULL,
		description VARCHAR(255) NOT NULL,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
	)`,
	`CREATE TABLE IF NOT EXISTS management_indicators (
		id BIGINT PRIMARY KEY AUTO_INCREMENT,
		code VARCHAR(80) NOT NULL UNIQUE,
		label VARCHAR(140) NOT NULL,
		value DECIMAL(18,2) NOT NULL,
		unit VARCHAR(20) NOT NULL,
		status ENUM('good','warning','critical','neutral') NOT NULL DEFAULT 'neutral',
		updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
	)`,
	`CREATE TABLE IF NOT EXISTS documents (
		id BIGINT PRIMARY KEY AUTO_INCREMENT,
		module VARCHAR(80) NOT NULL,
		reference_id BIGINT NOT NULL,
		category VARCHAR(80) NOT NULL,
		file_name VARCHAR(255) NOT NULL,
		stored_name VARCHAR(255) NOT NULL,
		content_type VARCHAR(120) NOT NULL,
		size_bytes BIGINT NOT NULL,
		version_no INT NOT NULL DEFAULT 1,
		uploaded_by BIGINT NULL,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
	)`,
	`CREATE TABLE IF NOT EXISTS journals (
		id BIGINT PRIMARY KEY AUTO_INCREMENT,
		journal_number VARCHAR(40) NOT NULL UNIQUE,
		journal_date DATE NOT NULL,
		reference_number VARCHAR(80) NOT NULL,
		description TEXT NOT NULL,
		posting_status ENUM('Draft','Waiting Approval','Approved','Posted','Unposted','Rejected') NOT NULL DEFAULT 'Draft',
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
	)`,
}

func Migrate(ctx context.Context, db *sql.DB) error {
	for _, stmt := range statements {
		if _, err := db.ExecContext(ctx, stmt); err != nil {
			return err
		}
	}
	return nil
}
