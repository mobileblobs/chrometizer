package ffmpeg

import (
	"bytes"
	"fmt"
	"github.com/mobileblobs/chrometizer/config"
	"github.com/mobileblobs/chrometizer/fs"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

var transcode_lock = false

func TestFFmpeg() bool {
	cmd := exec.Command(config.FFMPEG_CMD, "-formats")
	var out bytes.Buffer
	cmd.Stdout = &out

	err := cmd.Run()

	if err != nil {
		return false
	}

	ff_out := strings.ToUpper(out.String())

	for _, codec := range config.REQ_CODECS {
		if !strings.Contains(ff_out, codec) {
			return false
		}
	}

	return true
}

func TranscodeAll() bool {

	if transcode_lock {
		return false
	}

	transcode_lock = true
	go startTranscoder()
	return true
}

func IsTranscoding() bool {
	return transcode_lock
}

func startTranscoder() {
	for _, vf := range fs.LoadVF() {
		if !vf.Ready {
			process(vf)
		}
	}

	transcode_lock = false
}

func process(vf *fs.VF) {
	move, args, err := command(vf)

	if err != nil { // ffprobe failed - record it!
		updateVF(err.Error(), "", "", vf)
		return
	}

	if move { // rename/move the file to ready - it's compatible!

		err = os.Rename(args[0], args[1])
		if err != nil {
			updateVF(err.Error(), "", "", vf)
		} else {
			updateVF("", filepath.Base(args[1]), args[1], vf)
		}

	} else { // need to transcode audio, video or both
		transcode(args, vf)
	}
}

func transcode(args []string, vf *fs.VF) {

	vf.Transcoding = true
	cmd := exec.Command(config.FFMPEG_CMD, args...)
	fmt.Printf("\nexecuting: %s", cmd.Args)
	var out bytes.Buffer
	cmd.Stdout = &out
	var erro bytes.Buffer
	cmd.Stderr = &erro

	cmd.Run()
	fmt.Printf("\n ^ completed!")

	// rename as ready
	temp_file := args[len(args)-1]
	ready_file := strings.Replace(temp_file, config.TEMP_EXT, config.FILE_READY_EXT, -1)
	err := os.Rename(temp_file, ready_file)

	if err != nil {
		updateVF(err.Error(), "", "", vf)
		return
	}

	if config.Conf.Remove_orig {
		os.Remove(vf.Path)
	}

	//all done - update
	updateVF("", filepath.Base(ready_file), ready_file, vf)
}

func updateVF(err string, name string, path string, vf *fs.VF) {
	if err != "" {

		vf.Err = err
		vf.Ready = false
		vf.Ready = true

	} else {
		vf.Name = name
		vf.Path = path
		vf.Ready = true
		thumbnail(vf)
	}

	vf.Transcoding = false
}
