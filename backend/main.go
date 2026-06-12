package	main

import	(
	"net/http"
	"fmt"
	"database/sql"
	"os"
	_ "github.com/lib/pq"
)
func	main(){
	connStr := "host=" + os.Getenv("DB_HOST") +
    " port=" + os.Getenv("DB_PORT") +
    " user=" + os.Getenv("DB_USER") +
    " password=" + os.Getenv("DB_PASSWORD") +
    " dbname=" + os.Getenv("DB_NAME") +
    " sslmode=disable"
// PostGreSQL a besoin de recevoir une string seule qui comporte tout les params comme ca :
// Result: "host=postgres port=5432 user=myuser password=mypass dbname=mydb sslmode=disable"

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
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "homepage HTTP request")
	})
	http.ListenAndServe(":8000", nil)
}
