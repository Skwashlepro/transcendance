package	main

import	(
	"net/http"
	"fmt"
)
func	main(){
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "homepage HTTP request")
	})
	http.ListenAndServe(":8000", nil)
}
