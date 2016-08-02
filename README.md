# Chrometizer
Transcode and cast your local video files. It's written in Go and does transcoding off-line (upfront).


#### General
The design is KISS & DRY (as much as possible) and the whole project can be described as : transcode all of your video files upfront, use only the filesystem as state/storage, cast, stream, watch the transcoded files to as many clients as you need at the same time with minimum load on the server.

#### FFmpeg
Chrometizer uses FFMPEG for transcoding and you will need to compile it with nonfree codecs.
Simple, straightforward guide for Ubuntu/Debian can be found [here](https://trac.ffmpeg.org/wiki/CompilationGuide/Ubuntu).

Chrometizer will test your FFmpeg installation and will refuse to start (no point) if there is no support for : x264 and libfdk_aac encoder.

Simple tests for required codecs :
```
ffmpeg -formats 2> /dev/null | grep "E mp4"
  E mp4             MP4 (MPEG-4 Part 14)

ffmpeg -formats 2> /dev/null | grep "E matroska"
  E matroska        Matroska

ffmpeg -codecs 2> /dev/null | grep "libfdk_aac"
 DEA.L. aac                  AAC ...
 
ffmpeg -codecs 2> /dev/null | grep "libx264"
 DEV.LS h264                 H.264 

```

#### Installation
If you managed to get FFmpeg with aac & x264 you are ready to install. If not, keep [trying](https://trac.ffmpeg.org/wiki/CompilationGuide/Ubuntu) - again chrometizer will refuse to start if they are not avalable.
##### Binary
If you are runing on 64 bit Linux you should be able to just grab the binary from the dist folder put it in the desired directory and :
```
chmod +x chrometizer
sudo setcap 'cap_net_bind_service=+ep' chrometizer
./chrometizer
```
The second line is to allow to bind to port 80 (chromecast refuses to load from diffrent ports(?)).
You can compare the md5sum to make sure the binary is the one uploaded here.

DO NOT run as root!
##### Source
Assumingyou have [golang set](https://golang.org/doc/code.html) then :
```
go install github.com/mobileblobs/chrometizer
```


#### Usage/Running