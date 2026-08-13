package app

import (
	"context"
	"database/sql"
	"errors"
)

func (s *Service) Reconciliations(ctx context.Context) ([]ReconciliationJob, error) {
	rows, err := s.sql.QueryContext(ctx, `SELECT id, type, period, matched_count, unmatched_count, status, created_at FROM reconciliation_jobs ORDER BY period DESC, type`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []ReconciliationJob
	for rows.Next() {
		var item ReconciliationJob
		if err := rows.Scan(&item.ID, &item.Type, &item.Period, &item.MatchedCount, &item.UnmatchedCount, &item.Status, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Service) CreateReconciliation(ctx context.Context, actor User, typ, period, ip, device string) (ReconciliationJob, error) {
	if !s.HasPermission(ctx, actor.Role, "reconciliation", "run") && actor.Role != "Super Admin" {
		return ReconciliationJob{}, errors.New("role tidak memiliki akses reconciliation")
	}
	_, err := s.sql.ExecContext(ctx, `INSERT INTO reconciliation_jobs (type, period, status, created_by)
		VALUES (?, ?, 'In Process', ?)
		ON DUPLICATE KEY UPDATE status='In Process'`, typ, period, actor.ID)
	if err != nil {
		return ReconciliationJob{}, err
	}
	s.Audit(ctx, actor.ID, "Reconciliation", "Run", typ, period, nil, map[string]any{"status": "In Process"}, ip, device)
	items, err := s.Reconciliations(ctx)
	if err != nil {
		return ReconciliationJob{}, err
	}
	for _, item := range items {
		if item.Type == typ && item.Period == period {
			return item, nil
		}
	}
	return ReconciliationJob{}, sql.ErrNoRows
}
