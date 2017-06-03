package config

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"strconv"
	"strings"
)

const FFMPEG_CMD = "ffmpeg"
const FFPROBE_CMD = "ffprobe"

const TRIMED_VP8_MARK = "VIDEO:VP8"
const TRIMED_H264_MARK = "VIDEO:H264"
const H264_UNSUP = "HIGH10"
const AAC_AUDIO_MARK = "AUDIO:AAC"

// this CS is actually : scale="iw*min(384/iw\,216/ih):ih*min(384/iw\,216/ih),
// pad=384:216:(384-iw*min(384/iw\,216/ih))/2:(216-ih*min(384/iw\,216/ih))/2"
const THUMB_W = "384" // thumb width in pixels
const THUMB_H = "216" // thumb height in pixels
const THUMB_SCALE = "scale='iw*min(" + THUMB_W +
	"/iw\\," + THUMB_H + "/ih)':'ih*min(" + THUMB_W + "/iw\\," + THUMB_H +
	"/ih)', pad='" + THUMB_W + "':'" + THUMB_H + "':'(" + THUMB_W + "-iw*min(" +
	THUMB_W + "/iw\\," + THUMB_H + "/ih))/2':'(" + THUMB_H + "-ih*min(" +
	THUMB_W + "/iw\\," + THUMB_H + "/ih))/2'"

const FILE_READY_EXT = "-cast-ready"
const TEMP_EXT = "-temp_transcoding"
const DURATION_MARK = "DURATION:"

const MTIME_DES = 0
const MTIME_ASC = 1
const FNAME_ASC = 2
const FNAME_DES = 3

var SFE = [...]string{"MKV", "MP4", "AVI", "MPEG", "MPG", "FLV", "3GP", "WEBM"}

var REQ_CODECS = [...]string{"E MP4", "E MATROSKA", "E ADTS", "E H264"}

type Config struct {
	Config_loc  string
	Media_loc   string
	Exclude     []string
	Remove_orig bool
}

var Conf Config

func LoadConfig() {

	if readConfig() != nil {
		// ln if needed
		Conf.Media_loc = "/storage"
		Conf.Config_loc = Conf.Media_loc + "/.chrometizer.json"

		Conf.Exclude = nil
		exc := os.Getenv("EXC")
		if len(exc) > 0 {
			Conf.Exclude = strings.Split(exc, ",")
		}

		Conf.Remove_orig = false
		rem := os.Getenv("REM")
		if len(rem) > 0 {
			Conf.Remove_orig, _ = strconv.ParseBool(rem)
		}

		// write the config
		StoreConfig()
	}

	fmt.Printf("\nusing %s as config!", Conf.Config_loc)
}

func StoreConfig() error {
	jb, err := json.MarshalIndent(Conf, "", "  ")
	if err != nil {
		fmt.Printf("\nMarshal error: %v\n", err)
		return err
	}
	return ioutil.WriteFile(Conf.Config_loc, jb, 0644)
}

func readConfig() error {
	// try to read from default location or return error
	file, e := ioutil.ReadFile("/storage/.chrometizer.json")
	if e != nil {
		return e
	}

	// config there & OK - scan & transcode
	return json.Unmarshal(file, &Conf)
}

// tests Media_loc - writable directory
func ConfigTest(temp_conf *Config) (bool, JsonMessage) {
	ml := temp_conf.Media_loc
	fi, err := os.Stat(ml)

	if err != nil && os.IsNotExist(err) {
		return false, JsonMessage{"Media_loc", err.Error()}
	}

	if !fi.IsDir() {
		return false, JsonMessage{"Media_loc", "Not a directory"}
	}

	err = ioutil.WriteFile(ml+"/temp.txt", []byte("test"), 0644)
	if err != nil {
		return false, JsonMessage{"Media_loc", "Can not write to media directory"}
	}

	err = os.Remove(ml + "/temp.txt")
	if err != nil {
		return false, JsonMessage{"Media_loc", "Can not write to media directory"}
	}

	return true, JsonMessage{}
}

type JsonMessage struct {
	Id      string
	Message string
}
