package config

import "os"

type Config struct {
	Addr       string
	AppEnv     string
	AppSecret  string
	MySQLDSN   string
	UploadDir  string
	CORSOrigin string
}

func Load() Config {
	return Config{
		Addr:       get("APP_ADDR", ":8080"),
		AppEnv:     get("APP_ENV", "development"),
		AppSecret:  get("APP_SECRET", "financeerp-local-secret"),
		MySQLDSN:   get("MYSQL_DSN", "admin:HkQV5KXNt45JO7Iz@tcp(160.19.165.216:3306)/finacneerp?parseTime=true&multiStatements=true"),
		UploadDir:  get("UPLOAD_DIR", `\\160.19.165.217\E-Finance\uploads`),
		CORSOrigin: get("CORS_ORIGIN", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5175,http://127.0.0.1:5175"),
	}
}

func get(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
