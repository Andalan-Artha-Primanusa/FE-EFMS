package app

import (
	"context"
	"errors"
)

func (s *Service) GenerateJournal(ctx context.Context, actor User, sourceModule, sourceReference, ip, device string) (AccountingRun, error) {
	if !s.HasPermission(ctx, actor.Role, "accounting", "generate") && actor.Role != "Super Admin" {
		return AccountingRun{}, errors.New("role tidak memiliki akses generate journal")
	}
	runNumber, err := s.NextNumber(ctx, "accounting_runs", "*")
	if err != nil {
		return AccountingRun{}, err
	}
	journalNumber, err := s.NextNumber(ctx, "journals", "*")
	if err != nil {
		return AccountingRun{}, err
	}
	if s.sql != nil {
		_, err = s.sql.ExecContext(ctx, `INSERT INTO accounting_runs (run_number, source_module, source_reference, journal_number, created_by)
			VALUES (?, ?, ?, ?, ?)`, runNumber, sourceModule, sourceReference, journalNumber, actor.ID)
		if err != nil {
			return AccountingRun{}, err
		}
		_, _ = s.sql.ExecContext(ctx, `UPDATE operational_transactions SET accounting_state='Journal Generated' WHERE reference_number=?`, sourceReference)
		_, _ = s.sql.ExecContext(ctx, `INSERT IGNORE INTO journals (journal_number, journal_date, reference_number, description, posting_status)
			VALUES (?, CURDATE(), ?, ?, 'Waiting Approval')`, journalNumber, sourceReference, "Automatic journal from "+sourceModule)
	}
	s.Audit(ctx, actor.ID, "Accounting Engine", "Automatic Journal Generation", sourceModule, sourceReference, nil, map[string]any{"runNumber": runNumber, "journalNumber": journalNumber}, ip, device)
	return s.AccountingRunByNumber(ctx, runNumber)
}

func (s *Service) AccountingRunByNumber(ctx context.Context, runNumber string) (AccountingRun, error) {
	if s == nil || s.sql == nil {
		return AccountingRun{
			RunNumber:     runNumber,
			JournalNumber: "JRN-" + runNumber,
			Status:        "Automatic Journal Generation",
		}, nil
	}
	var item AccountingRun
	err := s.sql.QueryRowContext(ctx, `SELECT id, run_number, source_module, source_reference, journal_number, status, created_at FROM accounting_runs WHERE run_number=?`, runNumber).
		Scan(&item.ID, &item.RunNumber, &item.SourceModule, &item.SourceReference, &item.JournalNumber, &item.Status, &item.CreatedAt)
	return item, err
}

func (s *Service) AccountingRuns(ctx context.Context) ([]AccountingRun, error) {
	rows, err := s.sql.QueryContext(ctx, `SELECT id, run_number, source_module, source_reference, journal_number, status, created_at FROM accounting_runs ORDER BY created_at DESC LIMIT 100`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []AccountingRun
	for rows.Next() {
		var item AccountingRun
		if err := rows.Scan(&item.ID, &item.RunNumber, &item.SourceModule, &item.SourceReference, &item.JournalNumber, &item.Status, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}
