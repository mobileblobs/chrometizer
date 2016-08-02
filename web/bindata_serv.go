package web

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
)

func HandleWebclient(w http.ResponseWriter, r *http.Request) {
	a_name := strings.Replace(r.RequestURI, "/", "", 1)
	data, err := Asset(a_name)
	if err != nil {
		fmt.Printf("\n%s", err)
		return
	}

	con_type := getContentType(a_name)
	w.Header().Set("Content-Type", con_type)
	w.Header().Set("Content-Length", strconv.Itoa(len(data)))

	if _, err := w.Write(data); err != nil {
		fmt.Println("unable to write image.")
	}
}

func getContentType(name string) string {
	switch {
	case strings.HasSuffix(name, "png") || strings.HasSuffix(name, "ico"):
		return "image/jpeg"
	case strings.HasSuffix(name, "js"):
		return "application/javascript"
	case strings.HasSuffix(name, "css"):
		return "text/css"
	}

	return "text/html"
}
