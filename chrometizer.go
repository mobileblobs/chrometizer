package main

import (
	"errors"
	"fmt"
	"github.com/mobileblobs/chrometizer/config"
	"github.com/mobileblobs/chrometizer/ffmpeg"
	"github.com/mobileblobs/chrometizer/web"
	"net"
	"os"
)

func main() {
	if !ffmpeg.TestFFmpeg() {
		fmt.Printf("\nffmpeg error!\nmake sure : " +
			"\n1. ffmpeg is configured and compiled with non-free codecs : " +
			"https://trac.ffmpeg.org/wiki/CompilationGuide/Ubuntu" +
			"\n2. ffmpeg is on the path (you may need to remove default one!)\n" +
			"\nexiting now!")
		os.Exit(1)
	}

	eip, err := externalIP()
	if err != nil {
		fmt.Println(err)
	}

	// load config from file & if OK scan for VFs
	if config.LoadConfig(eip) == nil {
		ffmpeg.TranscodeAll()
	}

	web.StartHttp()
}

func externalIP() (string, error) {
	ifaces, err := net.Interfaces()
	if err != nil {
		return "", err
	}
	for _, iface := range ifaces {
		if iface.Flags&net.FlagUp == 0 {
			continue // interface down
		}
		if iface.Flags&net.FlagLoopback != 0 {
			continue // loopback interface
		}
		addrs, err := iface.Addrs()
		if err != nil {
			return "", err
		}
		for _, addr := range addrs {
			var ip net.IP
			switch v := addr.(type) {
			case *net.IPNet:
				ip = v.IP
			case *net.IPAddr:
				ip = v.IP
			}
			if ip == nil || ip.IsLoopback() {
				continue
			}
			ip = ip.To4()
			if ip == nil {
				continue // not an ipv4 address
			}
			return ip.String(), nil
		}
	}
	return "", errors.New("are you connected to the network?")
}
