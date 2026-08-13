package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
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
		log.Fatalf("database: %v", err)
	}
	defer sqlDB.Close()

	if err := database.Migrate(context.Background(), sqlDB); err != nil {
		log.Fatalf("migrate: %v", err)
	}
	if err := database.Seed(context.Background(), sqlDB); err != nil {
		log.Fatalf("seed: %v", err)
	}
	if err := os.MkdirAll(cfg.UploadDir, 0o755); err != nil {
		log.Printf("upload dir warning: %v", err)
	}

	service := app.New(gormDB, cfg)
	server := httpapi.NewFiberApp(service, cfg)

	go func() {
		log.Printf("finance ERP API listening on %s", cfg.Addr)
		if err := server.Listen(cfg.Addr); err != nil {
			log.Fatalf("server: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = server.ShutdownWithContext(ctx)
}
