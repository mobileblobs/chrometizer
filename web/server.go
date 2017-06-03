package web

import (
	"github.com/mobileblobs/chrometizer/config"
	"net/http"
	"strings"
)

func StartHttp() {
	// settings or status (if settings exist)
	http.HandleFunc("/", HandleSlash)

	// webclient : all
	http.HandleFunc("/webclient/", HandleWebclient)

	// api : all
	http.HandleFunc("/api/", HandleApi)

	// file stream : all
	http.HandleFunc("/file/", HandleFile)

	http.ListenAndServe(":8080", nil)

}

func HandleSlash(w http.ResponseWriter, r *http.Request) {
	// get only
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	http.Redirect(w, r, "/webclient/cast.html", http.StatusTemporaryRedirect)
}

func HandleFile(w http.ResponseWriter, r *http.Request) {
	// get only
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/file/")
	http.ServeFile(w, r, config.MEDIA+"/"+path)
}

func HandleApi(w http.ResponseWriter, r *http.Request) {

	switch {

	case strings.HasPrefix(r.RequestURI, "/api/cast"): //params
		HandleCast(w, r)
		return

	case strings.EqualFold(r.RequestURI, "/api/vnames"):
		HandleVnames(w, r)
		return
	}
}
