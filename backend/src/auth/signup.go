package auth

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"transcendance/backend/src/security"
)


type SignupRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}


func Signup(db *sql.DB) http.HandlerFunc {

	return func(w http.ResponseWriter, r *http.Request) {


		var req SignupRequest


		err := json.NewDecoder(r.Body).Decode(&req)

		if err != nil {
			http.Error(w, "invalid json", 400)
			return
		}


		hash, err := security.HashPassword(req.Password)

		if err != nil {
			http.Error(w, "hash failed", 500)
			return
		}


		_, err = db.Exec(
			"INSERT INTO users(username,password) VALUES($1,$2)",
			req.Username,
			hash,
		)


		if err != nil {
			http.Error(w, "username already exists", 400)
			return
		}


		w.Header().Set("Content-Type", "application/json")

		w.Write([]byte(`
		{
			"message":"account created"
		}
		`))
	}
}
