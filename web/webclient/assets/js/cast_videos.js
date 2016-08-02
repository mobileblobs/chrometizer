
/**
 * Sample app (slightly modified) from : https://github.com/googlecast/CastVideos-chrome  
 */
(function() {
	'use strict';

	/**
	 * Media source root URL
	 **/
	//filled up later during init

	/**
	 * Width of progress bar in pixel
	 **/
	var PROGRESS_BAR_WIDTH = 600;

	/**
	 * Constants of states for Chromecast device 
	 **/
	var DEVICE_STATE = {
		'IDLE' : 0,
		'ACTIVE' : 1,
		'WARNING' : 2,
		'ERROR' : 3,
	};

	/**
	 * Constants of states for CastPlayer 
	 **/
	var PLAYER_STATE = {
		'IDLE' : 'IDLE',
		'LOADING' : 'LOADING',
		'LOADED' : 'LOADED',
		'PLAYING' : 'PLAYING',
		'PAUSED' : 'PAUSED',
		'STOPPED' : 'STOPPED',
		'SEEKING' : 'SEEKING',
		'ERROR' : 'ERROR'
	};

	/**
	 * Cast player object
	 * main variables:
	 *  - deviceState for Cast mode: 
	 *    IDLE: Default state indicating that Cast extension is installed, but showing no current activity
	 *    ACTIVE: Shown when Chrome has one or more local activities running on a receiver
	 *    WARNING: Shown when the device is actively being used, but when one or more issues have occurred
	 *    ERROR: Should not normally occur, but shown when there is a failure 
	 *  - Cast player variables for controlling Cast mode media playback 
	 *  - Local player variables for controlling local mode media playbacks
	 *  - Current media variables for transition between Cast and local modes
	 */
	var CastPlayer = function() {
		/* device variables */
		// @type {DEVICE_STATE} A state for device
		this.deviceState = DEVICE_STATE.IDLE;

		/* receivers available */
		// @type {boolean} A boolean to indicate availability of receivers
		this.receivers_available = false;

		/* Cast player variables */
		// @type {Object} a chrome.cast.media.Media object
		this.currentMediaSession = null;
		// @type {Number} volume
		this.currentVolume = 0.5;
		// @type {Boolean} A flag for autoplay after load
		this.autoplay = true;
		// @type {string} a chrome.cast.Session object
		this.session = null;
		// @type {PLAYER_STATE} A state for Cast media player
		this.castPlayerState = PLAYER_STATE.IDLE;

		/* Local player variables */
		// @type {PLAYER_STATE} A state for local media player
		this.localPlayerState = PLAYER_STATE.IDLE;
		// @type {HTMLElement} local player
		this.localPlayer = null;
		// @type {Boolean} Fullscreen mode on/off
		this.fullscreen = false;

		/* Current media variables */
		// @type {Boolean} Audio on and off
		this.audio = true;
		// @type {Number} A number for current media time
		this.currentMediaTime = 0;
		// @type {Number} A number for current media duration
		this.currentMediaDuration = -1;
		// @type {Timer} A timer for tracking progress of media
		this.timer = null;
		// @type {Boolean} A boolean to stop timer update of progress when triggered by media status event 
		this.progressFlag = true;
		// @type {Number} A number in milliseconds for minimal progress update
		this.timerStep = 1000;

		/* media contents from JSON */
		this.mediaContents = null;

		this.initializeCastPlayer();
		this.initializeLocalPlayer();
	};

	/**
	 * Initialize local media player 
	 */
	CastPlayer.prototype.initializeLocalPlayer = function() {
		this.localPlayer = document.getElementById('video_element');
		this.localPlayer.addEventListener('loadeddata', this.onMediaLoadedLocally.bind(this));
	};

	/**
	 * Initialize Cast media player 
	 * Initializes the API. Note that either successCallback and errorCallback will be
	 * invoked once the API has finished initialization. The sessionListener and 
	 * receiverListener may be invoked at any time afterwards, and possibly more than once. 
	 */
	CastPlayer.prototype.initializeCastPlayer = function() {

		if (!chrome.cast || !chrome.cast.isAvailable) {
			setTimeout(this.initializeCastPlayer.bind(this), 1000);
			return;
		}

		// auto join policy can be one of the following three
		var autoJoinPolicy = chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED;
		//var autoJoinPolicy = chrome.cast.AutoJoinPolicy.PAGE_SCOPED;
		//var autoJoinPolicy = chrome.cast.AutoJoinPolicy.TAB_AND_ORIGIN_SCOPED;

		// request session
		var sessionRequest = new chrome.cast.SessionRequest(chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID);
		var apiConfig = new chrome.cast.ApiConfig(sessionRequest, this.sessionListener.bind(this), this.receiverListener.bind(this), autoJoinPolicy);

		chrome.cast.initialize(apiConfig, this.onInitSuccess.bind(this), this.onError.bind(this));

		/*this.addVideoThumbs();*/
		this.initializeUI();
	};

	/**
	 * Callback function for init success 
	 */
	CastPlayer.prototype.onInitSuccess = function() {
		//console.log("init success");
		this.updateMediaControlUI();
	};

	/**
	 * Generic error callback function 
	 */
	CastPlayer.prototype.onError = function() {
		console.log("error");
	};

	/**
	 * @param {!Object} e A new session
	 * This handles auto-join when a page is reloaded
	 * When active session is detected, playback will automatically
	 * join existing session and occur in Cast mode and media
	 * status gets synced up with current media of the session 
	 */
	CastPlayer.prototype.sessionListener = function(e) {
		this.session = e;
		if (this.session) {
			this.deviceState = DEVICE_STATE.ACTIVE;
			if (this.session.media[0]) {
				this.onMediaDiscovered('activeSession', this.session.media[0]);
				//this.syncCurrentMedia(this.session.media[0].media.contentId);
				this.selectMediaUpdateUI();
				this.updateDisplayMessage();
			} else {
				this.loadMedia();
			}
			this.session.addUpdateListener(this.sessionUpdateListener.bind(this));
		}
	}

	/**
	 * @param {string} e Receiver availability
	 * This indicates availability of receivers but
	 * does not provide a list of device IDs
	 */
	CastPlayer.prototype.receiverListener = function(e) {
		if (e === 'available') {
			this.receivers_available = true;
			this.updateMediaControlUI();
			//console.log("receiver found");
		} else {
			// alert ?
			//console.log("receiver list empty");
		}
	};

	/**
	 * session update listener
	 */
	CastPlayer.prototype.sessionUpdateListener = function(isAlive) {
		if (!isAlive) {
			this.session = null;
			this.deviceState = DEVICE_STATE.IDLE;
			this.castPlayerState = PLAYER_STATE.IDLE;
			this.currentMediaSession = null;
			clearInterval(this.timer);
			this.updateDisplayMessage();

			var online = navigator.onLine;
			if (online == true) {
				// continue to play media locally
				console.log("current time: " + this.currentMediaTime);
				this.playMediaLocally();
				this.updateMediaControlUI();
			}
		}
	};

	/**
	 * Select a media content
	 */
	CastPlayer.prototype.selectMedia = function() {
		console.log("media selected : " + cur_video_rurl);

		// reset progress bar
		var pi = document.getElementById("progress_indicator");
		var p = document.getElementById("progress");

		// reset currentMediaTime
		this.currentMediaTime = 0;

		p.style.width = '0px';
		pi.style.marginLeft = -21 - PROGRESS_BAR_WIDTH + 'px';

		if (!this.currentMediaSession) {
			this.localPlayerState = PLAYER_STATE.IDLE;
			this.playMediaLocally();
		} else {
			this.castPlayerState = PLAYER_STATE.IDLE;
			this.playMedia();
		}
		this.selectMediaUpdateUI();
	};

	/**
	 * Requests that a receiver application session be created or joined. By default, the SessionRequest
	 * passed to the API at initialization time is used; this may be overridden by passing a different
	 * session request in opt_sessionRequest. 
	 */
	CastPlayer.prototype.launchApp = function() {
		console.log("launching app...");
		chrome.cast.requestSession(this.sessionListener.bind(this), this.onLaunchError.bind(this));
		if (this.timer) {
			clearInterval(this.timer);
		}
	};

	/**
	 * Callback function for request session success 
	 * @param {Object} e A chrome.cast.Session object
	 */
	CastPlayer.prototype.onRequestSessionSuccess = function(e) {
		console.log("session success: " + e.sessionId);
		this.session = e;
		this.deviceState = DEVICE_STATE.ACTIVE;
		this.updateMediaControlUI();
		this.loadMedia();
		this.session.addUpdateListener(this.sessionUpdateListener.bind(this));
	};

	/**
	 * Callback function for launch error
	 */
	CastPlayer.prototype.onLaunchError = function() {
		console.log("launch error");
		this.deviceState = DEVICE_STATE.ERROR;
	};

	/**
	 * Stops the running receiver application associated with the session.
	 */
	CastPlayer.prototype.stopApp = function() {
		this.session.stop(this.onStopAppSuccess.bind(this, 'Session stopped'), this.onError.bind(this));

	};

	/**
	 * Callback function for stop app success 
	 */
	CastPlayer.prototype.onStopAppSuccess = function(message) {
		console.log(message);
		this.deviceState = DEVICE_STATE.IDLE;
		this.castPlayerState = PLAYER_STATE.IDLE;
		this.currentMediaSession = null;
		clearInterval(this.timer);
		this.updateDisplayMessage();

		// continue to play media locally
		console.log("current time: " + this.currentMediaTime);
		this.playMediaLocally();
		this.updateMediaControlUI();
	};

	/**
	 * Loads media into a running receiver application
	 */
	CastPlayer.prototype.loadMedia = function() {
		if (!this.session) {
			console.log("no session");
			return;
		}
		console.log("loading..." + cur_video_rurl);
		var mediaInfo = new chrome.cast.media.MediaInfo(cur_video_rurl);

		mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata();
		mediaInfo.metadata.metadataType = chrome.cast.media.MetadataType.GENERIC;
		mediaInfo.contentType = 'video/mp4';

		mediaInfo.metadata.title = cur_video_rurl;

		var request = new chrome.cast.media.LoadRequest(mediaInfo);
		request.autoplay = this.autoplay;
		if (this.localPlayerState == PLAYER_STATE.PLAYING) {
			request.currentTime = this.localPlayer.currentTime;
			this.localPlayer.pause();
			this.localPlayerState = PLAYER_STATE.STOPPED;
		} else {
			request.currentTime = 0;
		}

		this.castPlayerState = PLAYER_STATE.LOADING;
		this.session.loadMedia(request, this.onMediaDiscovered.bind(this, 'loadMedia'), this.onLoadMediaError.bind(this));

	};

	/**
	 * Callback function for loadMedia success
	 * @param {Object} mediaSession A new media object.
	 */
	CastPlayer.prototype.onMediaDiscovered = function(how, mediaSession) {
		console.log("new media session ID:" + mediaSession.mediaSessionId + ' (' + how + ')');
		this.currentMediaSession = mediaSession;
		if (how == 'loadMedia') {
			if (this.autoplay) {
				this.castPlayerState = PLAYER_STATE.PLAYING;
			} else {
				this.castPlayerState = PLAYER_STATE.LOADED;
			}
		}

		if (how == 'activeSession') {
			this.castPlayerState = this.session.media[0].playerState;
			this.currentMediaTime = this.session.media[0].currentTime;
		}

		if (this.castPlayerState == PLAYER_STATE.PLAYING) {
			// start progress timer
			this.startProgressTimer(this.incrementMediaTime);
		}

		this.currentMediaSession.addUpdateListener(this.onMediaStatusUpdate.bind(this));

		this.currentMediaDuration = this.currentMediaSession.media.duration;
		var duration = this.currentMediaDuration;
		var hr = parseInt(duration / 3600);
		duration -= hr * 3600;
		var min = parseInt(duration / 60);
		var sec = parseInt(duration % 60);
		if (hr > 0) {
			duration = hr + ":" + min + ":" + sec;
		} else {
			if (min > 0) {
				duration = min + ":" + sec;
			} else {
				duration = sec;
			}
		}
		document.getElementById("duration").innerHTML = duration;

		if (this.localPlayerState == PLAYER_STATE.PLAYING) {
			this.localPlayerState == PLAYER_STATE.STOPPED;
			var vi = document.getElementById('video_image')
			vi.style.display = 'block';
			this.localPlayer.style.display = 'none';
			// start progress timer
			this.startProgressTimer(this.incrementMediaTime);
		}
		// update UIs
		this.updateMediaControlUI();
		this.updateDisplayMessage();
	};

	/**
	 * Callback function when media load returns error 
	 */
	CastPlayer.prototype.onLoadMediaError = function(e) {
		console.log("media error");
		this.castPlayerState = PLAYER_STATE.IDLE;
		// update UIs
		this.updateMediaControlUI();
		this.updateDisplayMessage();
	};

	/**
	 * Callback function for media status update from receiver
	 * @param {!Boolean} e true/false
	 */
	CastPlayer.prototype.onMediaStatusUpdate = function(e) {
		if (e == false) {
			this.currentMediaTime = 0;
			this.castPlayerState = PLAYER_STATE.IDLE;
		}
		console.log("updating media");
		this.updateProgressBar(e);
		this.updateDisplayMessage();
		this.updateMediaControlUI();
	};

	/**
	 * Helper function
	 * Increment media current position by 1 second 
	 */
	CastPlayer.prototype.incrementMediaTime = function() {
		if (this.castPlayerState == PLAYER_STATE.PLAYING || this.localPlayerState == PLAYER_STATE.PLAYING) {
			if (this.currentMediaTime < this.currentMediaDuration) {
				this.currentMediaTime += 1;
				this.updateProgressBarByTimer();
			} else {
				this.currentMediaTime = 0;
				clearInterval(this.timer);
			}
		}
	};

	/**
	 * Play media in local player
	 */
	CastPlayer.prototype.playMediaLocally = function() {
		//var vi = document.getElementById('video_image')
		//vi.style.display = 'none';
		this.localPlayer.style.display = 'block';
		if (this.localPlayerState != PLAYER_STATE.PLAYING && this.localPlayerState != PLAYER_STATE.PAUSED) {
			this.localPlayer.src = cur_video_rurl;
			this.localPlayer.load();
		} else {
			this.localPlayer.play();
			// start progress timer
			this.startProgressTimer(this.incrementMediaTime);
		}
		this.localPlayerState = PLAYER_STATE.PLAYING;
		this.updateMediaControlUI();
	};

	/**
	 * Callback when media is loaded in local player 
	 */
	CastPlayer.prototype.onMediaLoadedLocally = function() {
		this.currentMediaDuration = this.localPlayer.duration;
		var duration = this.currentMediaDuration;

		var hr = parseInt(duration / 3600);
		duration -= hr * 3600;
		var min = parseInt(duration / 60);
		var sec = parseInt(duration % 60);
		if (hr > 0) {
			duration = hr + ":" + min + ":" + sec;
		} else {
			if (min > 0) {
				duration = min + ":" + sec;
			} else {
				duration = sec;
			}
		}
		document.getElementById("duration").innerHTML = duration;
		this.localPlayer.currentTime = this.currentMediaTime;

		this.localPlayer.play();
		// start progress timer
		this.startProgressTimer(this.incrementMediaTime);
	};

	/**
	 * Play media in Cast mode 
	 */
	CastPlayer.prototype.playMedia = function() {
		if (!this.currentMediaSession) {
			this.playMediaLocally();
			return;
		}

		switch (this.castPlayerState) {
		case PLAYER_STATE.LOADED:
		case PLAYER_STATE.PAUSED:
			this.currentMediaSession.play(null, this.mediaCommandSuccessCallback.bind(this, "playing started for " + this.currentMediaSession.sessionId), this.onError.bind(this));
			this.currentMediaSession.addUpdateListener(this.onMediaStatusUpdate.bind(this));
			this.castPlayerState = PLAYER_STATE.PLAYING;
			// start progress timer
			this.startProgressTimer(this.incrementMediaTime);
			break;
		case PLAYER_STATE.IDLE:
		case PLAYER_STATE.LOADING:
		case PLAYER_STATE.STOPPED:
			this.loadMedia();
			this.currentMediaSession.addUpdateListener(this.onMediaStatusUpdate.bind(this));
			this.castPlayerState = PLAYER_STATE.PLAYING;
			break;
		default:
			break;
		}
		this.updateMediaControlUI();
		this.updateDisplayMessage();
	};

	/**
	 * Pause media playback in Cast mode  
	 */
	CastPlayer.prototype.pauseMedia = function() {
		if (!this.currentMediaSession) {
			this.pauseMediaLocally();
			return;
		}

		if (this.castPlayerState == PLAYER_STATE.PLAYING) {
			this.castPlayerState = PLAYER_STATE.PAUSED;
			this.currentMediaSession.pause(null, this.mediaCommandSuccessCallback.bind(this, "paused " + this.currentMediaSession.sessionId), this.onError.bind(this));
			this.updateMediaControlUI();
			this.updateDisplayMessage();
			clearInterval(this.timer);
		}
	};

	/**
	 * Pause media playback in local player 
	 */
	CastPlayer.prototype.pauseMediaLocally = function() {
		this.localPlayer.pause();
		this.localPlayerState = PLAYER_STATE.PAUSED;
		this.updateMediaControlUI();
		clearInterval(this.timer);
	};

	/**
	 * Stop media playback in either Cast or local mode  
	 */
	CastPlayer.prototype.stopMedia = function() {
		if (!this.currentMediaSession) {
			this.stopMediaLocally();
			return;
		}

		this.currentMediaSession.stop(null, this.mediaCommandSuccessCallback.bind(this, "stopped " + this.currentMediaSession.sessionId), this.onError.bind(this));
		this.castPlayerState = PLAYER_STATE.STOPPED;
		clearInterval(this.timer);

		this.updateDisplayMessage();
		this.updateMediaControlUI();
	};

	/**
	 * Stop media playback in local player
	 */
	CastPlayer.prototype.stopMediaLocally = function() {
		var vi = document.getElementById('video_image')
		vi.style.display = 'block';
		this.localPlayer.style.display = 'none';
		this.localPlayer.stop();
		this.localPlayerState = PLAYER_STATE.STOPPED;
		this.updateMediaControlUI();
	};

	/**
	 * Set media volume in Cast mode
	 * @param {Boolean} mute A boolean  
	 */
	CastPlayer.prototype.setReceiverVolume = function(mute) {
		var p = document.getElementById("audio_bg_level");
		if (event.currentTarget.id == 'audio_bg_track') {
			var pos = 100 - parseInt(event.offsetY);
		} else {
			var pos = parseInt(p.clientHeight) - parseInt(event.offsetY);
		}
		if (!this.currentMediaSession) {
			this.localPlayer.volume = pos < 100 ? pos / 100 : 1;
			p.style.height = pos + 'px';
			p.style.marginTop = -pos + 'px';
			return;
		}

		if (event.currentTarget.id == 'audio_bg_track' || event.currentTarget.id == 'audio_bg_level') {
			// add a drag to avoid loud volume
			if (pos < 100) {
				var vScale = this.currentVolume * 100;
				if (pos > vScale) {
					pos = vScale + (pos - vScale) / 2;
				}
				p.style.height = pos + 'px';
				p.style.marginTop = -pos + 'px';
				this.currentVolume = pos / 100;
			} else {
				this.currentVolume = 1;
			}
		}

		if (!mute) {
			this.session.setReceiverVolumeLevel(this.currentVolume, this.mediaCommandSuccessCallback.bind(this), this.onError.bind(this));
		} else {
			this.session.setReceiverMuted(true, this.mediaCommandSuccessCallback.bind(this), this.onError.bind(this));
		}
		this.updateMediaControlUI();
	};

	/**
	 * Mute media function in either Cast or local mode 
	 */
	CastPlayer.prototype.muteMedia = function() {
		if (this.audio == true) {
			this.audio = false;
			document.getElementById('audio_on').style.display = 'none';
			document.getElementById('audio_off').style.display = 'block';
			if (this.currentMediaSession) {
				this.setReceiverVolume(true);
			} else {
				this.localPlayer.muted = true;
			}
		} else {
			this.audio = true;
			document.getElementById('audio_on').style.display = 'block';
			document.getElementById('audio_off').style.display = 'none';
			if (this.currentMediaSession) {
				this.setReceiverVolume(false);
			} else {
				this.localPlayer.muted = false;
			}
		}
		this.updateMediaControlUI();
	};

	/**
	 * media seek function in either Cast or local mode
	 * @param {Event} e An event object from seek 
	 */
	CastPlayer.prototype.seekMedia = function(event) {
		var pos = parseInt(event.offsetX);
		var pi = document.getElementById("progress_indicator");
		var p = document.getElementById("progress");
		if (event.currentTarget.id == 'progress_indicator') {
			var curr = parseInt(this.currentMediaTime + this.currentMediaDuration * pos / PROGRESS_BAR_WIDTH);
			var pp = parseInt(pi.style.marginLeft) + pos;
			var pw = parseInt(p.style.width) + pos;
		} else {
			var curr = parseInt(pos * this.currentMediaDuration / PROGRESS_BAR_WIDTH);
			var pp = pos - 21 - PROGRESS_BAR_WIDTH;
			var pw = pos;
		}

		if (this.localPlayerState == PLAYER_STATE.PLAYING || this.localPlayerState == PLAYER_STATE.PAUSED) {
			this.localPlayer.currentTime = curr;
			this.currentMediaTime = curr;
			this.localPlayer.play();
		}

		if (this.localPlayerState == PLAYER_STATE.PLAYING || this.localPlayerState == PLAYER_STATE.PAUSED || this.castPlayerState == PLAYER_STATE.PLAYING || this.castPlayerState == PLAYER_STATE.PAUSED) {
			p.style.width = pw + 'px';
			pi.style.marginLeft = pp + 'px';
		}

		if (this.castPlayerState != PLAYER_STATE.PLAYING && this.castPlayerState != PLAYER_STATE.PAUSED) {
			return;
		}

		this.currentMediaTime = curr;
		console.log('Seeking ' + this.currentMediaSession.sessionId + ':' + this.currentMediaSession.mediaSessionId + ' to ' + pos + "%");
		var request = new chrome.cast.media.SeekRequest();
		request.currentTime = this.currentMediaTime;
		this.currentMediaSession.seek(request, this.onSeekSuccess.bind(this, 'media seek done'), this.onError.bind(this));
		this.castPlayerState = PLAYER_STATE.SEEKING;

		this.updateDisplayMessage();
		this.updateMediaControlUI();
	};

	/**
	 * Callback function for seek success
	 * @param {String} info A string that describe seek event
	 */
	CastPlayer.prototype.onSeekSuccess = function(info) {
		console.log(info);
		this.castPlayerState = PLAYER_STATE.PLAYING;
		this.updateDisplayMessage();
		this.updateMediaControlUI();
	};

	/**
	 * Callback function for media command success 
	 */
	CastPlayer.prototype.mediaCommandSuccessCallback = function(info, e) {
		console.log(info);
	};

	/**
	 * Update progress bar when there is a media status update
	 * @param {Object} e An media status update object 
	 */
	CastPlayer.prototype.updateProgressBar = function(e) {
		var p = document.getElementById("progress");
		var pi = document.getElementById("progress_indicator");
		if (e == false) {
			p.style.width = '0px';
			pi.style.marginLeft = -21 - PROGRESS_BAR_WIDTH + 'px';
			clearInterval(this.timer);
			this.castPlayerState = PLAYER_STATE.STOPPED;
			this.updateDisplayMessage();
		} else {
			p.style.width = Math.ceil(PROGRESS_BAR_WIDTH * this.currentMediaSession.currentTime / this.currentMediaSession.media.duration + 1) + 'px';
			this.progressFlag = false;
			setTimeout(this.setProgressFlag.bind(this), 1000); // don't update progress in 1 second
			var pp = Math.ceil(PROGRESS_BAR_WIDTH * this.currentMediaSession.currentTime / this.currentMediaSession.media.duration);
			pi.style.marginLeft = -21 - PROGRESS_BAR_WIDTH + pp + 'px';
		}
	};

	/**
	 * Set progressFlag with a timeout of 1 second to avoid UI update
	 * until a media status update from receiver 
	 */
	CastPlayer.prototype.setProgressFlag = function() {
		this.progressFlag = true;
	};

	/**
	 * Update progress bar based on timer  
	 */
	CastPlayer.prototype.updateProgressBarByTimer = function() {
		var p = document.getElementById("progress");
		if (isNaN(parseInt(p.style.width))) {
			p.style.width = 0;
		}
		if (this.currentMediaDuration > 0) {
			var pp = Math.floor(PROGRESS_BAR_WIDTH * this.currentMediaTime / this.currentMediaDuration);
		}

		if (this.progressFlag) {
			// don't update progress if it's been updated on media status update event
			p.style.width = pp + 'px';
			var pi = document.getElementById("progress_indicator");
			pi.style.marginLeft = -21 - PROGRESS_BAR_WIDTH + pp + 'px';
		}

		if (pp > PROGRESS_BAR_WIDTH) {
			clearInterval(this.timer);
			this.deviceState = DEVICE_STATE.IDLE;
			this.castPlayerState = PLAYER_STATE.IDLE;
			this.updateDisplayMessage();
			this.updateMediaControlUI();
		}
	};

	/**
	 * Update display message depending on cast mode by deviceState 
	 */
	CastPlayer.prototype.updateDisplayMessage = function() {
		if (this.deviceState != DEVICE_STATE.ACTIVE || this.castPlayerState == PLAYER_STATE.IDLE || this.castPlayerState == PLAYER_STATE.STOPPED) {
			document.getElementById("playerstate").style.display = 'none';
			document.getElementById("playerstatebg").style.display = 'none';
			document.getElementById("play").style.display = 'block';
			//document.getElementById("video_image_overlay").style.display = 'none';
		} else {
			document.getElementById("playerstate").style.display = 'block';
			document.getElementById("playerstatebg").style.display = 'block';
			document.getElementById("video_image_overlay").style.display = 'block';
		}
	}

	/**
	 * Update media control UI components based on localPlayerState or castPlayerState
	 */
	CastPlayer.prototype.updateMediaControlUI = function() {
		var playerState = this.deviceState == DEVICE_STATE.ACTIVE ? this.castPlayerState : this.localPlayerState;
		switch (playerState) {
		case PLAYER_STATE.LOADED:
		case PLAYER_STATE.PLAYING:
			document.getElementById("play").style.display = 'none';
			document.getElementById("pause").style.display = 'block';
			break;
		case PLAYER_STATE.PAUSED:
		case PLAYER_STATE.IDLE:
		case PLAYER_STATE.LOADING:
		case PLAYER_STATE.STOPPED:
			document.getElementById("play").style.display = 'block';
			document.getElementById("pause").style.display = 'none';
			break;
		default:
			break;
		}

		if (!this.receivers_available) {
			document.getElementById("casticonactive").style.display = 'none';
			document.getElementById("casticonidle").style.display = 'none';
			return;
		}

		if (this.deviceState == DEVICE_STATE.ACTIVE) {
			document.getElementById("casticonactive").style.display = 'block';
			document.getElementById("casticonidle").style.display = 'none';
			this.hideFullscreenButton();
		} else {
			document.getElementById("casticonidle").style.display = 'block';
			document.getElementById("casticonactive").style.display = 'none';
			this.showFullscreenButton();
		}
	}

	/**
	 * Update UI components after selectMedia call 
	 */
	CastPlayer.prototype.selectMediaUpdateUI = function() {
		document.getElementById("progress").style.width = '0px';
	};

	/**
	 * Initialize UI components and add event listeners 
	 */
	CastPlayer.prototype.initializeUI = function() {
		// set initial values for title, subtitle, and description 
		// add event handlers to UI components
		document.getElementById("casticonidle").addEventListener('click', this.launchApp.bind(this));
		document.getElementById("casticonactive").addEventListener('click', this.stopApp.bind(this));
		document.getElementById("progress_bg").addEventListener('click', this.seekMedia.bind(this));
		document.getElementById("progress").addEventListener('click', this.seekMedia.bind(this));
		document.getElementById("progress_indicator").addEventListener('dragend', this.seekMedia.bind(this));
		document.getElementById("audio_on").addEventListener('click', this.muteMedia.bind(this));
		document.getElementById("audio_off").addEventListener('click', this.muteMedia.bind(this));
		document.getElementById("audio_bg").addEventListener('mouseover', this.showVolumeSlider.bind(this));
		document.getElementById("audio_on").addEventListener('mouseover', this.showVolumeSlider.bind(this));
		document.getElementById("audio_bg_level").addEventListener('mouseover', this.showVolumeSlider.bind(this));
		document.getElementById("audio_bg_track").addEventListener('mouseover', this.showVolumeSlider.bind(this));
		document.getElementById("audio_bg_level").addEventListener('click', this.setReceiverVolume.bind(this, false));
		document.getElementById("audio_bg_track").addEventListener('click', this.setReceiverVolume.bind(this, false));
		document.getElementById("audio_bg").addEventListener('mouseout', this.hideVolumeSlider.bind(this));
		document.getElementById("audio_on").addEventListener('mouseout', this.hideVolumeSlider.bind(this));
		document.getElementById("media_control").addEventListener('mouseover', this.showMediaControl.bind(this));
		document.getElementById("media_control").addEventListener('mouseout', this.hideMediaControl.bind(this));
		document.getElementById("fullscreen_expand").addEventListener('click', this.requestFullScreen.bind(this));
		document.getElementById("fullscreen_collapse").addEventListener('click', this.cancelFullScreen.bind(this));
		document.addEventListener("fullscreenchange", this.changeHandler.bind(this), false);
		document.addEventListener("webkitfullscreenchange", this.changeHandler.bind(this), false);

		// enable play/pause buttons
		document.getElementById("play").addEventListener('click', this.playMedia.bind(this));
		document.getElementById("pause").addEventListener('click', this.pauseMedia.bind(this));
		document.getElementById("progress_indicator").draggable = true;

	};

	/**
	 * Show the media control 
	 */
	CastPlayer.prototype.showMediaControl = function() {
		document.getElementById('media_control').style.opacity = 0.7;
	};

	/**
	 * Hide the media control  
	 */
	CastPlayer.prototype.hideMediaControl = function() {
		document.getElementById('media_control').style.opacity = 0;
	};

	/**
	 * Show the volume slider
	 */
	CastPlayer.prototype.showVolumeSlider = function() {
		document.getElementById('audio_bg').style.opacity = 1;
		document.getElementById('audio_bg_track').style.opacity = 1;
		document.getElementById('audio_bg_level').style.opacity = 1;
		document.getElementById('audio_indicator').style.opacity = 1;
	};

	/**
	 * Hide the volume slider 
	 */
	CastPlayer.prototype.hideVolumeSlider = function() {
		document.getElementById('audio_bg').style.opacity = 0;
		document.getElementById('audio_bg_track').style.opacity = 0;
		document.getElementById('audio_bg_level').style.opacity = 0;
		document.getElementById('audio_indicator').style.opacity = 0;
	};

	/**
	 * Request full screen mode 
	 */
	CastPlayer.prototype.requestFullScreen = function() {
		// Supports most browsers and their versions.
		var element = document.getElementById("video_element");
		var requestMethod = element.requestFullScreen || element.webkitRequestFullScreen;

		if (requestMethod) { // Native full screen.
			requestMethod.call(element);
			console.log("requested fullscreen");
		}
	};

	/**
	 * Exit full screen mode 
	 */
	CastPlayer.prototype.cancelFullScreen = function() {
		// Supports most browsers and their versions.
		var requestMethod = document.cancelFullScreen || document.webkitCancelFullScreen;

		if (requestMethod) {
			requestMethod.call(document);
		}
	};

	/**
	 * Exit fullscreen mode by escape 
	 */
	CastPlayer.prototype.changeHandler = function() {
		this.fullscreen = !this.fullscreen;
		if (this.deviceState == DEVICE_STATE.ACTIVE) {
			this.hideFullscreenButton();
		} else {
			this.showFullscreenButton();
		}
	};

	/**
	 * Show expand/collapse fullscreen button
	 */
	CastPlayer.prototype.showFullscreenButton = function() {
		if (this.fullscreen) {
			document.getElementById('fullscreen_expand').style.display = 'none';
			document.getElementById('fullscreen_collapse').style.display = 'block';
		} else {
			document.getElementById('fullscreen_expand').style.display = 'block';
			document.getElementById('fullscreen_collapse').style.display = 'none';
		}
	};

	/**
	 * Hide expand/collapse fullscreen button
	 */
	CastPlayer.prototype.hideFullscreenButton = function() {
		document.getElementById('fullscreen_expand').style.display = 'none';
		document.getElementById('fullscreen_collapse').style.display = 'none';
	};

	/**
	 * @param {function} A callback function for the function to start timer 
	 */
	CastPlayer.prototype.startProgressTimer = function(callback) {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}

		// start progress timer
		this.timer = setInterval(callback.bind(this), this.timerStep);
	};

	/**
	 * Callback function for AJAX call on load error
	 */
	CastPlayer.prototype.onMediaJsonError = function() {
		console.log("Failed to load media JSON");
	}

	window.CastPlayer = CastPlayer;
})();

/*############################*/

/**
 * cast page JS
 */
var pageNum = 0;
var sort = 0;
var media_source_root = location.protocol + '//';
var server_ext_ip;
var cur_video_rurl;

$(document).ready(function() {
	$.typeahead({
		input : ".js-typeahead",
		order : "asc",
		display : [ "Name" ],
		mustSelectItem : true,
		source : {
			videos : {
				ajax : {
					url : "/api/vnames"
				}
			}
		},
		callback : {
			onClick : function(node, form, item, event) {
				clearGrid();
				addVid(item.Rpath, item.Name);
				$('#sort').hide();
				$('#reset').show();
				$('#pagintor').hide();
			},
			onSubmit : function(node, form, item, event) {
				return false;
			}
		}
	});

	loadGrid();

	$('#next').click(function() {
		pageNum++;
		loadGrid();
	});

	$('#prev').click(function() {
		pageNum--;
		loadGrid();
	});

	$(".dds").click(function(event) {
		sort = this.id;
		pageNum = 0;
		loadGrid();
	});

});

function showPlayer(src) {
	cur_video_rurl = media_source_root + server_ext_ip + '/file' + src;
	$('#vplayer').show();
	castPlayer.selectMedia();
}

function stopclose() {
	castPlayer.pauseMedia();
	$('#vplayer').hide();
}

function loadGrid() {
	clearGrid();

	$.get("/api/cast?page=" + pageNum + "&sort=" + sort, function(spvf) {
		server_ext_ip = spvf.SeIP;		
		pageNum = spvf.Page;
		setPager(spvf.PSize, spvf.Total);
		setSort(spvf.Sort);

		$.each(spvf.Vfs, function(i, vf) {
			if (!vf.Err && vf.Ready) {
				addVid(vf.Path, vf.Name);
			}
		});

		if (spvf.Total > spvf.PSize) {
			$('#prev').prop('disabled', ((spvf.Page >= 1) ? false : true));
			$('#next').prop('disabled', (((spvf.Page + 1) * spvf.PSize) > spvf.Total ? true : false));
			$('#pagintor').show();
		}
	})
}

function setSort(lsort) {
	$('.dds').show();
	sort = lsort;
	selSort = $('#' + sort);
	selSort.hide();
	$('#cur_sort').html(selSort.text() + '&nbsp;<span class="caret"></span>');
}

function setPager(pSize, total) {
	var ps = pageNum == 0 ? 1 : (pageNum * pSize) + 1;
	var pe = ps + pSize - 1;
	if (pe > total)
		pe = total;
	$('#pgtext').text(ps + '-' + pe + ' of ' + total);
}

function clearGrid() {
	$('#hvids').html("");
	$('#html5-videos').html("");
}

function addVid(vdSrc, vdName) {

	var vl = vdName.indexOf('cast-ready');
	var crm = vl < 28 ? vl : 28; // smallest possible screen -> img responsive!
	vname = vdName.substring(0, crm);
	$('#html5-videos').append(
			'<div class="col-lg-3 col-md-3 col-sm-6 col-xs-12 thumb video">' + '<div class="poster-image">' + '<a class="thumbnail" href="#" onclick="showPlayer(\'' + vdSrc + '\')">' + '<img class="img-responsive" src="/file/' + vdSrc + '.jpg"/>'
					+ '<small class="vtsub"><span class="vntext">' + vname + '</span></small>' + '</a>' + '</div>' + '</div>');
}

var castPlayer = new CastPlayer();
/*end of page specific JS */
