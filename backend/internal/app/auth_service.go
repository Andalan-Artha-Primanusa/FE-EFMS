package app

import (
	"context"
	"errors"
	"strconv"
	"strings"
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
	if s.db == nil {
		users, _ := s.Users(ctx)
		for _, u := range users {
			if u.ID == id {
				return u, nil
			}
		}
		return User{}, errors.New("user not found")
	}
	var user User
	err := s.db.WithContext(ctx).
		Table("users AS u").
		Select("u.id, u.name, u.email, r.name AS role, u.status, u.two_factor_enabled, u.last_login_at").
		Joins("JOIN roles r ON r.id = u.role_id").
		Where("u.id = ?", id).
		Take(&user).Error
	return user, err
}

var fallbackUsers = []User{
	{ID: 1, Name: "ERP Super Admin", Email: "admin@financeerp.local", Role: "Super Admin", Status: "active"},
	{ID: 2, Name: "Finance Admin", Email: "finance.admin@financeerp.local", Role: "Finance Admin", Status: "active"},
	{ID: 3, Name: "SPV Site Verificator", Email: "spv@financeerp.local", Role: "SPV Verificator", Status: "active"},
	{ID: 4, Name: "Admin Finance Site", Email: "admin.site@financeerp.local", Role: "Admin Finance Site", Status: "active"},
	{ID: 5, Name: "Admin Finance HO", Email: "admin.ho@financeerp.local", Role: "Admin Finance HO", Status: "active"},
	{ID: 6, Name: "Finance Manager", Email: "finance.manager@financeerp.local", Role: "Finance Manager", Status: "active"},
	{ID: 7, Name: "Direktur Utama", Email: "director@financeerp.local", Role: "Director", Status: "active"},
	{ID: 8, Name: "Treasury Officer", Email: "treasury@financeerp.local", Role: "Treasury", Status: "active"},
	{ID: 9, Name: "AR Officer", Email: "ar@financeerp.local", Role: "Account Receivable Officer", Status: "active"},
	{ID: 10, Name: "Accounting Officer", Email: "accounting@financeerp.local", Role: "Accounting", Status: "active"},
}

func (s *Service) Users(ctx context.Context) ([]User, error) {
	if s.db == nil {
		res := make([]User, len(fallbackUsers))
		copy(res, fallbackUsers)
		return res, nil
	}
	var users []User
	err := s.db.WithContext(ctx).
		Table("users AS u").
		Select("u.id, u.name, u.email, r.name AS role, u.status, u.two_factor_enabled, u.last_login_at").
		Joins("JOIN roles r ON r.id = u.role_id").
		Order("u.id ASC").
		Find(&users).Error
	if err != nil {
		return nil, err
	}
	return users, nil
}

func (s *Service) CreateUser(ctx context.Context, actor User, input UserInput, ip, device string) (User, error) {
	if strings.TrimSpace(input.Name) == "" {
		return User{}, errors.New("nama pengguna wajib diisi")
	}
	if strings.TrimSpace(input.Email) == "" {
		return User{}, errors.New("email pengguna wajib diisi")
	}
	if strings.TrimSpace(input.Role) == "" {
		input.Role = "Department User"
	}
	if input.Status == "" {
		input.Status = "active"
	}
	pwd := input.Password
	if strings.TrimSpace(pwd) == "" {
		pwd = "Admin@12345"
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(pwd), bcrypt.DefaultCost)
	if err != nil {
		return User{}, err
	}

	if s.db == nil {
		newID := int64(len(fallbackUsers) + 1)
		newUser := User{
			ID:     newID,
			Name:   input.Name,
			Email:  input.Email,
			Role:   input.Role,
			Status: input.Status,
		}
		fallbackUsers = append(fallbackUsers, newUser)
		s.Audit(ctx, actor.ID, "User Management", "create", "User", strconv.FormatInt(newID, 10), nil, newUser, ip, device)
		return newUser, nil
	}

	var roleID int64
	err = s.db.WithContext(ctx).Table("roles").Select("id").Where("name = ?", input.Role).Take(&roleID).Error
	if err != nil {
		// Fallback to role 1 if role not found
		roleID = 1
	}

	res := s.db.WithContext(ctx).Exec(`INSERT INTO users (role_id, name, email, password_hash, status) VALUES (?, ?, ?, ?, ?)`,
		roleID, input.Name, input.Email, string(hash), input.Status)
	if res.Error != nil {
		return User{}, res.Error
	}

	var created User
	err = s.db.WithContext(ctx).
		Table("users AS u").
		Select("u.id, u.name, u.email, r.name AS role, u.status, u.two_factor_enabled, u.last_login_at").
		Joins("JOIN roles r ON r.id = u.role_id").
		Where("u.email = ?", input.Email).
		Take(&created).Error
	if err != nil {
		return User{}, err
	}

	s.Audit(ctx, actor.ID, "User Management", "create", "User", strconv.FormatInt(created.ID, 10), nil, created, ip, device)
	return created, nil
}

func (s *Service) UpdateUser(ctx context.Context, actor User, id int64, input UserInput, ip, device string) (User, error) {
	if strings.TrimSpace(input.Name) == "" {
		return User{}, errors.New("nama pengguna wajib diisi")
	}
	if strings.TrimSpace(input.Email) == "" {
		return User{}, errors.New("email pengguna wajib diisi")
	}

	if s.db == nil {
		for i, u := range fallbackUsers {
			if u.ID == id {
				fallbackUsers[i].Name = input.Name
				fallbackUsers[i].Email = input.Email
				if input.Role != "" {
					fallbackUsers[i].Role = input.Role
				}
				if input.Status != "" {
					fallbackUsers[i].Status = input.Status
				}
				s.Audit(ctx, actor.ID, "User Management", "update", "User", strconv.FormatInt(id, 10), nil, fallbackUsers[i], ip, device)
				return fallbackUsers[i], nil
			}
		}
		return User{}, errors.New("user not found")
	}

	updates := map[string]any{
		"name":   input.Name,
		"email":  input.Email,
		"status": input.Status,
	}

	if input.Role != "" {
		var roleID int64
		if err := s.db.WithContext(ctx).Table("roles").Select("id").Where("name = ?", input.Role).Take(&roleID).Error; err == nil {
			updates["role_id"] = roleID
		}
	}

	if strings.TrimSpace(input.Password) != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
		if err == nil {
			updates["password_hash"] = string(hash)
			updates["failed_logins"] = 0
		}
	}

	err := s.db.WithContext(ctx).Table("users").Where("id = ?", id).Updates(updates).Error
	if err != nil {
		return User{}, err
	}

	updated, err := s.UserByID(ctx, id)
	if err != nil {
		return User{}, err
	}
	s.Audit(ctx, actor.ID, "User Management", "update", "User", strconv.FormatInt(id, 10), nil, updated, ip, device)
	return updated, nil
}

func (s *Service) DeleteUser(ctx context.Context, actor User, id int64, ip, device string) error {
	if id == 1 {
		return errors.New("akun Super Admin utama (ID 1) tidak dapat dihapus demi keamanan sistem")
	}
	if actor.ID == id {
		return errors.New("tidak dapat menghapus akun Anda sendiri yang sedang aktif")
	}

	if s.db == nil {
		newList := []User{}
		found := false
		for _, u := range fallbackUsers {
			if u.ID != id {
				newList = append(newList, u)
			} else {
				found = true
			}
		}
		if !found {
			return errors.New("user not found")
		}
		fallbackUsers = newList
		s.Audit(ctx, actor.ID, "User Management", "delete", "User", strconv.FormatInt(id, 10), nil, nil, ip, device)
		return nil
	}

	res := s.db.WithContext(ctx).Table("users").Where("id = ?", id).Delete(&User{})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return errors.New("user not found")
	}
	s.Audit(ctx, actor.ID, "User Management", "delete", "User", strconv.FormatInt(id, 10), nil, nil, ip, device)
	return nil
}
