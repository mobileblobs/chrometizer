# Chrometizer
Transcode and cast your video files. Inspired by [steventrux](https://gist.github.com/steventrux/10815095).

## Install

### Docker (recommended)
```
# install docker if you haven't
sudo apt-get install -y docker.io

# add your user to the docker group
sudo usermod -aG docker $USER

# Now log out/log in and THEN test
docker images

# get chrometizer latest image
docker pull mobileblobs/chrometizer

#See configuration bellow.
```

### Native (Ubuntu x86_64)
```
# get ffmpeg with non-free
sudo add-apt-repository ppa:djcj/hybrid
sudo apt-get update && sudo apt-get install -y ffmpeg

# get the binary
wget https://github.com/mobileblobs/chrometizer/raw/master/dist/chrometizer
chmod +x chrometizer && mv chrometizer /usr/local/bin/
sudo mkdir /storage && sudo chown -R $USER /storage

# See configuration bellow.
```
For other distros, platforms etc. see [Develop](https://github.com/mobileblobs/chrometizer/blob/master/DEVELOP.md).

## Configuration
Chrometizer expects all videos and configuration file to be in /storage.  
This will be mapped by Docker volume but if you are running natively you should
link, mount or move you video files in /storage.

#### Configuration file
Chrometizer looks for /storage/.chrometizer.json.
If no file is found or it's invalid JSON, defaults are used.
```
/storage/.chrometizer.json example
{
  "UID": "",
  "Exclude": [],
  "Remove_orig": false
}
```
###### UID
Your user numerical ID. If set it will be used to create new files with this UID.
```
# to get your UID
(echo $UID)
# Default is unset.
```
###### Exclude
Exclude directories within /storage.
```
# json string arrya example
"Exclude": ["exclude_dir1", "exclude_dir2", "exclude_dir3"]
# Default is unset.
```
###### Remove_orig
Should the original videos be deleted after successful transcoding.  
If you have enough space and want to preserver the original set "false".
If space is of concern use "true"
```
# no quotes
"Remove_orig": true
# Default is false.
```

## Run it
You are OK with the default values or you have created .chrometizer.json file -
let's have some fun!
### Docker
If you need to overwrite the default config, you should create .chrometizer.json
file in "/absolute/path/to/your/video/files".   
Docker will union mount it to the container /storage.
We will expose port 80 on the host and run in detached mode :
```
docker run -d -p 80:8080 -v /absolute/path/to/your/video/files:/storage --restart unless-stopped mobileblobs/chrometizer
```
If everything goes well you should see your container running
```
docker ps
```
and all of your CPU will be consumed by the initial transcoding.  
The --restart unless-stopped will make sure it starts on boot.

### Native
You will need to link, mount or move you video files in /storage.  
Chrometizer will open port 8080. For chromecast to be able to play you will need 
to proxy (nginx, apache, ha-proxy etc.) or port-forward 80 -> 8080 (iptables) 
or use the systemd service.  
Create /storage/.chrometizer.json if needed.
```
# run once
/usr/local/bin/chrometizer
# ctrl+c to kill

# startup service
wget https://raw.githubusercontent.com/mobileblobs/chrometizer/master/dist/chrometizer.service
# EDIT the file then :
sudo cp chrometizer.service /lib/systemd/system/
sudo systemctl enable chrometizer.service
sudo systemctl start chrometizer
```

## Use (clients)
#### Web
There is built-in web client which you can use at 
http://server_lan_ip/. You will need to use the LAN IP of the machine 
(the host if docker) if you want to cast.
#### Android
[chrometizer](https://play.google.com/store/apps/details?id=com.mobileblobs.chrometizer.cast.player) is free!
