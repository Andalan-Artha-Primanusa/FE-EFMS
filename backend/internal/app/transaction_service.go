package app

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
)

func (s *Service) Transactions(ctx context.Context, status string) ([]Transaction, error) {
	query := `SELECT t.id, t.number, t.type, u.name, c.name, t.description, t.amount, t.status, t.budget_status, t.created_at
		FROM transaction_requests t JOIN users u ON u.id=t.requester_id JOIN companies c ON c.id=t.company_id`
	args := []any{}
	if status != "" {
		query += ` WHERE t.status=?`
		args = append(args, status)
	}
	query += ` ORDER BY t.created_at DESC LIMIT 50`
	rows, err := s.sql.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Transaction
	for rows.Next() {
		var item Transaction
		if err := rows.Scan(&item.ID, &item.Number, &item.Type, &item.Requester, &item.Company, &item.Description, &item.Amount, &item.Status, &item.BudgetStatus, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Service) CreateTransaction(ctx context.Context, actor User, input TransactionInput, ip, device string) (Transaction, error) {
	if input.Type == "" || input.Description == "" || input.Amount <= 0 {
		return Transaction{}, errors.New("type, description, dan amount wajib diisi")
	}
	if !s.HasPermission(ctx, actor.Role, "transaction_request", "submit") && actor.Role != "Super Admin" {
		return Transaction{}, errors.New("role tidak memiliki akses submit transaction request")
	}
	number, err := s.NextNumber(ctx, "transaction_requests", "*")
	if err != nil {
		return Transaction{}, err
	}
	budgetStatus := "Available"
	status := "Waiting Approval"
	if input.Amount > 250000000 {
		budgetStatus = "Warning"
	}
	res, err := s.sql.ExecContext(ctx, `INSERT INTO transaction_requests (number, type, requester_id, company_id, description, amount, status, budget_status)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, number, input.Type, actor.ID, input.CompanyID, input.Description, input.Amount, status, budgetStatus)
	if err != nil {
		return Transaction{}, err
	}
	id, _ := res.LastInsertId()
	steps := []string{"Department Head", "Budget Controller", "Finance Manager", "General Manager", "Director"}
	for order, role := range steps {
		_, _ = s.sql.ExecContext(ctx, `INSERT INTO approval_steps (transaction_id, step_order, approver_role) VALUES (?, ?, ?)`, id, order+1, role)
	}
	s.Audit(ctx, actor.ID, "Transaction Request", "Create", "transaction_requests", fmt.Sprint(id), nil, input, ip, device)
	items, err := s.Transactions(ctx, "")
	if err != nil {
		return Transaction{}, err
	}
	for _, item := range items {
		if item.ID == id {
			return item, nil
		}
	}
	return Transaction{}, sql.ErrNoRows
}

func (s *Service) UpdateTransaction(ctx context.Context, actor User, id int64, input TransactionInput, ip, device string) (Transaction, error) {
	if input.Type == "" || input.Description == "" || input.Amount <= 0 {
		return Transaction{}, errors.New("type, description, dan amount wajib diisi")
	}
	if !s.HasPermission(ctx, actor.Role, "transaction_request", "submit") && actor.Role != "Super Admin" {
		return Transaction{}, errors.New("role tidak memiliki akses update transaction request")
	}
	var currentStatus string
	if err := s.sql.QueryRowContext(ctx, `SELECT status FROM transaction_requests WHERE id=?`, id).Scan(&currentStatus); err != nil {
		return Transaction{}, err
	}
	if currentStatus == "Posted" || currentStatus == "Closed" || currentStatus == "Paid" || currentStatus == "Received" {
		return Transaction{}, errors.New("transaksi yang sudah final tidak dapat diupdate")
	}
	budgetStatus := "Available"
	if input.Amount > 250000000 {
		budgetStatus = "Warning"
	}
	_, err := s.sql.ExecContext(ctx, `UPDATE transaction_requests
		SET type=?, company_id=?, description=?, amount=?, budget_status=?, status='Waiting Approval'
		WHERE id=?`, input.Type, input.CompanyID, input.Description, input.Amount, budgetStatus, id)
	if err != nil {
		return Transaction{}, err
	}
	s.Audit(ctx, actor.ID, "Transaction Request", "Update", "transaction_requests", fmt.Sprint(id), nil, input, ip, device)
	return s.TransactionByID(ctx, id)
}

func (s *Service) CancelTransaction(ctx context.Context, actor User, id int64, ip, device string) error {
	if !s.HasPermission(ctx, actor.Role, "transaction_request", "submit") && actor.Role != "Super Admin" {
		return errors.New("role tidak memiliki akses cancel transaction request")
	}
	var currentStatus string
	if err := s.sql.QueryRowContext(ctx, `SELECT status FROM transaction_requests WHERE id=?`, id).Scan(&currentStatus); err != nil {
		return err
	}
	if currentStatus == "Posted" || currentStatus == "Closed" || currentStatus == "Paid" || currentStatus == "Received" {
		return errors.New("transaksi yang sudah final tidak dapat dicancel")
	}
	if _, err := s.sql.ExecContext(ctx, `UPDATE transaction_requests SET status='Cancelled' WHERE id=?`, id); err != nil {
		return err
	}
	s.Audit(ctx, actor.ID, "Transaction Request", "Cancel", "transaction_requests", fmt.Sprint(id), nil, map[string]any{"status": "Cancelled"}, ip, device)
	return nil
}

func (s *Service) TransactionByID(ctx context.Context, id int64) (Transaction, error) {
	var item Transaction
	err := s.sql.QueryRowContext(ctx, `SELECT t.id, t.number, t.type, u.name, c.name, t.description, t.amount, t.status, t.budget_status, t.created_at
		FROM transaction_requests t JOIN users u ON u.id=t.requester_id JOIN companies c ON c.id=t.company_id WHERE t.id=?`, id).
		Scan(&item.ID, &item.Number, &item.Type, &item.Requester, &item.Company, &item.Description, &item.Amount, &item.Status, &item.BudgetStatus, &item.CreatedAt)
	return item, err
}

func (s *Service) Approve(ctx context.Context, actor User, id int64, action ApprovalAction, ip, device string) error {
	if !s.HasPermission(ctx, actor.Role, "approval", "act") && actor.Role != "Super Admin" {
		return errors.New("role tidak memiliki akses approval")
	}
	statusMap := map[string]string{"approve": "Approved", "reject": "Rejected", "revision": "Revision Required", "hold": "On Hold"}
	nextStatus, ok := statusMap[action.Action]
	if !ok {
		return errors.New("approval action tidak valid")
	}
	_, err := s.sql.ExecContext(ctx, `UPDATE transaction_requests SET status=? WHERE id=?`, nextStatus, id)
	if err != nil {
		return err
	}
	_, _ = s.sql.ExecContext(ctx, `UPDATE approval_steps SET status=?, approver_id=?, note=?, acted_at=NOW() WHERE transaction_id=? AND status='Waiting Approval' ORDER BY step_order LIMIT 1`, nextStatus, actor.ID, action.Note, id)
	s.Audit(ctx, actor.ID, "Approval Center", action.Action, "transaction_requests", fmt.Sprint(id), nil, action, ip, device)
	return nil
}
