package app

import (
	"database/sql"

	"financeerp/backend/internal/config"

	"gorm.io/gorm"
)

type Service struct {
	db  *gorm.DB
	sql *sql.DB
	cfg config.Config
}

func New(db *gorm.DB, cfg config.Config) *Service {
	sqlDB, _ := db.DB()
	return &Service{db: db, sql: sqlDB, cfg: cfg}
}
