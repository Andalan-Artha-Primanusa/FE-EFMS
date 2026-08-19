package database

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/go-sql-driver/mysql"
	gormmysql "gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Open(dsn string) (*sql.DB, error) {
	if !strings.Contains(dsn, "timeout=") {
		if strings.Contains(dsn, "?") {
			dsn += "&timeout=2s&readTimeout=2s&writeTimeout=2s"
		} else {
			dsn += "?timeout=2s&readTimeout=2s&writeTimeout=2s"
		}
	}
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(20)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(30 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		if strings.Contains(err.Error(), "Unknown database") {
			if createErr := createDatabase(ctx, dsn); createErr != nil {
				return nil, createErr
			}
			if err := db.PingContext(ctx); err != nil {
				return nil, err
			}
			return db, nil
		}
		return nil, err
	}
	return db, nil
}

func OpenGORM(dsn string) (*gorm.DB, *sql.DB, error) {
	sqlDB, err := Open(dsn)
	if err != nil {
		return nil, nil, err
	}
	gdb, err := gorm.Open(gormmysql.New(gormmysql.Config{Conn: sqlDB}), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		_ = sqlDB.Close()
		return nil, nil, err
	}
	return gdb, sqlDB, nil
}

func createDatabase(ctx context.Context, dsn string) error {
	cfg, err := mysql.ParseDSN(dsn)
	if err != nil {
		return err
	}
	dbName := cfg.DBName
	if dbName == "" {
		return nil
	}
	cfg.DBName = ""
	rootDB, err := sql.Open("mysql", cfg.FormatDSN())
	if err != nil {
		return err
	}
	defer rootDB.Close()
	_, err = rootDB.ExecContext(ctx, fmt.Sprintf("CREATE DATABASE IF NOT EXISTS `%s` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci", strings.ReplaceAll(dbName, "`", "``")))
	return err
}
