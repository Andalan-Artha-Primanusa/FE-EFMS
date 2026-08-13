package app

import (
	"context"
	"database/sql"
	"errors"
)

func (s *Service) OperationalTransactions(ctx context.Context, flow string) ([]OperationalTransaction, error) {
	query := `SELECT id, flow, step, reference_number, partner_name, amount, status, accounting_state, created_at FROM operational_transactions`
	args := []any{}
	if flow != "" {
		query += ` WHERE flow=?`
		args = append(args, flow)
	}
	query += ` ORDER BY created_at DESC LIMIT 100`
	rows, err := s.sql.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []OperationalTransaction
	for rows.Next() {
		var item OperationalTransaction
		if err := rows.Scan(&item.ID, &item.Flow, &item.Step, &item.ReferenceNumber, &item.PartnerName, &item.Amount, &item.Status, &item.AccountingState, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Service) CreateOperationalTransaction(ctx context.Context, actor User, input OperationalInput, ip, device string) (OperationalTransaction, error) {
	if !s.HasPermission(ctx, actor.Role, "operational_transaction", "write") && actor.Role != "Super Admin" {
		return OperationalTransaction{}, errors.New("role tidak memiliki akses operational transaction")
	}
	if input.Flow == "" || input.Step == "" || input.Amount <= 0 {
		return OperationalTransaction{}, errors.New("flow, step, dan amount wajib diisi")
	}
	referenceNumber := input.ReferenceNumber
	if referenceNumber == "" {
		generated, err := s.NextNumber(ctx, "operational_transactions", input.Flow)
		if err != nil {
			return OperationalTransaction{}, err
		}
		referenceNumber = generated
	}
	_, err := s.sql.ExecContext(ctx, `INSERT INTO operational_transactions (flow, step, reference_number, partner_name, amount, status, created_by)
		VALUES (?, ?, ?, ?, ?, 'Submitted', ?)`, input.Flow, input.Step, referenceNumber, input.PartnerName, input.Amount, actor.ID)
	if err != nil {
		return OperationalTransaction{}, err
	}
	s.Audit(ctx, actor.ID, "Operational Transaction", "Create", input.Flow, referenceNumber, nil, input, ip, device)
	items, err := s.OperationalTransactions(ctx, input.Flow)
	if err != nil {
		return OperationalTransaction{}, err
	}
	for _, item := range items {
		if item.ReferenceNumber == referenceNumber {
			return item, nil
		}
	}
	return OperationalTransaction{}, sql.ErrNoRows
}
