package web

import (
	"encoding/json"
	"github.com/mobileblobs/chrometizer/config"
	"github.com/mobileblobs/chrometizer/ffmpeg"
	"github.com/mobileblobs/chrometizer/fs"
	"net/http"
)

func HandleConfig(w http.ResponseWriter, r *http.Request) {
	switch {
	// read config
	case r.Method == http.MethodGet:
		w.Header().Set("Content-Type", "application/json")
		json_bytes, _ := json.Marshal(config.Conf)
		w.Write(json_bytes)
		return

	// write config
	case r.Method == http.MethodPost:
		var temp_conf config.Config
		decoder := json.NewDecoder(r.Body)
		err := decoder.Decode(&temp_conf)

		w.Header().Set("Content-Type", "application/json")
		if err != nil {
			writeMsg(w, config.JsonMessage{"parse", err.Error()})
			return
		}

		ok, msg := config.ConfigTest(&temp_conf)
		if !ok {
			writeMsg(w, msg)
			return
		}

		config.Conf = temp_conf
		err = config.StoreConfig()
		if err != nil {
			writeMsg(w, config.JsonMessage{"write", err.Error()})
			return
		}

		// start the transcoder!
		ffmpeg.TranscodeAll()

		// say we OK
		writeMsg(w, config.JsonMessage{"OK", "Config successfully written"})
		return
	}

	//unssuported : HEAD/PUT/TRACE etc
	w.WriteHeader(http.StatusNotFound)
}

func writeMsg(w http.ResponseWriter, je config.JsonMessage) {
	json_bytes, _ := json.Marshal(je)
	w.Write(json_bytes)
}

func HandleStatus(w http.ResponseWriter, r *http.Request) {
	// get only
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json_bytes, _ := json.Marshal(fs.CachedVF())
	w.Write(json_bytes)
}

func HandleScan(w http.ResponseWriter, r *http.Request) {
	// get only
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json_bytes, _ := json.Marshal(ffmpeg.TranscodeAll())
	w.Write(json_bytes)
}
