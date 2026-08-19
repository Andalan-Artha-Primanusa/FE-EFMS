package app

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

func (s *Service) PreviewNumber(ctx context.Context, objectCode, objectType string) (string, error) {
	prefix, next, padding, err := s.numberRange(ctx, objectCode, objectType)
	if err != nil {
		return "", err
	}
	return formatNumber(prefix, next, padding), nil
}

func (s *Service) NextNumber(ctx context.Context, objectCode, objectType string) (string, error) {
	if s == nil || s.sql == nil {
		prefix := "NR"
		if len(objectCode) >= 3 {
			prefix = objectCode[:3]
		}
		return fmt.Sprintf("%s-%d", prefix, time.Now().UnixNano()%100000), nil
	}
	tx, err := s.sql.BeginTx(ctx, &sql.TxOptions{})
	if err != nil {
		return "", err
	}
	defer tx.Rollback()
	prefix, next, padding, err := s.numberRangeTx(ctx, tx, objectCode, objectType)
	if err != nil {
		return "", err
	}
	if _, err := tx.ExecContext(ctx, `UPDATE number_ranges SET next_number=next_number+1 WHERE object_code=? AND object_type=? AND fiscal_year IS NULL`, objectCode, objectType); err != nil {
		return "", err
	}
	if err := tx.Commit(); err != nil {
		return "", err
	}
	return formatNumber(prefix, next, padding), nil
}

func (s *Service) numberRange(ctx context.Context, objectCode, objectType string) (string, int64, int, error) {
	var prefix string
	var next int64
	var padding int
	err := s.sql.QueryRowContext(ctx, `SELECT prefix, next_number, padding FROM number_ranges WHERE object_code=? AND object_type=? AND fiscal_year IS NULL AND status='active'`, objectCode, objectType).
		Scan(&prefix, &next, &padding)
	if err == sql.ErrNoRows && objectType != "*" {
		return s.numberRange(ctx, objectCode, "*")
	}
	return prefix, next, padding, err
}

func (s *Service) numberRangeTx(ctx context.Context, tx *sql.Tx, objectCode, objectType string) (string, int64, int, error) {
	var prefix string
	var next int64
	var padding int
	err := tx.QueryRowContext(ctx, `SELECT prefix, next_number, padding FROM number_ranges WHERE object_code=? AND object_type=? AND fiscal_year IS NULL AND status='active' FOR UPDATE`, objectCode, objectType).
		Scan(&prefix, &next, &padding)
	if err == sql.ErrNoRows && objectType != "*" {
		return s.numberRangeTx(ctx, tx, objectCode, "*")
	}
	return prefix, next, padding, err
}

func formatNumber(prefix string, next int64, padding int) string {
	return fmt.Sprintf("%s-%0*d", prefix, padding, next)
}
