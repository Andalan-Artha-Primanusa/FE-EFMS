package main

import (
	"context"
	"log"
	"os"
	"time"

	"financeerp/backend/internal/app"
	"financeerp/backend/internal/config"
	"financeerp/backend/internal/database"
	"financeerp/backend/internal/httpapi"

	_ "github.com/go-sql-driver/mysql"
)

func main() {
	cfg := config.Load()

	gormDB, sqlDB, err := database.OpenGORM(cfg.MySQLDSN)
	if err != nil {
		log.Printf("database warning: %v, using in-memory store", err)
	} else if sqlDB != nil {
		go func() {
			ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
			defer cancel()
			if err := database.Migrate(ctx, sqlDB); err != nil {
				log.Printf("migrate warning: %v", err)
			}
			if err := database.Seed(ctx, sqlDB); err != nil {
				log.Printf("seed warning: %v", err)
			}
		}()
	}

	localUpload := "./uploads"
	_ = os.MkdirAll(localUpload, 0o755)
	if cfg.UploadDir != "" && cfg.UploadDir != localUpload {
		go func(dir string) {
			_ = os.MkdirAll(dir, 0o755)
		}(cfg.UploadDir)
	}

	service := app.New(gormDB, cfg)
	server := httpapi.NewFiberApp(service, cfg)

	log.Printf("finance ERP API listening on %s", cfg.Addr)
	if err := server.Listen(cfg.Addr); err != nil {
		log.Fatalf("server: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = server.ShutdownWithContext(ctx)
}
