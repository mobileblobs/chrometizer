# Chrometizer
Transcode and cast your local video files. It's written in Go and does transcoding off-line (upfront). It was inspired by [this nice and simple script](https://gist.github.com/steventrux/10815095). Thanks @steventrux!


#### General
The design is KISS & DRY (as much as possible) and the whole project can be described as : transcode all of your video files upfront, use only the filesystem as state/storage, cast, stream, watch the transcoded files to as many clients as you need at the same time with minimum load on the server.

#### FFmpeg
Chrometizer uses FFMPEG for transcoding and you will need to compile it with non-free codecs.
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
If you are running on 64 bit Linux you should be able to just grab the binary from the dist folder put it in the desired directory and :
```
chmod +x chrometizer
sudo setcap 'cap_net_bind_service=+ep' chrometizer
./chrometizer
```
The second line is to allow to bind to port 80 (chromecast refuses to load from different ports(?)).
You can compare the md5sum to make sure the binary is the one uploaded here. Don't run as root, please - the world will be a better place ;)

##### Source
Assumingyou have [golang set](https://golang.org/doc/code.html) then :
```
go get github.com/mobileblobs/chrometizer
go install github.com/mobileblobs/chrometizer
```

##### Docker
As soon as I have some time will setup a public docker image that will, download, compile and install FFmpeg and Chrometizer and bridge the main external IP ... or nice people can send me a pr for the dist dir ;)

##### Windows
Maybe. Technically all should just work after proper target build but I couldn' know ... If you are interested if building and maintaining windows binary - let me know.

#### Usage/Running
Set the binary to be executable
```
chmod +x chrometizer
```
Allow chrometizer to bind to port 80 (for casting)
```
sudo setcap 'cap_net_bind_service=+ep' chrometizer
```
Run it :
```
./chrometizer &
```
It will printout config location which is current user (you didn't run it as root did you?) .chrometizer.json so if your FFmpeg is OK you should see something like :
```
using /home/<user>/.chrometizer.json as config!
```
If that's OK with you can just hit the server with a browser (use Google Chrome if you want to cast) at 
```
http://server
```
It will display the config/status page, which will let you set your media library location, option to exclude sub-directories and should you keep the original files.
Once you write the config (you can move it around later on) it will start scanning and transcoding your files.
After the config is done you can navigate ("chrometizer" link in the navbar) to your library.
If config is OK next time you visit your server from a browser it will send you to the library instead of the config page but you can always adjust by clicking on the setting glyphon in the top right corner.

#### Development
There are to independent parts, which I tried to keep as much apart as possible : the server and the webclient. 

##### server
Is simple Golang application that scans, transcodes and servers your video files (VFs). It is stateless in a way that it does not use storage engines (DB, KV etc.) but the file system alone. It achieves this by altering file names in predefined pattern (suffixes). When it transcodes a file it appends temp extension so it can always retry in case of failure. Once file is complete and ready the transcoded one get cast-ready suffix so it won't attempt to transcode it again.
The benefit of being stateless is that you can interrupt it at any time (stop, kill, restart, etc. etc.) and once you start it again it will just continue from where it left (except for the temp file which will be overwritten).
To develop the server you should need only GO 1.6+ and 2 libs :
```
go get github.com/bradfitz/slice
go get github.com/jteeuwen/go-bindata
```
All web resources are packed into the binary in order to be able to work even when the user has no internet access. Using CDNs is tempting but if user is offline she needs to be able to play her local files.

##### webclient
It is a typical standalone (although served but the server) web app - HTML, CSS and JS. Jquery is required by the Bootstrap so I sticked with it (angular would be nicer but why two when it can be done with 1?).
There is nothing specific except the use of go-binda.
To start developing he webclient you will need to run go-bindata with debug switch :
```
cd gocode/src/github.com/mobileblobs/chrometizer/web
go-bindata -debug webclient/...
```
note the 3 dots at the end. This will modify ```bindata.go``` file (you will need to manually change the package back to ```web``` but at the end you will be able to edit the web files (css, html, js)and just refresh while the server is running.
One annoying thing is that ```setcap``` needs to be run any time you recompile the binary and the easiest solution is to have your build tool of choice to execute the ```setcap``` after install/compile.

#### TODOs
While stable an functional the current version is just an MVP so here are few that I know of :
* Meta-streams for play and casting (subtitles, meta data etc.)
* Casting to multiple chromecasts devices (possible?)
* Collections (series, albums, groups).
* Authentication.