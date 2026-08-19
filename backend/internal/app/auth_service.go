package app

import (
	"context"
	"errors"
	"time"

	"financeerp/backend/internal/security"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type authUserRow struct {
	ID               int64
	Name             string
	Email            string
	Role             string
	Status           string
	TwoFactorEnabled bool
	LastLoginAt      *time.Time
	PasswordHash     string
	FailedLogins     int
}

func (s *Service) Login(ctx context.Context, email, password, ip, device string) (LoginResult, error) {
	var result LoginResult
	var row authUserRow
	err := s.db.WithContext(ctx).
		Table("users AS u").
		Select("u.id, u.name, u.email, r.name AS role, u.status, u.two_factor_enabled, u.last_login_at, u.password_hash, u.failed_logins").
		Joins("JOIN roles r ON r.id = u.role_id").
		Where("u.email = ?", email).
		Take(&row).Error
	if err != nil {
		s.recordLogin(ctx, nil, email, ip, device, false, "user not found")
		return result, errors.New("email atau password tidak valid")
	}
	user := User{
		ID:               row.ID,
		Name:             row.Name,
		Email:            row.Email,
		Role:             row.Role,
		Status:           row.Status,
		TwoFactorEnabled: row.TwoFactorEnabled,
		LastLoginAt:      row.LastLoginAt,
	}
	if user.Status != "active" {
		s.recordLogin(ctx, &user.ID, email, ip, device, false, "account not active")
		return result, errors.New("akun tidak aktif")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(row.PasswordHash), []byte(password)); err != nil {
		failed := row.FailedLogins + 1
		updates := map[string]any{"failed_logins": failed}
		if failed >= 5 {
			updates["status"] = "locked"
		}
		_ = s.db.WithContext(ctx).Table("users").Where("id = ?", user.ID).Updates(updates).Error
		s.recordLogin(ctx, &user.ID, email, ip, device, false, "invalid password")
		return result, errors.New("email atau password tidak valid")
	}
	_ = s.db.WithContext(ctx).Table("users").Where("id = ?", user.ID).Updates(map[string]any{
		"failed_logins": 0,
		"last_login_at": gorm.Expr("NOW()"),
	}).Error
	s.recordLogin(ctx, &user.ID, email, ip, device, true, "login success")
	token, err := security.Sign(security.Claims{UserID: user.ID, Email: user.Email, Role: user.Role, Exp: time.Now().Add(12 * time.Hour).Unix()}, s.cfg.AppSecret)
	if err != nil {
		return result, err
	}
	result.Token = token
	result.User = user
	return result, nil
}

func (s *Service) UserByID(ctx context.Context, id int64) (User, error) {
	var user User
	if s.db == nil {
		if id == 1 {
			return User{ID: 1, Name: "ERP Super Admin", Email: "admin@financeerp.local", Role: "Super Admin", Status: "active"}, nil
		}
		return user, errors.New("user not found")
	}
	err := s.db.WithContext(ctx).
		Table("users AS u").
		Select("u.id, u.name, u.email, r.name AS role, u.status, u.two_factor_enabled, u.last_login_at").
		Joins("JOIN roles r ON r.id = u.role_id").
		Where("u.id = ?", id).
		Take(&user).Error
	return user, err
}
