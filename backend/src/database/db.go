package database

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/lib/pq"
)

func Connect() (*sql.DB, error) {
	cfg := map[string]string{
		"host":     os.Getenv("DB_HOST"),
		"port":     os.Getenv("DB_PORT"),
		"user":     os.Getenv("DB_USER"),
		"password": os.Getenv("DB_PASSWORD"),
		"dbname":   os.Getenv("DB_NAME"),
	}
	for key, value := range cfg {
		if value == "" {
			return nil, fmt.Errorf("database config is missing: %s", key)
		}
	}

	connStr := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		cfg["host"], cfg["port"], cfg["user"], cfg["password"], cfg["dbname"],
	)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, err
	}

	if err := db.Ping(); err != nil {
		_ = db.Close()
		return nil, err
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	return db, nil
}
