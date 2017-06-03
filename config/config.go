package config

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"os"
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

const MEDIA = "/storage"

type Config struct {
	UID         int
	Exclude     []string
	Remove_orig bool
}

var Conf Config

func LoadConfig() {
	// defaults
	Conf.UID = -1
	Conf.Exclude = nil
	Conf.Remove_orig = false

	// load from .chrometizer.json if we have it
	file, e := ioutil.ReadFile(MEDIA + "/.chrometizer.json")
	if e == nil {
		e = json.Unmarshal(file, &Conf)
		if e == nil {
			fmt.Printf("config loaded : %+v\n", Conf)
		} else {
			fmt.Println(e)
		}
	}
}

// tests Media_loc - writable directory
func TestConfig() error {
	fi, err := os.Stat(MEDIA)

	if err != nil && os.IsNotExist(err) {
		return err
	}

	if !fi.IsDir() {
		return errors.New("/storage is not a directory")
	}

	err = ioutil.WriteFile(MEDIA+"/temp.txt", []byte("test"), 0644)
	if err != nil {
		return err
	}

	err = os.Remove(MEDIA + "/temp.txt")
	if err != nil {
		return err
	}

	return nil
}
