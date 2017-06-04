# chrometizer development
## FFmpeg installation
### FFmpeg PPA (Debian/Ubuntu)
```
sudo add-apt-repository ppa:djcj/hybrid
sudo apt-get update
sudo apt-get install ffmpeg
```

### FFmpeg source
You will need to compile it with non-free codecs.
[Ubuntu/Debian](https://trac.ffmpeg.org/wiki/CompilationGuide/Ubuntu).

Chrometizer will test your FFmpeg installation and will refuse to start 
(no point) if there is no support for : x264 and libfdk_aac encoder.

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

##### Source
Get [golang](https://golang.org/dl/) then :
```
go get github.com/mobileblobs/chrometizer
go install github.com/mobileblobs/chrometizer
```
The web client uses go-bindata so
```
go get github.com/bradfitz/slice
go get -u github.com/jteeuwen/go-bindata
```
All web resources are packed into the binary in order to be able to work offline.

##### webclient
KISS with a bit outdated JS. To develop it you will need to :
```
cd gocode/src/github.com/mobileblobs/chrometizer/web
go-bindata -debug webclient/...
```
note the 3 dots at the end. This will modify ```bindata.go``` file (you will 
need to manually change the package back to ```web``` but at the end you will 
be able to edit the web files (css, html, js) and just refresh while the server 
is running.  
