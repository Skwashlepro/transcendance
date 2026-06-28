package main

import (
	"database/sql"
	"fmt"
	"net/http"
	"os"

	_ "github.com/lib/pq"

	"transcendance/backend/src/auth"
)


func enableCors(next http.Handler) http.Handler {

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		w.Header().Set(
			"Access-Control-Allow-Origin",
			"http://localhost:3000",
		)

		w.Header().Set(
			"Access-Control-Allow-Headers",
			"Content-Type",
		)

		w.Header().Set(
			"Access-Control-Allow-Methods",
			"GET, POST, OPTIONS",
		)

		if r.Method == "OPTIONS" {
			return
		}

		next.ServeHTTP(w, r)
	})
}


func main() {


	connStr := "host=" + os.Getenv("DB_HOST") +
		" port=" + os.Getenv("DB_PORT") +
		" user=" + os.Getenv("DB_USER") +
		" password=" + os.Getenv("DB_PASSWORD") +
		" dbname=" + os.Getenv("DB_NAME") +
		" sslmode=disable"


	db, err := sql.Open("postgres", connStr)

	if err != nil {
		fmt.Println("Error opening db:", err)
		return
	}


	err = db.Ping()

	if err != nil {
		fmt.Println("Error connecting to db:", err)
		return
	}


	fmt.Println("Connected to PostgreSQL!")


	mux := http.NewServeMux()


	mux.HandleFunc("/api/test", func(w http.ResponseWriter, r *http.Request) {

		w.Header().Set("Content-Type", "application/json")

		w.Write([]byte(`
		{
			"message":"Hello from Go backend"
		}
		`))
	})


	// signup route
	mux.HandleFunc(
		"/api/signup",
		auth.Signup(db),
	)


	fmt.Println("Server running on port 8000")


	err = http.ListenAndServe(
		":8000",
		enableCors(mux),
	)

	if err != nil {
		fmt.Println(err)
	}
}
