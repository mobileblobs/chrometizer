package main

import (
	"fmt"
	"github.com/mobileblobs/chrometizer/config"
	"github.com/mobileblobs/chrometizer/ffmpeg"
	"github.com/mobileblobs/chrometizer/web"
	"os"
)

func main() {

	// no point of starting if ffmpeg is not there
	if !ffmpeg.TestFFmpeg() {
		fmt.Printf("\nffmpeg error!\nmake sure : " +
			"\n1. ffmpeg is configured and compiled with non-free codecs : " +
			"https://trac.ffmpeg.org/wiki/CompilationGuide/Ubuntu" +
			"\n2. ffmpeg is on the path (you may need to remove" +
			" the default one!).\n\nExiting now!")
		os.Exit(1)
	}

	// load config from /storage or write it from ENV
	config.LoadConfig()

	ffmpeg.TranscodeAll()

	web.StartHttp()
}
