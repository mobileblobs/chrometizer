package ffmpeg

import (
	"bytes"
	"fmt"
	"github.com/mobileblobs/chrometizer/config"
	"github.com/mobileblobs/chrometizer/fs"
	"os/exec"
	"strconv"
	"strings"
)

func command(vf *fs.VF) (move bool, args []string, err error) {
	cmd := exec.Command(config.FFPROBE_CMD, vf.Path)
	var out bytes.Buffer
	cmd.Stderr = &out

	err = cmd.Run()
	if err != nil {
		return false, nil, err
	}

	return buildCmd(vf, out.String())
}

func buildCmd(vf *fs.VF, output string) (move bool, args []string, err error) {
	up := strings.ToUpper(output)               // all caps
	up_comp := strings.Replace(up, " ", "", -1) // no spaces
	vf.Duration = getDuration(&up_comp)         // extract DURATION
	move, avcodecs := getCodecs(&up_comp)       // move or transcode

	if move {
		return move, []string{vf.Path, getReadyName(&vf.Path)}, nil
	}

	args = []string{"-i", vf.Path}
	args = append(args, avcodecs...)
	args = append(args, getTempName(&vf.Path))
	return false, args, nil
}

func getDuration(up_comp *string) string {
	//DURATION:00:00:03.600000000
	uctemp := *up_comp
	di := strings.Index(uctemp, config.DURATION_MARK)
	if di < 0 {
		return ""
	}

	cut := uctemp[(di + len(config.DURATION_MARK)):] // 00:00:05.16,S...
	se := strings.Index(cut, ".")
	if se < 0 {
		return ""
	}

	return cut[:se] //00:00:03
}

func getTempName(path *string) string {
	ext := ".mp4"
	if strings.HasSuffix(strings.ToUpper(*path), "MKV") {
		ext = ".mkv"
	}

	li := strings.LastIndex(*path, ".")
	ptmp := *path
	if li < 0 {
		return ptmp + config.TEMP_EXT + ext
	}
	return ptmp[:li] + config.TEMP_EXT + ext
}

func getReadyName(path *string) string {
	li := strings.LastIndex(*path, ".")
	ptmp := *path
	return ptmp[:li] + config.FILE_READY_EXT + ptmp[li:len(ptmp)]
}

func getCodecs(up_comp *string) (bool, []string) {
	webm := strings.Contains(*up_comp, config.TRIMED_VP8_MARK)
	askip, acodec := getAcodec(up_comp)
	vskip, vcodec := getVcodec(up_comp)

	if webm || (askip && vskip) {
		return true, nil
	}

	return false, append(acodec, vcodec...)
}

func getVcodec(up_comp *string) (bool, []string) {
	if strings.Contains(*up_comp, config.TRIMED_H264_MARK) &&
		!strings.Contains(*up_comp, config.H264_UNSUP) {
		return true, []string{"-vcodec", "copy"}
	}
	return false, []string{"-vcodec", "libx264", "-vsync", "0", "-level", "3.1",
		"-qmax", "22", "-qmin", "20", "-x264opts", "no-cabac:ref=2"}
}

func getAcodec(up_comp *string) (bool, []string) {
	if strings.Contains(*up_comp, config.AAC_AUDIO_MARK) {
		return true, []string{"-acodec", "copy"}
	}
	return false, []string{"-acodec", "libfdk_aac", "-ab", "192k", "-ac", "2",
		"-absf", "aac_adtstoasc", "-async", "1"}
}

// Create a JPG imgage at specified time with
// height=216 width=384
// while preseve aspect and padd in black
func thumbnail(vf *fs.VF) {
	tnTime := tnPoint(vf.Duration)
	fmt.Printf("\nwill cut JPG at:%s\n", tnTime)
	args := []string{"-y", "-ss", tnTime, "-i", vf.Path, "-vframes", "1", "-filter:v",
		config.THUMB_SCALE, vf.Path + ".jpg"}
	cmd := exec.Command(config.FFMPEG_CMD, args...)
	cmd.Run()
}

func tnPoint(dt string) string {
	hms := strings.Split(dt, ":")
	mnts, _ := strconv.ParseInt(hms[1], 10, 0)

	if mnts > 15 { // have more than 15 minutes
		return "00:15:00"
	} else if mnts > 5 {
		return "00:05:00"
	} else if mnts > 1 {
		return "00:01:00"
	} else { // seconds long!
		ss, _ := strconv.ParseInt(hms[2], 10, 0)
		ss = ss - 1
		if ss < 10 {
			return "00:00:0" + strconv.FormatInt(int64(ss), 10)
		}
		return "00:00:" + strconv.FormatInt(int64(ss), 10)
	}

	return ""
}
