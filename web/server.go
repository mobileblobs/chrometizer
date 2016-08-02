package web

import (
	"github.com/mobileblobs/chrometizer/config"
	"net/http"
	"strings"
)

var fsON = false

func StartHttp() {
	// settings or status (if settings exist)
	http.HandleFunc("/", HandleSlash)

	// webclient : all
	http.HandleFunc("/webclient/", HandleWebclient)

	// api : all
	http.HandleFunc("/api/", HandleApi)

	// file stream : all
	http.HandleFunc("/file/", HandleFile)

	http.ListenAndServe(":80", nil)

}

func HandleSlash(w http.ResponseWriter, r *http.Request) {
	// get only
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	if config.Conf.Media_loc != "" {
		// config exists go to status
		http.Redirect(w, r, "/webclient/cast.html", http.StatusTemporaryRedirect)
	} else {
		// go create settings
		http.Redirect(w, r, "/webclient/config.html", http.StatusTemporaryRedirect)
	}
}

func HandleFile(w http.ResponseWriter, r *http.Request) {
	// get only
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/file/")
	http.ServeFile(w, r, config.Conf.Media_loc+"/"+path)
}

func HandleApi(w http.ResponseWriter, r *http.Request) {
	// fmt.Printf("\n %s \n", r.RequestURI)
	switch {

	case strings.EqualFold(r.RequestURI, "/api/config"):
		HandleConfig(w, r)
		return

	case strings.EqualFold(r.RequestURI, "/api/status"):
		HandleStatus(w, r)
		return

	case strings.EqualFold(r.RequestURI, "/api/scan"):
		HandleScan(w, r)
		return

	case strings.HasPrefix(r.RequestURI, "/api/cast"): //params
		HandleCast(w, r)
		return

	case strings.EqualFold(r.RequestURI, "/api/vnames"):
		HandleVnames(w, r)
		return
	}
}
