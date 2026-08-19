package app

import (
	"context"
	"errors"
	"fmt"
	"strings"
)

func (s *Service) FinanceFlow(ctx context.Context) ([]FlowStage, error) {
	rows, err := s.sql.QueryContext(ctx, `SELECT stage_order, code, name, description, JSON_UNQUOTE(modules) FROM finance_flow_stages ORDER BY stage_order`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var stages []FlowStage
	for rows.Next() {
		var stage FlowStage
		var modulesJSON string
		if err := rows.Scan(&stage.Order, &stage.Code, &stage.Name, &stage.Description, &modulesJSON); err != nil {
			return nil, err
		}
		_ = decodeJSONStringArray(modulesJSON, &stage.Modules)
		stages = append(stages, stage)
	}
	return stages, rows.Err()
}

func (s *Service) Roles(ctx context.Context) ([]RoleAccess, error) {
	rows, err := s.sql.QueryContext(ctx, `SELECT name FROM roles ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var access []RoleAccess
	for rows.Next() {
		var role string
		if err := rows.Scan(&role); err != nil {
			return nil, err
		}
		permissions, err := s.PermissionsForRole(ctx, role)
		if err != nil {
			return nil, err
		}
		access = append(access, RoleAccess{
			Role:        role,
			Permissions: permissions,
			Scopes:      []string{"company", "site", "department", "project"},
		})
	}
	return access, rows.Err()
}

func (s *Service) PermissionsForRole(ctx context.Context, role string) ([]Permission, error) {
	if s.sql == nil {
		var items []Permission
		grants, ok := rolePermissionMap[role]
		if !ok && IsSuperAdminRole(role) {
			grants = []string{"*:*"}
		}
		for _, grant := range grants {
			if grant == "*:*" {
				return permissions, nil
			}
			parts := strings.Split(grant, ":")
			if len(parts) == 2 {
				for _, p := range permissions {
					if p.Module == parts[0] && (parts[1] == "*" || p.Action == parts[1]) {
						items = append(items, p)
					}
				}
			}
		}
		return items, nil
	}
	rows, err := s.sql.QueryContext(ctx, `SELECT p.module, p.action, p.description
		FROM permissions p
		JOIN role_permissions rp ON rp.permission_id=p.id
		JOIN roles r ON r.id=rp.role_id
		WHERE r.name=?
		ORDER BY p.module, p.action`, role)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Permission
	for rows.Next() {
		var item Permission
		if err := rows.Scan(&item.Module, &item.Action, &item.Description); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Service) HasPermission(ctx context.Context, role, module, action string) bool {
	if IsSuperAdminRole(role) {
		return true
	}
	permissions, err := s.PermissionsForRole(ctx, role)
	if err != nil {
		return false
	}
	for _, permission := range permissions {
		if permission.Module == module && (permission.Action == action || permission.Action == "*") {
			return true
		}
	}
	return false
}

func (s *Service) MasterRecords(ctx context.Context, typ string) ([]MasterRecord, error) {
	query := `SELECT id, type, code, name, status, COALESCE(JSON_UNQUOTE(metadata), 'null'), created_at FROM master_records`
	args := []any{}
	if typ != "" {
		query += ` WHERE type=?`
		args = append(args, typ)
	}
	query += ` ORDER BY type, code`
	rows, err := s.sql.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []MasterRecord
	for rows.Next() {
		var item MasterRecord
		if err := rows.Scan(&item.ID, &item.Type, &item.Code, &item.Name, &item.Status, &item.Metadata, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Service) CreateMasterRecord(ctx context.Context, actor User, input MasterRecordInput, ip, device string) (MasterRecord, error) {
	if err := validateMasterRecordInput(input); err != nil {
		return MasterRecord{}, err
	}
	if !s.HasPermission(ctx, actor.Role, "master_data", "write") && actor.Role != "Super Admin" {
		return MasterRecord{}, errors.New("role tidak memiliki akses create master data")
	}
	metadata := strings.TrimSpace(input.Metadata)
	if metadata == "" {
		metadata = "{}"
	}
	code, err := s.NextNumber(ctx, "master_records", strings.TrimSpace(input.Type))
	if err != nil {
		return MasterRecord{}, err
	}
	res, err := s.sql.ExecContext(ctx, `INSERT INTO master_records (type, code, name, status, metadata) VALUES (?, ?, ?, ?, CAST(? AS JSON))`,
		input.Type, code, strings.TrimSpace(input.Name), normalizeStatus(input.Status), metadata)
	if err != nil {
		return MasterRecord{}, err
	}
	id, _ := res.LastInsertId()
	s.Audit(ctx, actor.ID, "Master Data", "Create", "master_records", fmt.Sprint(id), nil, input, ip, device)
	return s.MasterRecordByID(ctx, id)
}

func (s *Service) UpdateMasterRecord(ctx context.Context, actor User, id int64, input MasterRecordInput, ip, device string) (MasterRecord, error) {
	if err := validateMasterRecordInput(input); err != nil {
		return MasterRecord{}, err
	}
	if !s.HasPermission(ctx, actor.Role, "master_data", "write") && actor.Role != "Super Admin" {
		return MasterRecord{}, errors.New("role tidak memiliki akses update master data")
	}
	metadata := strings.TrimSpace(input.Metadata)
	if metadata == "" {
		metadata = "{}"
	}
	_, err := s.sql.ExecContext(ctx, `UPDATE master_records SET type=?, name=?, status=?, metadata=CAST(? AS JSON) WHERE id=?`,
		input.Type, strings.TrimSpace(input.Name), normalizeStatus(input.Status), metadata, id)
	if err != nil {
		return MasterRecord{}, err
	}
	s.Audit(ctx, actor.ID, "Master Data", "Update", "master_records", fmt.Sprint(id), nil, input, ip, device)
	return s.MasterRecordByID(ctx, id)
}

func (s *Service) DeleteMasterRecord(ctx context.Context, actor User, id int64, ip, device string) error {
	if !s.HasPermission(ctx, actor.Role, "master_data", "delete") && !s.HasPermission(ctx, actor.Role, "master_data", "write") && actor.Role != "Super Admin" {
		return errors.New("role tidak memiliki akses delete master data")
	}
	if _, err := s.sql.ExecContext(ctx, `UPDATE master_records SET status='inactive' WHERE id=?`, id); err != nil {
		return err
	}
	s.Audit(ctx, actor.ID, "Master Data", "Delete", "master_records", fmt.Sprint(id), nil, map[string]any{"status": "inactive"}, ip, device)
	return nil
}

func (s *Service) MasterRecordByID(ctx context.Context, id int64) (MasterRecord, error) {
	var item MasterRecord
	err := s.sql.QueryRowContext(ctx, `SELECT id, type, code, name, status, COALESCE(JSON_UNQUOTE(metadata), 'null'), created_at FROM master_records WHERE id=?`, id).
		Scan(&item.ID, &item.Type, &item.Code, &item.Name, &item.Status, &item.Metadata, &item.CreatedAt)
	return item, err
}

func validateMasterRecordInput(input MasterRecordInput) error {
	if strings.TrimSpace(input.Type) == "" || strings.TrimSpace(input.Name) == "" {
		return errors.New("type dan name wajib diisi")
	}
	return nil
}

func normalizeStatus(status string) string {
	if strings.EqualFold(status, "inactive") {
		return "inactive"
	}
	return "active"
}
