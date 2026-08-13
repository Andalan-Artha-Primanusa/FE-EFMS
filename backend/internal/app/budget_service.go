package app

import (
	"context"
	"database/sql"
	"errors"
)

func (s *Service) ValidateBudget(ctx context.Context, input BudgetValidationInput) (BudgetValidationResult, error) {
	var result BudgetValidationResult
	err := s.sql.QueryRowContext(ctx, `SELECT amount, utilized, reserved FROM budgets
		WHERE company_id=? AND account_id=? AND status IN ('Published','Locked')
		ORDER BY fiscal_year DESC, period_month DESC LIMIT 1`, input.CompanyID, input.AccountID).
		Scan(&result.BudgetAmount, &result.Utilized, &result.Reserved)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return BudgetValidationResult{Status: "Blocked", Message: "Budget belum tersedia atau belum published."}, nil
		}
		return result, err
	}
	result.AvailableAmount = result.BudgetAmount - result.Utilized - result.Reserved
	switch {
	case input.Amount > result.AvailableAmount:
		result.Status = "Blocked"
		result.Message = "Tidak cukup budget, transaksi harus dikembalikan untuk revisi atau revisi budget."
	case input.Amount > result.AvailableAmount*0.8:
		result.Status = "Warning"
		result.Message = "Budget tersedia, tetapi sudah mendekati batas."
	default:
		result.Status = "Available"
		result.Message = "Budget cukup."
	}
	return result, nil
}
