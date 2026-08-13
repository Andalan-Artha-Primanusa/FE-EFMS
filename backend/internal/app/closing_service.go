package app

import (
	"context"
	"database/sql"
	"errors"
)

func (s *Service) ClosingPeriods(ctx context.Context) ([]ClosingPeriod, error) {
	rows, err := s.sql.QueryContext(ctx, `SELECT id, period, step, progress, status, locked_at, created_at FROM period_closings ORDER BY period DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []ClosingPeriod
	for rows.Next() {
		var item ClosingPeriod
		if err := rows.Scan(&item.ID, &item.Period, &item.Step, &item.Progress, &item.Status, &item.LockedAt, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Service) ClosePeriod(ctx context.Context, actor User, period, ip, device string) (ClosingPeriod, error) {
	if !s.HasPermission(ctx, actor.Role, "period_closing", "close") && actor.Role != "Super Admin" {
		return ClosingPeriod{}, errors.New("role tidak memiliki akses close period")
	}
	_, err := s.sql.ExecContext(ctx, `INSERT INTO period_closings (period, step, progress, status, locked_at, created_by)
		VALUES (?, 'Close Period Lock', 100, 'Closed', NOW(), ?)
		ON DUPLICATE KEY UPDATE step='Close Period Lock', progress=100, status='Closed', locked_at=NOW()`, period, actor.ID)
	if err != nil {
		return ClosingPeriod{}, err
	}
	s.Audit(ctx, actor.ID, "Period Closing", "Close Period Lock", "period", period, nil, map[string]any{"status": "Closed"}, ip, device)
	items, err := s.ClosingPeriods(ctx)
	if err != nil {
		return ClosingPeriod{}, err
	}
	for _, item := range items {
		if item.Period == period {
			return item, nil
		}
	}
	return ClosingPeriod{}, sql.ErrNoRows
}
