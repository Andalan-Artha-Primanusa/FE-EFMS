package app

import "context"

func (s *Service) Audit(ctx context.Context, userID int64, module, action, refType, refID string, before, after any, ip, device string) {
	if s == nil || s.sql == nil {
		return
	}
	_, _ = s.sql.ExecContext(ctx, `INSERT INTO audit_logs (user_id, module, action, reference_type, reference_id, before_data, after_data, ip_address, device)
		VALUES (?, ?, ?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), ?, ?)`, userID, module, action, refType, refID, jsonOrNull(before), jsonOrNull(after), ip, device)
}

func (s *Service) AuditLogs(ctx context.Context) ([]AuditLog, error) {
	if s == nil || s.sql == nil {
		return []AuditLog{}, nil
	}
	rows, err := s.sql.QueryContext(ctx, `SELECT a.id, COALESCE(u.name,'System'), a.module, a.action, a.reference_type, a.reference_id, a.ip_address, a.device, a.created_at
		FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.created_at DESC LIMIT 80`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var logs []AuditLog
	for rows.Next() {
		var log AuditLog
		if err := rows.Scan(&log.ID, &log.User, &log.Module, &log.Action, &log.ReferenceType, &log.ReferenceID, &log.IPAddress, &log.Device, &log.CreatedAt); err != nil {
			return nil, err
		}
		logs = append(logs, log)
	}
	return logs, rows.Err()
}

func (s *Service) recordLogin(ctx context.Context, userID *int64, email, ip, device string, success bool, reason string) {
	if s == nil || s.sql == nil {
		return
	}
	_, _ = s.sql.ExecContext(ctx, `INSERT INTO login_history (user_id, email, ip_address, device, success, reason) VALUES (?, ?, ?, ?, ?, ?)`, userID, email, ip, device, success, reason)
}
