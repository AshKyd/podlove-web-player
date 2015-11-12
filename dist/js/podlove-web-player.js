(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/*!
 *
 * MediaElement.js
 * HTML5 <video> and <audio> shim and player
 * http://mediaelementjs.com/
 *
 * Creates a JavaScript object that mimics HTML5 MediaElement API
 * for browsers that don't understand HTML5 or can't play the provided codec
 * Can play MP4 (H.264), Ogg, WebM, FLV, WMV, WMA, ACC, and MP3
 *
 * Copyright 2010-2014, John Dyer (http://j.hn)
 * License: MIT
 *
 */
// Namespace
var mejs = mejs || {};

// version number
mejs.version = '2.16.4'; 


// player number (for missing, same id attr)
mejs.meIndex = 0;

// media types accepted by plugins
mejs.plugins = {
	silverlight: [
		{version: [3,0], types: ['video/mp4','video/m4v','video/mov','video/wmv','audio/wma','audio/m4a','audio/mp3','audio/wav','audio/mpeg']}
	],
	flash: [
		{version: [9,0,124], types: ['video/mp4','video/m4v','video/mov','video/flv','video/rtmp','video/x-flv','audio/flv','audio/x-flv','audio/mp3','audio/m4a','audio/mpeg', 'video/youtube', 'video/x-youtube', 'application/x-mpegURL']}
		//,{version: [12,0], types: ['video/webm']} // for future reference (hopefully!)
	],
	youtube: [
		{version: null, types: ['video/youtube', 'video/x-youtube', 'audio/youtube', 'audio/x-youtube']}
	],
	vimeo: [
		{version: null, types: ['video/vimeo', 'video/x-vimeo']}
	]
};

/*
Utility methods
*/
mejs.Utility = {
	encodeUrl: function(url) {
		return encodeURIComponent(url); //.replace(/\?/gi,'%3F').replace(/=/gi,'%3D').replace(/&/gi,'%26');
	},
	escapeHTML: function(s) {
		return s.toString().split('&').join('&amp;').split('<').join('&lt;').split('"').join('&quot;');
	},
	absolutizeUrl: function(url) {
		var el = document.createElement('div');
		el.innerHTML = '<a href="' + this.escapeHTML(url) + '">x</a>';
		return el.firstChild.href;
	},
	getScriptPath: function(scriptNames) {
		var
			i = 0,
			j,
			codePath = '',
			testname = '',
			slashPos,
			filenamePos,
			scriptUrl,
			scriptPath,			
			scriptFilename,
			scripts = document.getElementsByTagName('script'),
			il = scripts.length,
			jl = scriptNames.length;
			
		// go through all <script> tags
		for (; i < il; i++) {
			scriptUrl = scripts[i].src;
			slashPos = scriptUrl.lastIndexOf('/');
			if (slashPos > -1) {
				scriptFilename = scriptUrl.substring(slashPos + 1);
				scriptPath = scriptUrl.substring(0, slashPos + 1);
			} else {
				scriptFilename = scriptUrl;
				scriptPath = '';			
			}
			
			// see if any <script> tags have a file name that matches the 
			for (j = 0; j < jl; j++) {
				testname = scriptNames[j];
				filenamePos = scriptFilename.indexOf(testname);
				if (filenamePos > -1) {
					codePath = scriptPath;
					break;
				}
			}
			
			// if we found a path, then break and return it
			if (codePath !== '') {
				break;
			}
		}
		
		// send the best path back
		return codePath;
	},
	secondsToTimeCode: function(time, forceHours, showFrameCount, fps) {
		//add framecount
		if (typeof showFrameCount == 'undefined') {
		    showFrameCount=false;
		} else if(typeof fps == 'undefined') {
		    fps = 25;
		}
	
		var hours = Math.floor(time / 3600) % 24,
			minutes = Math.floor(time / 60) % 60,
			seconds = Math.floor(time % 60),
			frames = Math.floor(((time % 1)*fps).toFixed(3)),
			result = 
					( (forceHours || hours > 0) ? (hours < 10 ? '0' + hours : hours) + ':' : '')
						+ (minutes < 10 ? '0' + minutes : minutes) + ':'
						+ (seconds < 10 ? '0' + seconds : seconds)
						+ ((showFrameCount) ? ':' + (frames < 10 ? '0' + frames : frames) : '');
	
		return result;
	},
	
	timeCodeToSeconds: function(hh_mm_ss_ff, forceHours, showFrameCount, fps){
		if (typeof showFrameCount == 'undefined') {
		    showFrameCount=false;
		} else if(typeof fps == 'undefined') {
		    fps = 25;
		}
	
		var tc_array = hh_mm_ss_ff.split(":"),
			tc_hh = parseInt(tc_array[0], 10),
			tc_mm = parseInt(tc_array[1], 10),
			tc_ss = parseInt(tc_array[2], 10),
			tc_ff = 0,
			tc_in_seconds = 0;
		
		if (showFrameCount) {
		    tc_ff = parseInt(tc_array[3])/fps;
		}
		
		tc_in_seconds = ( tc_hh * 3600 ) + ( tc_mm * 60 ) + tc_ss + tc_ff;
		
		return tc_in_seconds;
	},
	

	convertSMPTEtoSeconds: function (SMPTE) {
		if (typeof SMPTE != 'string') 
			return false;

		SMPTE = SMPTE.replace(',', '.');
		
		var secs = 0,
			decimalLen = (SMPTE.indexOf('.') != -1) ? SMPTE.split('.')[1].length : 0,
			multiplier = 1;
		
		SMPTE = SMPTE.split(':').reverse();
		
		for (var i = 0; i < SMPTE.length; i++) {
			multiplier = 1;
			if (i > 0) {
				multiplier = Math.pow(60, i); 
			}
			secs += Number(SMPTE[i]) * multiplier;
		}
		return Number(secs.toFixed(decimalLen));
	},	
	
	/* borrowed from SWFObject: http://code.google.com/p/swfobject/source/browse/trunk/swfobject/src/swfobject.js#474 */
	removeSwf: function(id) {
		var obj = document.getElementById(id);
		if (obj && /object|embed/i.test(obj.nodeName)) {
			if (mejs.MediaFeatures.isIE) {
				obj.style.display = "none";
				(function(){
					if (obj.readyState == 4) {
						mejs.Utility.removeObjectInIE(id);
					} else {
						setTimeout(arguments.callee, 10);
					}
				})();
			} else {
				obj.parentNode.removeChild(obj);
			}
		}
	},
	removeObjectInIE: function(id) {
		var obj = document.getElementById(id);
		if (obj) {
			for (var i in obj) {
				if (typeof obj[i] == "function") {
					obj[i] = null;
				}
			}
			obj.parentNode.removeChild(obj);
		}		
	}
};


// Core detector, plugins are added below
mejs.PluginDetector = {

	// main public function to test a plug version number PluginDetector.hasPluginVersion('flash',[9,0,125]);
	hasPluginVersion: function(plugin, v) {
		var pv = this.plugins[plugin];
		v[1] = v[1] || 0;
		v[2] = v[2] || 0;
		return (pv[0] > v[0] || (pv[0] == v[0] && pv[1] > v[1]) || (pv[0] == v[0] && pv[1] == v[1] && pv[2] >= v[2])) ? true : false;
	},

	// cached values
	nav: window.navigator,
	ua: window.navigator.userAgent.toLowerCase(),

	// stored version numbers
	plugins: [],

	// runs detectPlugin() and stores the version number
	addPlugin: function(p, pluginName, mimeType, activeX, axDetect) {
		this.plugins[p] = this.detectPlugin(pluginName, mimeType, activeX, axDetect);
	},

	// get the version number from the mimetype (all but IE) or ActiveX (IE)
	detectPlugin: function(pluginName, mimeType, activeX, axDetect) {

		var version = [0,0,0],
			description,
			i,
			ax;

		// Firefox, Webkit, Opera
		if (typeof(this.nav.plugins) != 'undefined' && typeof this.nav.plugins[pluginName] == 'object') {
			description = this.nav.plugins[pluginName].description;
			if (description && !(typeof this.nav.mimeTypes != 'undefined' && this.nav.mimeTypes[mimeType] && !this.nav.mimeTypes[mimeType].enabledPlugin)) {
				version = description.replace(pluginName, '').replace(/^\s+/,'').replace(/\sr/gi,'.').split('.');
				for (i=0; i<version.length; i++) {
					version[i] = parseInt(version[i].match(/\d+/), 10);
				}
			}
		// Internet Explorer / ActiveX
		} else if (typeof(window.ActiveXObject) != 'undefined') {
			try {
				ax = new ActiveXObject(activeX);
				if (ax) {
					version = axDetect(ax);
				}
			}
			catch (e) { }
		}
		return version;
	}
};

// Add Flash detection
mejs.PluginDetector.addPlugin('flash','Shockwave Flash','application/x-shockwave-flash','ShockwaveFlash.ShockwaveFlash', function(ax) {
	// adapted from SWFObject
	var version = [],
		d = ax.GetVariable("$version");
	if (d) {
		d = d.split(" ")[1].split(",");
		version = [parseInt(d[0], 10), parseInt(d[1], 10), parseInt(d[2], 10)];
	}
	return version;
});

// Add Silverlight detection
mejs.PluginDetector.addPlugin('silverlight','Silverlight Plug-In','application/x-silverlight-2','AgControl.AgControl', function (ax) {
	// Silverlight cannot report its version number to IE
	// but it does have a isVersionSupported function, so we have to loop through it to get a version number.
	// adapted from http://www.silverlightversion.com/
	var v = [0,0,0,0],
		loopMatch = function(ax, v, i, n) {
			while(ax.isVersionSupported(v[0]+ "."+ v[1] + "." + v[2] + "." + v[3])){
				v[i]+=n;
			}
			v[i] -= n;
		};
	loopMatch(ax, v, 0, 1);
	loopMatch(ax, v, 1, 1);
	loopMatch(ax, v, 2, 10000); // the third place in the version number is usually 5 digits (4.0.xxxxx)
	loopMatch(ax, v, 2, 1000);
	loopMatch(ax, v, 2, 100);
	loopMatch(ax, v, 2, 10);
	loopMatch(ax, v, 2, 1);
	loopMatch(ax, v, 3, 1);

	return v;
});
// add adobe acrobat
/*
PluginDetector.addPlugin('acrobat','Adobe Acrobat','application/pdf','AcroPDF.PDF', function (ax) {
	var version = [],
		d = ax.GetVersions().split(',')[0].split('=')[1].split('.');

	if (d) {
		version = [parseInt(d[0], 10), parseInt(d[1], 10), parseInt(d[2], 10)];
	}
	return version;
});
*/
// necessary detection (fixes for <IE9)
mejs.MediaFeatures = {
	init: function() {
		var
			t = this,
			d = document,
			nav = mejs.PluginDetector.nav,
			ua = mejs.PluginDetector.ua.toLowerCase(),
			i,
			v,
			html5Elements = ['source','track','audio','video'];

		// detect browsers (only the ones that have some kind of quirk we need to work around)
		t.isiPad = (ua.match(/ipad/i) !== null);
		t.isiPhone = (ua.match(/iphone/i) !== null);
		t.isiOS = t.isiPhone || t.isiPad;
		t.isAndroid = (ua.match(/android/i) !== null);
		t.isBustedAndroid = (ua.match(/android 2\.[12]/) !== null);
		t.isBustedNativeHTTPS = (location.protocol === 'https:' && (ua.match(/android [12]\./) !== null || ua.match(/macintosh.* version.* safari/) !== null));
		t.isIE = (nav.appName.toLowerCase().indexOf("microsoft") != -1 || nav.appName.toLowerCase().match(/trident/gi) !== null);
		t.isChrome = (ua.match(/chrome/gi) !== null);
		t.isChromium = (ua.match(/chromium/gi) !== null);
		t.isFirefox = (ua.match(/firefox/gi) !== null);
		t.isWebkit = (ua.match(/webkit/gi) !== null);
		t.isGecko = (ua.match(/gecko/gi) !== null) && !t.isWebkit && !t.isIE;
		t.isOpera = (ua.match(/opera/gi) !== null);
		t.hasTouch = ('ontouchstart' in window); //  && window.ontouchstart != null); // this breaks iOS 7
		
		// borrowed from Modernizr
		t.svg = !! document.createElementNS &&
				!! document.createElementNS('http://www.w3.org/2000/svg','svg').createSVGRect;

		// create HTML5 media elements for IE before 9, get a <video> element for fullscreen detection
		for (i=0; i<html5Elements.length; i++) {
			v = document.createElement(html5Elements[i]);
		}
		
		t.supportsMediaTag = (typeof v.canPlayType !== 'undefined' || t.isBustedAndroid);

		// Fix for IE9 on Windows 7N / Windows 7KN (Media Player not installer)
		try{
			v.canPlayType("video/mp4");
		}catch(e){
			t.supportsMediaTag = false;
		}

		// detect native JavaScript fullscreen (Safari/Firefox only, Chrome still fails)
		
		// iOS
		t.hasSemiNativeFullScreen = (typeof v.webkitEnterFullscreen !== 'undefined');
		
		// W3C
		t.hasNativeFullscreen = (typeof v.requestFullscreen !== 'undefined');
		
		// webkit/firefox/IE11+
		t.hasWebkitNativeFullScreen = (typeof v.webkitRequestFullScreen !== 'undefined');
		t.hasMozNativeFullScreen = (typeof v.mozRequestFullScreen !== 'undefined');
		t.hasMsNativeFullScreen = (typeof v.msRequestFullscreen !== 'undefined');
		
		t.hasTrueNativeFullScreen = (t.hasWebkitNativeFullScreen || t.hasMozNativeFullScreen || t.hasMsNativeFullScreen);
		t.nativeFullScreenEnabled = t.hasTrueNativeFullScreen;
		
		// Enabled?
		if (t.hasMozNativeFullScreen) {
			t.nativeFullScreenEnabled = document.mozFullScreenEnabled;
		} else if (t.hasMsNativeFullScreen) {
			t.nativeFullScreenEnabled = document.msFullscreenEnabled;		
		}
		
		if (t.isChrome) {
			t.hasSemiNativeFullScreen = false;
		}
		
		if (t.hasTrueNativeFullScreen) {
			
			t.fullScreenEventName = '';
			if (t.hasWebkitNativeFullScreen) { 
				t.fullScreenEventName = 'webkitfullscreenchange';
				
			} else if (t.hasMozNativeFullScreen) {
				t.fullScreenEventName = 'mozfullscreenchange';
				
			} else if (t.hasMsNativeFullScreen) {
				t.fullScreenEventName = 'MSFullscreenChange';
			}
			
			t.isFullScreen = function() {
				if (t.hasMozNativeFullScreen) {
					return d.mozFullScreen;
				
				} else if (t.hasWebkitNativeFullScreen) {
					return d.webkitIsFullScreen;
				
				} else if (t.hasMsNativeFullScreen) {
					return d.msFullscreenElement !== null;
				}
			}
					
			t.requestFullScreen = function(el) {
		
				if (t.hasWebkitNativeFullScreen) {
					el.webkitRequestFullScreen();
					
				} else if (t.hasMozNativeFullScreen) {
					el.mozRequestFullScreen();

				} else if (t.hasMsNativeFullScreen) {
					el.msRequestFullscreen();

				}
			}
			
			t.cancelFullScreen = function() {				
				if (t.hasWebkitNativeFullScreen) {
					document.webkitCancelFullScreen();
					
				} else if (t.hasMozNativeFullScreen) {
					document.mozCancelFullScreen();
					
				} else if (t.hasMsNativeFullScreen) {
					document.msExitFullscreen();
					
				}
			}	
			
		}
		
		
		// OS X 10.5 can't do this even if it says it can :(
		if (t.hasSemiNativeFullScreen && ua.match(/mac os x 10_5/i)) {
			t.hasNativeFullScreen = false;
			t.hasSemiNativeFullScreen = false;
		}
		
	}
};
mejs.MediaFeatures.init();

/*
extension methods to <video> or <audio> object to bring it into parity with PluginMediaElement (see below)
*/
mejs.HtmlMediaElement = {
	pluginType: 'native',
	isFullScreen: false,

	setCurrentTime: function (time) {
		this.currentTime = time;
	},

	setMuted: function (muted) {
		this.muted = muted;
	},

	setVolume: function (volume) {
		this.volume = volume;
	},

	// for parity with the plugin versions
	stop: function () {
		this.pause();
	},

	// This can be a url string
	// or an array [{src:'file.mp4',type:'video/mp4'},{src:'file.webm',type:'video/webm'}]
	setSrc: function (url) {
		
		// Fix for IE9 which can't set .src when there are <source> elements. Awesome, right?
		var 
			existingSources = this.getElementsByTagName('source');
		while (existingSources.length > 0){
			this.removeChild(existingSources[0]);
		}
	
		if (typeof url == 'string') {
			this.src = url;
		} else {
			var i, media;

			for (i=0; i<url.length; i++) {
				media = url[i];
				if (this.canPlayType(media.type)) {
					this.src = media.src;
					break;
				}
			}
		}
	},

	setVideoSize: function (width, height) {
		this.width = width;
		this.height = height;
	}
};

/*
Mimics the <video/audio> element by calling Flash's External Interface or Silverlights [ScriptableMember]
*/
mejs.PluginMediaElement = function (pluginid, pluginType, mediaUrl) {
	this.id = pluginid;
	this.pluginType = pluginType;
	this.src = mediaUrl;
	this.events = {};
	this.attributes = {};
};

// JavaScript values and ExternalInterface methods that match HTML5 video properties methods
// http://www.adobe.com/livedocs/flash/9.0/ActionScriptLangRefV3/fl/video/FLVPlayback.html
// http://www.whatwg.org/specs/web-apps/current-work/multipage/video.html
mejs.PluginMediaElement.prototype = {

	// special
	pluginElement: null,
	pluginType: '',
	isFullScreen: false,

	// not implemented :(
	playbackRate: -1,
	defaultPlaybackRate: -1,
	seekable: [],
	played: [],

	// HTML5 read-only properties
	paused: true,
	ended: false,
	seeking: false,
	duration: 0,
	error: null,
	tagName: '',

	// HTML5 get/set properties, but only set (updated by event handlers)
	muted: false,
	volume: 1,
	currentTime: 0,

	// HTML5 methods
	play: function () {
		if (this.pluginApi != null) {
			if (this.pluginType == 'youtube' || this.pluginType == 'vimeo') {
				this.pluginApi.playVideo();
			} else {
				this.pluginApi.playMedia();
			}
			this.paused = false;
		}
	},
	load: function () {
		if (this.pluginApi != null) {
			if (this.pluginType == 'youtube' || this.pluginType == 'vimeo') {
			} else {
				this.pluginApi.loadMedia();
			}
			
			this.paused = false;
		}
	},
	pause: function () {
		if (this.pluginApi != null) {
			if (this.pluginType == 'youtube' || this.pluginType == 'vimeo') {
				this.pluginApi.pauseVideo();
			} else {
				this.pluginApi.pauseMedia();
			}			
			
			
			this.paused = true;
		}
	},
	stop: function () {
		if (this.pluginApi != null) {
			if (this.pluginType == 'youtube' || this.pluginType == 'vimeo') {
				this.pluginApi.stopVideo();
			} else {
				this.pluginApi.stopMedia();
			}	
			this.paused = true;
		}
	},
	canPlayType: function(type) {
		var i,
			j,
			pluginInfo,
			pluginVersions = mejs.plugins[this.pluginType];

		for (i=0; i<pluginVersions.length; i++) {
			pluginInfo = pluginVersions[i];

			// test if user has the correct plugin version
			if (mejs.PluginDetector.hasPluginVersion(this.pluginType, pluginInfo.version)) {

				// test for plugin playback types
				for (j=0; j<pluginInfo.types.length; j++) {
					// find plugin that can play the type
					if (type == pluginInfo.types[j]) {
						return 'probably';
					}
				}
			}
		}

		return '';
	},
	
	positionFullscreenButton: function(x,y,visibleAndAbove) {
		if (this.pluginApi != null && this.pluginApi.positionFullscreenButton) {
			this.pluginApi.positionFullscreenButton(Math.floor(x),Math.floor(y),visibleAndAbove);
		}
	},
	
	hideFullscreenButton: function() {
		if (this.pluginApi != null && this.pluginApi.hideFullscreenButton) {
			this.pluginApi.hideFullscreenButton();
		}		
	},	
	

	// custom methods since not all JavaScript implementations support get/set

	// This can be a url string
	// or an array [{src:'file.mp4',type:'video/mp4'},{src:'file.webm',type:'video/webm'}]
	setSrc: function (url) {
		if (typeof url == 'string') {
			this.pluginApi.setSrc(mejs.Utility.absolutizeUrl(url));
			this.src = mejs.Utility.absolutizeUrl(url);
		} else {
			var i, media;

			for (i=0; i<url.length; i++) {
				media = url[i];
				if (this.canPlayType(media.type)) {
					this.pluginApi.setSrc(mejs.Utility.absolutizeUrl(media.src));
					this.src = mejs.Utility.absolutizeUrl(url);
					break;
				}
			}
		}

	},
	setCurrentTime: function (time) {
		if (this.pluginApi != null) {
			if (this.pluginType == 'youtube' || this.pluginType == 'vimeo') {
				this.pluginApi.seekTo(time);
			} else {
				this.pluginApi.setCurrentTime(time);
			}				
			
			
			
			this.currentTime = time;
		}
	},
	setVolume: function (volume) {
		if (this.pluginApi != null) {
			// same on YouTube and MEjs
			if (this.pluginType == 'youtube') {
				this.pluginApi.setVolume(volume * 100);
			} else {
				this.pluginApi.setVolume(volume);
			}
			this.volume = volume;
		}
	},
	setMuted: function (muted) {
		if (this.pluginApi != null) {
			if (this.pluginType == 'youtube') {
				if (muted) {
					this.pluginApi.mute();
				} else {
					this.pluginApi.unMute();
				}
				this.muted = muted;
				this.dispatchEvent('volumechange');
			} else {
				this.pluginApi.setMuted(muted);
			}
			this.muted = muted;
		}
	},

	// additional non-HTML5 methods
	setVideoSize: function (width, height) {
		
		//if (this.pluginType == 'flash' || this.pluginType == 'silverlight') {
			if (this.pluginElement && this.pluginElement.style) {
				this.pluginElement.style.width = width + 'px';
				this.pluginElement.style.height = height + 'px';
			}
			if (this.pluginApi != null && this.pluginApi.setVideoSize) {
				this.pluginApi.setVideoSize(width, height);
			}
		//}
	},

	setFullscreen: function (fullscreen) {
		if (this.pluginApi != null && this.pluginApi.setFullscreen) {
			this.pluginApi.setFullscreen(fullscreen);
		}
	},
	
	enterFullScreen: function() {
		if (this.pluginApi != null && this.pluginApi.setFullscreen) {
			this.setFullscreen(true);
		}		
		
	},
	
	exitFullScreen: function() {
		if (this.pluginApi != null && this.pluginApi.setFullscreen) {
			this.setFullscreen(false);
		}
	},	

	// start: fake events
	addEventListener: function (eventName, callback, bubble) {
		this.events[eventName] = this.events[eventName] || [];
		this.events[eventName].push(callback);
	},
	removeEventListener: function (eventName, callback) {
		if (!eventName) { this.events = {}; return true; }
		var callbacks = this.events[eventName];
		if (!callbacks) return true;
		if (!callback) { this.events[eventName] = []; return true; }
		for (var i = 0; i < callbacks.length; i++) {
			if (callbacks[i] === callback) {
				this.events[eventName].splice(i, 1);
				return true;
			}
		}
		return false;
	},	
	dispatchEvent: function (eventName) {
		var i,
			args,
			callbacks = this.events[eventName];

		if (callbacks) {
			args = Array.prototype.slice.call(arguments, 1);
			for (i = 0; i < callbacks.length; i++) {
				callbacks[i].apply(this, args);
			}
		}
	},
	// end: fake events
	
	// fake DOM attribute methods
	hasAttribute: function(name){
		return (name in this.attributes);  
	},
	removeAttribute: function(name){
		delete this.attributes[name];
	},
	getAttribute: function(name){
		if (this.hasAttribute(name)) {
			return this.attributes[name];
		}
		return '';
	},
	setAttribute: function(name, value){
		this.attributes[name] = value;
	},

	remove: function() {
		mejs.Utility.removeSwf(this.pluginElement.id);
		mejs.MediaPluginBridge.unregisterPluginElement(this.pluginElement.id);
	}
};

// Handles calls from Flash/Silverlight and reports them as native <video/audio> events and properties
mejs.MediaPluginBridge = {

	pluginMediaElements:{},
	htmlMediaElements:{},

	registerPluginElement: function (id, pluginMediaElement, htmlMediaElement) {
		this.pluginMediaElements[id] = pluginMediaElement;
		this.htmlMediaElements[id] = htmlMediaElement;
	},

	unregisterPluginElement: function (id) {
		delete this.pluginMediaElements[id];
		delete this.htmlMediaElements[id];
	},

	// when Flash/Silverlight is ready, it calls out to this method
	initPlugin: function (id) {

		var pluginMediaElement = this.pluginMediaElements[id],
			htmlMediaElement = this.htmlMediaElements[id];

		if (pluginMediaElement) {
			// find the javascript bridge
			switch (pluginMediaElement.pluginType) {
				case "flash":
					pluginMediaElement.pluginElement = pluginMediaElement.pluginApi = document.getElementById(id);
					break;
				case "silverlight":
					pluginMediaElement.pluginElement = document.getElementById(pluginMediaElement.id);
					pluginMediaElement.pluginApi = pluginMediaElement.pluginElement.Content.MediaElementJS;
					break;
			}
	
			if (pluginMediaElement.pluginApi != null && pluginMediaElement.success) {
				pluginMediaElement.success(pluginMediaElement, htmlMediaElement);
			}
		}
	},

	// receives events from Flash/Silverlight and sends them out as HTML5 media events
	// http://www.whatwg.org/specs/web-apps/current-work/multipage/video.html
	fireEvent: function (id, eventName, values) {

		var
			e,
			i,
			bufferedTime,
			pluginMediaElement = this.pluginMediaElements[id];

		if(!pluginMediaElement){
            return;
        }
        
		// fake event object to mimic real HTML media event.
		e = {
			type: eventName,
			target: pluginMediaElement
		};

		// attach all values to element and event object
		for (i in values) {
			pluginMediaElement[i] = values[i];
			e[i] = values[i];
		}

		// fake the newer W3C buffered TimeRange (loaded and total have been removed)
		bufferedTime = values.bufferedTime || 0;

		e.target.buffered = e.buffered = {
			start: function(index) {
				return 0;
			},
			end: function (index) {
				return bufferedTime;
			},
			length: 1
		};

		pluginMediaElement.dispatchEvent(e.type, e);
	}
};

/*
Default options
*/
mejs.MediaElementDefaults = {
	// allows testing on HTML5, flash, silverlight
	// auto: attempts to detect what the browser can do
	// auto_plugin: prefer plugins and then attempt native HTML5
	// native: forces HTML5 playback
	// shim: disallows HTML5, will attempt either Flash or Silverlight
	// none: forces fallback view
	mode: 'auto',
	// remove or reorder to change plugin priority and availability
	plugins: ['flash','silverlight','youtube','vimeo'],
	// shows debug errors on screen
	enablePluginDebug: false,
	// use plugin for browsers that have trouble with Basic Authentication on HTTPS sites
	httpsBasicAuthSite: false,
	// overrides the type specified, useful for dynamic instantiation
	type: '',
	// path to Flash and Silverlight plugins
	pluginPath: mejs.Utility.getScriptPath(['mediaelement.js','mediaelement.min.js','mediaelement-and-player.js','mediaelement-and-player.min.js']),
	// name of flash file
	flashName: 'flashmediaelement.swf',
	// streamer for RTMP streaming
	flashStreamer: '',
	// turns on the smoothing filter in Flash
	enablePluginSmoothing: false,
	// enabled pseudo-streaming (seek) on .mp4 files
	enablePseudoStreaming: false,
	// start query parameter sent to server for pseudo-streaming
	pseudoStreamingStartQueryParam: 'start',
	// name of silverlight file
	silverlightName: 'silverlightmediaelement.xap',
	// default if the <video width> is not specified
	defaultVideoWidth: 480,
	// default if the <video height> is not specified
	defaultVideoHeight: 270,
	// overrides <video width>
	pluginWidth: -1,
	// overrides <video height>
	pluginHeight: -1,
	// additional plugin variables in 'key=value' form
	pluginVars: [],	
	// rate in milliseconds for Flash and Silverlight to fire the timeupdate event
	// larger number is less accurate, but less strain on plugin->JavaScript bridge
	timerRate: 250,
	// initial volume for player
	startVolume: 0.8,
	success: function () { },
	error: function () { }
};

/*
Determines if a browser supports the <video> or <audio> element
and returns either the native element or a Flash/Silverlight version that
mimics HTML5 MediaElement
*/
mejs.MediaElement = function (el, o) {
	return mejs.HtmlMediaElementShim.create(el,o);
};

mejs.HtmlMediaElementShim = {

	create: function(el, o) {
		var
			options = mejs.MediaElementDefaults,
			htmlMediaElement = (typeof(el) == 'string') ? document.getElementById(el) : el,
			tagName = htmlMediaElement.tagName.toLowerCase(),
			isMediaTag = (tagName === 'audio' || tagName === 'video'),
			src = (isMediaTag) ? htmlMediaElement.getAttribute('src') : htmlMediaElement.getAttribute('href'),
			poster = htmlMediaElement.getAttribute('poster'),
			autoplay =  htmlMediaElement.getAttribute('autoplay'),
			preload =  htmlMediaElement.getAttribute('preload'),
			controls =  htmlMediaElement.getAttribute('controls'),
			playback,
			prop;

		// extend options
		for (prop in o) {
			options[prop] = o[prop];
		}

		// clean up attributes
		src = 		(typeof src == 'undefined' 	|| src === null || src == '') ? null : src;		
		poster =	(typeof poster == 'undefined' 	|| poster === null) ? '' : poster;
		preload = 	(typeof preload == 'undefined' 	|| preload === null || preload === 'false') ? 'none' : preload;
		autoplay = 	!(typeof autoplay == 'undefined' || autoplay === null || autoplay === 'false');
		controls = 	!(typeof controls == 'undefined' || controls === null || controls === 'false');

		// test for HTML5 and plugin capabilities
		playback = this.determinePlayback(htmlMediaElement, options, mejs.MediaFeatures.supportsMediaTag, isMediaTag, src);
		playback.url = (playback.url !== null) ? mejs.Utility.absolutizeUrl(playback.url) : '';

		if (playback.method == 'native') {
			// second fix for android
			if (mejs.MediaFeatures.isBustedAndroid) {
				htmlMediaElement.src = playback.url;
				htmlMediaElement.addEventListener('click', function() {
					htmlMediaElement.play();
				}, false);
			}
		
			// add methods to native HTMLMediaElement
			return this.updateNative(playback, options, autoplay, preload);
		} else if (playback.method !== '') {
			// create plugin to mimic HTMLMediaElement
			
			return this.createPlugin( playback,  options, poster, autoplay, preload, controls);
		} else {
			// boo, no HTML5, no Flash, no Silverlight.
			this.createErrorMessage( playback, options, poster );
			
			return this;
		}
	},
	
	determinePlayback: function(htmlMediaElement, options, supportsMediaTag, isMediaTag, src) {
		var
			mediaFiles = [],
			i,
			j,
			k,
			l,
			n,
			type,
			result = { method: '', url: '', htmlMediaElement: htmlMediaElement, isVideo: (htmlMediaElement.tagName.toLowerCase() != 'audio')},
			pluginName,
			pluginVersions,
			pluginInfo,
			dummy,
			media;
			
		// STEP 1: Get URL and type from <video src> or <source src>

		// supplied type overrides <video type> and <source type>
		if (typeof options.type != 'undefined' && options.type !== '') {
			
			// accept either string or array of types
			if (typeof options.type == 'string') {
				mediaFiles.push({type:options.type, url:src});
			} else {
				
				for (i=0; i<options.type.length; i++) {
					mediaFiles.push({type:options.type[i], url:src});
				}
			}

		// test for src attribute first
		} else if (src !== null) {
			type = this.formatType(src, htmlMediaElement.getAttribute('type'));
			mediaFiles.push({type:type, url:src});

		// then test for <source> elements
		} else {
			// test <source> types to see if they are usable
			for (i = 0; i < htmlMediaElement.childNodes.length; i++) {
				n = htmlMediaElement.childNodes[i];
				if (n.nodeType == 1 && n.tagName.toLowerCase() == 'source') {
					src = n.getAttribute('src');
					type = this.formatType(src, n.getAttribute('type'));
					media = n.getAttribute('media');

					if (!media || !window.matchMedia || (window.matchMedia && window.matchMedia(media).matches)) {
						mediaFiles.push({type:type, url:src});
					}
				}
			}
		}
		
		// in the case of dynamicly created players
		// check for audio types
		if (!isMediaTag && mediaFiles.length > 0 && mediaFiles[0].url !== null && this.getTypeFromFile(mediaFiles[0].url).indexOf('audio') > -1) {
			result.isVideo = false;
		}
		

		// STEP 2: Test for playback method
		
		// special case for Android which sadly doesn't implement the canPlayType function (always returns '')
		if (mejs.MediaFeatures.isBustedAndroid) {
			htmlMediaElement.canPlayType = function(type) {
				return (type.match(/video\/(mp4|m4v)/gi) !== null) ? 'maybe' : '';
			};
		}		
		
		// special case for Chromium to specify natively supported video codecs (i.e. WebM and Theora) 
		if (mejs.MediaFeatures.isChromium) { 
			htmlMediaElement.canPlayType = function(type) { 
				return (type.match(/video\/(webm|ogv|ogg)/gi) !== null) ? 'maybe' : ''; 
			}; 
		}

		// test for native playback first
		if (supportsMediaTag && (options.mode === 'auto' || options.mode === 'auto_plugin' || options.mode === 'native')  && !(mejs.MediaFeatures.isBustedNativeHTTPS && options.httpsBasicAuthSite === true)) {
						
			if (!isMediaTag) {

				// create a real HTML5 Media Element 
				dummy = document.createElement( result.isVideo ? 'video' : 'audio');			
				htmlMediaElement.parentNode.insertBefore(dummy, htmlMediaElement);
				htmlMediaElement.style.display = 'none';
				
				// use this one from now on
				result.htmlMediaElement = htmlMediaElement = dummy;
			}
				
			for (i=0; i<mediaFiles.length; i++) {
				// normal check
				if (mediaFiles[i].type == "video/m3u8" || htmlMediaElement.canPlayType(mediaFiles[i].type).replace(/no/, '') !== ''
					// special case for Mac/Safari 5.0.3 which answers '' to canPlayType('audio/mp3') but 'maybe' to canPlayType('audio/mpeg')
					|| htmlMediaElement.canPlayType(mediaFiles[i].type.replace(/mp3/,'mpeg')).replace(/no/, '') !== ''
					// special case for m4a supported by detecting mp4 support
					|| htmlMediaElement.canPlayType(mediaFiles[i].type.replace(/m4a/,'mp4')).replace(/no/, '') !== '') {
					result.method = 'native';
					result.url = mediaFiles[i].url;
					break;
				}
			}			
			
			if (result.method === 'native') {
				if (result.url !== null) {
					htmlMediaElement.src = result.url;
				}
			
				// if `auto_plugin` mode, then cache the native result but try plugins.
				if (options.mode !== 'auto_plugin') {
					return result;
				}
			}
		}

		// if native playback didn't work, then test plugins
		if (options.mode === 'auto' || options.mode === 'auto_plugin' || options.mode === 'shim') {
			for (i=0; i<mediaFiles.length; i++) {
				type = mediaFiles[i].type;

				// test all plugins in order of preference [silverlight, flash]
				for (j=0; j<options.plugins.length; j++) {

					pluginName = options.plugins[j];
			
					// test version of plugin (for future features)
					pluginVersions = mejs.plugins[pluginName];				
					
					for (k=0; k<pluginVersions.length; k++) {
						pluginInfo = pluginVersions[k];
					
						// test if user has the correct plugin version
						
						// for youtube/vimeo
						if (pluginInfo.version == null || 
							
							mejs.PluginDetector.hasPluginVersion(pluginName, pluginInfo.version)) {

							// test for plugin playback types
							for (l=0; l<pluginInfo.types.length; l++) {
								// find plugin that can play the type
								if (type == pluginInfo.types[l]) {
									result.method = pluginName;
									result.url = mediaFiles[i].url;
									return result;
								}
							}
						}
					}
				}
			}
		}
		
		// at this point, being in 'auto_plugin' mode implies that we tried plugins but failed.
		// if we have native support then return that.
		if (options.mode === 'auto_plugin' && result.method === 'native') {
			return result;
		}

		// what if there's nothing to play? just grab the first available
		if (result.method === '' && mediaFiles.length > 0) {
			result.url = mediaFiles[0].url;
		}

		return result;
	},

	formatType: function(url, type) {
		var ext;

		// if no type is supplied, fake it with the extension
		if (url && !type) {		
			return this.getTypeFromFile(url);
		} else {
			// only return the mime part of the type in case the attribute contains the codec
			// see http://www.whatwg.org/specs/web-apps/current-work/multipage/video.html#the-source-element
			// `video/mp4; codecs="avc1.42E01E, mp4a.40.2"` becomes `video/mp4`
			
			if (type && ~type.indexOf(';')) {
				return type.substr(0, type.indexOf(';')); 
			} else {
				return type;
			}
		}
	},
	
	getTypeFromFile: function(url) {
		url = url.split('?')[0];
		var ext = url.substring(url.lastIndexOf('.') + 1).toLowerCase();
		return (/(mp4|m4v|ogg|ogv|m3u8|webm|webmv|flv|wmv|mpeg|mov)/gi.test(ext) ? 'video' : 'audio') + '/' + this.getTypeFromExtension(ext);
	},
	
	getTypeFromExtension: function(ext) {
		
		switch (ext) {
			case 'mp4':
			case 'm4v':
			case 'm4a':
				return 'mp4';
			case 'webm':
			case 'webma':
			case 'webmv':	
				return 'webm';
			case 'ogg':
			case 'oga':
			case 'ogv':	
				return 'ogg';
			default:
				return ext;
		}
	},

	createErrorMessage: function(playback, options, poster) {
		var 
			htmlMediaElement = playback.htmlMediaElement,
			errorContainer = document.createElement('div');
			
		errorContainer.className = 'me-cannotplay';

		try {
			errorContainer.style.width = htmlMediaElement.width + 'px';
			errorContainer.style.height = htmlMediaElement.height + 'px';
		} catch (e) {}

    if (options.customError) {
      errorContainer.innerHTML = options.customError;
    } else {
      errorContainer.innerHTML = (poster !== '') ?
        '<a href="' + playback.url + '"><img src="' + poster + '" width="100%" height="100%" /></a>' :
        '<a href="' + playback.url + '"><span>' + mejs.i18n.t('Download File') + '</span></a>';
    }

		htmlMediaElement.parentNode.insertBefore(errorContainer, htmlMediaElement);
		htmlMediaElement.style.display = 'none';

		options.error(htmlMediaElement);
	},

	createPlugin:function(playback, options, poster, autoplay, preload, controls) {
		var 
			htmlMediaElement = playback.htmlMediaElement,
			width = 1,
			height = 1,
			pluginid = 'me_' + playback.method + '_' + (mejs.meIndex++),
			pluginMediaElement = new mejs.PluginMediaElement(pluginid, playback.method, playback.url),
			container = document.createElement('div'),
			specialIEContainer,
			node,
			initVars;

		// copy tagName from html media element
		pluginMediaElement.tagName = htmlMediaElement.tagName

		// copy attributes from html media element to plugin media element
		for (var i = 0; i < htmlMediaElement.attributes.length; i++) {
			var attribute = htmlMediaElement.attributes[i];
			if (attribute.specified == true) {
				pluginMediaElement.setAttribute(attribute.name, attribute.value);
			}
		}

		// check for placement inside a <p> tag (sometimes WYSIWYG editors do this)
		node = htmlMediaElement.parentNode;
		while (node !== null && node.tagName.toLowerCase() !== 'body' && node.parentNode != null) {
			if (node.parentNode.tagName.toLowerCase() === 'p') {
				node.parentNode.parentNode.insertBefore(node, node.parentNode);
				break;
			}
			node = node.parentNode;
		}

		if (playback.isVideo) {
			width = (options.pluginWidth > 0) ? options.pluginWidth : (options.videoWidth > 0) ? options.videoWidth : (htmlMediaElement.getAttribute('width') !== null) ? htmlMediaElement.getAttribute('width') : options.defaultVideoWidth;
			height = (options.pluginHeight > 0) ? options.pluginHeight : (options.videoHeight > 0) ? options.videoHeight : (htmlMediaElement.getAttribute('height') !== null) ? htmlMediaElement.getAttribute('height') : options.defaultVideoHeight;
		
			// in case of '%' make sure it's encoded
			width = mejs.Utility.encodeUrl(width);
			height = mejs.Utility.encodeUrl(height);
		
		} else {
			if (options.enablePluginDebug) {
				width = 320;
				height = 240;
			}
		}

		// register plugin
		pluginMediaElement.success = options.success;
		mejs.MediaPluginBridge.registerPluginElement(pluginid, pluginMediaElement, htmlMediaElement);

		// add container (must be added to DOM before inserting HTML for IE)
		container.className = 'me-plugin';
		container.id = pluginid + '_container';
		
		if (playback.isVideo) {
				htmlMediaElement.parentNode.insertBefore(container, htmlMediaElement);
		} else {
				document.body.insertBefore(container, document.body.childNodes[0]);
		}

		// flash/silverlight vars
		initVars = [
			'id=' + pluginid,
			'jsinitfunction=' + "mejs.MediaPluginBridge.initPlugin",
			'jscallbackfunction=' + "mejs.MediaPluginBridge.fireEvent",
			'isvideo=' + ((playback.isVideo) ? "true" : "false"),
			'autoplay=' + ((autoplay) ? "true" : "false"),
			'preload=' + preload,
			'width=' + width,
			'startvolume=' + options.startVolume,
			'timerrate=' + options.timerRate,
			'flashstreamer=' + options.flashStreamer,
			'height=' + height,
			'pseudostreamstart=' + options.pseudoStreamingStartQueryParam];

		if (playback.url !== null) {
			if (playback.method == 'flash') {
				initVars.push('file=' + mejs.Utility.encodeUrl(playback.url));
			} else {
				initVars.push('file=' + playback.url);
			}
		}
		if (options.enablePluginDebug) {
			initVars.push('debug=true');
		}
		if (options.enablePluginSmoothing) {
			initVars.push('smoothing=true');
		}
    if (options.enablePseudoStreaming) {
      initVars.push('pseudostreaming=true');
    }
		if (controls) {
			initVars.push('controls=true'); // shows controls in the plugin if desired
		}
		if (options.pluginVars) {
			initVars = initVars.concat(options.pluginVars);
		}		

		switch (playback.method) {
			case 'silverlight':
				container.innerHTML =
'<object data="data:application/x-silverlight-2," type="application/x-silverlight-2" id="' + pluginid + '" name="' + pluginid + '" width="' + width + '" height="' + height + '" class="mejs-shim">' +
'<param name="initParams" value="' + initVars.join(',') + '" />' +
'<param name="windowless" value="true" />' +
'<param name="background" value="black" />' +
'<param name="minRuntimeVersion" value="3.0.0.0" />' +
'<param name="autoUpgrade" value="true" />' +
'<param name="source" value="' + options.pluginPath + options.silverlightName + '" />' +
'</object>';
					break;

			case 'flash':

				if (mejs.MediaFeatures.isIE) {
					specialIEContainer = document.createElement('div');
					container.appendChild(specialIEContainer);
					specialIEContainer.outerHTML =
'<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" codebase="//download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab" ' +
'id="' + pluginid + '" width="' + width + '" height="' + height + '" class="mejs-shim">' +
'<param name="movie" value="' + options.pluginPath + options.flashName + '?x=' + (new Date()) + '" />' +
'<param name="flashvars" value="' + initVars.join('&amp;') + '" />' +
'<param name="quality" value="high" />' +
'<param name="bgcolor" value="#000000" />' +
'<param name="wmode" value="transparent" />' +
'<param name="allowScriptAccess" value="always" />' +
'<param name="allowFullScreen" value="true" />' +
'<param name="scale" value="default" />' + 
'</object>';

				} else {

					container.innerHTML =
'<embed id="' + pluginid + '" name="' + pluginid + '" ' +
'play="true" ' +
'loop="false" ' +
'quality="high" ' +
'bgcolor="#000000" ' +
'wmode="transparent" ' +
'allowScriptAccess="always" ' +
'allowFullScreen="true" ' +
'type="application/x-shockwave-flash" pluginspage="//www.macromedia.com/go/getflashplayer" ' +
'src="' + options.pluginPath + options.flashName + '" ' +
'flashvars="' + initVars.join('&') + '" ' +
'width="' + width + '" ' +
'height="' + height + '" ' +
'scale="default"' + 
'class="mejs-shim"></embed>';
				}
				break;
			
			case 'youtube':
			
				
				var videoId;
				// youtu.be url from share button
				if (playback.url.lastIndexOf("youtu.be") != -1) {
					videoId = playback.url.substr(playback.url.lastIndexOf('/')+1);
					if (videoId.indexOf('?') != -1) {
						videoId = videoId.substr(0, videoId.indexOf('?'));
					}
				}
				else {
					videoId = playback.url.substr(playback.url.lastIndexOf('=')+1);
				}
				youtubeSettings = {
						container: container,
						containerId: container.id,
						pluginMediaElement: pluginMediaElement,
						pluginId: pluginid,
						videoId: videoId,
						height: height,
						width: width	
					};				
				
				if (mejs.PluginDetector.hasPluginVersion('flash', [10,0,0]) ) {
					mejs.YouTubeApi.createFlash(youtubeSettings);
				} else {
					mejs.YouTubeApi.enqueueIframe(youtubeSettings);		
				}
				
				break;
			
			// DEMO Code. Does NOT work.
			case 'vimeo':
				var player_id = pluginid + "_player";
				pluginMediaElement.vimeoid = playback.url.substr(playback.url.lastIndexOf('/')+1);
				
				container.innerHTML ='<iframe src="//player.vimeo.com/video/' + pluginMediaElement.vimeoid + '?api=1&portrait=0&byline=0&title=0&player_id=' + player_id + '" width="' + width +'" height="' + height +'" frameborder="0" class="mejs-shim" id="' + player_id + '" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>';
				if (typeof($f) == 'function') { // froogaloop available
					var player = $f(container.childNodes[0]);
					
					player.addEvent('ready', function() {
						
						player.playVideo = function() {
							player.api( 'play' );
						} 
						player.stopVideo = function() {
							player.api( 'unload' );
						} 
						player.pauseVideo = function() {
							player.api( 'pause' );
						} 
						player.seekTo = function( seconds ) {
							player.api( 'seekTo', seconds );
						}
						player.setVolume = function( volume ) {
							player.api( 'setVolume', volume );
						}
						player.setMuted = function( muted ) {
							if( muted ) {
								player.lastVolume = player.api( 'getVolume' );
								player.api( 'setVolume', 0 );
							} else {
								player.api( 'setVolume', player.lastVolume );
								delete player.lastVolume;
							}
						}						

						function createEvent(player, pluginMediaElement, eventName, e) {
							var obj = {
								type: eventName,
								target: pluginMediaElement
							};
							if (eventName == 'timeupdate') {
								pluginMediaElement.currentTime = obj.currentTime = e.seconds;
								pluginMediaElement.duration = obj.duration = e.duration;
							}
							pluginMediaElement.dispatchEvent(obj.type, obj);
						}

						player.addEvent('play', function() {
							createEvent(player, pluginMediaElement, 'play');
							createEvent(player, pluginMediaElement, 'playing');
						});

						player.addEvent('pause', function() {
							createEvent(player, pluginMediaElement, 'pause');
						});

						player.addEvent('finish', function() {
							createEvent(player, pluginMediaElement, 'ended');
						});

						player.addEvent('playProgress', function(e) {
							createEvent(player, pluginMediaElement, 'timeupdate', e);
						});

						pluginMediaElement.pluginElement = container;
						pluginMediaElement.pluginApi = player;

						// init mejs
						mejs.MediaPluginBridge.initPlugin(pluginid);
					});
				}
				else {
					console.warn("You need to include froogaloop for vimeo to work");
				}
				break;			
		}
		// hide original element
		htmlMediaElement.style.display = 'none';
		// prevent browser from autoplaying when using a plugin
		htmlMediaElement.removeAttribute('autoplay');

		// FYI: options.success will be fired by the MediaPluginBridge
		
		return pluginMediaElement;
	},

	updateNative: function(playback, options, autoplay, preload) {
		
		var htmlMediaElement = playback.htmlMediaElement,
			m;
		
		
		// add methods to video object to bring it into parity with Flash Object
		for (m in mejs.HtmlMediaElement) {
			htmlMediaElement[m] = mejs.HtmlMediaElement[m];
		}

		/*
		Chrome now supports preload="none"
		if (mejs.MediaFeatures.isChrome) {
		
			// special case to enforce preload attribute (Chrome doesn't respect this)
			if (preload === 'none' && !autoplay) {
			
				// forces the browser to stop loading (note: fails in IE9)
				htmlMediaElement.src = '';
				htmlMediaElement.load();
				htmlMediaElement.canceledPreload = true;

				htmlMediaElement.addEventListener('play',function() {
					if (htmlMediaElement.canceledPreload) {
						htmlMediaElement.src = playback.url;
						htmlMediaElement.load();
						htmlMediaElement.play();
						htmlMediaElement.canceledPreload = false;
					}
				}, false);
			// for some reason Chrome forgets how to autoplay sometimes.
			} else if (autoplay) {
				htmlMediaElement.load();
				htmlMediaElement.play();
			}
		}
		*/

		// fire success code
		options.success(htmlMediaElement, htmlMediaElement);
		
		return htmlMediaElement;
	}
};

/*
 - test on IE (object vs. embed)
 - determine when to use iframe (Firefox, Safari, Mobile) vs. Flash (Chrome, IE)
 - fullscreen?
*/

// YouTube Flash and Iframe API
mejs.YouTubeApi = {
	isIframeStarted: false,
	isIframeLoaded: false,
	loadIframeApi: function() {
		if (!this.isIframeStarted) {
			var tag = document.createElement('script');
			tag.src = "//www.youtube.com/player_api";
			var firstScriptTag = document.getElementsByTagName('script')[0];
			firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
			this.isIframeStarted = true;
		}
	},
	iframeQueue: [],
	enqueueIframe: function(yt) {
		
		if (this.isLoaded) {
			this.createIframe(yt);
		} else {
			this.loadIframeApi();
			this.iframeQueue.push(yt);
		}
	},
	createIframe: function(settings) {
		
		var
		pluginMediaElement = settings.pluginMediaElement,	
		player = new YT.Player(settings.containerId, {
			height: settings.height,
			width: settings.width,
			videoId: settings.videoId,
			playerVars: {controls:0},
			events: {
				'onReady': function() {
					
					// hook up iframe object to MEjs
					settings.pluginMediaElement.pluginApi = player;
					
					// init mejs
					mejs.MediaPluginBridge.initPlugin(settings.pluginId);
					
					// create timer
					setInterval(function() {
						mejs.YouTubeApi.createEvent(player, pluginMediaElement, 'timeupdate');
					}, 250);					
				},
				'onStateChange': function(e) {
					
					mejs.YouTubeApi.handleStateChange(e.data, player, pluginMediaElement);
					
				}
			}
		});
	},
	
	createEvent: function (player, pluginMediaElement, eventName) {
		var obj = {
			type: eventName,
			target: pluginMediaElement
		};

		if (player && player.getDuration) {
			
			// time 
			pluginMediaElement.currentTime = obj.currentTime = player.getCurrentTime();
			pluginMediaElement.duration = obj.duration = player.getDuration();
			
			// state
			obj.paused = pluginMediaElement.paused;
			obj.ended = pluginMediaElement.ended;			
			
			// sound
			obj.muted = player.isMuted();
			obj.volume = player.getVolume() / 100;
			
			// progress
			obj.bytesTotal = player.getVideoBytesTotal();
			obj.bufferedBytes = player.getVideoBytesLoaded();
			
			// fake the W3C buffered TimeRange
			var bufferedTime = obj.bufferedBytes / obj.bytesTotal * obj.duration;
			
			obj.target.buffered = obj.buffered = {
				start: function(index) {
					return 0;
				},
				end: function (index) {
					return bufferedTime;
				},
				length: 1
			};

		}
		
		// send event up the chain
		pluginMediaElement.dispatchEvent(obj.type, obj);
	},	
	
	iFrameReady: function() {
		
		this.isLoaded = true;
		this.isIframeLoaded = true;
		
		while (this.iframeQueue.length > 0) {
			var settings = this.iframeQueue.pop();
			this.createIframe(settings);
		}	
	},
	
	// FLASH!
	flashPlayers: {},
	createFlash: function(settings) {
		
		this.flashPlayers[settings.pluginId] = settings;
		
		/*
		settings.container.innerHTML =
			'<object type="application/x-shockwave-flash" id="' + settings.pluginId + '" data="//www.youtube.com/apiplayer?enablejsapi=1&amp;playerapiid=' + settings.pluginId  + '&amp;version=3&amp;autoplay=0&amp;controls=0&amp;modestbranding=1&loop=0" ' +
				'width="' + settings.width + '" height="' + settings.height + '" style="visibility: visible; " class="mejs-shim">' +
				'<param name="allowScriptAccess" value="always">' +
				'<param name="wmode" value="transparent">' +
			'</object>';
		*/

		var specialIEContainer,
			youtubeUrl = '//www.youtube.com/apiplayer?enablejsapi=1&amp;playerapiid=' + settings.pluginId  + '&amp;version=3&amp;autoplay=0&amp;controls=0&amp;modestbranding=1&loop=0';
			
		if (mejs.MediaFeatures.isIE) {
			
			specialIEContainer = document.createElement('div');
			settings.container.appendChild(specialIEContainer);
			specialIEContainer.outerHTML = '<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" codebase="//download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab" ' +
'id="' + settings.pluginId + '" width="' + settings.width + '" height="' + settings.height + '" class="mejs-shim">' +
	'<param name="movie" value="' + youtubeUrl + '" />' +
	'<param name="wmode" value="transparent" />' +
	'<param name="allowScriptAccess" value="always" />' +
	'<param name="allowFullScreen" value="true" />' +
'</object>';
		} else {
		settings.container.innerHTML =
			'<object type="application/x-shockwave-flash" id="' + settings.pluginId + '" data="' + youtubeUrl + '" ' +
				'width="' + settings.width + '" height="' + settings.height + '" style="visibility: visible; " class="mejs-shim">' +
				'<param name="allowScriptAccess" value="always">' +
				'<param name="wmode" value="transparent">' +
			'</object>';
		}		
		
	},
	
	flashReady: function(id) {
		var
			settings = this.flashPlayers[id],
			player = document.getElementById(id),
			pluginMediaElement = settings.pluginMediaElement;
		
		// hook up and return to MediaELementPlayer.success	
		pluginMediaElement.pluginApi = 
		pluginMediaElement.pluginElement = player;
		mejs.MediaPluginBridge.initPlugin(id);
		
		// load the youtube video
		player.cueVideoById(settings.videoId);
		
		var callbackName = settings.containerId + '_callback';
		
		window[callbackName] = function(e) {
			mejs.YouTubeApi.handleStateChange(e, player, pluginMediaElement);
		}
		
		player.addEventListener('onStateChange', callbackName);
		
		setInterval(function() {
			mejs.YouTubeApi.createEvent(player, pluginMediaElement, 'timeupdate');
		}, 250);
		
		mejs.YouTubeApi.createEvent(player, pluginMediaElement, 'canplay');
	},
	
	handleStateChange: function(youTubeState, player, pluginMediaElement) {
		switch (youTubeState) {
			case -1: // not started
				pluginMediaElement.paused = true;
				pluginMediaElement.ended = true;
				mejs.YouTubeApi.createEvent(player, pluginMediaElement, 'loadedmetadata');
				//createYouTubeEvent(player, pluginMediaElement, 'loadeddata');
				break;
			case 0:
				pluginMediaElement.paused = false;
				pluginMediaElement.ended = true;
				mejs.YouTubeApi.createEvent(player, pluginMediaElement, 'ended');
				break;
			case 1:
				pluginMediaElement.paused = false;
				pluginMediaElement.ended = false;				
				mejs.YouTubeApi.createEvent(player, pluginMediaElement, 'play');
				mejs.YouTubeApi.createEvent(player, pluginMediaElement, 'playing');
				break;
			case 2:
				pluginMediaElement.paused = true;
				pluginMediaElement.ended = false;				
				mejs.YouTubeApi.createEvent(player, pluginMediaElement, 'pause');
				break;
			case 3: // buffering
				mejs.YouTubeApi.createEvent(player, pluginMediaElement, 'progress');
				break;
			case 5:
				// cued?
				break;						
			
		}			
		
	}
}
// IFRAME
function onYouTubePlayerAPIReady() {
	mejs.YouTubeApi.iFrameReady();
}
// FLASH
function onYouTubePlayerReady(id) {
	mejs.YouTubeApi.flashReady(id);
}

window.mejs = mejs;
window.MediaElement = mejs.MediaElement;

/*
 * Adds Internationalization and localization to mediaelement.
 *
 * This file does not contain translations, you have to add them manually.
 * The schema is always the same: me-i18n-locale-[IETF-language-tag].js
 *
 * Examples are provided both for german and chinese translation.
 *
 *
 * What is the concept beyond i18n?
 *   http://en.wikipedia.org/wiki/Internationalization_and_localization
 *
 * What langcode should i use?
 *   http://en.wikipedia.org/wiki/IETF_language_tag
 *   https://tools.ietf.org/html/rfc5646
 *
 *
 * License?
 *
 *   The i18n file uses methods from the Drupal project (drupal.js):
 *     - i18n.methods.t() (modified)
 *     - i18n.methods.checkPlain() (full copy)
 *
 *   The Drupal project is (like mediaelementjs) licensed under GPLv2.
 *    - http://drupal.org/licensing/faq/#q1
 *    - https://github.com/johndyer/mediaelement
 *    - http://www.gnu.org/licenses/old-licenses/gpl-2.0.html
 *
 *
 * @author
 *   Tim Latz (latz.tim@gmail.com)
 *
 *
 * @params
 *  - context - document, iframe ..
 *  - exports - CommonJS, window ..
 *
 */
;(function(context, exports, undefined) {
    "use strict";

    var i18n = {
        "locale": {
            // Ensure previous values aren't overwritten.
            "language" : (exports.i18n && exports.i18n.locale.language) || '',
            "strings" : (exports.i18n && exports.i18n.locale.strings) || {}
        },
        "ietf_lang_regex" : /^(x\-)?[a-z]{2,}(\-\w{2,})?(\-\w{2,})?$/,
        "methods" : {}
    };
// start i18n


    /**
     * Get language, fallback to browser's language if empty
     *
     * IETF: RFC 5646, https://tools.ietf.org/html/rfc5646
     * Examples: en, zh-CN, cmn-Hans-CN, sr-Latn-RS, es-419, x-private
     */
    i18n.getLanguage = function () {
        var language = i18n.locale.language || window.navigator.userLanguage || window.navigator.language;
        return i18n.ietf_lang_regex.exec(language) ? language : null;

        //(WAS: convert to iso 639-1 (2-letters, lower case))
        //return language.substr(0, 2).toLowerCase();
    };

    // i18n fixes for compatibility with WordPress
    if ( typeof mejsL10n != 'undefined' ) {
        i18n.locale.language = mejsL10n.language;
    }



    /**
     * Encode special characters in a plain-text string for display as HTML.
     */
    i18n.methods.checkPlain = function (str) {
        var character, regex,
        replace = {
            '&': '&amp;',
            '"': '&quot;',
            '<': '&lt;',
            '>': '&gt;'
        };
        str = String(str);
        for (character in replace) {
            if (replace.hasOwnProperty(character)) {
                regex = new RegExp(character, 'g');
                str = str.replace(regex, replace[character]);
            }
        }
        return str;
    };

    /**
     * Translate strings to the page language or a given language.
     *
     *
     * @param str
     *   A string containing the English string to translate.
     *
     * @param options
     *   - 'context' (defaults to the default context): The context the source string
     *     belongs to.
     *
     * @return
     *   The translated string, escaped via i18n.methods.checkPlain()
     */
    i18n.methods.t = function (str, options) {

        // Fetch the localized version of the string.
        if (i18n.locale.strings && i18n.locale.strings[options.context] && i18n.locale.strings[options.context][str]) {
            str = i18n.locale.strings[options.context][str];
        }

        return i18n.methods.checkPlain(str);
    };


    /**
     * Wrapper for i18n.methods.t()
     *
     * @see i18n.methods.t()
     * @throws InvalidArgumentException
     */
    i18n.t = function(str, options) {

        if (typeof str === 'string' && str.length > 0) {

            // check every time due language can change for
            // different reasons (translation, lang switcher ..)
            var language = i18n.getLanguage();

            options = options || {
                "context" : language
            };

            return i18n.methods.t(str, options);
        }
        else {
            throw {
                "name" : 'InvalidArgumentException',
                "message" : 'First argument is either not a string or empty.'
            };
        }
    };

// end i18n
    exports.i18n = i18n;
}(document, mejs));

// i18n fixes for compatibility with WordPress
;(function(exports, undefined) {

    "use strict";

    if ( typeof mejsL10n != 'undefined' ) {
        exports[mejsL10n.language] = mejsL10n.strings;
    }

}(mejs.i18n.locale.strings));

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../bower_components/mediaelement/build/mediaelement.js","/../../bower_components/mediaelement/build")
},{"buffer":2,"oMfpAn":5}],2:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192

/**
 * If `Buffer._useTypedArrays`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (compatible down to IE6)
 */
Buffer._useTypedArrays = (function () {
  // Detect if browser supports Typed Arrays. Supported browsers are IE 10+, Firefox 4+,
  // Chrome 7+, Safari 5.1+, Opera 11.6+, iOS 4.2+. If the browser does not support adding
  // properties to `Uint8Array` instances, then that's the same as no `Uint8Array` support
  // because we need to be able to add all the node Buffer API methods. This is an issue
  // in Firefox 4-29. Now fixed: https://bugzilla.mozilla.org/show_bug.cgi?id=695438
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() &&
        typeof arr.subarray === 'function' // Chrome 9-10 lack `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Workaround: node's base64 implementation allows for non-padded strings
  // while base64-js does not.
  if (encoding === 'base64' && type === 'string') {
    subject = stringtrim(subject)
    while (subject.length % 4 !== 0) {
      subject = subject + '='
    }
  }

  // Find the length
  var length
  if (type === 'number')
    length = coerce(subject)
  else if (type === 'string')
    length = Buffer.byteLength(subject, encoding)
  else if (type === 'object')
    length = coerce(subject.length) // assume that object is array-like
  else
    throw new Error('First argument needs to be a number, array or string.')

  var buf
  if (Buffer._useTypedArrays) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (Buffer._useTypedArrays && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    for (i = 0; i < length; i++) {
      if (Buffer.isBuffer(subject))
        buf[i] = subject.readUInt8(i)
      else
        buf[i] = subject[i]
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer._useTypedArrays && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

// STATIC METHODS
// ==============

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.isBuffer = function (b) {
  return !!(b !== null && b !== undefined && b._isBuffer)
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str + ''
  switch (encoding || 'utf8') {
    case 'hex':
      ret = str.length / 2
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.concat = function (list, totalLength) {
  assert(isArray(list), 'Usage: Buffer.concat(list, [totalLength])\n' +
      'list should be an Array.')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (typeof totalLength !== 'number') {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

// BUFFER INSTANCE METHODS
// =======================

function _hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  assert(strLen % 2 === 0, 'Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    assert(!isNaN(byte), 'Invalid hex string')
    buf[offset + i] = byte
  }
  Buffer._charsWritten = i * 2
  return i
}

function _utf8Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf8ToBytes(string), buf, offset, length)
  return charsWritten
}

function _asciiWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function _binaryWrite (buf, string, offset, length) {
  return _asciiWrite(buf, string, offset, length)
}

function _base64Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function _utf16leWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf16leToBytes(string), buf, offset, length)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = _asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = _binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = _base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leWrite(this, string, offset, length)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toString = function (encoding, start, end) {
  var self = this

  encoding = String(encoding || 'utf8').toLowerCase()
  start = Number(start) || 0
  end = (end !== undefined)
    ? Number(end)
    : end = self.length

  // Fastpath empty strings
  if (end === start)
    return ''

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexSlice(self, start, end)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Slice(self, start, end)
      break
    case 'ascii':
      ret = _asciiSlice(self, start, end)
      break
    case 'binary':
      ret = _binarySlice(self, start, end)
      break
    case 'base64':
      ret = _base64Slice(self, start, end)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leSlice(self, start, end)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  assert(end >= start, 'sourceEnd < sourceStart')
  assert(target_start >= 0 && target_start < target.length,
      'targetStart out of bounds')
  assert(start >= 0 && start < source.length, 'sourceStart out of bounds')
  assert(end >= 0 && end <= source.length, 'sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  var len = end - start

  if (len < 100 || !Buffer._useTypedArrays) {
    for (var i = 0; i < len; i++)
      target[i + target_start] = this[i + start]
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }
}

function _base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function _utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function _asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++)
    ret += String.fromCharCode(buf[i])
  return ret
}

function _binarySlice (buf, start, end) {
  return _asciiSlice(buf, start, end)
}

function _hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function _utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i+1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = clamp(start, len, 0)
  end = clamp(end, len, len)

  if (Buffer._useTypedArrays) {
    return Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  return this[offset]
}

function _readUInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    val = buf[offset]
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
  } else {
    val = buf[offset] << 8
    if (offset + 1 < len)
      val |= buf[offset + 1]
  }
  return val
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  return _readUInt16(this, offset, true, noAssert)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  return _readUInt16(this, offset, false, noAssert)
}

function _readUInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    if (offset + 2 < len)
      val = buf[offset + 2] << 16
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
    val |= buf[offset]
    if (offset + 3 < len)
      val = val + (buf[offset + 3] << 24 >>> 0)
  } else {
    if (offset + 1 < len)
      val = buf[offset + 1] << 16
    if (offset + 2 < len)
      val |= buf[offset + 2] << 8
    if (offset + 3 < len)
      val |= buf[offset + 3]
    val = val + (buf[offset] << 24 >>> 0)
  }
  return val
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  return _readUInt32(this, offset, true, noAssert)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  return _readUInt32(this, offset, false, noAssert)
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null,
        'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  var neg = this[offset] & 0x80
  if (neg)
    return (0xff - this[offset] + 1) * -1
  else
    return this[offset]
}

function _readInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt16(buf, offset, littleEndian, true)
  var neg = val & 0x8000
  if (neg)
    return (0xffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  return _readInt16(this, offset, true, noAssert)
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  return _readInt16(this, offset, false, noAssert)
}

function _readInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt32(buf, offset, littleEndian, true)
  var neg = val & 0x80000000
  if (neg)
    return (0xffffffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  return _readInt32(this, offset, true, noAssert)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  return _readInt32(this, offset, false, noAssert)
}

function _readFloat (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 23, 4)
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  return _readFloat(this, offset, true, noAssert)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  return _readFloat(this, offset, false, noAssert)
}

function _readDouble (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 7 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 52, 8)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  return _readDouble(this, offset, true, noAssert)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  return _readDouble(this, offset, false, noAssert)
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'trying to write beyond buffer length')
    verifuint(value, 0xff)
  }

  if (offset >= this.length) return

  this[offset] = value
}

function _writeUInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 2); i < j; i++) {
    buf[offset + i] =
        (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
            (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, false, noAssert)
}

function _writeUInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffffffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 4); i < j; i++) {
    buf[offset + i] =
        (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, false, noAssert)
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7f, -0x80)
  }

  if (offset >= this.length)
    return

  if (value >= 0)
    this.writeUInt8(value, offset, noAssert)
  else
    this.writeUInt8(0xff + value + 1, offset, noAssert)
}

function _writeInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fff, -0x8000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt16(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt16(buf, 0xffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, false, noAssert)
}

function _writeInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fffffff, -0x80000000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt32(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt32(buf, 0xffffffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, false, noAssert)
}

function _writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 23, 4)
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, false, noAssert)
}

function _writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 7 < buf.length,
        'Trying to write beyond buffer length')
    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 52, 8)
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, false, noAssert)
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (typeof value === 'string') {
    value = value.charCodeAt(0)
  }

  assert(typeof value === 'number' && !isNaN(value), 'value is not a number')
  assert(end >= start, 'end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  assert(start >= 0 && start < this.length, 'start out of bounds')
  assert(end >= 0 && end <= this.length, 'end out of bounds')

  for (var i = start; i < end; i++) {
    this[i] = value
  }
}

Buffer.prototype.inspect = function () {
  var out = []
  var len = this.length
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i])
    if (i === exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...'
      break
    }
  }
  return '<Buffer ' + out.join(' ') + '>'
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer._useTypedArrays) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1)
        buf[i] = this[i]
      return buf.buffer
    }
  } else {
    throw new Error('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function (arr) {
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

// slice(start, end)
function clamp (index, len, defaultValue) {
  if (typeof index !== 'number') return defaultValue
  index = ~~index;  // Coerce to integer.
  if (index >= len) return len
  if (index >= 0) return index
  index += len
  if (index >= 0) return index
  return 0
}

function coerce (length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length)
  return length < 0 ? 0 : length
}

function isArray (subject) {
  return (Array.isArray || function (subject) {
    return Object.prototype.toString.call(subject) === '[object Array]'
  })(subject)
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    var b = str.charCodeAt(i)
    if (b <= 0x7F)
      byteArray.push(str.charCodeAt(i))
    else {
      var start = i
      if (b >= 0xD800 && b <= 0xDFFF) i++
      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16))
    }
  }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length) {
  var pos
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

/*
 * We have to make sure that the value is a valid integer. This means that it
 * is non-negative. It has no fractional component and that it does not
 * exceed the maximum allowed value.
 */
function verifuint (value, max) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value >= 0, 'specified a negative value for writing an unsigned value')
  assert(value <= max, 'value is larger than maximum value for type')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifsint (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifIEEE754 (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
}

function assert (test, message) {
  if (!test) throw new Error(message || 'Failed assertion')
}

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer/index.js","/../../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer")
},{"base64-js":3,"buffer":2,"ieee754":4,"oMfpAn":5}],3:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)
	var PLUS_URL_SAFE = '-'.charCodeAt(0)
	var SLASH_URL_SAFE = '_'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS ||
		    code === PLUS_URL_SAFE)
			return 62 // '+'
		if (code === SLASH ||
		    code === SLASH_URL_SAFE)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer/node_modules/base64-js/lib/b64.js","/../../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer/node_modules/base64-js/lib")
},{"buffer":2,"oMfpAn":5}],4:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer/node_modules/ieee754/index.js","/../../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer/node_modules/ieee754")
},{"buffer":2,"oMfpAn":5}],5:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/gulp-browserify/node_modules/browserify/node_modules/process/browser.js","/../../node_modules/gulp-browserify/node_modules/browserify/node_modules/process")
},{"buffer":2,"oMfpAn":5}],6:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

/**
 * @type {Chapters}
 */
var Chapters = require('./modules/chapter');

function createTimeControls() {
  return $('<ul class="timecontrolbar"></ul>');
}

function createBox() {
  return $('<div class="controlbar bar"></div>');
}

function playerStarted(player) {
  return ((typeof player.currentTime === 'number') && (player.currentTime > 0));
}

function getCombinedCallback(callback) {
  return function (evt) {
    console.debug('Controls', 'controlbutton clicked', evt);
    evt.preventDefault();
    console.debug('Controls', 'player started?', playerStarted(this.player));
    if (!playerStarted(this.player)) {
      this.player.play();
    }
    var boundCallBack = callback.bind(this);
    boundCallBack();
  };
}

/**
 * instantiate new controls element
 * @param {jQuery|HTMLElement} player Player element reference
 * @param {Timeline} timeline Timeline object for this player
 * @constructor
 */
function Controls (timeline) {
  this.player = timeline.player;
  this.timeline = timeline;
  this.box = createBox();
  this.timeControlElement = createTimeControls();
  this.box.append(this.timeControlElement);
}

/**
 * create time control buttons and add them to timeControlElement
 * @param {null|Chapters} chapterModule when present will add next and previous chapter controls
 * @returns {void}
 */
Controls.prototype.createTimeControls = function (chapterModule) {
  var hasChapters = (chapterModule instanceof Chapters);
  if (!hasChapters) {
    console.info('Controls', 'createTimeControls', 'no chapterTab found');
  }
  if (hasChapters) {
    this.createButton('pwp-controls-previous-chapter', 'Zurück zum vorigen Kapitel', function () {
      var activeChapter = chapterModule.getActiveChapter();
      if (this.timeline.getTime() > activeChapter.start + 10) {
        console.debug('Controls', 'Zurück zum Kapitelanfang', chapterModule.currentChapter, 'from', this.timeline.getTime());
        return chapterModule.playCurrentChapter();
      }
      console.debug('Controls', 'Zurück zum vorigen Kapitel', chapterModule.currentChapter);
      return chapterModule.previous();
    });
  }

  this.createButton('pwp-controls-back-30', '30 Sekunden zurück', function () {
    console.debug('Controls', 'rewind before', this.timeline.getTime());
    this.timeline.setTime(this.timeline.getTime() - 30);
    console.debug('Controls', 'rewind after', this.timeline.getTime());
  });

  this.createButton('pwp-controls-forward-30', '30 Sekunden vor', function () {
    console.debug('Controls', 'ffwd before', this.timeline.getTime());
    this.timeline.setTime(this.timeline.getTime() + 30);
    console.debug('Controls', 'ffwd after', this.timeline.getTime());
  });

  if (hasChapters) {
    this.createButton('pwp-controls-next-chapter', 'Zum nächsten Kapitel springen', function () {
      console.debug('Controls', 'next Chapter before', this.timeline.getTime());
      chapterModule.next();
      console.debug('Controls', 'next Chapter after', this.timeline.getTime());
    });
  }
};

Controls.prototype.createButton = function createButton(icon, title, callback) {
  var button = $('<li><a href="#" class="button button-control" title="' + title + '">' +
    '<i class="icon ' + icon + '"></i></a></li>');
  this.timeControlElement.append(button);
  var combinedCallback = getCombinedCallback(callback);
  button.on('click', combinedCallback.bind(this));
};

module.exports = Controls;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/controls.js","/")
},{"./modules/chapter":9,"buffer":2,"oMfpAn":5}],7:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

// everything for an embedded player
var
  players = [],
  lastHeight = 0,
  $body;

function postToOpener(obj) {
  console.debug('postToOpener', obj);
  window.parent.postMessage(obj, '*');
}

function messageListener (event) {
  var orig = event.originalEvent;

  if (orig.data.action === 'pause') {
    players.forEach(function (player) {
      player.pause();
    });
  }
}

function waitForMetadata (callback) {
  function metaDataListener (event) {
    var orig = event.originalEvent;
    if (orig.data.playerOptions) {
      callback(orig.data.playerOptions);
    }
  }
  $(window).on('message', metaDataListener);
}

function pollHeight() {
  var newHeight = $body.height();
  if (lastHeight !== newHeight) {
    postToOpener({
      action: 'resize',
      arg: newHeight
    });
  }

  lastHeight = newHeight;
  requestAnimationFrame(pollHeight, document.body);
}

/**
 * initialize embed functionality
 * @param {function} $ jQuery
 * @param {Array} playerList all playersin this window
 * @returns {void}
 */
function init($, playerList) {
  players = playerList;
  $body = $(document.body);
  $(window).on('message', messageListener);
  pollHeight();
}

module.exports = {
  postToOpener: postToOpener,
  waitForMetadata: waitForMetadata,
  init: init
};

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/embed.js","/")
},{"buffer":2,"oMfpAn":5}],8:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**!
 * ===========================================
 * Podlove Web Player v3.0.0-alpha
 * Licensed under The BSD 2-Clause License
 * http://opensource.org/licenses/BSD-2-Clause
 * ===========================================
 * Copyright (c) 2014, Gerrit van Aaken (https://github.com/gerritvanaaken/), Simon Waldherr (https://github.com/simonwaldherr/), Frank Hase (https://github.com/Kambfhase/), Eric Teubert (https://github.com/eteubert/) and others (https://github.com/podlove/podlove-web-player/contributors)
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 *
 * - Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * - Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
'use strict';

var TabRegistry = require('./tabregistry'),
  embed = require('./embed'),
  Timeline = require('./timeline'),
  Info = require('./modules/info'),
  Share = require('./modules/share'),
  Downloads = require('./modules/downloads'),
  Chapters = require('./modules/chapter'),
  SaveTime = require('./modules/savetime'),
  Controls = require('./controls'),
  Player = require('./player'),
  ProgressBar = require('./modules/progressbar');

var pwp;

// will expose/attach itself to the $ global
require('../../bower_components/mediaelement/build/mediaelement.js');

/**
 * The most missing feature regarding embedded players
 * @param {string} title the title of the show
 * @param {string} url (optional) the link to the show
 * @returns {string}
 */
function renderShowTitle(title, url) {
  if (!title) {
    return '';
  }
  if (url) {
    title = '<a href="' + url + '" title="Link zur Show">' + title + '</a>';
  }
  return '<h3 class="showtitle">' + title + '</h3>';
}

/**
 * Render episode title HTML
 * @param {string} text
 * @param {string} link
 * @returns {string}
 */
function renderTitle(text, link) {
  var titleBegin = '<h1 class="episodetitle">',
    titleEnd = '</h1>';
  if (text !== undefined && link !== undefined) {
    text = '<a href="' + link + '" title="Link zur Episode">' + text + '</a>';
  }
  return titleBegin + text + titleEnd;
}

/**
 * Render HTML subtitle
 * @param {string} text
 * @returns {string}
 */
function renderSubTitle(text) {
  if (!text) {
    return '';
  }
  return '<h2 class="subtitle">' + text + '</h2>';
}

/**
 * Render HTML title area
 * @param params
 * @returns {string}
 */
function renderTitleArea(params) {
  return '<header>' +
    renderShowTitle(params.show.title, params.show.url) +
    renderTitle(params.title, params.permalink) +
    renderSubTitle(params.subtitle) +
    '</header>';
}

/**
 * Render HTML playbutton
 * @returns {string}
 */
function renderPlaybutton() {
  return $('<a class="play" title="Abspielen" href="javascript:;"></a>');
}

/**
 * Render the poster image in HTML
 * returns an empty string if posterUrl is empty
 * @param {string} posterUrl
 * @returns {string} rendered HTML
 */
function renderPoster(posterUrl) {
  if (!posterUrl) {
    return '';
  }
  return '<div class="coverart"><img class="coverimg" src="' + posterUrl + '" data-img="' + posterUrl + '" alt="Poster Image"></div>';
}

/**
 * checks if the current window is hidden
 * @returns {boolean} true if the window is hidden
 */
function isHidden() {
  var props = [
    'hidden',
    'mozHidden',
    'msHidden',
    'webkitHidden'
  ];

  for (var index in props) {
    if (props[index] in document) {
      return !!document[props[index]];
    }
  }
  return false;
}

function renderModules(timeline, wrapper, params) {
  var
    tabs = new TabRegistry(),
    hasChapters = timeline.hasChapters,
    controls = new Controls(timeline),
    controlBox = controls.box;

  /**
   * -- MODULES --
   */
  var chapters;
  if (hasChapters) {
    chapters = new Chapters(timeline, params);
    timeline.addModule(chapters);
  }
  controls.createTimeControls(chapters);

  var saveTime = new SaveTime(timeline, params);
  timeline.addModule(saveTime);

  var progressBar = new ProgressBar(timeline);
  timeline.addModule(progressBar);

  var sharing = new Share(params);
  var downloads = new Downloads(params);
  var infos = new Info(params);

  /**
   * -- TABS --
   * The tabs in controlbar will appear in following order:
   */

  if (hasChapters) {
    tabs.add(chapters.tab);
  }

  tabs.add(sharing.tab);
  tabs.add(downloads.tab);
  tabs.add(infos.tab);

  tabs.openInitial(params.activeTab);

  // Render controlbar with togglebar and timecontrols
  var controlbarWrapper = $('<div class="controlbar-wrapper"></div>');
  controlbarWrapper.append(tabs.togglebar);
  controlbarWrapper.append(controlBox);

  // render progressbar, controlbar and tabs
  wrapper
    .append(progressBar.render())
    .append(controlbarWrapper)
    .append(tabs.container);

  progressBar.addEvents();
}

/**
 * add chapter behavior and deeplinking: skip to referenced
 * time position & write current time into address
 * @param {object} player
 * @param {object} params
 * @param {object} wrapper
 */
function addBehavior(player, params, wrapper) {
  var jqPlayer = $(player),
    timeline = new Timeline(player, params),

    metaElement = $('<div class="titlebar"></div>'),
    playerType = params.type,
    playButton = renderPlaybutton(),
    poster = params.poster || jqPlayer.attr('poster');

  var deepLink;

  console.debug('webplayer', 'metadata', timeline.getData());
  jqPlayer.prop({
    controls: null,
    preload: 'metadata'
  });

  /**
   * Build rich player with meta data
   */
  wrapper
    .addClass('podlovewebplayer_' + playerType)
    .data('podlovewebplayer', {
    player: jqPlayer
  });

  if (playerType === 'audio') {
    // Render playbutton in titlebar
    metaElement.prepend(playButton);
    metaElement.append(renderPoster(poster));
    wrapper.prepend(metaElement);
  }

  if (playerType === 'video') {
    var videoPane = $('<div class="video-pane"></div>');
    var overlay = $('<div class="video-overlay"></div>');
    overlay.append(playButton);
    overlay.on('click', function () {
      if (player.paused) {
        playButton.addClass('playing');
        player.play();
        return;
      }
      playButton.removeClass('playing');
      player.pause();
    });

    videoPane
      .append(overlay)
      .append(jqPlayer);

    wrapper
      .append(metaElement)
      .append(videoPane);

    jqPlayer.prop({poster: poster});
  }

  // Render title area with title h2 and subtitle h3
  metaElement.append(renderTitleArea(params));

  // parse deeplink
  deepLink = require('./url').checkCurrent();
  if (deepLink[0] && pwp.players.length === 1) {
    var playerAttributes = {preload: 'auto'};
    if (!isHidden()) {
      playerAttributes.autoplay = 'autoplay';
    }
    jqPlayer.attr(playerAttributes);
    //stopAtTime = deepLink[1];
    timeline.playRange(deepLink);

    $('html, body').delay(150).animate({
      scrollTop: $('.container:first').offset().top - 25
    });
  }

  playButton.on('click', function (evt) {
    evt.preventDefault();
    evt.stopPropagation();

    if (player.currentTime && player.currentTime > 0 && !player.paused) {
      playButton.removeClass('playing');
      player.pause();
      if (player.pluginType === 'flash') {
        player.pause();    // flash fallback needs additional pause
      }
      return;
    }

    if (!playButton.hasClass('playing')) {
      playButton.addClass('playing');
    }
    player.play();
  });

  $(document)
    .on('keydown', function (e) {
      console.log('progress', 'keydown', e);
      /*
       if ((new Date() - lastKeyPressTime) >= 1000) {
       startedPaused = media.paused;
       }
       */
      e.preventDefault();
      e.stopPropagation();

      var keyCode = e.which,
        duration = timeline.player.duration,
        seekTime = timeline.player.currentTime;

      switch (keyCode) {
        case 37: // left
          seekTime -= 1;
          break;
        case 39: // Right
          seekTime += 1;
          break;
        case 38: // Up
          if (timeline.hasChapters) {
            timeline.modules[0].next();
            return false;
          }
          seekTime += Math.floor(duration * 0.1);
          break;
        case 40: // Down
          if (timeline.hasChapters) {
            timeline.modules[0].previous();
            return false;
          }
          seekTime -= Math.floor(duration * 0.1);
          break;
        case 36: // Home
          seekTime = 0;
          break;
        case 35: // end
          seekTime = duration;
          break;
        case 10: // enter
        case 32: // space
          if (timeline.player.paused) {
            timeline.player.play();
            return false;
          }
            timeline.player.pause();
          return false;
        default:
          return false;
      }

      timeline.setTime(seekTime);
      return false;
    });

  jqPlayer
    .on('timelineElement', function (event) {
      console.log(event.currentTarget.id, event);
    })
    .on('timeupdate progress', function (event) {
      timeline.update(event);
    })
    // update play/pause status
    .on('play', function () {})
    .on('playing', function () {
      playButton.addClass('playing');
      embed.postToOpener({ action: 'play', arg: player.currentTime });
    })
    .on('pause', function () {
      playButton.removeClass('playing');
      embed.postToOpener({ action: 'pause', arg: player.currentTime });
    })
    .on('ended', function () {
      embed.postToOpener({ action: 'stop', arg: player.currentTime });
      // delete the cached play time
      timeline.rewind();
    });

  var delayModuleRendering = !timeline.duration || isNaN(timeline.duration) || timeline.duration <= 0;

  if (!delayModuleRendering) {
    renderModules(timeline, wrapper, params);
  }

  jqPlayer.one('canplay', function () {
    // correct duration just in case
    timeline.duration = player.duration;
    if (delayModuleRendering) {
      renderModules(timeline, wrapper, params);
    }
  });
}

/**
 * return callback function that will attach source elements to the deferred audio element
 * @param {object} deferredPlayer
 * @returns {Function}
 */
function getDeferredPlayerCallBack(deferredPlayer) {
  return function (data) {
    var params = $.extend({}, Player.defaults, data);
    data.sources.forEach(function (sourceObject) {
      $('<source>', sourceObject).appendTo(deferredPlayer);
    });
    Player.create(deferredPlayer, params, addBehavior);
  };
}

/**
 *
 * @param {object} options
 * @returns {jQuery}
 */
$.fn.podlovewebplayer = function webPlayer(options) {
  if (options.deferred) {
    var deferredPlayer = this[0];
    var callback = getDeferredPlayerCallBack(deferredPlayer);
    embed.waitForMetadata(callback);
    embed.postToOpener({action: 'waiting'});
    return this;
  }

  // Additional parameters default values
  var params = $.extend({}, Player.defaults, options);

  // turn each player in the current set into a Podlove Web Player
  return this.each(function (i, playerElement) {
    Player.create(playerElement, params, addBehavior);
  });
};

pwp = { players: Player.players };

embed.init($, Player.players);

window.pwp = pwp;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/fake_46460646.js","/")
},{"../../bower_components/mediaelement/build/mediaelement.js":1,"./controls":6,"./embed":7,"./modules/chapter":9,"./modules/downloads":10,"./modules/info":11,"./modules/progressbar":12,"./modules/savetime":13,"./modules/share":14,"./player":15,"./tabregistry":20,"./timeline":22,"./url":23,"buffer":2,"oMfpAn":5}],9:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var tc = require('../timecode')
  , Tab = require('../tab')
  ;

var ACTIVE_CHAPTER_THRESHHOLD = 0.1;

function rowClickHandler (e) {
  e.preventDefault();
  var chapters = e.data.module;
  console.log('Chapter', 'clickHandler', 'setCurrentChapter to', e.data.index);
  chapters.setCurrentChapter(e.data.index);
  chapters.playCurrentChapter();
  chapters.timeline.player.play();
  return false;
}

function transformChapter(chapter) {
  chapter.code = chapter.title;
  if (typeof chapter.start === 'string') {
    chapter.start = tc.getStartTimeCode(chapter.start);
  }
  return chapter;
}

/**
 * add `end` property to each simple chapter,
 * needed for proper formatting
 * @param {number} duration
 * @returns {function}
 */
function addEndTime(duration) {
  return function (chapter, i, chapters) {
    var next = chapters[i + 1];
    chapter.end = next ? next.start : duration;
    return chapter;
  };
}

function render(html) {
  return $(html);
}

/**
 * render HTMLTableElement for chapters
 * @returns {jQuery|HTMLElement}
 */
function renderChapterTable() {
  return render(
    '<table class="podlovewebplayer_chapters"><caption>Kapitel</caption>' +
      '<thead>' +
        '<tr>' +
          '<th scope="col">Kapitelnummer</th>' +
          '<th scope="col">Startzeit</th>' +
          '<th scope="col">Titel</th>' +
          '<th scope="col">Dauer</th>' +
        '</tr>' +
      '</thead>' +
      '<tbody></tbody>' +
    '</table>'
  );
}

/**
 *
 * @param {object} chapter
 * @returns {jQuery|HTMLElement}
 */
function renderRow (chapter, index) {
  return render(
    '<tr class="chapter">' +
      '<td class="chapter-number"><span class="badge">' + (index + 1) + '</span></td>' +
      '<td class="chapter-name"><span>' + chapter.code + '</span></td>' +
      '<td class="chapter-duration"><span>' + chapter.duration + '</span></td>' +
    '</tr>'
  );
}

/**
 *
 * @param {Array} chapters
 * @returns {number}
 */
function getMaxChapterStart(chapters) {
  function getStartTime (chapter) {
    return chapter.start;
  }
  return Math.max.apply(Math, $.map(chapters, getStartTime));
}

/**
 *
 * @param {{end:{number}, start:{number}}} chapter
 * @param {number} currentTime
 * @returns {boolean}
 */
function isActiveChapter (chapter, currentTime) {
  if (!chapter) {
    return false;
  }
  return (currentTime > chapter.start - ACTIVE_CHAPTER_THRESHHOLD && currentTime <= chapter.end);
}

/**
 * update the chapter list when the data is loaded
 * @param {Timeline} timeline
 */
function update (timeline) {
  var activeChapter = this.getActiveChapter()
    , currentTime = timeline.getTime();

  console.debug('Chapters', 'update', this, activeChapter, currentTime);
  if (isActiveChapter(activeChapter, currentTime)) {
    console.log('Chapters', 'update', 'already set', this.currentChapter);
    return;
  }
  function markChapter (chapter, i) {
    var isActive = isActiveChapter(chapter, currentTime);
    if (isActive) {
      this.setCurrentChapter(i);
    }
  }
  this.chapters.forEach(markChapter, this);
}

/**
 * chapter handling
 * @params {Timeline} params
 * @return {Chapters} chapter module
 */
function Chapters (timeline, params) {

  if (!timeline || !timeline.hasChapters) {
    return null;
  }
  if (timeline.duration === 0) {
    console.warn('Chapters', 'constructor', 'Zero length media?', timeline);
  }

  this.timeline = timeline;
  this.duration = timeline.duration;
  this.chapterlinks = !!timeline.chapterlinks;
  this.currentChapter = 0;
  this.chapters = this.parseSimpleChapter(params);
  this.data = this.chapters;

  this.tab = new Tab({
    icon: 'pwp-chapters',
    title: 'Kapitel anzeigen / verbergen',
    headline: 'Kapitel',
    name: 'podlovewebplayer_chapterbox'
  });

  this.tab
    .createMainContent('')
    .append(this.generateTable());

  this.update = update.bind(this);
}

/**
 * Given a list of chapters, this function creates the chapter table for the player.
 * @returns {jQuery|HTMLDivElement}
 */
Chapters.prototype.generateTable = function () {
  var table, tbody, maxchapterstart, forceHours;

  table = renderChapterTable();
  tbody = table.children('tbody');

  maxchapterstart = getMaxChapterStart(this.chapters);
  forceHours = (maxchapterstart >= 3600);

  function buildChapter(chapter, index) {
    var duration = Math.round(chapter.end - chapter.start);

    //make sure the duration for all chapters are equally formatted
    chapter.duration = tc.generate([duration], false);

    //if there is a chapter that starts after an hour, force '00:' on all previous chapters
    chapter.startTime = tc.generate([Math.round(chapter.start)], true, forceHours);

    //insert the chapter data
    var row = renderRow(chapter, index);
    row.on('click', {module: this, index: index}, rowClickHandler);
    row.appendTo(tbody);
    chapter.element = row;
  }

  this.chapters.forEach(buildChapter, this);
  return table;
};

Chapters.prototype.getActiveChapter = function () {
  var active = this.chapters[this.currentChapter];
  console.log('Chapters', 'getActiveChapter', active);
  return active;
};

/**
 *
 * @param {number} chapterIndex
 */
Chapters.prototype.setCurrentChapter = function (chapterIndex) {
  if (chapterIndex < this.chapters.length && chapterIndex >= 0) {
    this.currentChapter = chapterIndex;
  }
  this.markActiveChapter();
  console.log('Chapters', 'setCurrentChapter', 'to', this.currentChapter);
};

Chapters.prototype.markActiveChapter = function () {
  var activeChapter = this.getActiveChapter();
  $.each(this.chapters, function () {
    this.element.removeClass('active');
  });
  activeChapter.element.addClass('active');
};

Chapters.prototype.next = function () {
  var current = this.currentChapter,
    next = this.setCurrentChapter(current + 1);
  if (current === next) {
    console.log('Chapters', 'next', 'already in last chapter');
    return current;
  }
  console.log('Chapters', 'next', 'chapter', this.currentChapter);
  this.playCurrentChapter();
  return next;
};

Chapters.prototype.previous = function () {
  var current = this.currentChapter,
    previous = this.setCurrentChapter(current - 1);
  if (current === previous) {
    console.debug('Chapters', 'previous', 'already in first chapter');
    this.playCurrentChapter();
    return current;
  }
  console.debug('Chapters', 'previous', 'chapter', this.currentChapter);
  this.playCurrentChapter();
  return previous;
};

Chapters.prototype.playCurrentChapter = function () {
  var start = this.getActiveChapter().start;
  console.log('Chapters', '#playCurrentChapter', 'start', start);
  var time = this.timeline.setTime(start);
  console.log('Chapters', '#playCurrentChapter', 'currentTime', time);
};

Chapters.prototype.parseSimpleChapter = function (params) {
  var chapters = params.chapters;
  if (!chapters) {
    return [];
  }

  return chapters
    .map(transformChapter)
    .map(addEndTime(this.duration))
    .sort(function (a, b) { // order is not guaranteed: http://podlove.org/simple-chapters/
      return a.start - b.start;
    });
};

module.exports = Chapters;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/modules/chapter.js","/modules")
},{"../tab":19,"../timecode":21,"buffer":2,"oMfpAn":5}],10:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var Tab = require('../tab');

/**
 * Calculate the filesize into KB and MB
 * @param size
 * @returns {string}
 */
function formatSize(size) {
  var oneMb = 1048576;
  var fileSize = parseInt(size, 10);
  var kBFileSize = Math.round(fileSize / 1024);
  var mBFileSIze = Math.round(fileSize / 1024 / 1024);
  if (!size) {
    return ' -- ';
  }
  // in case, the filesize is smaller than 1MB,
  // the format will be rendered in KB
  // otherwise in MB
  return (fileSize < oneMb) ? kBFileSize + ' KB' : mBFileSIze + ' MB';
}

/**
 *
 * @param listElement
 * @returns {string}
 */
function createOption(listElement) {
  console.log(listElement);
  return '<option>' + listElement.assetTitle + ' &#8226; ' + formatSize(listElement.size) + '</option>';
}

/**
 *
 * @param element
 * @returns {{assetTitle: String, downloadUrl: String, url: String, size: Number}}
 */
function normalizeDownload (element) {
  return {
    assetTitle: element.name,
    downloadUrl: element.dlurl,
    url: element.url,
    size: element.size
  };
}

/**
 *
 * @param element
 * @returns {{assetTitle: String, downloadUrl: String, url: String, size: Number}}
 */
function normalizeSource(element) {
  var source = (typeof element === 'string') ? element : element.src;
  var parts = source.split('.');
  return {
    assetTitle: parts[parts.length - 1],
    downloadUrl: source,
    url: source,
    size: -1
  };
}

/**
 *
 * @param {Object} params
 * @returns {Array}
 */
function createList (params) {
  if (params.downloads && params.downloads[0].assetTitle) {
    return params.downloads;
  }

  if (params.downloads) {
    return params.downloads.map(normalizeDownload);
  }
  // build from source elements
  return params.sources.map(normalizeSource);
}

/**
 *
 * @param {object} params
 * @constructor
 */
function Downloads (params) {
  this.list = createList(params);
  this.tab = this.createDownloadTab(params);
}

/**
 *
 * @param {object} params
 * @returns {null|Tab} download tab
 */
Downloads.prototype.createDownloadTab = function (params) {
  if ((!params.downloads && !params.sources) || params.hidedownloadbutton === true) {
    return null;
  }
  var downloadTab = new Tab({
    icon: 'pwp-download',
    title: 'Downloads anzeigen / verbergen',
    name: 'downloads',
    headline: 'Download'
  });

  var $tabContent = downloadTab.createMainContent(
    '<div class="download">' +
    '<form action="" method="">' +
      '<select class="select" name="select-file">' + this.list.map(createOption) + '</select>' +
      '<button class="download button-submit icon pwp-download" name="download-file">' +
      '<span class="download label">Download</span>' +
      '</button>' +
    '</form>' +
    '</div>'
  );
  downloadTab.box.append($tabContent);

  return downloadTab;
};

module.exports = Downloads;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/modules/downloads.js","/modules")
},{"../tab":19,"buffer":2,"oMfpAn":5}],11:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var Tab = require('../tab')
  , timeCode = require('../timecode')
  , services = require('../social-networks');

function getPublicationDate(rawDate) {
  if (!rawDate) {
    return '';
  }
  var date = new Date(rawDate);
  return '<p>Veröffentlicht am: ' + date.getDate() + '.' + date.getMonth() + '.' + date.getFullYear() + '</p>';
}

function createEpisodeInfo(tab, params) {
  tab.createMainContent(
    '<h2>' + params.title + '</h2>' +
    '<h3>' + params.subtitle + '</h3>' +
    '<p>' + params.summary + '</p>' +
    '<p>Dauer: ' + timeCode.fromTimeStamp(params.duration) + '</p>' +
     getPublicationDate(params.publicationDate) +
    '<p>' +
      'Permalink:<br>' +
      '<a href="' + params.permalink + '" title="Permalink für die Episode">' + params.permalink + '</a>' +
    '</p>'
  );
}

function createPosterImage(poster) {
  if (!poster) {
    return '';
  }
  return '<div class="poster-image">' +
    '<img src="' + poster + '" data-img="' + poster + '" alt="Poster Image">' +
    '</div>';
}

function createSubscribeButton(params) {
  if (!params.subscribeButton) {
    return '';
  }
  return '<button class="button-submit">' +
      '<span class="showtitle-label">' + params.show.title + '</span>' +
      '<span class="submit-label">' + params.subscribeButton + '</span>' +
    '</button>';
}

function createShowInfo (tab, params) {
  tab.createAside(
    '<h2>' + params.show.title + '</h2>' +
    '<h3>' + params.show.subtitle + '</h3>' +
    createPosterImage(params.show.poster) +
    createSubscribeButton(params) +
    '<p>Link zur Show:<br>' +
      '<a href="' + params.show.url + '" title="Link zur Show">' + params.show.url + '</a></p>'
  );
}

function createSocialLink(options) {
  var service = services.get(options.serviceName);
  var listItem = $('<li></li>');
  var button = service.getButton(options);
  listItem.append(button.element);
  this.append(listItem);
}

function createSocialInfo(profiles) {
  if (!profiles) {
    return null;
  }

  var profileList = $('<ul></ul>');
  profiles.forEach(createSocialLink, profileList);

  var container = $('<div class="social-links"><h3>Bleib in Verbindung</h3></div>');
  container.append(profileList);
  return container;
}

function createSocialAndLicenseInfo (tab, params) {
  if (!params.license && !params.profiles) {
    return;
  }
  tab.createFooter(
    '<p>Die Show "' + params.show.title + '" ist lizensiert unter<br>' +
      '<a href="' + params.license.url + '" title="Lizenz ansehen">' + params.license.name + '</a>' +
    '</p>'
  ).prepend(createSocialInfo(params.profiles));
}

/**
 * create info tab if params.summary is defined
 * @param {object} params parameter object
 * @returns {null|Tab} info tab instance or null
 */
function createInfoTab(params) {
  if (!params.summary) {
    return null;
  }
  var infoTab = new Tab({
    icon: 'pwp-info',
    title: 'Infos anzeigen / verbergen',
    headline: 'Info',
    name: 'info'
  });

  createEpisodeInfo(infoTab, params);
  createShowInfo(infoTab, params);
  createSocialAndLicenseInfo(infoTab, params);

  return infoTab;
}

/**
 * Information module to display podcast and episode info
 * @param {object} params parameter object
 * @constructor
 */
function Info(params) {
  this.tab = createInfoTab(params);
}

module.exports = Info;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/modules/info.js","/modules")
},{"../social-networks":18,"../tab":19,"../timecode":21,"buffer":2,"oMfpAn":5}],12:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var tc = require('../timecode');
var cap = require('../util').cap;

function renderTimeElement(className, time) {
  return $('<div class="time time-' + className + '">' + time + '</div>');
}

/**
 * Render an HTML Element for the current chapter
 * @returns {jQuery|HTMLElement}
 */
function renderCurrentChapterElement() {
  var chapterElement = $('<div class="chapter"></div>');

  if (!this.chapterModule) {
    return chapterElement;
  }

  var index = this.chapterModule.currentChapter;
  var chapter = this.chapterModule.chapters[index];
  console.debug('Progressbar', 'renderCurrentChapterElement', index, chapter);

  this.chapterBadge = $('<span class="badge">' + (index + 1) + '</span>');
  this.chapterTitle = $('<span class="chapter-title">' + chapter.title + '</span>');

  chapterElement
    .append(this.chapterBadge)
    .append(this.chapterTitle);

  return chapterElement;
}

function renderProgressInfo(progressBar) {
  var progressInfo = $('<div class="progress-info"></div>');

  return progressInfo
    .append(progressBar.currentTime)
    .append(renderCurrentChapterElement.call(progressBar))
    .append(progressBar.durationTimeElement);
}

function updateTimes(progressBar) {
  var time = progressBar.timeline.getTime();
  progressBar.currentTime.html(tc.fromTimeStamp(time));

  if (progressBar.showDuration) { return; }

  var remainingTime = Math.abs(time - progressBar.duration);
  progressBar.durationTimeElement.text('-' + tc.fromTimeStamp(remainingTime));
}

function renderDurationTimeElement(progressBar) {
  var formattedDuration = tc.fromTimeStamp(progressBar.duration);
  var durationTimeElement = renderTimeElement('duration', 0);

  durationTimeElement.on('click', function () {
    progressBar.showDuration = !progressBar.showDuration;
    if (progressBar.showDuration) {
      durationTimeElement.text(formattedDuration);
      return;
    }
    updateTimes(progressBar);
  });

  return durationTimeElement;
}

function renderMarkerAt(time) {
  var percent = 100 * time / this.duration;
  return $('<div class="marker" style="left:' + percent + '%;"></div>');
}

function renderChapterMarker(chapter) {
  return renderMarkerAt.call(this, chapter.start);
}

/**
 * This update method is to be called when a players `currentTime` changes.
 */
function update (timeline) {
  this.setProgress(timeline.getTime());
  this.buffer.val(timeline.getBuffered());
  this.setChapter();
}

/**
 * @constructor
 * Creates a new progress bar object.
 * @param {Timeline} timeline - The players timeline to attach to.
 */
function ProgressBar(timeline) {
  if (!timeline) {
    console.error('Timeline missing', arguments);
    return;
  }
  this.timeline = timeline;
  this.duration = timeline.duration;

  this.bar = null;
  this.currentTime = null;

  if (timeline.hasChapters) {
    // FIXME get access to chapterModule reliably
    // this.timeline.getModule('chapters')
    this.chapterModule = this.timeline.modules[0];
    this.chapterBadge = null;
    this.chapterTitle = null;
  }

  this.showDuration = false;
  this.progress = null;
  this.buffer = null;
  this.update = update.bind(this);
}

ProgressBar.prototype.setHandlePosition = function (time) {
  var percent = time / this.duration * 100;
  var newLeftOffset = percent + '%';
  console.debug('ProgressBar', 'setHandlePosition', 'time', time, 'newLeftOffset', newLeftOffset);
  this.handle.css('left', newLeftOffset);
};

/**
 * set progress bar value, slider position and current time
 * @param {number} time
 */
ProgressBar.prototype.setProgress = function (time) {
  this.progress.val(time);
  this.setHandlePosition(time);
  updateTimes(this);
};

/**
 * set chapter title and badge
 */
ProgressBar.prototype.setChapter = function () {
  if (!this.chapterModule) { return; }

  var index = this.chapterModule.currentChapter;
  var chapter = this.chapterModule.chapters[index];
  this.chapterBadge.text(index + 1);
  this.chapterTitle.text(chapter.title);
};

/**
 * Renders a new progress bar jQuery object.
 */
ProgressBar.prototype.render = function () {

  // time elements
  var initialTime = tc.fromTimeStamp(this.timeline.getTime());
  this.currentTime = renderTimeElement('current', initialTime);
  this.durationTimeElement = renderDurationTimeElement(this);

  // progress info
  var progressInfo = renderProgressInfo(this);
  updateTimes(this);

  // timeline and buffer bars
  var progress = $('<div class="progress"></div>');
  var timelineBar = $('<progress class="current"></progress>')
      .attr({ min: 0, max: this.duration});
  var buffer = $('<progress class="buffer"></progress>')
      .attr({min: 0, max: this.duration});
  var handle = $('<div class="handle"><div class="inner-handle"></div></div>');

  progress
    .append(timelineBar)
    .append(buffer)
    .append(handle);

  this.progress = timelineBar;
  this.buffer = buffer;
  this.handle = handle;
  this.setProgress(this.timeline.getTime());

  if (this.chapterModule) {
    var chapterMarkers = this.chapterModule.chapters.map(renderChapterMarker, this);
    chapterMarkers.shift(); // remove first one
    progress.append(chapterMarkers);
  }

  // progress bar
  var bar = $('<div class="progressbar"></div>');
  bar
    .append(progressInfo)
    .append(progress);

  this.bar = bar;
  return bar;
};

ProgressBar.prototype.addEvents = function() {
  var mouseIsDown = false;
  var timeline = this.timeline;
  var progress = this.progress;

  function calculateNewTime (pageX) {
    // mouse position relative to the object
    var width = progress.outerWidth(true);
    var offset = progress.offset();
    var pos = cap(pageX - offset.left, 0, width);
    var percentage = (pos / width);
    return percentage * timeline.duration;
  }

  function handleMouseMove (event) {
    event.preventDefault();
    event.stopPropagation();

    var x = event.pageX;
    if (event.originalEvent.changedTouches) {
      x = event.originalEvent.changedTouches[0].pageX;
    }

    if (typeof timeline.duration !== 'number' || !mouseIsDown ) { return; }
    var newTime = calculateNewTime(x);
    if (newTime === timeline.getTime()) { return; }
    timeline.seek(newTime);
  }

  function handleMouseUp () {
    mouseIsDown = false;
    $(document).unbind('touchend.dur mouseup.dur touchmove.dur mousemove.dur');
  }

  function handleMouseDown (event) {
    if (event.which !== 0 && event.which !== 1) { return; }

    mouseIsDown = true;
    handleMouseMove(event);
    $(document)
      .bind('mousemove.dur touchmove.dur', handleMouseMove)
      .bind('mouseup.dur touchend.dur', handleMouseUp);
  }

  // handle click and drag with mouse or touch in progressbar and on handle
  this.progress.bind('mousedown touchstart', handleMouseDown);

  this.handle.bind('touchstart mousedown', handleMouseDown);
};

module.exports = ProgressBar;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/modules/progressbar.js","/modules")
},{"../timecode":21,"../util":24,"buffer":2,"oMfpAn":5}],13:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

/**
 * Saving the playtime
 */
var prefix = 'podlove-web-player-playtime-';

function getItem () {
  return +localStorage[this.key];
}

function removeItem () {
  return localStorage.removeItem(this.key);
}

function hasItem () {
  return (this.key) in localStorage;
}

function update () {
  console.debug('SaveTime', 'update', this.timeline.getTime());
  if (this.timeline.getTime() === 0) {
    return removeItem.call(this);
  }
  this.setItem(this.timeline.getTime());
}

function SaveTime(timeline, params) {
  this.timeline = timeline;
  this.key = prefix + params.permalink;
  this.getItem = getItem.bind(this);
  this.removeItem = removeItem.bind(this);
  this.hasItem = hasItem.bind(this);
  this.update = update.bind(this);

  // set the time on start
  if (this.hasItem()) {
    timeline.setTime(this.getItem());
  }
}

SaveTime.prototype.setItem = function (value) {
  localStorage[this.key] = value;
};

module.exports = SaveTime;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/modules/savetime.js","/modules")
},{"buffer":2,"oMfpAn":5}],14:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var Tab = require('../tab')
  , SocialButtonList = require('../social-button-list');

var services = ['twitter', 'facebook', 'gplus', 'tumblr', 'email']
  , shareOptions = [
    {name: 'Show', value: 'show'},
    {name: 'Episode', value: 'episode', default: true},
    {name: 'Chapter', value: 'chapter', disabled: true},
    {name: 'Exactly this part here', value: 'timed', disabled: true}
  ]
  , shareData = {};

// module globals
var selectedOption, shareButtons, linkInput;

function getShareData(value) {
  if (value === 'show') {
    return shareData.show;
  }
  var data = shareData.episode;
  // todo add chapter start and end time to url
  //if (value === 'chapter') {
  //}
  // todo add selected start and end time to url
  //if (value === 'timed') {
  //}
  return data;
}

function updateUrls(data) {
  shareButtons.update(data);
  linkInput.update(data);
}

function onShareOptionChangeTo (element, value) {
  var data = getShareData(value);
  var radio = element.find('[type=radio]');

  return function () {
    selectedOption.removeClass('selected');

    radio.prop('checked', true);
    element.addClass('selected');
    selectedOption = element;
    console.log('sharing options changed', element, value);

    updateUrls(data);
  };
}

/**
 * create sharing button
 * @param {object} option sharing option definition
 * @returns {jQuery} share button reference
 */
function createOption(option) {
  if (option.disabled) {
    console.log('Share', 'createOption', 'omit disabled option', option.name);
    return null;
  }

  var data = getShareData(option.value);

  if (!data) {
    console.log('Share', 'createOption', 'omit option without data', option.name);
    return null;
  }

  var element = $('<tr class="share-select-option">' +
    '<td class="share-description">' + option.name + '</td>' +
    '<td class="share-radio"><input type="radio" id="share-option-' + option.name + '" name="r-group" value="' + option.title + '"></td>' +
    '<td class="share-label"><label for="share-option-' + option.name + '">' + option.title + '</label></td>' +
    '</tr>'
  );
  var radio = element.find('[type=radio]');

  if (option.default) {
    selectedOption = element;
    element.addClass('selected');
    radio.prop('checked', true);
    updateUrls(data);
  }
  var changeHandler = onShareOptionChangeTo(element, option.value);
  element.on('click', changeHandler);
  return element;
}

/**
 * Creates an html table element to wrap all share buttons
 * @returns {jQuery|HTMLElement} share button wrapper reference
 */
function createShareList(params) {
  shareOptions[0].title = params.show.title;
  shareOptions[1].title = params.title;
  var table = $('<table class="share-button-wrapper" data-toggle="buttons"><caption>Podcast teilen</caption><tbody></tbody</table>');
  table.append(shareOptions.map(createOption));
  return table;
}

/**
 * create sharing buttons in a form
 * @returns {jQuery} form element reference
 */
function createShareOptions(params) {
  var form = $('<form>' +
    '<h3>Was möchtest du teilen?</h3>' +
  '</form>');
  form.append(createShareList(params));
  return form;
}

/**
 * build and return tab instance for sharing
 * @param {object} params player configuration
 * @returns {null|Tab} sharing tab instance or null if permalink missing or sharing disabled
 */
function createShareTab(params) {
  if (!params.permalink || params.hidesharebutton === true) {
    return null;
  }

  var shareTab = new Tab({
    icon: 'pwp-share',
    title: 'Teilen anzeigen / verbergen',
    name: 'podlovewebplayer_share',
    headline: 'Teilen'
  });

  shareButtons = new SocialButtonList(services, getShareData('episode'));
  linkInput = $('<h3>Direkter Link</h3>' +
    '<input type="url" name="share-link-url" readonly>');
  linkInput.update = function(data) {
    this.val(data.rawUrl);
  };

  shareTab.createMainContent('')
    .append(createShareOptions(params))
    .append('<h3>Teilen via ...</h3>')
    .append(shareButtons.list);
  shareTab.createFooter('').append(linkInput);

  return shareTab;
}

module.exports = function Share(params) {
  shareData.episode = {
    poster: params.poster,
    title: encodeURIComponent(params.title),
    url: encodeURIComponent(params.permalink),
    rawUrl: params.permalink,
    text: encodeURIComponent(params.title + ' ' + params.permalink)
  };
  shareData.chapters = params.chapters;

  if (params.show.url) {
    shareData.show = {
      poster: params.show.poster,
      title: encodeURIComponent(params.show.title),
      url: encodeURIComponent(params.show.url),
      rawUrl: params.show.url,
      text: encodeURIComponent(params.show.title + ' ' + params.show.url)
    };
  }

  selectedOption = 'episode';
  this.tab = createShareTab(params);
};

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/modules/share.js","/modules")
},{"../social-button-list":16,"../tab":19,"buffer":2,"oMfpAn":5}],15:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var parseTimecode = require('./timecode').parse;

/**
 * player
 */
var
// Keep all Players on site - for inline players
// embedded players are registered in podlove-webplayer-moderator in the embedding page
  players = [],
// all used functions
  mejsoptions = {
    defaultVideoWidth: 480,
    defaultVideoHeight: 270,
    videoWidth: -1,
    videoHeight: -1,
    audioWidth: -1,
    audioHeight: 30,
    startVolume: 0.8,
    loop: false,
    enableAutosize: true,
    features: ['playpause', 'current', 'progress', 'duration', 'tracks', 'fullscreen'],
    alwaysShowControls: false,
    iPadUseNativeControls: false,
    iPhoneUseNativeControls: false,
    AndroidUseNativeControls: false,
    alwaysShowHours: false,
    showTimecodeFrameCount: false,
    framesPerSecond: 25,
    enableKeyboard: true,
    pauseOtherPlayers: true,
    duration: false,
    plugins: ['flash', 'silverlight'],
    pluginPath: './bin/',
    flashName: 'flashmediaelement.swf',
    silverlightName: 'silverlightmediaelement.xap'
  },
  defaults = {
    chapterlinks: 'all',
    width: '100%',
    duration: false,
    chaptersVisible: false,
    timecontrolsVisible: false,
    sharebuttonsVisible: false,
    downloadbuttonsVisible: false,
    summaryVisible: false,
    hidetimebutton: false,
    hidedownloadbutton: false,
    hidesharebutton: false,
    sharewholeepisode: false,
    sources: []
  };

/**
 * remove 'px' unit, set witdth to 100% for 'auto'
 * @param {string} width
 * @returns {string}
 */
function normalizeWidth(width) {
  if (width.toLowerCase() === 'auto') {
    return '100%';
  }
  return width.replace('px', '');
}

/**
 * audio or video tag
 * @param {HTMLElement} player
 * @returns {string} 'audio' | 'video'
 */
function getPlayerType (player) {
  return player.tagName.toLowerCase();
}

/**
 * kill play/pause button from miniplayer
 * @param options
 */
function removePlayPause(options) {
  $.each(options.features, function (i) {
    if (this === 'playpause') {
      options.features.splice(i, 1);
    }
  });
}

/**
 * player error handling function
 * will remove the topmost mediafile from src or source list
 * possible fix for Firefox AAC issues
 */
function removeUnplayableMedia() {
  var $this = $(this);
  if ($this.attr('src')) {
    $this.removeAttr('src');
    return;
  }
  var sourceList = $this.children('source');
  if (sourceList.length) {
    sourceList.first().remove();
  }
}

function create(player, params, callback) {
  var jqPlayer,
    playerType = getPlayerType(player),
    secArray,
    wrapper;

  jqPlayer = $(player);
  wrapper = $('<div class="container"></div>');
  jqPlayer.replaceWith(wrapper);

  //fine tuning params
  params.width = normalizeWidth(params.width);
  if (playerType === 'audio') {
    // FIXME: Since the player is no longer visible it has no width
    if (params.audioWidth !== undefined) {
      params.width = params.audioWidth;
    }
    mejsoptions.audioWidth = params.width;
    //kill fullscreen button
    $.each(mejsoptions.features, function (i) {
      if (this === 'fullscreen') {
        mejsoptions.features.splice(i, 1);
      }
    });
    removePlayPause(mejsoptions);
  }
  else if (playerType === 'video') {
    //video params
    if (false && params.height !== undefined) {
      mejsoptions.videoWidth = params.width;
      mejsoptions.videoHeight = params.height;
    }
    // FIXME
    if (false && $(player).attr('width') !== undefined) {
      params.width = $(player).attr('width');
    }
  }

  //duration can be given in seconds or in NPT format
  if (params.duration && params.duration !== parseInt(params.duration, 10)) {
    secArray = parseTimecode(params.duration);
    params.duration = secArray[0];
  }

  //Overwrite MEJS default values with actual data
  $.each(mejsoptions, function (key) {
    if (key in params) {
      mejsoptions[key] = params[key];
    }
  });

  //wrapper and init stuff
  // FIXME: better check for numerical value
  if (params.width.toString().trim() === parseInt(params.width, 10).toString()) {
    params.width = parseInt(params.width, 10) + 'px';
  }

  players.push(player);

  //add params from audio and video elements
  jqPlayer.find('source').each(function () {
    if (!params.sources) {
      params.sources = [];
    }
    params.sources.push($(this).attr('src'));
  });

  params.type = playerType;
  // init MEJS to player
  mejsoptions.success = function (playerElement) {
    jqPlayer.on('error', removeUnplayableMedia);   // This might be a fix to some Firefox AAC issues.
    callback(playerElement, params, wrapper);
  };
  var me = new MediaElement(player, mejsoptions);
  console.log('MediaElement', me);
}

module.exports = {
  create: create,
  defaults: defaults,
  players: players
};

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/player.js","/")
},{"./timecode":21,"buffer":2,"oMfpAn":5}],16:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var socialNetworks = require('./social-networks');

function createButtonWith(options) {
  return function (serviceName) {
    var service = socialNetworks.get(serviceName);
    return service.getButton(options);
  };
}

function SocialButtonList (services, options) {
  var createButton = createButtonWith(options);
  this.buttons = services.map(createButton);

  this.list = $('<ul class="social-network-buttons"></ul>');
  this.buttons.forEach(function (button) {
    var listElement = $('<li></li>').append(button.element);
    this.list.append(listElement);
  }, this);
}

SocialButtonList.prototype.update = function (options) {
  this.buttons.forEach(function (button) {
    button.updateUrl(options);
  });
};

module.exports = SocialButtonList;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/social-button-list.js","/")
},{"./social-networks":18,"buffer":2,"oMfpAn":5}],17:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

function createButton (options) {
  return $('<a class="pwp-contrast-' + options.icon + '" target="_blank" href="' + options.url + '" ' +
  'title="' + options.title + '"><i class="icon pwp-' + options.icon + '"></i></a>' +
  '<span>' + options.title + '</span>');
}

/**
 * Creates an object to interact with a social network
 * @param {object} options Icon, title profile- and sharing-URL-templates
 * @constructor
 */
function SocialNetwork (options) {
  this.icon = options.icon;
  this.title = options.title;
  this.url = options.profileUrl;
  this.shareUrl = options.shareUrl;
}

/**
 * build URL for sharing a text, a title and a url
 * @param {object} options contents to be shared
 * @returns {string} URL to share the contents
 */
SocialNetwork.prototype.getShareUrl = function (options) {
  var shareUrl = this.shareUrl
    .replace('$text$', options.text)
    .replace('$title$', options.title)
    .replace('$url$', options.url);
  return this.url + shareUrl;
};

/**
 * build URL to a given profile
 * @param {object} profile Username to link to
 * @returns {string} profile URL
 */
SocialNetwork.prototype.getProfileUrl = function (profile) {
  return this.url + profile;
};

/**
 * get profile button element
 * @param {object} options options.profile defines the profile the button links to
 * @returns {{element:{jQuery}}} button reference
 */
SocialNetwork.prototype.getProfileButton = function (options) {
  if (!options.profile) {
    return null;
  }
  return {
    element: createButton({
      url: this.getProfileUrl(options.profile),
      title: this.title,
      icon: this.icon
    })
  };
};

/**
 * get share button element and URL update function
 * @param {object} options initial contents to be shared with the button
 * @returns {{element:{jQuery}, updateUrl:{function}}} button reference and update function
 */
SocialNetwork.prototype.getShareButton = function (options) {

  if (!this.shareUrl || !options.title || !options.url) {
    return null;
  }

  if (!options.text) {
    options.text = options.title + '%20' + options.url;
  }

  var element = createButton({
    url: this.getShareUrl(options),
    title: this.title,
    icon: this.icon
  });

  var updateUrl = function (updateOptions) {
    element.get(0).href = this.getShareUrl(updateOptions);
  }.bind(this);

  return {
    element: element,
    updateUrl: updateUrl
  };
};

/**
 * get share or profile button depending on the options given
 * @param {object} options object with either profilename or contents to share
 * @returns {object} button object
 */
SocialNetwork.prototype.getButton = function (options) {
  if (options.profile) {
    return this.getProfileButton(options);
  }
  if (this.shareUrl && options.title && options.url) {
    return this.getShareButton(options);
  }
  return null;
};

module.exports = SocialNetwork;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/social-network.js","/")
},{"buffer":2,"oMfpAn":5}],18:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var SocialNetwork = require('./social-network');
var socialNetworks = {
  twitter: new SocialNetwork({
    icon: 'twitter',
    title: 'Twitter',
    profileUrl: 'https://twitter.com/',
    shareUrl: 'share?text=$text$&url=$url$'
  }),

  flattr: new SocialNetwork({
    icon: 'flattr',
    title: 'Flattr',
    profileUrl: 'https://flattr.com/profile/',
    shareUrl: 'share?text=$text$&url=$url$'
  }),

  facebook: new SocialNetwork({
    icon: 'facebook',
    title: 'Facebook',
    profileUrl: 'https://facebook.com/',
    shareUrl: 'share.php?t=$text$&u=$url$'
  }),

  adn: new SocialNetwork({
    icon: 'adn',
    title: 'App.net',
    profileUrl: 'https://alpha.app.net/',
    shareUrl: 'intent/post?text=$text$'
  }),

  soundcloud: new SocialNetwork({
    icon: 'soundcloud',
    title: 'SoundCloud',
    profileUrl: 'https://soundcloud.com/',
    shareUrl: 'share?title=$title$&url=$url$'
  }),

  instagram: new SocialNetwork({
    icon: 'instagram',
    title: 'Instagram',
    profileUrl: 'http://instagram.com/',
    shareUrl: 'share?title=$title$&url=$url$'
  }),

  tumblr: new SocialNetwork({
    icon: 'tumblr',
    title: 'Tumblr',
    profileUrl: 'https://www.tumblr.com/',
    shareUrl: 'share?title=$title$&url=$url$'
  }),

  email: new SocialNetwork({
    icon: 'message',
    title: 'E-Mail',
    profileUrl: 'mailto:',
    shareUrl: '?subject=$title$&body=$text$'
  }),

  gplus: new SocialNetwork({
    icon: 'google-plus',
    title: 'Google+',
    profileUrl: 'https://plus.google.com/',
    shareUrl: 'share?title=$title$&url=$url$'
  })
};

/**
 * returns the service registered with the given name
 * @param {string} serviceName The name of the social network
 * @returns {SocialNetwork} The network with the given name
 */
function getService (serviceName) {
  var service = socialNetworks[serviceName];
  if (!service) {
    console.error('Unknown service', serviceName);
  }
  return service;
}

module.exports = {
  get: getService
};

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/social-networks.js","/")
},{"./social-network":17,"buffer":2,"oMfpAn":5}],19:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

/**
 * When tab content is scrolled, a boxshadow is added to the header
 * @param event
 */
function addShadowOnScroll(event) {
  var scroll = event.currentTarget.scrollTop;
  event.data.header.toggleClass('scrolled', (scroll >= 5 ));
}

/**
 * Return an html section element as a wrapper for the tab
 * @param {object} options
 * @returns {*|jQuery|HTMLElement}
 */
function createContentBox(options) {
  var classes = ['tab'];
  classes.push(options.name);
  if (options.active) {
    classes.push('active');
  }
  return $('<section class="' + classes.join(' ') + '"></section>');
}

/**
 * Create a tab
 * @param options
 * @constructor
 */
function Tab(options) {
  this.icon = options.icon;
  this.title = options.title;
  this.headline = options.headline;

  this.box = createContentBox(options);
  var header = this.createHeader();
  this.box.on('scroll', {header: header}, addShadowOnScroll);

  this.active = false;
  this.toggle = null;
}

/**
 * Add class 'active' to the active tab
 */
Tab.prototype.open = function () {
  this.active = true;
  this.box.addClass('active');
  this.toggle.addClass('active');
};

/**
 * Remove class 'active' from the inactive tab
 */
Tab.prototype.close = function () {
  this.active = false;
  this.box.removeClass('active');
  this.toggle.removeClass('active');
};

/**
 * Return an html header element with a headline
 */
Tab.prototype.createHeader = function() {
  var header = $('<header class="tab-header"><h2 class="tab-headline">' +
    '<i class="icon ' + this.icon + '"></i>' + this.headline + '</h2></header>');
  this.box.append(header);
  return header;
};

/**
 * Append an html div element with class main to the tab's content box
 * @param content
 */
Tab.prototype.createMainContent = function(content) {
  var mainDiv = $('<div class="main">' + content + '</div');
  this.box.append(mainDiv);
  return mainDiv;
};

/**
 * Append an html aside element to the tab's content box
 * @param content
 */
Tab.prototype.createAside = function(content) {
  var aside = $('<aside class="aside">' + content + '</aside>');
  this.box.append(aside);
  return aside;
};

/**
 * Append an html footer element to the tab's content box
 * @param content
 */
Tab.prototype.createFooter = function(content) {
  var footer = $('<footer>' + content + '</footer>');
  this.box.append(footer);
  return footer;
};

module.exports = Tab;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/tab.js","/")
},{"buffer":2,"oMfpAn":5}],20:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

/**
 *
 * @param {Tab} tab
 * @returns {boolean}
 */
function getToggleClickHandler(tab) {
  /*jshint validthis:true */
  console.debug('TabRegistry', 'activeTab', this.activeTab);
  if (this.activeTab) {
    this.activeTab.close();
  }
  if (this.activeTab === tab) {
    this.activeTab = null;
    return false;
  }
  this.activeTab = tab;
  this.activeTab.open();
  return false;
}

/**
 *
 * @param {HTMLElement} player
 */
function logCurrentTime (player) {
  console.log('player.currentTime', player.currentTime);
}

function TabRegistry() {
  /**
   * will store a reference to currently active tab instance to close it when another one is opened
   * @type {object}
   */
  this.activeTab = null;
  this.togglebar = $('<div class="togglebar bar"></div>');
  this.toggleList = $('<ul class="tablist"></ul>');
  this.togglebar.append(this.toggleList);
  this.container = $('<div class="tabs"></div>');
  this.listeners = [logCurrentTime];
  this.tabs = [];
}

TabRegistry.prototype.createToggleFor = function (tab) {
  var toggle = $('<li title="' + tab.title + '">' +
      '<a href="javascript:;" class="button button-toggle ' + tab.icon + '"></a>' +
    '</li>');
  toggle.on('click', getToggleClickHandler.bind(this, tab));
  this.toggleList.append(toggle);
  return toggle;
};

/**
 * Register a tab and open it if it is initially visible
 * @param {Tab} tab
 * @param {Boolean} visible
 */
TabRegistry.prototype.add = function(tab) {
  if (tab === null) { return; }
  this.tabs.push(tab);
  this.container.append(tab.box);
  tab.toggle = this.createToggleFor(tab);
};

TabRegistry.prototype.openInitial = function (tabName) {
  if (!tabName) {
    return;
  }
  var matchingTabs = this.tabs.filter(function (tab) {
    return (tab.headline === tabName);
  });
  if (matchingTabs.length === 0) {
    console.warn('TabRegistry.openInitial: Could not open tab', tabName);
  }
  var initialActiveTab = matchingTabs.pop();
  initialActiveTab.open();
  this.activeTab = initialActiveTab;
};

/**
 *
 * @param {object} module
 */
TabRegistry.prototype.addModule = function(module) {
  if (module.tab) {
    this.add(module.tab);
  }
  if (module.update) {
    this.listeners.push(module.update);
  }
};

TabRegistry.prototype.update = function(event) {
  console.log('TabRegistry#update', event);
  var player = event.currentTarget;
  $.each(this.listeners, function (i, listener) { listener(player); });
};

module.exports = TabRegistry;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/tabregistry.js","/")
},{"buffer":2,"oMfpAn":5}],21:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var zeroFill = require('./util').zeroFill;

/**
 * Timecode as described in http://podlove.org/deep-link/
 * and http://www.w3.org/TR/media-frags/#fragment-dimensions
 */
var timeCodeMatcher = /(?:(\d+):)?(\d{1,2}):(\d\d)(\.\d{1,3})?/;

/**
 * convert an array of string to timecode
 * @param {string} tc
 * @returns {number|boolean}
 */
function extractTime(tc) {
  if (!tc) {
    return false;
  }
  var parts = timeCodeMatcher.exec(tc);
  if (!parts) {
    console.warn('Could not extract time from', tc);
    return false;
  }
  var time = 0;
  // hours
  time += parts[1] ? parseInt(parts[1], 10) * 60 * 60 : 0;
  // minutes
  time += parseInt(parts[2], 10) * 60;
  // seconds
  time += parseInt(parts[3], 10);
  // milliseconds
  time += parts[4] ? parseFloat(parts[4]) : 0;
  // no negative time
  time = Math.max(time, 0);
  return time;
}

/**
 * convert a timestamp to a timecode in ${insert RFC here} format
 * @param {Number} time
 * @param {Boolean} leadingZeros
 * @param {Boolean} [forceHours] force output of hours, defaults to false
 * @param {Boolean} [showMillis] output milliseconds separated with a dot from the seconds - defaults to false
 * @return {string}
 */
function ts2tc(time, leadingZeros, forceHours, showMillis) {
  var hours, minutes, seconds, milliseconds;
  var timecode = '';

  if (time === 0) {
    return (forceHours ? '00:00:00' : '00:00');
  }

  // prevent negative values from player
  if (!time || time <= 0) {
    return (forceHours ? '--:--:--' : '--:--');
  }

  hours = Math.floor(time / 60 / 60);
  minutes = Math.floor(time / 60) % 60;
  seconds = Math.floor(time % 60) % 60;
  milliseconds = Math.floor(time % 1 * 1000);

  if (showMillis && milliseconds) {
    timecode = '.' + zeroFill(milliseconds, 3);
  }

  timecode = ':' + zeroFill(seconds, 2) + timecode;

  if (hours === 0 && !forceHours && !leadingZeros ) {
    return minutes.toString() + timecode;
  }

  timecode = zeroFill(minutes, 2) + timecode;

  if (hours === 0 && !forceHours) {
    // required (minutes : seconds)
    return timecode;
  }

  if (leadingZeros) {
    return zeroFill(hours, 2) + ':' + timecode;
  }

  return hours + ':' + timecode;
}

module.exports = {

  /**
   * convenience method for converting timestamps to
   * @param {Number} timestamp
   * @returns {String} timecode
   */
  fromTimeStamp: function (timestamp) {
    return ts2tc(timestamp, true, true);
  },

  /**
   * accepts array with start and end time in seconds
   * returns timecode in deep-linking format
   * @param {Array} times
   * @param {Boolean} leadingZeros
   * @param {Boolean} [forceHours]
   * @return {string}
   */
  generate: function (times, leadingZeros, forceHours) {
    if (times[1] > 0 && times[1] < 9999999 && times[0] < times[1]) {
      return ts2tc(times[0], leadingZeros, forceHours) + ',' + ts2tc(times[1], leadingZeros, forceHours);
    }
    return ts2tc(times[0], leadingZeros, forceHours);
  },

  /**
   * parses time code into seconds
   * @param {String} timecode
   * @return {Array}
   */
  parse: function (timecode) {
    if (!timecode) {
      return [false, false];
    }

    var timeparts = timecode.split('-');

    if (!timeparts.length) {
      console.warn('no timeparts:', timecode);
      return [false, false];
    }

    var startTime = extractTime(timeparts.shift());
    var endTime = extractTime(timeparts.shift());

    return (endTime > startTime) ? [startTime, endTime] : [startTime, false];
  },

  getStartTimeCode: function getStartTimecode(start) {
      return this.parse(start)[0];
  }
};

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/timecode.js","/")
},{"./util":24,"buffer":2,"oMfpAn":5}],22:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

/*
 [
 {type: "image", "title": "The very best Image", "url": "http://domain.com/images/test1.png"},
 {type: "shownote", "text": "PAPAPAPAPAPAGENO"},
 {type: "topic", start: 0, end: 1, q:true, title: "The very first chapter" },
 {type: "audio", start: 0, end: 1, q:true, class: 'speech'},
 {type: "audio", start: 1, end: 2, q:true, class: 'music'},
 {type: "audio", start: 2, end: 3, q:true, class: 'noise'},
 {type: "audio", start: 4, end: 5, q:true, class: 'silence'},
 {type: "content", start: 0, end: 1, q:true, title: "The very first chapter", class:'advertisement'},
 {type: "location", start: 0, end: 1, q:false, title: "Around Berlin", lat:12.123, lon:52.234, diameter:123 },
 {type: "chat", q:false, start: 0.12, "data": "ERSTER & HITLER!!!"},
 {type: "shownote", start: 0.23, "data": "Jemand vadert"},
 {type: "image", "name": "The very best Image", "url": "http://domain.com/images/test1.png"},
 {type: "link", "name": "An interesting link", "url": "http://"},
 {type: "topic", start: 1, end: 2, "name": "The very first chapter", "url": ""},
 ]
 */
var cap = require('./util').cap;

function call(listener) {
  listener(this);
}

function filterByType(type) {
  return function (record) {
    return (record.type === type);
  };
}

/**
 *
 * @param {Timeline} timeline
 */
function logCurrentTime(timeline) {
  console.log('Timeline', 'currentTime', timeline.getTime());
}

/**
 *
 * @param {object} params
 * @returns {boolean} true if at least one chapter is present
 */
function checkForChapters(params) {
  return !!params.chapters && (
    typeof params.chapters === 'object' && params.chapters.length > 1
    );
}

function stopOnEndTime() {
  if (this.currentTime >= this.endTime) {
    console.log('ENDTIME REACHED');
    this.player.stop();
    delete this.endTime;
  }
}

/**
 *
 * @param {HTMLMediaElement} player
 * @param {object} data
 * @constructor
 */
function Timeline(player, data) {
  this.player = player;
  this.hasChapters = checkForChapters(data);
  this.modules = [];
  this.listeners = [logCurrentTime];
  this.currentTime = -1;
  this.duration = data.duration;
  this.bufferedTime = 0;
  this.resume = player.paused;
  this.seeking = false;
}

Timeline.prototype.getData = function () {
  return this.data;
};

Timeline.prototype.getDataByType = function (type) {
  return this.data.filter(filterByType(type));
};

Timeline.prototype.addModule = function (module) {
  if (module.update) {
    this.listeners.push(module.update);
  }
  if (module.data) {
    this.data = module.data;
  }
  this.modules.push(module);
};

Timeline.prototype.playRange = function (range) {
  if (!range || !range.length || !range.shift) {
    throw new TypeError('Timeline.playRange called without a range');
  }
  this.setTime(range.shift());
  this.stopAt(range.shift());
};

Timeline.prototype.update = function (event) {
  console.log('Timeline', 'update', event);
  this.setBufferedTime(event);

  if (event && event.type === 'timeupdate') {
    this.currentTime = this.player.currentTime;
  }
  this.listeners.forEach(call, this);
};

Timeline.prototype.emitEventsBetween = function (start, end) {
  var emitStarted = false,
    emit = function (event) {
      var customEvent = new $.Event(event.type, event);
      $(this).trigger(customEvent);
    }.bind(this);
  this.data.map(function (event) {
    var later = (event.start > start),
      earlier = (event.end < start),
      ended = (event.end < end);

    if (later && earlier && !ended || emitStarted) {
      console.log('Timeline', 'Emit', event);
      emit(event);
    }
    emitStarted = later;
  });
};

/**
 * returns if time is a valid timestamp in current timeline
 * @param {*} time
 * @returns {boolean}
 */
Timeline.prototype.isValidTime = function (time) {
  return (typeof time === 'number' && !isNaN(time) && time >= 0 && time <= this.duration);
};

Timeline.prototype.setTime = function (time) {
  if (!this.isValidTime(time)) {
    console.warn('Timeline', 'setTime', 'time out of bounds', time);
    return this.currentTime;
  }

  console.log('Timeline', 'setTime', 'time', time);
  this.currentTime = time;
  this.update();

  console.log('canplay', 'setTime', 'playerState', this.player.readyState);
  if (this.player.readyState === this.player.HAVE_ENOUGH_DATA) {
    this.player.setCurrentTime(time);
    return this.currentTime;
  }

  // TODO visualize buffer state
  // $(document).find('.play').css({color:'red'});
  $(this.player).one('canplay', function () {
    // TODO remove buffer state visual
    // $(document).find('.play').css({color:'white'});
    console.log('Player', 'canplay', 'buffered', time);
    this.setCurrentTime(time);
  });

  return this.currentTime;
};

Timeline.prototype.seek = function (time) {
  console.debug('Timeline', 'seek', time);
  this.currentTime = cap(time, 0, this.duration);
  this.setTime(this.currentTime);
};

Timeline.prototype.stopAt = function (time) {
  if (!time || time <= 0 || time > this.duration) {
    return console.warn('Timeline', 'stopAt', 'time out of bounds', time);
  }
  var self = this;
  this.endTime = time;
  this.listeners.push(function () {
    stopOnEndTime.call(self);
  });
};

Timeline.prototype.getTime = function () {
  return this.currentTime;
};

Timeline.prototype.getBuffered = function () {
  if (isNaN(this.bufferedTime)) {
    console.warn('Timeline', 'getBuffered', 'bufferedTime is not a number');
    return 0;
  }
  return this.bufferedTime;
};

Timeline.prototype.setBufferedTime = function (e) {
  var target = (e !== undefined) ? e.target : this.player;
  var buffered = 0;

  // newest HTML5 spec has buffered array (FF4, Webkit)
  if (target && target.buffered && target.buffered.length > 0 && target.buffered.end && target.duration) {
    buffered = target.buffered.end(target.buffered.length - 1);
  }
  // Some browsers (e.g., FF3.6 and Safari 5) cannot calculate target.bufferered.end()
  // to be anything other than 0. If the byte count is available we use this instead.
  // Browsers that support the else if do not seem to have the bufferedBytes value and
  // should skip to there. Tested in Safari 5, Webkit head, FF3.6, Chrome 6, IE 7/8.
  else if (target && target.bytesTotal !== undefined && target.bytesTotal > 0 && target.bufferedBytes !== undefined) {
    buffered = target.bufferedBytes / target.bytesTotal * target.duration;
  }
  // Firefox 3 with an Ogg file seems to go this way
  else if (e && e.lengthComputable && e.total !== 0) {
    buffered = e.loaded / e.total * target.duration;
  }
  var cappedTime = cap(buffered, 0, target.duration);
  console.log('Timeline', 'setBufferedTime', cappedTime);
  this.bufferedTime = cappedTime;
};

Timeline.prototype.rewind = function () {
  this.setTime(0);
  var callListenerWithThis = function _callListenerWithThis(i, listener) {
    listener(this);
  }.bind(this);
  $.each(this.listeners, callListenerWithThis);
};

module.exports = Timeline;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/timeline.js","/")
},{"./util":24,"buffer":2,"oMfpAn":5}],23:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

var tc = require('./timecode');

/*
  "t=1"	[("t", "1")]	simple case
  "t=1&t=2"	[("t", "1"), ("t", "2")]	repeated name
  "a=b=c"	[("a", "b=c")]	"=" in value
  "a&b=c"	[("a", ""), ("b", "c")]	missing value
  "%74=%6ept%3A%310"	[("t", "npt:10")]	unnecssary percent-encoding
  "id=%xy&t=1"	[("t", "1")]	invalid percent-encoding
  "id=%E4r&t=1"	[("t", "1")]	invalid UTF-8
 */

/**
 * get the value of a specific URL hash fragment
 * @param {string} key name of the fragment
 * @returns {string|boolean} value of the fragment or false when not found in URL
 */
function getFragment(key) {
  var query = window.location.hash.substring(1),
    pairs = query.split('&');

  if (query.indexOf(key) === -1) {
    return false;
  }

  for (var i = 0, l = pairs.length; i < l; i++) {
    var pair = pairs[i].split('=');
    if (pair[0] !== key) {
      continue;
    }
    if (pair.length === 1) {
      return true;
    }
    return decodeURIComponent(pair[1]);
  }
  return false;
}

/**
 * URL handling helpers
 */
module.exports = {
  getFragment: getFragment,
  checkCurrent: function () {
    var t = getFragment('t');
    return tc.parse(t);
  }
};

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/url.js","/")
},{"./timecode":21,"buffer":2,"oMfpAn":5}],24:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

/**
 * return new value in bounds of min and max
 * @param {number} val any number
 * @param {number} min lower boundary for val
 * @param {number} max upper boundary for val
 * @returns {number} resulting value
 */
function cap(val, min, max) {
  // cap x values
  val = Math.max(val, min);
  val = Math.min(val, max);
  return val;
}

/**
 * return number as string lefthand filled with zeros
 * @param {number} number (integer) value to be padded
 * @param {number} width length of the string that is returned
 * @returns {string} padded number
 */
function zeroFill (number, width) {
  var s = number.toString();
  while (s.length < width) {
    s = '0' + s;
  }
  return s;
}

module.exports = {
  cap: cap,
  zeroFill: zeroFill
};

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/util.js","/")
},{"buffer":2,"oMfpAn":5}]},{},[8])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9saW5lMC9Qcm9qZWN0cy9Qb2Rsb3ZlL3BvZGxvdmUtd2ViLXBsYXllci9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvbGluZTAvUHJvamVjdHMvUG9kbG92ZS9wb2Rsb3ZlLXdlYi1wbGF5ZXIvYm93ZXJfY29tcG9uZW50cy9tZWRpYWVsZW1lbnQvYnVpbGQvbWVkaWFlbGVtZW50LmpzIiwiL1VzZXJzL2xpbmUwL1Byb2plY3RzL1BvZGxvdmUvcG9kbG92ZS13ZWItcGxheWVyL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9pbmRleC5qcyIsIi9Vc2Vycy9saW5lMC9Qcm9qZWN0cy9Qb2Rsb3ZlL3BvZGxvdmUtd2ViLXBsYXllci9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvbm9kZV9tb2R1bGVzL2Jhc2U2NC1qcy9saWIvYjY0LmpzIiwiL1VzZXJzL2xpbmUwL1Byb2plY3RzL1BvZGxvdmUvcG9kbG92ZS13ZWItcGxheWVyL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9ub2RlX21vZHVsZXMvaWVlZTc1NC9pbmRleC5qcyIsIi9Vc2Vycy9saW5lMC9Qcm9qZWN0cy9Qb2Rsb3ZlL3BvZGxvdmUtd2ViLXBsYXllci9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCIvVXNlcnMvbGluZTAvUHJvamVjdHMvUG9kbG92ZS9wb2Rsb3ZlLXdlYi1wbGF5ZXIvc3JjL2pzL2NvbnRyb2xzLmpzIiwiL1VzZXJzL2xpbmUwL1Byb2plY3RzL1BvZGxvdmUvcG9kbG92ZS13ZWItcGxheWVyL3NyYy9qcy9lbWJlZC5qcyIsIi9Vc2Vycy9saW5lMC9Qcm9qZWN0cy9Qb2Rsb3ZlL3BvZGxvdmUtd2ViLXBsYXllci9zcmMvanMvZmFrZV80NjQ2MDY0Ni5qcyIsIi9Vc2Vycy9saW5lMC9Qcm9qZWN0cy9Qb2Rsb3ZlL3BvZGxvdmUtd2ViLXBsYXllci9zcmMvanMvbW9kdWxlcy9jaGFwdGVyLmpzIiwiL1VzZXJzL2xpbmUwL1Byb2plY3RzL1BvZGxvdmUvcG9kbG92ZS13ZWItcGxheWVyL3NyYy9qcy9tb2R1bGVzL2Rvd25sb2Fkcy5qcyIsIi9Vc2Vycy9saW5lMC9Qcm9qZWN0cy9Qb2Rsb3ZlL3BvZGxvdmUtd2ViLXBsYXllci9zcmMvanMvbW9kdWxlcy9pbmZvLmpzIiwiL1VzZXJzL2xpbmUwL1Byb2plY3RzL1BvZGxvdmUvcG9kbG92ZS13ZWItcGxheWVyL3NyYy9qcy9tb2R1bGVzL3Byb2dyZXNzYmFyLmpzIiwiL1VzZXJzL2xpbmUwL1Byb2plY3RzL1BvZGxvdmUvcG9kbG92ZS13ZWItcGxheWVyL3NyYy9qcy9tb2R1bGVzL3NhdmV0aW1lLmpzIiwiL1VzZXJzL2xpbmUwL1Byb2plY3RzL1BvZGxvdmUvcG9kbG92ZS13ZWItcGxheWVyL3NyYy9qcy9tb2R1bGVzL3NoYXJlLmpzIiwiL1VzZXJzL2xpbmUwL1Byb2plY3RzL1BvZGxvdmUvcG9kbG92ZS13ZWItcGxheWVyL3NyYy9qcy9wbGF5ZXIuanMiLCIvVXNlcnMvbGluZTAvUHJvamVjdHMvUG9kbG92ZS9wb2Rsb3ZlLXdlYi1wbGF5ZXIvc3JjL2pzL3NvY2lhbC1idXR0b24tbGlzdC5qcyIsIi9Vc2Vycy9saW5lMC9Qcm9qZWN0cy9Qb2Rsb3ZlL3BvZGxvdmUtd2ViLXBsYXllci9zcmMvanMvc29jaWFsLW5ldHdvcmsuanMiLCIvVXNlcnMvbGluZTAvUHJvamVjdHMvUG9kbG92ZS9wb2Rsb3ZlLXdlYi1wbGF5ZXIvc3JjL2pzL3NvY2lhbC1uZXR3b3Jrcy5qcyIsIi9Vc2Vycy9saW5lMC9Qcm9qZWN0cy9Qb2Rsb3ZlL3BvZGxvdmUtd2ViLXBsYXllci9zcmMvanMvdGFiLmpzIiwiL1VzZXJzL2xpbmUwL1Byb2plY3RzL1BvZGxvdmUvcG9kbG92ZS13ZWItcGxheWVyL3NyYy9qcy90YWJyZWdpc3RyeS5qcyIsIi9Vc2Vycy9saW5lMC9Qcm9qZWN0cy9Qb2Rsb3ZlL3BvZGxvdmUtd2ViLXBsYXllci9zcmMvanMvdGltZWNvZGUuanMiLCIvVXNlcnMvbGluZTAvUHJvamVjdHMvUG9kbG92ZS9wb2Rsb3ZlLXdlYi1wbGF5ZXIvc3JjL2pzL3RpbWVsaW5lLmpzIiwiL1VzZXJzL2xpbmUwL1Byb2plY3RzL1BvZGxvdmUvcG9kbG92ZS13ZWItcGxheWVyL3NyYy9qcy91cmwuanMiLCIvVXNlcnMvbGluZTAvUHJvamVjdHMvUG9kbG92ZS9wb2Rsb3ZlLXdlYi1wbGF5ZXIvc3JjL2pzL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3M0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdmxDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdlBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4vKiFcbiAqXG4gKiBNZWRpYUVsZW1lbnQuanNcbiAqIEhUTUw1IDx2aWRlbz4gYW5kIDxhdWRpbz4gc2hpbSBhbmQgcGxheWVyXG4gKiBodHRwOi8vbWVkaWFlbGVtZW50anMuY29tL1xuICpcbiAqIENyZWF0ZXMgYSBKYXZhU2NyaXB0IG9iamVjdCB0aGF0IG1pbWljcyBIVE1MNSBNZWRpYUVsZW1lbnQgQVBJXG4gKiBmb3IgYnJvd3NlcnMgdGhhdCBkb24ndCB1bmRlcnN0YW5kIEhUTUw1IG9yIGNhbid0IHBsYXkgdGhlIHByb3ZpZGVkIGNvZGVjXG4gKiBDYW4gcGxheSBNUDQgKEguMjY0KSwgT2dnLCBXZWJNLCBGTFYsIFdNViwgV01BLCBBQ0MsIGFuZCBNUDNcbiAqXG4gKiBDb3B5cmlnaHQgMjAxMC0yMDE0LCBKb2huIER5ZXIgKGh0dHA6Ly9qLmhuKVxuICogTGljZW5zZTogTUlUXG4gKlxuICovXG4vLyBOYW1lc3BhY2VcbnZhciBtZWpzID0gbWVqcyB8fCB7fTtcblxuLy8gdmVyc2lvbiBudW1iZXJcbm1lanMudmVyc2lvbiA9ICcyLjE2LjQnOyBcblxuXG4vLyBwbGF5ZXIgbnVtYmVyIChmb3IgbWlzc2luZywgc2FtZSBpZCBhdHRyKVxubWVqcy5tZUluZGV4ID0gMDtcblxuLy8gbWVkaWEgdHlwZXMgYWNjZXB0ZWQgYnkgcGx1Z2luc1xubWVqcy5wbHVnaW5zID0ge1xuXHRzaWx2ZXJsaWdodDogW1xuXHRcdHt2ZXJzaW9uOiBbMywwXSwgdHlwZXM6IFsndmlkZW8vbXA0JywndmlkZW8vbTR2JywndmlkZW8vbW92JywndmlkZW8vd212JywnYXVkaW8vd21hJywnYXVkaW8vbTRhJywnYXVkaW8vbXAzJywnYXVkaW8vd2F2JywnYXVkaW8vbXBlZyddfVxuXHRdLFxuXHRmbGFzaDogW1xuXHRcdHt2ZXJzaW9uOiBbOSwwLDEyNF0sIHR5cGVzOiBbJ3ZpZGVvL21wNCcsJ3ZpZGVvL200dicsJ3ZpZGVvL21vdicsJ3ZpZGVvL2ZsdicsJ3ZpZGVvL3J0bXAnLCd2aWRlby94LWZsdicsJ2F1ZGlvL2ZsdicsJ2F1ZGlvL3gtZmx2JywnYXVkaW8vbXAzJywnYXVkaW8vbTRhJywnYXVkaW8vbXBlZycsICd2aWRlby95b3V0dWJlJywgJ3ZpZGVvL3gteW91dHViZScsICdhcHBsaWNhdGlvbi94LW1wZWdVUkwnXX1cblx0XHQvLyx7dmVyc2lvbjogWzEyLDBdLCB0eXBlczogWyd2aWRlby93ZWJtJ119IC8vIGZvciBmdXR1cmUgcmVmZXJlbmNlIChob3BlZnVsbHkhKVxuXHRdLFxuXHR5b3V0dWJlOiBbXG5cdFx0e3ZlcnNpb246IG51bGwsIHR5cGVzOiBbJ3ZpZGVvL3lvdXR1YmUnLCAndmlkZW8veC15b3V0dWJlJywgJ2F1ZGlvL3lvdXR1YmUnLCAnYXVkaW8veC15b3V0dWJlJ119XG5cdF0sXG5cdHZpbWVvOiBbXG5cdFx0e3ZlcnNpb246IG51bGwsIHR5cGVzOiBbJ3ZpZGVvL3ZpbWVvJywgJ3ZpZGVvL3gtdmltZW8nXX1cblx0XVxufTtcblxuLypcblV0aWxpdHkgbWV0aG9kc1xuKi9cbm1lanMuVXRpbGl0eSA9IHtcblx0ZW5jb2RlVXJsOiBmdW5jdGlvbih1cmwpIHtcblx0XHRyZXR1cm4gZW5jb2RlVVJJQ29tcG9uZW50KHVybCk7IC8vLnJlcGxhY2UoL1xcPy9naSwnJTNGJykucmVwbGFjZSgvPS9naSwnJTNEJykucmVwbGFjZSgvJi9naSwnJTI2Jyk7XG5cdH0sXG5cdGVzY2FwZUhUTUw6IGZ1bmN0aW9uKHMpIHtcblx0XHRyZXR1cm4gcy50b1N0cmluZygpLnNwbGl0KCcmJykuam9pbignJmFtcDsnKS5zcGxpdCgnPCcpLmpvaW4oJyZsdDsnKS5zcGxpdCgnXCInKS5qb2luKCcmcXVvdDsnKTtcblx0fSxcblx0YWJzb2x1dGl6ZVVybDogZnVuY3Rpb24odXJsKSB7XG5cdFx0dmFyIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0ZWwuaW5uZXJIVE1MID0gJzxhIGhyZWY9XCInICsgdGhpcy5lc2NhcGVIVE1MKHVybCkgKyAnXCI+eDwvYT4nO1xuXHRcdHJldHVybiBlbC5maXJzdENoaWxkLmhyZWY7XG5cdH0sXG5cdGdldFNjcmlwdFBhdGg6IGZ1bmN0aW9uKHNjcmlwdE5hbWVzKSB7XG5cdFx0dmFyXG5cdFx0XHRpID0gMCxcblx0XHRcdGosXG5cdFx0XHRjb2RlUGF0aCA9ICcnLFxuXHRcdFx0dGVzdG5hbWUgPSAnJyxcblx0XHRcdHNsYXNoUG9zLFxuXHRcdFx0ZmlsZW5hbWVQb3MsXG5cdFx0XHRzY3JpcHRVcmwsXG5cdFx0XHRzY3JpcHRQYXRoLFx0XHRcdFxuXHRcdFx0c2NyaXB0RmlsZW5hbWUsXG5cdFx0XHRzY3JpcHRzID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3NjcmlwdCcpLFxuXHRcdFx0aWwgPSBzY3JpcHRzLmxlbmd0aCxcblx0XHRcdGpsID0gc2NyaXB0TmFtZXMubGVuZ3RoO1xuXHRcdFx0XG5cdFx0Ly8gZ28gdGhyb3VnaCBhbGwgPHNjcmlwdD4gdGFnc1xuXHRcdGZvciAoOyBpIDwgaWw7IGkrKykge1xuXHRcdFx0c2NyaXB0VXJsID0gc2NyaXB0c1tpXS5zcmM7XG5cdFx0XHRzbGFzaFBvcyA9IHNjcmlwdFVybC5sYXN0SW5kZXhPZignLycpO1xuXHRcdFx0aWYgKHNsYXNoUG9zID4gLTEpIHtcblx0XHRcdFx0c2NyaXB0RmlsZW5hbWUgPSBzY3JpcHRVcmwuc3Vic3RyaW5nKHNsYXNoUG9zICsgMSk7XG5cdFx0XHRcdHNjcmlwdFBhdGggPSBzY3JpcHRVcmwuc3Vic3RyaW5nKDAsIHNsYXNoUG9zICsgMSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRzY3JpcHRGaWxlbmFtZSA9IHNjcmlwdFVybDtcblx0XHRcdFx0c2NyaXB0UGF0aCA9ICcnO1x0XHRcdFxuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHQvLyBzZWUgaWYgYW55IDxzY3JpcHQ+IHRhZ3MgaGF2ZSBhIGZpbGUgbmFtZSB0aGF0IG1hdGNoZXMgdGhlIFxuXHRcdFx0Zm9yIChqID0gMDsgaiA8IGpsOyBqKyspIHtcblx0XHRcdFx0dGVzdG5hbWUgPSBzY3JpcHROYW1lc1tqXTtcblx0XHRcdFx0ZmlsZW5hbWVQb3MgPSBzY3JpcHRGaWxlbmFtZS5pbmRleE9mKHRlc3RuYW1lKTtcblx0XHRcdFx0aWYgKGZpbGVuYW1lUG9zID4gLTEpIHtcblx0XHRcdFx0XHRjb2RlUGF0aCA9IHNjcmlwdFBhdGg7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0Ly8gaWYgd2UgZm91bmQgYSBwYXRoLCB0aGVuIGJyZWFrIGFuZCByZXR1cm4gaXRcblx0XHRcdGlmIChjb2RlUGF0aCAhPT0gJycpIHtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdFxuXHRcdC8vIHNlbmQgdGhlIGJlc3QgcGF0aCBiYWNrXG5cdFx0cmV0dXJuIGNvZGVQYXRoO1xuXHR9LFxuXHRzZWNvbmRzVG9UaW1lQ29kZTogZnVuY3Rpb24odGltZSwgZm9yY2VIb3Vycywgc2hvd0ZyYW1lQ291bnQsIGZwcykge1xuXHRcdC8vYWRkIGZyYW1lY291bnRcblx0XHRpZiAodHlwZW9mIHNob3dGcmFtZUNvdW50ID09ICd1bmRlZmluZWQnKSB7XG5cdFx0ICAgIHNob3dGcmFtZUNvdW50PWZhbHNlO1xuXHRcdH0gZWxzZSBpZih0eXBlb2YgZnBzID09ICd1bmRlZmluZWQnKSB7XG5cdFx0ICAgIGZwcyA9IDI1O1xuXHRcdH1cblx0XG5cdFx0dmFyIGhvdXJzID0gTWF0aC5mbG9vcih0aW1lIC8gMzYwMCkgJSAyNCxcblx0XHRcdG1pbnV0ZXMgPSBNYXRoLmZsb29yKHRpbWUgLyA2MCkgJSA2MCxcblx0XHRcdHNlY29uZHMgPSBNYXRoLmZsb29yKHRpbWUgJSA2MCksXG5cdFx0XHRmcmFtZXMgPSBNYXRoLmZsb29yKCgodGltZSAlIDEpKmZwcykudG9GaXhlZCgzKSksXG5cdFx0XHRyZXN1bHQgPSBcblx0XHRcdFx0XHQoIChmb3JjZUhvdXJzIHx8IGhvdXJzID4gMCkgPyAoaG91cnMgPCAxMCA/ICcwJyArIGhvdXJzIDogaG91cnMpICsgJzonIDogJycpXG5cdFx0XHRcdFx0XHQrIChtaW51dGVzIDwgMTAgPyAnMCcgKyBtaW51dGVzIDogbWludXRlcykgKyAnOidcblx0XHRcdFx0XHRcdCsgKHNlY29uZHMgPCAxMCA/ICcwJyArIHNlY29uZHMgOiBzZWNvbmRzKVxuXHRcdFx0XHRcdFx0KyAoKHNob3dGcmFtZUNvdW50KSA/ICc6JyArIChmcmFtZXMgPCAxMCA/ICcwJyArIGZyYW1lcyA6IGZyYW1lcykgOiAnJyk7XG5cdFxuXHRcdHJldHVybiByZXN1bHQ7XG5cdH0sXG5cdFxuXHR0aW1lQ29kZVRvU2Vjb25kczogZnVuY3Rpb24oaGhfbW1fc3NfZmYsIGZvcmNlSG91cnMsIHNob3dGcmFtZUNvdW50LCBmcHMpe1xuXHRcdGlmICh0eXBlb2Ygc2hvd0ZyYW1lQ291bnQgPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHQgICAgc2hvd0ZyYW1lQ291bnQ9ZmFsc2U7XG5cdFx0fSBlbHNlIGlmKHR5cGVvZiBmcHMgPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHQgICAgZnBzID0gMjU7XG5cdFx0fVxuXHRcblx0XHR2YXIgdGNfYXJyYXkgPSBoaF9tbV9zc19mZi5zcGxpdChcIjpcIiksXG5cdFx0XHR0Y19oaCA9IHBhcnNlSW50KHRjX2FycmF5WzBdLCAxMCksXG5cdFx0XHR0Y19tbSA9IHBhcnNlSW50KHRjX2FycmF5WzFdLCAxMCksXG5cdFx0XHR0Y19zcyA9IHBhcnNlSW50KHRjX2FycmF5WzJdLCAxMCksXG5cdFx0XHR0Y19mZiA9IDAsXG5cdFx0XHR0Y19pbl9zZWNvbmRzID0gMDtcblx0XHRcblx0XHRpZiAoc2hvd0ZyYW1lQ291bnQpIHtcblx0XHQgICAgdGNfZmYgPSBwYXJzZUludCh0Y19hcnJheVszXSkvZnBzO1xuXHRcdH1cblx0XHRcblx0XHR0Y19pbl9zZWNvbmRzID0gKCB0Y19oaCAqIDM2MDAgKSArICggdGNfbW0gKiA2MCApICsgdGNfc3MgKyB0Y19mZjtcblx0XHRcblx0XHRyZXR1cm4gdGNfaW5fc2Vjb25kcztcblx0fSxcblx0XG5cblx0Y29udmVydFNNUFRFdG9TZWNvbmRzOiBmdW5jdGlvbiAoU01QVEUpIHtcblx0XHRpZiAodHlwZW9mIFNNUFRFICE9ICdzdHJpbmcnKSBcblx0XHRcdHJldHVybiBmYWxzZTtcblxuXHRcdFNNUFRFID0gU01QVEUucmVwbGFjZSgnLCcsICcuJyk7XG5cdFx0XG5cdFx0dmFyIHNlY3MgPSAwLFxuXHRcdFx0ZGVjaW1hbExlbiA9IChTTVBURS5pbmRleE9mKCcuJykgIT0gLTEpID8gU01QVEUuc3BsaXQoJy4nKVsxXS5sZW5ndGggOiAwLFxuXHRcdFx0bXVsdGlwbGllciA9IDE7XG5cdFx0XG5cdFx0U01QVEUgPSBTTVBURS5zcGxpdCgnOicpLnJldmVyc2UoKTtcblx0XHRcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IFNNUFRFLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRtdWx0aXBsaWVyID0gMTtcblx0XHRcdGlmIChpID4gMCkge1xuXHRcdFx0XHRtdWx0aXBsaWVyID0gTWF0aC5wb3coNjAsIGkpOyBcblx0XHRcdH1cblx0XHRcdHNlY3MgKz0gTnVtYmVyKFNNUFRFW2ldKSAqIG11bHRpcGxpZXI7XG5cdFx0fVxuXHRcdHJldHVybiBOdW1iZXIoc2Vjcy50b0ZpeGVkKGRlY2ltYWxMZW4pKTtcblx0fSxcdFxuXHRcblx0LyogYm9ycm93ZWQgZnJvbSBTV0ZPYmplY3Q6IGh0dHA6Ly9jb2RlLmdvb2dsZS5jb20vcC9zd2ZvYmplY3Qvc291cmNlL2Jyb3dzZS90cnVuay9zd2ZvYmplY3Qvc3JjL3N3Zm9iamVjdC5qcyM0NzQgKi9cblx0cmVtb3ZlU3dmOiBmdW5jdGlvbihpZCkge1xuXHRcdHZhciBvYmogPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCk7XG5cdFx0aWYgKG9iaiAmJiAvb2JqZWN0fGVtYmVkL2kudGVzdChvYmoubm9kZU5hbWUpKSB7XG5cdFx0XHRpZiAobWVqcy5NZWRpYUZlYXR1cmVzLmlzSUUpIHtcblx0XHRcdFx0b2JqLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcblx0XHRcdFx0KGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0aWYgKG9iai5yZWFkeVN0YXRlID09IDQpIHtcblx0XHRcdFx0XHRcdG1lanMuVXRpbGl0eS5yZW1vdmVPYmplY3RJbklFKGlkKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0c2V0VGltZW91dChhcmd1bWVudHMuY2FsbGVlLCAxMCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KSgpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0b2JqLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQob2JqKTtcblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cdHJlbW92ZU9iamVjdEluSUU6IGZ1bmN0aW9uKGlkKSB7XG5cdFx0dmFyIG9iaiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKTtcblx0XHRpZiAob2JqKSB7XG5cdFx0XHRmb3IgKHZhciBpIGluIG9iaikge1xuXHRcdFx0XHRpZiAodHlwZW9mIG9ialtpXSA9PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdFx0XHRvYmpbaV0gPSBudWxsO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRvYmoucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChvYmopO1xuXHRcdH1cdFx0XG5cdH1cbn07XG5cblxuLy8gQ29yZSBkZXRlY3RvciwgcGx1Z2lucyBhcmUgYWRkZWQgYmVsb3dcbm1lanMuUGx1Z2luRGV0ZWN0b3IgPSB7XG5cblx0Ly8gbWFpbiBwdWJsaWMgZnVuY3Rpb24gdG8gdGVzdCBhIHBsdWcgdmVyc2lvbiBudW1iZXIgUGx1Z2luRGV0ZWN0b3IuaGFzUGx1Z2luVmVyc2lvbignZmxhc2gnLFs5LDAsMTI1XSk7XG5cdGhhc1BsdWdpblZlcnNpb246IGZ1bmN0aW9uKHBsdWdpbiwgdikge1xuXHRcdHZhciBwdiA9IHRoaXMucGx1Z2luc1twbHVnaW5dO1xuXHRcdHZbMV0gPSB2WzFdIHx8IDA7XG5cdFx0dlsyXSA9IHZbMl0gfHwgMDtcblx0XHRyZXR1cm4gKHB2WzBdID4gdlswXSB8fCAocHZbMF0gPT0gdlswXSAmJiBwdlsxXSA+IHZbMV0pIHx8IChwdlswXSA9PSB2WzBdICYmIHB2WzFdID09IHZbMV0gJiYgcHZbMl0gPj0gdlsyXSkpID8gdHJ1ZSA6IGZhbHNlO1xuXHR9LFxuXG5cdC8vIGNhY2hlZCB2YWx1ZXNcblx0bmF2OiB3aW5kb3cubmF2aWdhdG9yLFxuXHR1YTogd2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKSxcblxuXHQvLyBzdG9yZWQgdmVyc2lvbiBudW1iZXJzXG5cdHBsdWdpbnM6IFtdLFxuXG5cdC8vIHJ1bnMgZGV0ZWN0UGx1Z2luKCkgYW5kIHN0b3JlcyB0aGUgdmVyc2lvbiBudW1iZXJcblx0YWRkUGx1Z2luOiBmdW5jdGlvbihwLCBwbHVnaW5OYW1lLCBtaW1lVHlwZSwgYWN0aXZlWCwgYXhEZXRlY3QpIHtcblx0XHR0aGlzLnBsdWdpbnNbcF0gPSB0aGlzLmRldGVjdFBsdWdpbihwbHVnaW5OYW1lLCBtaW1lVHlwZSwgYWN0aXZlWCwgYXhEZXRlY3QpO1xuXHR9LFxuXG5cdC8vIGdldCB0aGUgdmVyc2lvbiBudW1iZXIgZnJvbSB0aGUgbWltZXR5cGUgKGFsbCBidXQgSUUpIG9yIEFjdGl2ZVggKElFKVxuXHRkZXRlY3RQbHVnaW46IGZ1bmN0aW9uKHBsdWdpbk5hbWUsIG1pbWVUeXBlLCBhY3RpdmVYLCBheERldGVjdCkge1xuXG5cdFx0dmFyIHZlcnNpb24gPSBbMCwwLDBdLFxuXHRcdFx0ZGVzY3JpcHRpb24sXG5cdFx0XHRpLFxuXHRcdFx0YXg7XG5cblx0XHQvLyBGaXJlZm94LCBXZWJraXQsIE9wZXJhXG5cdFx0aWYgKHR5cGVvZih0aGlzLm5hdi5wbHVnaW5zKSAhPSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgdGhpcy5uYXYucGx1Z2luc1twbHVnaW5OYW1lXSA9PSAnb2JqZWN0Jykge1xuXHRcdFx0ZGVzY3JpcHRpb24gPSB0aGlzLm5hdi5wbHVnaW5zW3BsdWdpbk5hbWVdLmRlc2NyaXB0aW9uO1xuXHRcdFx0aWYgKGRlc2NyaXB0aW9uICYmICEodHlwZW9mIHRoaXMubmF2Lm1pbWVUeXBlcyAhPSAndW5kZWZpbmVkJyAmJiB0aGlzLm5hdi5taW1lVHlwZXNbbWltZVR5cGVdICYmICF0aGlzLm5hdi5taW1lVHlwZXNbbWltZVR5cGVdLmVuYWJsZWRQbHVnaW4pKSB7XG5cdFx0XHRcdHZlcnNpb24gPSBkZXNjcmlwdGlvbi5yZXBsYWNlKHBsdWdpbk5hbWUsICcnKS5yZXBsYWNlKC9eXFxzKy8sJycpLnJlcGxhY2UoL1xcc3IvZ2ksJy4nKS5zcGxpdCgnLicpO1xuXHRcdFx0XHRmb3IgKGk9MDsgaTx2ZXJzaW9uLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0dmVyc2lvbltpXSA9IHBhcnNlSW50KHZlcnNpb25baV0ubWF0Y2goL1xcZCsvKSwgMTApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0Ly8gSW50ZXJuZXQgRXhwbG9yZXIgLyBBY3RpdmVYXG5cdFx0fSBlbHNlIGlmICh0eXBlb2Yod2luZG93LkFjdGl2ZVhPYmplY3QpICE9ICd1bmRlZmluZWQnKSB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRheCA9IG5ldyBBY3RpdmVYT2JqZWN0KGFjdGl2ZVgpO1xuXHRcdFx0XHRpZiAoYXgpIHtcblx0XHRcdFx0XHR2ZXJzaW9uID0gYXhEZXRlY3QoYXgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRjYXRjaCAoZSkgeyB9XG5cdFx0fVxuXHRcdHJldHVybiB2ZXJzaW9uO1xuXHR9XG59O1xuXG4vLyBBZGQgRmxhc2ggZGV0ZWN0aW9uXG5tZWpzLlBsdWdpbkRldGVjdG9yLmFkZFBsdWdpbignZmxhc2gnLCdTaG9ja3dhdmUgRmxhc2gnLCdhcHBsaWNhdGlvbi94LXNob2Nrd2F2ZS1mbGFzaCcsJ1Nob2Nrd2F2ZUZsYXNoLlNob2Nrd2F2ZUZsYXNoJywgZnVuY3Rpb24oYXgpIHtcblx0Ly8gYWRhcHRlZCBmcm9tIFNXRk9iamVjdFxuXHR2YXIgdmVyc2lvbiA9IFtdLFxuXHRcdGQgPSBheC5HZXRWYXJpYWJsZShcIiR2ZXJzaW9uXCIpO1xuXHRpZiAoZCkge1xuXHRcdGQgPSBkLnNwbGl0KFwiIFwiKVsxXS5zcGxpdChcIixcIik7XG5cdFx0dmVyc2lvbiA9IFtwYXJzZUludChkWzBdLCAxMCksIHBhcnNlSW50KGRbMV0sIDEwKSwgcGFyc2VJbnQoZFsyXSwgMTApXTtcblx0fVxuXHRyZXR1cm4gdmVyc2lvbjtcbn0pO1xuXG4vLyBBZGQgU2lsdmVybGlnaHQgZGV0ZWN0aW9uXG5tZWpzLlBsdWdpbkRldGVjdG9yLmFkZFBsdWdpbignc2lsdmVybGlnaHQnLCdTaWx2ZXJsaWdodCBQbHVnLUluJywnYXBwbGljYXRpb24veC1zaWx2ZXJsaWdodC0yJywnQWdDb250cm9sLkFnQ29udHJvbCcsIGZ1bmN0aW9uIChheCkge1xuXHQvLyBTaWx2ZXJsaWdodCBjYW5ub3QgcmVwb3J0IGl0cyB2ZXJzaW9uIG51bWJlciB0byBJRVxuXHQvLyBidXQgaXQgZG9lcyBoYXZlIGEgaXNWZXJzaW9uU3VwcG9ydGVkIGZ1bmN0aW9uLCBzbyB3ZSBoYXZlIHRvIGxvb3AgdGhyb3VnaCBpdCB0byBnZXQgYSB2ZXJzaW9uIG51bWJlci5cblx0Ly8gYWRhcHRlZCBmcm9tIGh0dHA6Ly93d3cuc2lsdmVybGlnaHR2ZXJzaW9uLmNvbS9cblx0dmFyIHYgPSBbMCwwLDAsMF0sXG5cdFx0bG9vcE1hdGNoID0gZnVuY3Rpb24oYXgsIHYsIGksIG4pIHtcblx0XHRcdHdoaWxlKGF4LmlzVmVyc2lvblN1cHBvcnRlZCh2WzBdKyBcIi5cIisgdlsxXSArIFwiLlwiICsgdlsyXSArIFwiLlwiICsgdlszXSkpe1xuXHRcdFx0XHR2W2ldKz1uO1xuXHRcdFx0fVxuXHRcdFx0dltpXSAtPSBuO1xuXHRcdH07XG5cdGxvb3BNYXRjaChheCwgdiwgMCwgMSk7XG5cdGxvb3BNYXRjaChheCwgdiwgMSwgMSk7XG5cdGxvb3BNYXRjaChheCwgdiwgMiwgMTAwMDApOyAvLyB0aGUgdGhpcmQgcGxhY2UgaW4gdGhlIHZlcnNpb24gbnVtYmVyIGlzIHVzdWFsbHkgNSBkaWdpdHMgKDQuMC54eHh4eClcblx0bG9vcE1hdGNoKGF4LCB2LCAyLCAxMDAwKTtcblx0bG9vcE1hdGNoKGF4LCB2LCAyLCAxMDApO1xuXHRsb29wTWF0Y2goYXgsIHYsIDIsIDEwKTtcblx0bG9vcE1hdGNoKGF4LCB2LCAyLCAxKTtcblx0bG9vcE1hdGNoKGF4LCB2LCAzLCAxKTtcblxuXHRyZXR1cm4gdjtcbn0pO1xuLy8gYWRkIGFkb2JlIGFjcm9iYXRcbi8qXG5QbHVnaW5EZXRlY3Rvci5hZGRQbHVnaW4oJ2Fjcm9iYXQnLCdBZG9iZSBBY3JvYmF0JywnYXBwbGljYXRpb24vcGRmJywnQWNyb1BERi5QREYnLCBmdW5jdGlvbiAoYXgpIHtcblx0dmFyIHZlcnNpb24gPSBbXSxcblx0XHRkID0gYXguR2V0VmVyc2lvbnMoKS5zcGxpdCgnLCcpWzBdLnNwbGl0KCc9JylbMV0uc3BsaXQoJy4nKTtcblxuXHRpZiAoZCkge1xuXHRcdHZlcnNpb24gPSBbcGFyc2VJbnQoZFswXSwgMTApLCBwYXJzZUludChkWzFdLCAxMCksIHBhcnNlSW50KGRbMl0sIDEwKV07XG5cdH1cblx0cmV0dXJuIHZlcnNpb247XG59KTtcbiovXG4vLyBuZWNlc3NhcnkgZGV0ZWN0aW9uIChmaXhlcyBmb3IgPElFOSlcbm1lanMuTWVkaWFGZWF0dXJlcyA9IHtcblx0aW5pdDogZnVuY3Rpb24oKSB7XG5cdFx0dmFyXG5cdFx0XHR0ID0gdGhpcyxcblx0XHRcdGQgPSBkb2N1bWVudCxcblx0XHRcdG5hdiA9IG1lanMuUGx1Z2luRGV0ZWN0b3IubmF2LFxuXHRcdFx0dWEgPSBtZWpzLlBsdWdpbkRldGVjdG9yLnVhLnRvTG93ZXJDYXNlKCksXG5cdFx0XHRpLFxuXHRcdFx0dixcblx0XHRcdGh0bWw1RWxlbWVudHMgPSBbJ3NvdXJjZScsJ3RyYWNrJywnYXVkaW8nLCd2aWRlbyddO1xuXG5cdFx0Ly8gZGV0ZWN0IGJyb3dzZXJzIChvbmx5IHRoZSBvbmVzIHRoYXQgaGF2ZSBzb21lIGtpbmQgb2YgcXVpcmsgd2UgbmVlZCB0byB3b3JrIGFyb3VuZClcblx0XHR0LmlzaVBhZCA9ICh1YS5tYXRjaCgvaXBhZC9pKSAhPT0gbnVsbCk7XG5cdFx0dC5pc2lQaG9uZSA9ICh1YS5tYXRjaCgvaXBob25lL2kpICE9PSBudWxsKTtcblx0XHR0LmlzaU9TID0gdC5pc2lQaG9uZSB8fCB0LmlzaVBhZDtcblx0XHR0LmlzQW5kcm9pZCA9ICh1YS5tYXRjaCgvYW5kcm9pZC9pKSAhPT0gbnVsbCk7XG5cdFx0dC5pc0J1c3RlZEFuZHJvaWQgPSAodWEubWF0Y2goL2FuZHJvaWQgMlxcLlsxMl0vKSAhPT0gbnVsbCk7XG5cdFx0dC5pc0J1c3RlZE5hdGl2ZUhUVFBTID0gKGxvY2F0aW9uLnByb3RvY29sID09PSAnaHR0cHM6JyAmJiAodWEubWF0Y2goL2FuZHJvaWQgWzEyXVxcLi8pICE9PSBudWxsIHx8IHVhLm1hdGNoKC9tYWNpbnRvc2guKiB2ZXJzaW9uLiogc2FmYXJpLykgIT09IG51bGwpKTtcblx0XHR0LmlzSUUgPSAobmF2LmFwcE5hbWUudG9Mb3dlckNhc2UoKS5pbmRleE9mKFwibWljcm9zb2Z0XCIpICE9IC0xIHx8IG5hdi5hcHBOYW1lLnRvTG93ZXJDYXNlKCkubWF0Y2goL3RyaWRlbnQvZ2kpICE9PSBudWxsKTtcblx0XHR0LmlzQ2hyb21lID0gKHVhLm1hdGNoKC9jaHJvbWUvZ2kpICE9PSBudWxsKTtcblx0XHR0LmlzQ2hyb21pdW0gPSAodWEubWF0Y2goL2Nocm9taXVtL2dpKSAhPT0gbnVsbCk7XG5cdFx0dC5pc0ZpcmVmb3ggPSAodWEubWF0Y2goL2ZpcmVmb3gvZ2kpICE9PSBudWxsKTtcblx0XHR0LmlzV2Via2l0ID0gKHVhLm1hdGNoKC93ZWJraXQvZ2kpICE9PSBudWxsKTtcblx0XHR0LmlzR2Vja28gPSAodWEubWF0Y2goL2dlY2tvL2dpKSAhPT0gbnVsbCkgJiYgIXQuaXNXZWJraXQgJiYgIXQuaXNJRTtcblx0XHR0LmlzT3BlcmEgPSAodWEubWF0Y2goL29wZXJhL2dpKSAhPT0gbnVsbCk7XG5cdFx0dC5oYXNUb3VjaCA9ICgnb250b3VjaHN0YXJ0JyBpbiB3aW5kb3cpOyAvLyAgJiYgd2luZG93Lm9udG91Y2hzdGFydCAhPSBudWxsKTsgLy8gdGhpcyBicmVha3MgaU9TIDdcblx0XHRcblx0XHQvLyBib3Jyb3dlZCBmcm9tIE1vZGVybml6clxuXHRcdHQuc3ZnID0gISEgZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TICYmXG5cdFx0XHRcdCEhIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUygnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnLCdzdmcnKS5jcmVhdGVTVkdSZWN0O1xuXG5cdFx0Ly8gY3JlYXRlIEhUTUw1IG1lZGlhIGVsZW1lbnRzIGZvciBJRSBiZWZvcmUgOSwgZ2V0IGEgPHZpZGVvPiBlbGVtZW50IGZvciBmdWxsc2NyZWVuIGRldGVjdGlvblxuXHRcdGZvciAoaT0wOyBpPGh0bWw1RWxlbWVudHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KGh0bWw1RWxlbWVudHNbaV0pO1xuXHRcdH1cblx0XHRcblx0XHR0LnN1cHBvcnRzTWVkaWFUYWcgPSAodHlwZW9mIHYuY2FuUGxheVR5cGUgIT09ICd1bmRlZmluZWQnIHx8IHQuaXNCdXN0ZWRBbmRyb2lkKTtcblxuXHRcdC8vIEZpeCBmb3IgSUU5IG9uIFdpbmRvd3MgN04gLyBXaW5kb3dzIDdLTiAoTWVkaWEgUGxheWVyIG5vdCBpbnN0YWxsZXIpXG5cdFx0dHJ5e1xuXHRcdFx0di5jYW5QbGF5VHlwZShcInZpZGVvL21wNFwiKTtcblx0XHR9Y2F0Y2goZSl7XG5cdFx0XHR0LnN1cHBvcnRzTWVkaWFUYWcgPSBmYWxzZTtcblx0XHR9XG5cblx0XHQvLyBkZXRlY3QgbmF0aXZlIEphdmFTY3JpcHQgZnVsbHNjcmVlbiAoU2FmYXJpL0ZpcmVmb3ggb25seSwgQ2hyb21lIHN0aWxsIGZhaWxzKVxuXHRcdFxuXHRcdC8vIGlPU1xuXHRcdHQuaGFzU2VtaU5hdGl2ZUZ1bGxTY3JlZW4gPSAodHlwZW9mIHYud2Via2l0RW50ZXJGdWxsc2NyZWVuICE9PSAndW5kZWZpbmVkJyk7XG5cdFx0XG5cdFx0Ly8gVzNDXG5cdFx0dC5oYXNOYXRpdmVGdWxsc2NyZWVuID0gKHR5cGVvZiB2LnJlcXVlc3RGdWxsc2NyZWVuICE9PSAndW5kZWZpbmVkJyk7XG5cdFx0XG5cdFx0Ly8gd2Via2l0L2ZpcmVmb3gvSUUxMStcblx0XHR0Lmhhc1dlYmtpdE5hdGl2ZUZ1bGxTY3JlZW4gPSAodHlwZW9mIHYud2Via2l0UmVxdWVzdEZ1bGxTY3JlZW4gIT09ICd1bmRlZmluZWQnKTtcblx0XHR0Lmhhc01vek5hdGl2ZUZ1bGxTY3JlZW4gPSAodHlwZW9mIHYubW96UmVxdWVzdEZ1bGxTY3JlZW4gIT09ICd1bmRlZmluZWQnKTtcblx0XHR0Lmhhc01zTmF0aXZlRnVsbFNjcmVlbiA9ICh0eXBlb2Ygdi5tc1JlcXVlc3RGdWxsc2NyZWVuICE9PSAndW5kZWZpbmVkJyk7XG5cdFx0XG5cdFx0dC5oYXNUcnVlTmF0aXZlRnVsbFNjcmVlbiA9ICh0Lmhhc1dlYmtpdE5hdGl2ZUZ1bGxTY3JlZW4gfHwgdC5oYXNNb3pOYXRpdmVGdWxsU2NyZWVuIHx8IHQuaGFzTXNOYXRpdmVGdWxsU2NyZWVuKTtcblx0XHR0Lm5hdGl2ZUZ1bGxTY3JlZW5FbmFibGVkID0gdC5oYXNUcnVlTmF0aXZlRnVsbFNjcmVlbjtcblx0XHRcblx0XHQvLyBFbmFibGVkP1xuXHRcdGlmICh0Lmhhc01vek5hdGl2ZUZ1bGxTY3JlZW4pIHtcblx0XHRcdHQubmF0aXZlRnVsbFNjcmVlbkVuYWJsZWQgPSBkb2N1bWVudC5tb3pGdWxsU2NyZWVuRW5hYmxlZDtcblx0XHR9IGVsc2UgaWYgKHQuaGFzTXNOYXRpdmVGdWxsU2NyZWVuKSB7XG5cdFx0XHR0Lm5hdGl2ZUZ1bGxTY3JlZW5FbmFibGVkID0gZG9jdW1lbnQubXNGdWxsc2NyZWVuRW5hYmxlZDtcdFx0XG5cdFx0fVxuXHRcdFxuXHRcdGlmICh0LmlzQ2hyb21lKSB7XG5cdFx0XHR0Lmhhc1NlbWlOYXRpdmVGdWxsU2NyZWVuID0gZmFsc2U7XG5cdFx0fVxuXHRcdFxuXHRcdGlmICh0Lmhhc1RydWVOYXRpdmVGdWxsU2NyZWVuKSB7XG5cdFx0XHRcblx0XHRcdHQuZnVsbFNjcmVlbkV2ZW50TmFtZSA9ICcnO1xuXHRcdFx0aWYgKHQuaGFzV2Via2l0TmF0aXZlRnVsbFNjcmVlbikgeyBcblx0XHRcdFx0dC5mdWxsU2NyZWVuRXZlbnROYW1lID0gJ3dlYmtpdGZ1bGxzY3JlZW5jaGFuZ2UnO1xuXHRcdFx0XHRcblx0XHRcdH0gZWxzZSBpZiAodC5oYXNNb3pOYXRpdmVGdWxsU2NyZWVuKSB7XG5cdFx0XHRcdHQuZnVsbFNjcmVlbkV2ZW50TmFtZSA9ICdtb3pmdWxsc2NyZWVuY2hhbmdlJztcblx0XHRcdFx0XG5cdFx0XHR9IGVsc2UgaWYgKHQuaGFzTXNOYXRpdmVGdWxsU2NyZWVuKSB7XG5cdFx0XHRcdHQuZnVsbFNjcmVlbkV2ZW50TmFtZSA9ICdNU0Z1bGxzY3JlZW5DaGFuZ2UnO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHR0LmlzRnVsbFNjcmVlbiA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRpZiAodC5oYXNNb3pOYXRpdmVGdWxsU2NyZWVuKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGQubW96RnVsbFNjcmVlbjtcblx0XHRcdFx0XG5cdFx0XHRcdH0gZWxzZSBpZiAodC5oYXNXZWJraXROYXRpdmVGdWxsU2NyZWVuKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGQud2Via2l0SXNGdWxsU2NyZWVuO1xuXHRcdFx0XHRcblx0XHRcdFx0fSBlbHNlIGlmICh0Lmhhc01zTmF0aXZlRnVsbFNjcmVlbikge1xuXHRcdFx0XHRcdHJldHVybiBkLm1zRnVsbHNjcmVlbkVsZW1lbnQgIT09IG51bGw7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdFx0XHRcblx0XHRcdHQucmVxdWVzdEZ1bGxTY3JlZW4gPSBmdW5jdGlvbihlbCkge1xuXHRcdFxuXHRcdFx0XHRpZiAodC5oYXNXZWJraXROYXRpdmVGdWxsU2NyZWVuKSB7XG5cdFx0XHRcdFx0ZWwud2Via2l0UmVxdWVzdEZ1bGxTY3JlZW4oKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0fSBlbHNlIGlmICh0Lmhhc01vek5hdGl2ZUZ1bGxTY3JlZW4pIHtcblx0XHRcdFx0XHRlbC5tb3pSZXF1ZXN0RnVsbFNjcmVlbigpO1xuXG5cdFx0XHRcdH0gZWxzZSBpZiAodC5oYXNNc05hdGl2ZUZ1bGxTY3JlZW4pIHtcblx0XHRcdFx0XHRlbC5tc1JlcXVlc3RGdWxsc2NyZWVuKCk7XG5cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHR0LmNhbmNlbEZ1bGxTY3JlZW4gPSBmdW5jdGlvbigpIHtcdFx0XHRcdFxuXHRcdFx0XHRpZiAodC5oYXNXZWJraXROYXRpdmVGdWxsU2NyZWVuKSB7XG5cdFx0XHRcdFx0ZG9jdW1lbnQud2Via2l0Q2FuY2VsRnVsbFNjcmVlbigpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHR9IGVsc2UgaWYgKHQuaGFzTW96TmF0aXZlRnVsbFNjcmVlbikge1xuXHRcdFx0XHRcdGRvY3VtZW50Lm1vekNhbmNlbEZ1bGxTY3JlZW4oKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0fSBlbHNlIGlmICh0Lmhhc01zTmF0aXZlRnVsbFNjcmVlbikge1xuXHRcdFx0XHRcdGRvY3VtZW50Lm1zRXhpdEZ1bGxzY3JlZW4oKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0fVxuXHRcdFx0fVx0XG5cdFx0XHRcblx0XHR9XG5cdFx0XG5cdFx0XG5cdFx0Ly8gT1MgWCAxMC41IGNhbid0IGRvIHRoaXMgZXZlbiBpZiBpdCBzYXlzIGl0IGNhbiA6KFxuXHRcdGlmICh0Lmhhc1NlbWlOYXRpdmVGdWxsU2NyZWVuICYmIHVhLm1hdGNoKC9tYWMgb3MgeCAxMF81L2kpKSB7XG5cdFx0XHR0Lmhhc05hdGl2ZUZ1bGxTY3JlZW4gPSBmYWxzZTtcblx0XHRcdHQuaGFzU2VtaU5hdGl2ZUZ1bGxTY3JlZW4gPSBmYWxzZTtcblx0XHR9XG5cdFx0XG5cdH1cbn07XG5tZWpzLk1lZGlhRmVhdHVyZXMuaW5pdCgpO1xuXG4vKlxuZXh0ZW5zaW9uIG1ldGhvZHMgdG8gPHZpZGVvPiBvciA8YXVkaW8+IG9iamVjdCB0byBicmluZyBpdCBpbnRvIHBhcml0eSB3aXRoIFBsdWdpbk1lZGlhRWxlbWVudCAoc2VlIGJlbG93KVxuKi9cbm1lanMuSHRtbE1lZGlhRWxlbWVudCA9IHtcblx0cGx1Z2luVHlwZTogJ25hdGl2ZScsXG5cdGlzRnVsbFNjcmVlbjogZmFsc2UsXG5cblx0c2V0Q3VycmVudFRpbWU6IGZ1bmN0aW9uICh0aW1lKSB7XG5cdFx0dGhpcy5jdXJyZW50VGltZSA9IHRpbWU7XG5cdH0sXG5cblx0c2V0TXV0ZWQ6IGZ1bmN0aW9uIChtdXRlZCkge1xuXHRcdHRoaXMubXV0ZWQgPSBtdXRlZDtcblx0fSxcblxuXHRzZXRWb2x1bWU6IGZ1bmN0aW9uICh2b2x1bWUpIHtcblx0XHR0aGlzLnZvbHVtZSA9IHZvbHVtZTtcblx0fSxcblxuXHQvLyBmb3IgcGFyaXR5IHdpdGggdGhlIHBsdWdpbiB2ZXJzaW9uc1xuXHRzdG9wOiBmdW5jdGlvbiAoKSB7XG5cdFx0dGhpcy5wYXVzZSgpO1xuXHR9LFxuXG5cdC8vIFRoaXMgY2FuIGJlIGEgdXJsIHN0cmluZ1xuXHQvLyBvciBhbiBhcnJheSBbe3NyYzonZmlsZS5tcDQnLHR5cGU6J3ZpZGVvL21wNCd9LHtzcmM6J2ZpbGUud2VibScsdHlwZTondmlkZW8vd2VibSd9XVxuXHRzZXRTcmM6IGZ1bmN0aW9uICh1cmwpIHtcblx0XHRcblx0XHQvLyBGaXggZm9yIElFOSB3aGljaCBjYW4ndCBzZXQgLnNyYyB3aGVuIHRoZXJlIGFyZSA8c291cmNlPiBlbGVtZW50cy4gQXdlc29tZSwgcmlnaHQ/XG5cdFx0dmFyIFxuXHRcdFx0ZXhpc3RpbmdTb3VyY2VzID0gdGhpcy5nZXRFbGVtZW50c0J5VGFnTmFtZSgnc291cmNlJyk7XG5cdFx0d2hpbGUgKGV4aXN0aW5nU291cmNlcy5sZW5ndGggPiAwKXtcblx0XHRcdHRoaXMucmVtb3ZlQ2hpbGQoZXhpc3RpbmdTb3VyY2VzWzBdKTtcblx0XHR9XG5cdFxuXHRcdGlmICh0eXBlb2YgdXJsID09ICdzdHJpbmcnKSB7XG5cdFx0XHR0aGlzLnNyYyA9IHVybDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dmFyIGksIG1lZGlhO1xuXG5cdFx0XHRmb3IgKGk9MDsgaTx1cmwubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0bWVkaWEgPSB1cmxbaV07XG5cdFx0XHRcdGlmICh0aGlzLmNhblBsYXlUeXBlKG1lZGlhLnR5cGUpKSB7XG5cdFx0XHRcdFx0dGhpcy5zcmMgPSBtZWRpYS5zcmM7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cblx0c2V0VmlkZW9TaXplOiBmdW5jdGlvbiAod2lkdGgsIGhlaWdodCkge1xuXHRcdHRoaXMud2lkdGggPSB3aWR0aDtcblx0XHR0aGlzLmhlaWdodCA9IGhlaWdodDtcblx0fVxufTtcblxuLypcbk1pbWljcyB0aGUgPHZpZGVvL2F1ZGlvPiBlbGVtZW50IGJ5IGNhbGxpbmcgRmxhc2gncyBFeHRlcm5hbCBJbnRlcmZhY2Ugb3IgU2lsdmVybGlnaHRzIFtTY3JpcHRhYmxlTWVtYmVyXVxuKi9cbm1lanMuUGx1Z2luTWVkaWFFbGVtZW50ID0gZnVuY3Rpb24gKHBsdWdpbmlkLCBwbHVnaW5UeXBlLCBtZWRpYVVybCkge1xuXHR0aGlzLmlkID0gcGx1Z2luaWQ7XG5cdHRoaXMucGx1Z2luVHlwZSA9IHBsdWdpblR5cGU7XG5cdHRoaXMuc3JjID0gbWVkaWFVcmw7XG5cdHRoaXMuZXZlbnRzID0ge307XG5cdHRoaXMuYXR0cmlidXRlcyA9IHt9O1xufTtcblxuLy8gSmF2YVNjcmlwdCB2YWx1ZXMgYW5kIEV4dGVybmFsSW50ZXJmYWNlIG1ldGhvZHMgdGhhdCBtYXRjaCBIVE1MNSB2aWRlbyBwcm9wZXJ0aWVzIG1ldGhvZHNcbi8vIGh0dHA6Ly93d3cuYWRvYmUuY29tL2xpdmVkb2NzL2ZsYXNoLzkuMC9BY3Rpb25TY3JpcHRMYW5nUmVmVjMvZmwvdmlkZW8vRkxWUGxheWJhY2suaHRtbFxuLy8gaHR0cDovL3d3dy53aGF0d2cub3JnL3NwZWNzL3dlYi1hcHBzL2N1cnJlbnQtd29yay9tdWx0aXBhZ2UvdmlkZW8uaHRtbFxubWVqcy5QbHVnaW5NZWRpYUVsZW1lbnQucHJvdG90eXBlID0ge1xuXG5cdC8vIHNwZWNpYWxcblx0cGx1Z2luRWxlbWVudDogbnVsbCxcblx0cGx1Z2luVHlwZTogJycsXG5cdGlzRnVsbFNjcmVlbjogZmFsc2UsXG5cblx0Ly8gbm90IGltcGxlbWVudGVkIDooXG5cdHBsYXliYWNrUmF0ZTogLTEsXG5cdGRlZmF1bHRQbGF5YmFja1JhdGU6IC0xLFxuXHRzZWVrYWJsZTogW10sXG5cdHBsYXllZDogW10sXG5cblx0Ly8gSFRNTDUgcmVhZC1vbmx5IHByb3BlcnRpZXNcblx0cGF1c2VkOiB0cnVlLFxuXHRlbmRlZDogZmFsc2UsXG5cdHNlZWtpbmc6IGZhbHNlLFxuXHRkdXJhdGlvbjogMCxcblx0ZXJyb3I6IG51bGwsXG5cdHRhZ05hbWU6ICcnLFxuXG5cdC8vIEhUTUw1IGdldC9zZXQgcHJvcGVydGllcywgYnV0IG9ubHkgc2V0ICh1cGRhdGVkIGJ5IGV2ZW50IGhhbmRsZXJzKVxuXHRtdXRlZDogZmFsc2UsXG5cdHZvbHVtZTogMSxcblx0Y3VycmVudFRpbWU6IDAsXG5cblx0Ly8gSFRNTDUgbWV0aG9kc1xuXHRwbGF5OiBmdW5jdGlvbiAoKSB7XG5cdFx0aWYgKHRoaXMucGx1Z2luQXBpICE9IG51bGwpIHtcblx0XHRcdGlmICh0aGlzLnBsdWdpblR5cGUgPT0gJ3lvdXR1YmUnIHx8IHRoaXMucGx1Z2luVHlwZSA9PSAndmltZW8nKSB7XG5cdFx0XHRcdHRoaXMucGx1Z2luQXBpLnBsYXlWaWRlbygpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5wbHVnaW5BcGkucGxheU1lZGlhKCk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLnBhdXNlZCA9IGZhbHNlO1xuXHRcdH1cblx0fSxcblx0bG9hZDogZnVuY3Rpb24gKCkge1xuXHRcdGlmICh0aGlzLnBsdWdpbkFwaSAhPSBudWxsKSB7XG5cdFx0XHRpZiAodGhpcy5wbHVnaW5UeXBlID09ICd5b3V0dWJlJyB8fCB0aGlzLnBsdWdpblR5cGUgPT0gJ3ZpbWVvJykge1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5wbHVnaW5BcGkubG9hZE1lZGlhKCk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHRoaXMucGF1c2VkID0gZmFsc2U7XG5cdFx0fVxuXHR9LFxuXHRwYXVzZTogZnVuY3Rpb24gKCkge1xuXHRcdGlmICh0aGlzLnBsdWdpbkFwaSAhPSBudWxsKSB7XG5cdFx0XHRpZiAodGhpcy5wbHVnaW5UeXBlID09ICd5b3V0dWJlJyB8fCB0aGlzLnBsdWdpblR5cGUgPT0gJ3ZpbWVvJykge1xuXHRcdFx0XHR0aGlzLnBsdWdpbkFwaS5wYXVzZVZpZGVvKCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLnBsdWdpbkFwaS5wYXVzZU1lZGlhKCk7XG5cdFx0XHR9XHRcdFx0XG5cdFx0XHRcblx0XHRcdFxuXHRcdFx0dGhpcy5wYXVzZWQgPSB0cnVlO1xuXHRcdH1cblx0fSxcblx0c3RvcDogZnVuY3Rpb24gKCkge1xuXHRcdGlmICh0aGlzLnBsdWdpbkFwaSAhPSBudWxsKSB7XG5cdFx0XHRpZiAodGhpcy5wbHVnaW5UeXBlID09ICd5b3V0dWJlJyB8fCB0aGlzLnBsdWdpblR5cGUgPT0gJ3ZpbWVvJykge1xuXHRcdFx0XHR0aGlzLnBsdWdpbkFwaS5zdG9wVmlkZW8oKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRoaXMucGx1Z2luQXBpLnN0b3BNZWRpYSgpO1xuXHRcdFx0fVx0XG5cdFx0XHR0aGlzLnBhdXNlZCA9IHRydWU7XG5cdFx0fVxuXHR9LFxuXHRjYW5QbGF5VHlwZTogZnVuY3Rpb24odHlwZSkge1xuXHRcdHZhciBpLFxuXHRcdFx0aixcblx0XHRcdHBsdWdpbkluZm8sXG5cdFx0XHRwbHVnaW5WZXJzaW9ucyA9IG1lanMucGx1Z2luc1t0aGlzLnBsdWdpblR5cGVdO1xuXG5cdFx0Zm9yIChpPTA7IGk8cGx1Z2luVmVyc2lvbnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHBsdWdpbkluZm8gPSBwbHVnaW5WZXJzaW9uc1tpXTtcblxuXHRcdFx0Ly8gdGVzdCBpZiB1c2VyIGhhcyB0aGUgY29ycmVjdCBwbHVnaW4gdmVyc2lvblxuXHRcdFx0aWYgKG1lanMuUGx1Z2luRGV0ZWN0b3IuaGFzUGx1Z2luVmVyc2lvbih0aGlzLnBsdWdpblR5cGUsIHBsdWdpbkluZm8udmVyc2lvbikpIHtcblxuXHRcdFx0XHQvLyB0ZXN0IGZvciBwbHVnaW4gcGxheWJhY2sgdHlwZXNcblx0XHRcdFx0Zm9yIChqPTA7IGo8cGx1Z2luSW5mby50eXBlcy5sZW5ndGg7IGorKykge1xuXHRcdFx0XHRcdC8vIGZpbmQgcGx1Z2luIHRoYXQgY2FuIHBsYXkgdGhlIHR5cGVcblx0XHRcdFx0XHRpZiAodHlwZSA9PSBwbHVnaW5JbmZvLnR5cGVzW2pdKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gJ3Byb2JhYmx5Jztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gJyc7XG5cdH0sXG5cdFxuXHRwb3NpdGlvbkZ1bGxzY3JlZW5CdXR0b246IGZ1bmN0aW9uKHgseSx2aXNpYmxlQW5kQWJvdmUpIHtcblx0XHRpZiAodGhpcy5wbHVnaW5BcGkgIT0gbnVsbCAmJiB0aGlzLnBsdWdpbkFwaS5wb3NpdGlvbkZ1bGxzY3JlZW5CdXR0b24pIHtcblx0XHRcdHRoaXMucGx1Z2luQXBpLnBvc2l0aW9uRnVsbHNjcmVlbkJ1dHRvbihNYXRoLmZsb29yKHgpLE1hdGguZmxvb3IoeSksdmlzaWJsZUFuZEFib3ZlKTtcblx0XHR9XG5cdH0sXG5cdFxuXHRoaWRlRnVsbHNjcmVlbkJ1dHRvbjogZnVuY3Rpb24oKSB7XG5cdFx0aWYgKHRoaXMucGx1Z2luQXBpICE9IG51bGwgJiYgdGhpcy5wbHVnaW5BcGkuaGlkZUZ1bGxzY3JlZW5CdXR0b24pIHtcblx0XHRcdHRoaXMucGx1Z2luQXBpLmhpZGVGdWxsc2NyZWVuQnV0dG9uKCk7XG5cdFx0fVx0XHRcblx0fSxcdFxuXHRcblxuXHQvLyBjdXN0b20gbWV0aG9kcyBzaW5jZSBub3QgYWxsIEphdmFTY3JpcHQgaW1wbGVtZW50YXRpb25zIHN1cHBvcnQgZ2V0L3NldFxuXG5cdC8vIFRoaXMgY2FuIGJlIGEgdXJsIHN0cmluZ1xuXHQvLyBvciBhbiBhcnJheSBbe3NyYzonZmlsZS5tcDQnLHR5cGU6J3ZpZGVvL21wNCd9LHtzcmM6J2ZpbGUud2VibScsdHlwZTondmlkZW8vd2VibSd9XVxuXHRzZXRTcmM6IGZ1bmN0aW9uICh1cmwpIHtcblx0XHRpZiAodHlwZW9mIHVybCA9PSAnc3RyaW5nJykge1xuXHRcdFx0dGhpcy5wbHVnaW5BcGkuc2V0U3JjKG1lanMuVXRpbGl0eS5hYnNvbHV0aXplVXJsKHVybCkpO1xuXHRcdFx0dGhpcy5zcmMgPSBtZWpzLlV0aWxpdHkuYWJzb2x1dGl6ZVVybCh1cmwpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR2YXIgaSwgbWVkaWE7XG5cblx0XHRcdGZvciAoaT0wOyBpPHVybC5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRtZWRpYSA9IHVybFtpXTtcblx0XHRcdFx0aWYgKHRoaXMuY2FuUGxheVR5cGUobWVkaWEudHlwZSkpIHtcblx0XHRcdFx0XHR0aGlzLnBsdWdpbkFwaS5zZXRTcmMobWVqcy5VdGlsaXR5LmFic29sdXRpemVVcmwobWVkaWEuc3JjKSk7XG5cdFx0XHRcdFx0dGhpcy5zcmMgPSBtZWpzLlV0aWxpdHkuYWJzb2x1dGl6ZVVybCh1cmwpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdH0sXG5cdHNldEN1cnJlbnRUaW1lOiBmdW5jdGlvbiAodGltZSkge1xuXHRcdGlmICh0aGlzLnBsdWdpbkFwaSAhPSBudWxsKSB7XG5cdFx0XHRpZiAodGhpcy5wbHVnaW5UeXBlID09ICd5b3V0dWJlJyB8fCB0aGlzLnBsdWdpblR5cGUgPT0gJ3ZpbWVvJykge1xuXHRcdFx0XHR0aGlzLnBsdWdpbkFwaS5zZWVrVG8odGltZSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLnBsdWdpbkFwaS5zZXRDdXJyZW50VGltZSh0aW1lKTtcblx0XHRcdH1cdFx0XHRcdFxuXHRcdFx0XG5cdFx0XHRcblx0XHRcdFxuXHRcdFx0dGhpcy5jdXJyZW50VGltZSA9IHRpbWU7XG5cdFx0fVxuXHR9LFxuXHRzZXRWb2x1bWU6IGZ1bmN0aW9uICh2b2x1bWUpIHtcblx0XHRpZiAodGhpcy5wbHVnaW5BcGkgIT0gbnVsbCkge1xuXHRcdFx0Ly8gc2FtZSBvbiBZb3VUdWJlIGFuZCBNRWpzXG5cdFx0XHRpZiAodGhpcy5wbHVnaW5UeXBlID09ICd5b3V0dWJlJykge1xuXHRcdFx0XHR0aGlzLnBsdWdpbkFwaS5zZXRWb2x1bWUodm9sdW1lICogMTAwKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRoaXMucGx1Z2luQXBpLnNldFZvbHVtZSh2b2x1bWUpO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy52b2x1bWUgPSB2b2x1bWU7XG5cdFx0fVxuXHR9LFxuXHRzZXRNdXRlZDogZnVuY3Rpb24gKG11dGVkKSB7XG5cdFx0aWYgKHRoaXMucGx1Z2luQXBpICE9IG51bGwpIHtcblx0XHRcdGlmICh0aGlzLnBsdWdpblR5cGUgPT0gJ3lvdXR1YmUnKSB7XG5cdFx0XHRcdGlmIChtdXRlZCkge1xuXHRcdFx0XHRcdHRoaXMucGx1Z2luQXBpLm11dGUoKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR0aGlzLnBsdWdpbkFwaS51bk11dGUoKTtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLm11dGVkID0gbXV0ZWQ7XG5cdFx0XHRcdHRoaXMuZGlzcGF0Y2hFdmVudCgndm9sdW1lY2hhbmdlJyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLnBsdWdpbkFwaS5zZXRNdXRlZChtdXRlZCk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLm11dGVkID0gbXV0ZWQ7XG5cdFx0fVxuXHR9LFxuXG5cdC8vIGFkZGl0aW9uYWwgbm9uLUhUTUw1IG1ldGhvZHNcblx0c2V0VmlkZW9TaXplOiBmdW5jdGlvbiAod2lkdGgsIGhlaWdodCkge1xuXHRcdFxuXHRcdC8vaWYgKHRoaXMucGx1Z2luVHlwZSA9PSAnZmxhc2gnIHx8IHRoaXMucGx1Z2luVHlwZSA9PSAnc2lsdmVybGlnaHQnKSB7XG5cdFx0XHRpZiAodGhpcy5wbHVnaW5FbGVtZW50ICYmIHRoaXMucGx1Z2luRWxlbWVudC5zdHlsZSkge1xuXHRcdFx0XHR0aGlzLnBsdWdpbkVsZW1lbnQuc3R5bGUud2lkdGggPSB3aWR0aCArICdweCc7XG5cdFx0XHRcdHRoaXMucGx1Z2luRWxlbWVudC5zdHlsZS5oZWlnaHQgPSBoZWlnaHQgKyAncHgnO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRoaXMucGx1Z2luQXBpICE9IG51bGwgJiYgdGhpcy5wbHVnaW5BcGkuc2V0VmlkZW9TaXplKSB7XG5cdFx0XHRcdHRoaXMucGx1Z2luQXBpLnNldFZpZGVvU2l6ZSh3aWR0aCwgaGVpZ2h0KTtcblx0XHRcdH1cblx0XHQvL31cblx0fSxcblxuXHRzZXRGdWxsc2NyZWVuOiBmdW5jdGlvbiAoZnVsbHNjcmVlbikge1xuXHRcdGlmICh0aGlzLnBsdWdpbkFwaSAhPSBudWxsICYmIHRoaXMucGx1Z2luQXBpLnNldEZ1bGxzY3JlZW4pIHtcblx0XHRcdHRoaXMucGx1Z2luQXBpLnNldEZ1bGxzY3JlZW4oZnVsbHNjcmVlbik7XG5cdFx0fVxuXHR9LFxuXHRcblx0ZW50ZXJGdWxsU2NyZWVuOiBmdW5jdGlvbigpIHtcblx0XHRpZiAodGhpcy5wbHVnaW5BcGkgIT0gbnVsbCAmJiB0aGlzLnBsdWdpbkFwaS5zZXRGdWxsc2NyZWVuKSB7XG5cdFx0XHR0aGlzLnNldEZ1bGxzY3JlZW4odHJ1ZSk7XG5cdFx0fVx0XHRcblx0XHRcblx0fSxcblx0XG5cdGV4aXRGdWxsU2NyZWVuOiBmdW5jdGlvbigpIHtcblx0XHRpZiAodGhpcy5wbHVnaW5BcGkgIT0gbnVsbCAmJiB0aGlzLnBsdWdpbkFwaS5zZXRGdWxsc2NyZWVuKSB7XG5cdFx0XHR0aGlzLnNldEZ1bGxzY3JlZW4oZmFsc2UpO1xuXHRcdH1cblx0fSxcdFxuXG5cdC8vIHN0YXJ0OiBmYWtlIGV2ZW50c1xuXHRhZGRFdmVudExpc3RlbmVyOiBmdW5jdGlvbiAoZXZlbnROYW1lLCBjYWxsYmFjaywgYnViYmxlKSB7XG5cdFx0dGhpcy5ldmVudHNbZXZlbnROYW1lXSA9IHRoaXMuZXZlbnRzW2V2ZW50TmFtZV0gfHwgW107XG5cdFx0dGhpcy5ldmVudHNbZXZlbnROYW1lXS5wdXNoKGNhbGxiYWNrKTtcblx0fSxcblx0cmVtb3ZlRXZlbnRMaXN0ZW5lcjogZnVuY3Rpb24gKGV2ZW50TmFtZSwgY2FsbGJhY2spIHtcblx0XHRpZiAoIWV2ZW50TmFtZSkgeyB0aGlzLmV2ZW50cyA9IHt9OyByZXR1cm4gdHJ1ZTsgfVxuXHRcdHZhciBjYWxsYmFja3MgPSB0aGlzLmV2ZW50c1tldmVudE5hbWVdO1xuXHRcdGlmICghY2FsbGJhY2tzKSByZXR1cm4gdHJ1ZTtcblx0XHRpZiAoIWNhbGxiYWNrKSB7IHRoaXMuZXZlbnRzW2V2ZW50TmFtZV0gPSBbXTsgcmV0dXJuIHRydWU7IH1cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGNhbGxiYWNrcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0aWYgKGNhbGxiYWNrc1tpXSA9PT0gY2FsbGJhY2spIHtcblx0XHRcdFx0dGhpcy5ldmVudHNbZXZlbnROYW1lXS5zcGxpY2UoaSwgMSk7XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0sXHRcblx0ZGlzcGF0Y2hFdmVudDogZnVuY3Rpb24gKGV2ZW50TmFtZSkge1xuXHRcdHZhciBpLFxuXHRcdFx0YXJncyxcblx0XHRcdGNhbGxiYWNrcyA9IHRoaXMuZXZlbnRzW2V2ZW50TmFtZV07XG5cblx0XHRpZiAoY2FsbGJhY2tzKSB7XG5cdFx0XHRhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcblx0XHRcdGZvciAoaSA9IDA7IGkgPCBjYWxsYmFja3MubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0Y2FsbGJhY2tzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuXHRcdFx0fVxuXHRcdH1cblx0fSxcblx0Ly8gZW5kOiBmYWtlIGV2ZW50c1xuXHRcblx0Ly8gZmFrZSBET00gYXR0cmlidXRlIG1ldGhvZHNcblx0aGFzQXR0cmlidXRlOiBmdW5jdGlvbihuYW1lKXtcblx0XHRyZXR1cm4gKG5hbWUgaW4gdGhpcy5hdHRyaWJ1dGVzKTsgIFxuXHR9LFxuXHRyZW1vdmVBdHRyaWJ1dGU6IGZ1bmN0aW9uKG5hbWUpe1xuXHRcdGRlbGV0ZSB0aGlzLmF0dHJpYnV0ZXNbbmFtZV07XG5cdH0sXG5cdGdldEF0dHJpYnV0ZTogZnVuY3Rpb24obmFtZSl7XG5cdFx0aWYgKHRoaXMuaGFzQXR0cmlidXRlKG5hbWUpKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5hdHRyaWJ1dGVzW25hbWVdO1xuXHRcdH1cblx0XHRyZXR1cm4gJyc7XG5cdH0sXG5cdHNldEF0dHJpYnV0ZTogZnVuY3Rpb24obmFtZSwgdmFsdWUpe1xuXHRcdHRoaXMuYXR0cmlidXRlc1tuYW1lXSA9IHZhbHVlO1xuXHR9LFxuXG5cdHJlbW92ZTogZnVuY3Rpb24oKSB7XG5cdFx0bWVqcy5VdGlsaXR5LnJlbW92ZVN3Zih0aGlzLnBsdWdpbkVsZW1lbnQuaWQpO1xuXHRcdG1lanMuTWVkaWFQbHVnaW5CcmlkZ2UudW5yZWdpc3RlclBsdWdpbkVsZW1lbnQodGhpcy5wbHVnaW5FbGVtZW50LmlkKTtcblx0fVxufTtcblxuLy8gSGFuZGxlcyBjYWxscyBmcm9tIEZsYXNoL1NpbHZlcmxpZ2h0IGFuZCByZXBvcnRzIHRoZW0gYXMgbmF0aXZlIDx2aWRlby9hdWRpbz4gZXZlbnRzIGFuZCBwcm9wZXJ0aWVzXG5tZWpzLk1lZGlhUGx1Z2luQnJpZGdlID0ge1xuXG5cdHBsdWdpbk1lZGlhRWxlbWVudHM6e30sXG5cdGh0bWxNZWRpYUVsZW1lbnRzOnt9LFxuXG5cdHJlZ2lzdGVyUGx1Z2luRWxlbWVudDogZnVuY3Rpb24gKGlkLCBwbHVnaW5NZWRpYUVsZW1lbnQsIGh0bWxNZWRpYUVsZW1lbnQpIHtcblx0XHR0aGlzLnBsdWdpbk1lZGlhRWxlbWVudHNbaWRdID0gcGx1Z2luTWVkaWFFbGVtZW50O1xuXHRcdHRoaXMuaHRtbE1lZGlhRWxlbWVudHNbaWRdID0gaHRtbE1lZGlhRWxlbWVudDtcblx0fSxcblxuXHR1bnJlZ2lzdGVyUGx1Z2luRWxlbWVudDogZnVuY3Rpb24gKGlkKSB7XG5cdFx0ZGVsZXRlIHRoaXMucGx1Z2luTWVkaWFFbGVtZW50c1tpZF07XG5cdFx0ZGVsZXRlIHRoaXMuaHRtbE1lZGlhRWxlbWVudHNbaWRdO1xuXHR9LFxuXG5cdC8vIHdoZW4gRmxhc2gvU2lsdmVybGlnaHQgaXMgcmVhZHksIGl0IGNhbGxzIG91dCB0byB0aGlzIG1ldGhvZFxuXHRpbml0UGx1Z2luOiBmdW5jdGlvbiAoaWQpIHtcblxuXHRcdHZhciBwbHVnaW5NZWRpYUVsZW1lbnQgPSB0aGlzLnBsdWdpbk1lZGlhRWxlbWVudHNbaWRdLFxuXHRcdFx0aHRtbE1lZGlhRWxlbWVudCA9IHRoaXMuaHRtbE1lZGlhRWxlbWVudHNbaWRdO1xuXG5cdFx0aWYgKHBsdWdpbk1lZGlhRWxlbWVudCkge1xuXHRcdFx0Ly8gZmluZCB0aGUgamF2YXNjcmlwdCBicmlkZ2Vcblx0XHRcdHN3aXRjaCAocGx1Z2luTWVkaWFFbGVtZW50LnBsdWdpblR5cGUpIHtcblx0XHRcdFx0Y2FzZSBcImZsYXNoXCI6XG5cdFx0XHRcdFx0cGx1Z2luTWVkaWFFbGVtZW50LnBsdWdpbkVsZW1lbnQgPSBwbHVnaW5NZWRpYUVsZW1lbnQucGx1Z2luQXBpID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIFwic2lsdmVybGlnaHRcIjpcblx0XHRcdFx0XHRwbHVnaW5NZWRpYUVsZW1lbnQucGx1Z2luRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHBsdWdpbk1lZGlhRWxlbWVudC5pZCk7XG5cdFx0XHRcdFx0cGx1Z2luTWVkaWFFbGVtZW50LnBsdWdpbkFwaSA9IHBsdWdpbk1lZGlhRWxlbWVudC5wbHVnaW5FbGVtZW50LkNvbnRlbnQuTWVkaWFFbGVtZW50SlM7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFxuXHRcdFx0aWYgKHBsdWdpbk1lZGlhRWxlbWVudC5wbHVnaW5BcGkgIT0gbnVsbCAmJiBwbHVnaW5NZWRpYUVsZW1lbnQuc3VjY2Vzcykge1xuXHRcdFx0XHRwbHVnaW5NZWRpYUVsZW1lbnQuc3VjY2VzcyhwbHVnaW5NZWRpYUVsZW1lbnQsIGh0bWxNZWRpYUVsZW1lbnQpO1xuXHRcdFx0fVxuXHRcdH1cblx0fSxcblxuXHQvLyByZWNlaXZlcyBldmVudHMgZnJvbSBGbGFzaC9TaWx2ZXJsaWdodCBhbmQgc2VuZHMgdGhlbSBvdXQgYXMgSFRNTDUgbWVkaWEgZXZlbnRzXG5cdC8vIGh0dHA6Ly93d3cud2hhdHdnLm9yZy9zcGVjcy93ZWItYXBwcy9jdXJyZW50LXdvcmsvbXVsdGlwYWdlL3ZpZGVvLmh0bWxcblx0ZmlyZUV2ZW50OiBmdW5jdGlvbiAoaWQsIGV2ZW50TmFtZSwgdmFsdWVzKSB7XG5cblx0XHR2YXJcblx0XHRcdGUsXG5cdFx0XHRpLFxuXHRcdFx0YnVmZmVyZWRUaW1lLFxuXHRcdFx0cGx1Z2luTWVkaWFFbGVtZW50ID0gdGhpcy5wbHVnaW5NZWRpYUVsZW1lbnRzW2lkXTtcblxuXHRcdGlmKCFwbHVnaW5NZWRpYUVsZW1lbnQpe1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuXHRcdC8vIGZha2UgZXZlbnQgb2JqZWN0IHRvIG1pbWljIHJlYWwgSFRNTCBtZWRpYSBldmVudC5cblx0XHRlID0ge1xuXHRcdFx0dHlwZTogZXZlbnROYW1lLFxuXHRcdFx0dGFyZ2V0OiBwbHVnaW5NZWRpYUVsZW1lbnRcblx0XHR9O1xuXG5cdFx0Ly8gYXR0YWNoIGFsbCB2YWx1ZXMgdG8gZWxlbWVudCBhbmQgZXZlbnQgb2JqZWN0XG5cdFx0Zm9yIChpIGluIHZhbHVlcykge1xuXHRcdFx0cGx1Z2luTWVkaWFFbGVtZW50W2ldID0gdmFsdWVzW2ldO1xuXHRcdFx0ZVtpXSA9IHZhbHVlc1tpXTtcblx0XHR9XG5cblx0XHQvLyBmYWtlIHRoZSBuZXdlciBXM0MgYnVmZmVyZWQgVGltZVJhbmdlIChsb2FkZWQgYW5kIHRvdGFsIGhhdmUgYmVlbiByZW1vdmVkKVxuXHRcdGJ1ZmZlcmVkVGltZSA9IHZhbHVlcy5idWZmZXJlZFRpbWUgfHwgMDtcblxuXHRcdGUudGFyZ2V0LmJ1ZmZlcmVkID0gZS5idWZmZXJlZCA9IHtcblx0XHRcdHN0YXJ0OiBmdW5jdGlvbihpbmRleCkge1xuXHRcdFx0XHRyZXR1cm4gMDtcblx0XHRcdH0sXG5cdFx0XHRlbmQ6IGZ1bmN0aW9uIChpbmRleCkge1xuXHRcdFx0XHRyZXR1cm4gYnVmZmVyZWRUaW1lO1xuXHRcdFx0fSxcblx0XHRcdGxlbmd0aDogMVxuXHRcdH07XG5cblx0XHRwbHVnaW5NZWRpYUVsZW1lbnQuZGlzcGF0Y2hFdmVudChlLnR5cGUsIGUpO1xuXHR9XG59O1xuXG4vKlxuRGVmYXVsdCBvcHRpb25zXG4qL1xubWVqcy5NZWRpYUVsZW1lbnREZWZhdWx0cyA9IHtcblx0Ly8gYWxsb3dzIHRlc3Rpbmcgb24gSFRNTDUsIGZsYXNoLCBzaWx2ZXJsaWdodFxuXHQvLyBhdXRvOiBhdHRlbXB0cyB0byBkZXRlY3Qgd2hhdCB0aGUgYnJvd3NlciBjYW4gZG9cblx0Ly8gYXV0b19wbHVnaW46IHByZWZlciBwbHVnaW5zIGFuZCB0aGVuIGF0dGVtcHQgbmF0aXZlIEhUTUw1XG5cdC8vIG5hdGl2ZTogZm9yY2VzIEhUTUw1IHBsYXliYWNrXG5cdC8vIHNoaW06IGRpc2FsbG93cyBIVE1MNSwgd2lsbCBhdHRlbXB0IGVpdGhlciBGbGFzaCBvciBTaWx2ZXJsaWdodFxuXHQvLyBub25lOiBmb3JjZXMgZmFsbGJhY2sgdmlld1xuXHRtb2RlOiAnYXV0bycsXG5cdC8vIHJlbW92ZSBvciByZW9yZGVyIHRvIGNoYW5nZSBwbHVnaW4gcHJpb3JpdHkgYW5kIGF2YWlsYWJpbGl0eVxuXHRwbHVnaW5zOiBbJ2ZsYXNoJywnc2lsdmVybGlnaHQnLCd5b3V0dWJlJywndmltZW8nXSxcblx0Ly8gc2hvd3MgZGVidWcgZXJyb3JzIG9uIHNjcmVlblxuXHRlbmFibGVQbHVnaW5EZWJ1ZzogZmFsc2UsXG5cdC8vIHVzZSBwbHVnaW4gZm9yIGJyb3dzZXJzIHRoYXQgaGF2ZSB0cm91YmxlIHdpdGggQmFzaWMgQXV0aGVudGljYXRpb24gb24gSFRUUFMgc2l0ZXNcblx0aHR0cHNCYXNpY0F1dGhTaXRlOiBmYWxzZSxcblx0Ly8gb3ZlcnJpZGVzIHRoZSB0eXBlIHNwZWNpZmllZCwgdXNlZnVsIGZvciBkeW5hbWljIGluc3RhbnRpYXRpb25cblx0dHlwZTogJycsXG5cdC8vIHBhdGggdG8gRmxhc2ggYW5kIFNpbHZlcmxpZ2h0IHBsdWdpbnNcblx0cGx1Z2luUGF0aDogbWVqcy5VdGlsaXR5LmdldFNjcmlwdFBhdGgoWydtZWRpYWVsZW1lbnQuanMnLCdtZWRpYWVsZW1lbnQubWluLmpzJywnbWVkaWFlbGVtZW50LWFuZC1wbGF5ZXIuanMnLCdtZWRpYWVsZW1lbnQtYW5kLXBsYXllci5taW4uanMnXSksXG5cdC8vIG5hbWUgb2YgZmxhc2ggZmlsZVxuXHRmbGFzaE5hbWU6ICdmbGFzaG1lZGlhZWxlbWVudC5zd2YnLFxuXHQvLyBzdHJlYW1lciBmb3IgUlRNUCBzdHJlYW1pbmdcblx0Zmxhc2hTdHJlYW1lcjogJycsXG5cdC8vIHR1cm5zIG9uIHRoZSBzbW9vdGhpbmcgZmlsdGVyIGluIEZsYXNoXG5cdGVuYWJsZVBsdWdpblNtb290aGluZzogZmFsc2UsXG5cdC8vIGVuYWJsZWQgcHNldWRvLXN0cmVhbWluZyAoc2Vlaykgb24gLm1wNCBmaWxlc1xuXHRlbmFibGVQc2V1ZG9TdHJlYW1pbmc6IGZhbHNlLFxuXHQvLyBzdGFydCBxdWVyeSBwYXJhbWV0ZXIgc2VudCB0byBzZXJ2ZXIgZm9yIHBzZXVkby1zdHJlYW1pbmdcblx0cHNldWRvU3RyZWFtaW5nU3RhcnRRdWVyeVBhcmFtOiAnc3RhcnQnLFxuXHQvLyBuYW1lIG9mIHNpbHZlcmxpZ2h0IGZpbGVcblx0c2lsdmVybGlnaHROYW1lOiAnc2lsdmVybGlnaHRtZWRpYWVsZW1lbnQueGFwJyxcblx0Ly8gZGVmYXVsdCBpZiB0aGUgPHZpZGVvIHdpZHRoPiBpcyBub3Qgc3BlY2lmaWVkXG5cdGRlZmF1bHRWaWRlb1dpZHRoOiA0ODAsXG5cdC8vIGRlZmF1bHQgaWYgdGhlIDx2aWRlbyBoZWlnaHQ+IGlzIG5vdCBzcGVjaWZpZWRcblx0ZGVmYXVsdFZpZGVvSGVpZ2h0OiAyNzAsXG5cdC8vIG92ZXJyaWRlcyA8dmlkZW8gd2lkdGg+XG5cdHBsdWdpbldpZHRoOiAtMSxcblx0Ly8gb3ZlcnJpZGVzIDx2aWRlbyBoZWlnaHQ+XG5cdHBsdWdpbkhlaWdodDogLTEsXG5cdC8vIGFkZGl0aW9uYWwgcGx1Z2luIHZhcmlhYmxlcyBpbiAna2V5PXZhbHVlJyBmb3JtXG5cdHBsdWdpblZhcnM6IFtdLFx0XG5cdC8vIHJhdGUgaW4gbWlsbGlzZWNvbmRzIGZvciBGbGFzaCBhbmQgU2lsdmVybGlnaHQgdG8gZmlyZSB0aGUgdGltZXVwZGF0ZSBldmVudFxuXHQvLyBsYXJnZXIgbnVtYmVyIGlzIGxlc3MgYWNjdXJhdGUsIGJ1dCBsZXNzIHN0cmFpbiBvbiBwbHVnaW4tPkphdmFTY3JpcHQgYnJpZGdlXG5cdHRpbWVyUmF0ZTogMjUwLFxuXHQvLyBpbml0aWFsIHZvbHVtZSBmb3IgcGxheWVyXG5cdHN0YXJ0Vm9sdW1lOiAwLjgsXG5cdHN1Y2Nlc3M6IGZ1bmN0aW9uICgpIHsgfSxcblx0ZXJyb3I6IGZ1bmN0aW9uICgpIHsgfVxufTtcblxuLypcbkRldGVybWluZXMgaWYgYSBicm93c2VyIHN1cHBvcnRzIHRoZSA8dmlkZW8+IG9yIDxhdWRpbz4gZWxlbWVudFxuYW5kIHJldHVybnMgZWl0aGVyIHRoZSBuYXRpdmUgZWxlbWVudCBvciBhIEZsYXNoL1NpbHZlcmxpZ2h0IHZlcnNpb24gdGhhdFxubWltaWNzIEhUTUw1IE1lZGlhRWxlbWVudFxuKi9cbm1lanMuTWVkaWFFbGVtZW50ID0gZnVuY3Rpb24gKGVsLCBvKSB7XG5cdHJldHVybiBtZWpzLkh0bWxNZWRpYUVsZW1lbnRTaGltLmNyZWF0ZShlbCxvKTtcbn07XG5cbm1lanMuSHRtbE1lZGlhRWxlbWVudFNoaW0gPSB7XG5cblx0Y3JlYXRlOiBmdW5jdGlvbihlbCwgbykge1xuXHRcdHZhclxuXHRcdFx0b3B0aW9ucyA9IG1lanMuTWVkaWFFbGVtZW50RGVmYXVsdHMsXG5cdFx0XHRodG1sTWVkaWFFbGVtZW50ID0gKHR5cGVvZihlbCkgPT0gJ3N0cmluZycpID8gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWwpIDogZWwsXG5cdFx0XHR0YWdOYW1lID0gaHRtbE1lZGlhRWxlbWVudC50YWdOYW1lLnRvTG93ZXJDYXNlKCksXG5cdFx0XHRpc01lZGlhVGFnID0gKHRhZ05hbWUgPT09ICdhdWRpbycgfHwgdGFnTmFtZSA9PT0gJ3ZpZGVvJyksXG5cdFx0XHRzcmMgPSAoaXNNZWRpYVRhZykgPyBodG1sTWVkaWFFbGVtZW50LmdldEF0dHJpYnV0ZSgnc3JjJykgOiBodG1sTWVkaWFFbGVtZW50LmdldEF0dHJpYnV0ZSgnaHJlZicpLFxuXHRcdFx0cG9zdGVyID0gaHRtbE1lZGlhRWxlbWVudC5nZXRBdHRyaWJ1dGUoJ3Bvc3RlcicpLFxuXHRcdFx0YXV0b3BsYXkgPSAgaHRtbE1lZGlhRWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2F1dG9wbGF5JyksXG5cdFx0XHRwcmVsb2FkID0gIGh0bWxNZWRpYUVsZW1lbnQuZ2V0QXR0cmlidXRlKCdwcmVsb2FkJyksXG5cdFx0XHRjb250cm9scyA9ICBodG1sTWVkaWFFbGVtZW50LmdldEF0dHJpYnV0ZSgnY29udHJvbHMnKSxcblx0XHRcdHBsYXliYWNrLFxuXHRcdFx0cHJvcDtcblxuXHRcdC8vIGV4dGVuZCBvcHRpb25zXG5cdFx0Zm9yIChwcm9wIGluIG8pIHtcblx0XHRcdG9wdGlvbnNbcHJvcF0gPSBvW3Byb3BdO1xuXHRcdH1cblxuXHRcdC8vIGNsZWFuIHVwIGF0dHJpYnV0ZXNcblx0XHRzcmMgPSBcdFx0KHR5cGVvZiBzcmMgPT0gJ3VuZGVmaW5lZCcgXHR8fCBzcmMgPT09IG51bGwgfHwgc3JjID09ICcnKSA/IG51bGwgOiBzcmM7XHRcdFxuXHRcdHBvc3RlciA9XHQodHlwZW9mIHBvc3RlciA9PSAndW5kZWZpbmVkJyBcdHx8IHBvc3RlciA9PT0gbnVsbCkgPyAnJyA6IHBvc3Rlcjtcblx0XHRwcmVsb2FkID0gXHQodHlwZW9mIHByZWxvYWQgPT0gJ3VuZGVmaW5lZCcgXHR8fCBwcmVsb2FkID09PSBudWxsIHx8IHByZWxvYWQgPT09ICdmYWxzZScpID8gJ25vbmUnIDogcHJlbG9hZDtcblx0XHRhdXRvcGxheSA9IFx0ISh0eXBlb2YgYXV0b3BsYXkgPT0gJ3VuZGVmaW5lZCcgfHwgYXV0b3BsYXkgPT09IG51bGwgfHwgYXV0b3BsYXkgPT09ICdmYWxzZScpO1xuXHRcdGNvbnRyb2xzID0gXHQhKHR5cGVvZiBjb250cm9scyA9PSAndW5kZWZpbmVkJyB8fCBjb250cm9scyA9PT0gbnVsbCB8fCBjb250cm9scyA9PT0gJ2ZhbHNlJyk7XG5cblx0XHQvLyB0ZXN0IGZvciBIVE1MNSBhbmQgcGx1Z2luIGNhcGFiaWxpdGllc1xuXHRcdHBsYXliYWNrID0gdGhpcy5kZXRlcm1pbmVQbGF5YmFjayhodG1sTWVkaWFFbGVtZW50LCBvcHRpb25zLCBtZWpzLk1lZGlhRmVhdHVyZXMuc3VwcG9ydHNNZWRpYVRhZywgaXNNZWRpYVRhZywgc3JjKTtcblx0XHRwbGF5YmFjay51cmwgPSAocGxheWJhY2sudXJsICE9PSBudWxsKSA/IG1lanMuVXRpbGl0eS5hYnNvbHV0aXplVXJsKHBsYXliYWNrLnVybCkgOiAnJztcblxuXHRcdGlmIChwbGF5YmFjay5tZXRob2QgPT0gJ25hdGl2ZScpIHtcblx0XHRcdC8vIHNlY29uZCBmaXggZm9yIGFuZHJvaWRcblx0XHRcdGlmIChtZWpzLk1lZGlhRmVhdHVyZXMuaXNCdXN0ZWRBbmRyb2lkKSB7XG5cdFx0XHRcdGh0bWxNZWRpYUVsZW1lbnQuc3JjID0gcGxheWJhY2sudXJsO1xuXHRcdFx0XHRodG1sTWVkaWFFbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0aHRtbE1lZGlhRWxlbWVudC5wbGF5KCk7XG5cdFx0XHRcdH0sIGZhbHNlKTtcblx0XHRcdH1cblx0XHRcblx0XHRcdC8vIGFkZCBtZXRob2RzIHRvIG5hdGl2ZSBIVE1MTWVkaWFFbGVtZW50XG5cdFx0XHRyZXR1cm4gdGhpcy51cGRhdGVOYXRpdmUocGxheWJhY2ssIG9wdGlvbnMsIGF1dG9wbGF5LCBwcmVsb2FkKTtcblx0XHR9IGVsc2UgaWYgKHBsYXliYWNrLm1ldGhvZCAhPT0gJycpIHtcblx0XHRcdC8vIGNyZWF0ZSBwbHVnaW4gdG8gbWltaWMgSFRNTE1lZGlhRWxlbWVudFxuXHRcdFx0XG5cdFx0XHRyZXR1cm4gdGhpcy5jcmVhdGVQbHVnaW4oIHBsYXliYWNrLCAgb3B0aW9ucywgcG9zdGVyLCBhdXRvcGxheSwgcHJlbG9hZCwgY29udHJvbHMpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBib28sIG5vIEhUTUw1LCBubyBGbGFzaCwgbm8gU2lsdmVybGlnaHQuXG5cdFx0XHR0aGlzLmNyZWF0ZUVycm9yTWVzc2FnZSggcGxheWJhY2ssIG9wdGlvbnMsIHBvc3RlciApO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9XG5cdH0sXG5cdFxuXHRkZXRlcm1pbmVQbGF5YmFjazogZnVuY3Rpb24oaHRtbE1lZGlhRWxlbWVudCwgb3B0aW9ucywgc3VwcG9ydHNNZWRpYVRhZywgaXNNZWRpYVRhZywgc3JjKSB7XG5cdFx0dmFyXG5cdFx0XHRtZWRpYUZpbGVzID0gW10sXG5cdFx0XHRpLFxuXHRcdFx0aixcblx0XHRcdGssXG5cdFx0XHRsLFxuXHRcdFx0bixcblx0XHRcdHR5cGUsXG5cdFx0XHRyZXN1bHQgPSB7IG1ldGhvZDogJycsIHVybDogJycsIGh0bWxNZWRpYUVsZW1lbnQ6IGh0bWxNZWRpYUVsZW1lbnQsIGlzVmlkZW86IChodG1sTWVkaWFFbGVtZW50LnRhZ05hbWUudG9Mb3dlckNhc2UoKSAhPSAnYXVkaW8nKX0sXG5cdFx0XHRwbHVnaW5OYW1lLFxuXHRcdFx0cGx1Z2luVmVyc2lvbnMsXG5cdFx0XHRwbHVnaW5JbmZvLFxuXHRcdFx0ZHVtbXksXG5cdFx0XHRtZWRpYTtcblx0XHRcdFxuXHRcdC8vIFNURVAgMTogR2V0IFVSTCBhbmQgdHlwZSBmcm9tIDx2aWRlbyBzcmM+IG9yIDxzb3VyY2Ugc3JjPlxuXG5cdFx0Ly8gc3VwcGxpZWQgdHlwZSBvdmVycmlkZXMgPHZpZGVvIHR5cGU+IGFuZCA8c291cmNlIHR5cGU+XG5cdFx0aWYgKHR5cGVvZiBvcHRpb25zLnR5cGUgIT0gJ3VuZGVmaW5lZCcgJiYgb3B0aW9ucy50eXBlICE9PSAnJykge1xuXHRcdFx0XG5cdFx0XHQvLyBhY2NlcHQgZWl0aGVyIHN0cmluZyBvciBhcnJheSBvZiB0eXBlc1xuXHRcdFx0aWYgKHR5cGVvZiBvcHRpb25zLnR5cGUgPT0gJ3N0cmluZycpIHtcblx0XHRcdFx0bWVkaWFGaWxlcy5wdXNoKHt0eXBlOm9wdGlvbnMudHlwZSwgdXJsOnNyY30pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XG5cdFx0XHRcdGZvciAoaT0wOyBpPG9wdGlvbnMudHlwZS5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdG1lZGlhRmlsZXMucHVzaCh7dHlwZTpvcHRpb25zLnR5cGVbaV0sIHVybDpzcmN9KTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0Ly8gdGVzdCBmb3Igc3JjIGF0dHJpYnV0ZSBmaXJzdFxuXHRcdH0gZWxzZSBpZiAoc3JjICE9PSBudWxsKSB7XG5cdFx0XHR0eXBlID0gdGhpcy5mb3JtYXRUeXBlKHNyYywgaHRtbE1lZGlhRWxlbWVudC5nZXRBdHRyaWJ1dGUoJ3R5cGUnKSk7XG5cdFx0XHRtZWRpYUZpbGVzLnB1c2goe3R5cGU6dHlwZSwgdXJsOnNyY30pO1xuXG5cdFx0Ly8gdGhlbiB0ZXN0IGZvciA8c291cmNlPiBlbGVtZW50c1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyB0ZXN0IDxzb3VyY2U+IHR5cGVzIHRvIHNlZSBpZiB0aGV5IGFyZSB1c2FibGVcblx0XHRcdGZvciAoaSA9IDA7IGkgPCBodG1sTWVkaWFFbGVtZW50LmNoaWxkTm9kZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0biA9IGh0bWxNZWRpYUVsZW1lbnQuY2hpbGROb2Rlc1tpXTtcblx0XHRcdFx0aWYgKG4ubm9kZVR5cGUgPT0gMSAmJiBuLnRhZ05hbWUudG9Mb3dlckNhc2UoKSA9PSAnc291cmNlJykge1xuXHRcdFx0XHRcdHNyYyA9IG4uZ2V0QXR0cmlidXRlKCdzcmMnKTtcblx0XHRcdFx0XHR0eXBlID0gdGhpcy5mb3JtYXRUeXBlKHNyYywgbi5nZXRBdHRyaWJ1dGUoJ3R5cGUnKSk7XG5cdFx0XHRcdFx0bWVkaWEgPSBuLmdldEF0dHJpYnV0ZSgnbWVkaWEnKTtcblxuXHRcdFx0XHRcdGlmICghbWVkaWEgfHwgIXdpbmRvdy5tYXRjaE1lZGlhIHx8ICh3aW5kb3cubWF0Y2hNZWRpYSAmJiB3aW5kb3cubWF0Y2hNZWRpYShtZWRpYSkubWF0Y2hlcykpIHtcblx0XHRcdFx0XHRcdG1lZGlhRmlsZXMucHVzaCh7dHlwZTp0eXBlLCB1cmw6c3JjfSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHRcdFxuXHRcdC8vIGluIHRoZSBjYXNlIG9mIGR5bmFtaWNseSBjcmVhdGVkIHBsYXllcnNcblx0XHQvLyBjaGVjayBmb3IgYXVkaW8gdHlwZXNcblx0XHRpZiAoIWlzTWVkaWFUYWcgJiYgbWVkaWFGaWxlcy5sZW5ndGggPiAwICYmIG1lZGlhRmlsZXNbMF0udXJsICE9PSBudWxsICYmIHRoaXMuZ2V0VHlwZUZyb21GaWxlKG1lZGlhRmlsZXNbMF0udXJsKS5pbmRleE9mKCdhdWRpbycpID4gLTEpIHtcblx0XHRcdHJlc3VsdC5pc1ZpZGVvID0gZmFsc2U7XG5cdFx0fVxuXHRcdFxuXG5cdFx0Ly8gU1RFUCAyOiBUZXN0IGZvciBwbGF5YmFjayBtZXRob2Rcblx0XHRcblx0XHQvLyBzcGVjaWFsIGNhc2UgZm9yIEFuZHJvaWQgd2hpY2ggc2FkbHkgZG9lc24ndCBpbXBsZW1lbnQgdGhlIGNhblBsYXlUeXBlIGZ1bmN0aW9uIChhbHdheXMgcmV0dXJucyAnJylcblx0XHRpZiAobWVqcy5NZWRpYUZlYXR1cmVzLmlzQnVzdGVkQW5kcm9pZCkge1xuXHRcdFx0aHRtbE1lZGlhRWxlbWVudC5jYW5QbGF5VHlwZSA9IGZ1bmN0aW9uKHR5cGUpIHtcblx0XHRcdFx0cmV0dXJuICh0eXBlLm1hdGNoKC92aWRlb1xcLyhtcDR8bTR2KS9naSkgIT09IG51bGwpID8gJ21heWJlJyA6ICcnO1xuXHRcdFx0fTtcblx0XHR9XHRcdFxuXHRcdFxuXHRcdC8vIHNwZWNpYWwgY2FzZSBmb3IgQ2hyb21pdW0gdG8gc3BlY2lmeSBuYXRpdmVseSBzdXBwb3J0ZWQgdmlkZW8gY29kZWNzIChpLmUuIFdlYk0gYW5kIFRoZW9yYSkgXG5cdFx0aWYgKG1lanMuTWVkaWFGZWF0dXJlcy5pc0Nocm9taXVtKSB7IFxuXHRcdFx0aHRtbE1lZGlhRWxlbWVudC5jYW5QbGF5VHlwZSA9IGZ1bmN0aW9uKHR5cGUpIHsgXG5cdFx0XHRcdHJldHVybiAodHlwZS5tYXRjaCgvdmlkZW9cXC8od2VibXxvZ3Z8b2dnKS9naSkgIT09IG51bGwpID8gJ21heWJlJyA6ICcnOyBcblx0XHRcdH07IFxuXHRcdH1cblxuXHRcdC8vIHRlc3QgZm9yIG5hdGl2ZSBwbGF5YmFjayBmaXJzdFxuXHRcdGlmIChzdXBwb3J0c01lZGlhVGFnICYmIChvcHRpb25zLm1vZGUgPT09ICdhdXRvJyB8fCBvcHRpb25zLm1vZGUgPT09ICdhdXRvX3BsdWdpbicgfHwgb3B0aW9ucy5tb2RlID09PSAnbmF0aXZlJykgICYmICEobWVqcy5NZWRpYUZlYXR1cmVzLmlzQnVzdGVkTmF0aXZlSFRUUFMgJiYgb3B0aW9ucy5odHRwc0Jhc2ljQXV0aFNpdGUgPT09IHRydWUpKSB7XG5cdFx0XHRcdFx0XHRcblx0XHRcdGlmICghaXNNZWRpYVRhZykge1xuXG5cdFx0XHRcdC8vIGNyZWF0ZSBhIHJlYWwgSFRNTDUgTWVkaWEgRWxlbWVudCBcblx0XHRcdFx0ZHVtbXkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCByZXN1bHQuaXNWaWRlbyA/ICd2aWRlbycgOiAnYXVkaW8nKTtcdFx0XHRcblx0XHRcdFx0aHRtbE1lZGlhRWxlbWVudC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShkdW1teSwgaHRtbE1lZGlhRWxlbWVudCk7XG5cdFx0XHRcdGh0bWxNZWRpYUVsZW1lbnQuc3R5bGUuZGlzcGxheSA9ICdub25lJztcblx0XHRcdFx0XG5cdFx0XHRcdC8vIHVzZSB0aGlzIG9uZSBmcm9tIG5vdyBvblxuXHRcdFx0XHRyZXN1bHQuaHRtbE1lZGlhRWxlbWVudCA9IGh0bWxNZWRpYUVsZW1lbnQgPSBkdW1teTtcblx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRmb3IgKGk9MDsgaTxtZWRpYUZpbGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdC8vIG5vcm1hbCBjaGVja1xuXHRcdFx0XHRpZiAobWVkaWFGaWxlc1tpXS50eXBlID09IFwidmlkZW8vbTN1OFwiIHx8IGh0bWxNZWRpYUVsZW1lbnQuY2FuUGxheVR5cGUobWVkaWFGaWxlc1tpXS50eXBlKS5yZXBsYWNlKC9uby8sICcnKSAhPT0gJydcblx0XHRcdFx0XHQvLyBzcGVjaWFsIGNhc2UgZm9yIE1hYy9TYWZhcmkgNS4wLjMgd2hpY2ggYW5zd2VycyAnJyB0byBjYW5QbGF5VHlwZSgnYXVkaW8vbXAzJykgYnV0ICdtYXliZScgdG8gY2FuUGxheVR5cGUoJ2F1ZGlvL21wZWcnKVxuXHRcdFx0XHRcdHx8IGh0bWxNZWRpYUVsZW1lbnQuY2FuUGxheVR5cGUobWVkaWFGaWxlc1tpXS50eXBlLnJlcGxhY2UoL21wMy8sJ21wZWcnKSkucmVwbGFjZSgvbm8vLCAnJykgIT09ICcnXG5cdFx0XHRcdFx0Ly8gc3BlY2lhbCBjYXNlIGZvciBtNGEgc3VwcG9ydGVkIGJ5IGRldGVjdGluZyBtcDQgc3VwcG9ydFxuXHRcdFx0XHRcdHx8IGh0bWxNZWRpYUVsZW1lbnQuY2FuUGxheVR5cGUobWVkaWFGaWxlc1tpXS50eXBlLnJlcGxhY2UoL200YS8sJ21wNCcpKS5yZXBsYWNlKC9uby8sICcnKSAhPT0gJycpIHtcblx0XHRcdFx0XHRyZXN1bHQubWV0aG9kID0gJ25hdGl2ZSc7XG5cdFx0XHRcdFx0cmVzdWx0LnVybCA9IG1lZGlhRmlsZXNbaV0udXJsO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XHRcdFx0XG5cdFx0XHRcblx0XHRcdGlmIChyZXN1bHQubWV0aG9kID09PSAnbmF0aXZlJykge1xuXHRcdFx0XHRpZiAocmVzdWx0LnVybCAhPT0gbnVsbCkge1xuXHRcdFx0XHRcdGh0bWxNZWRpYUVsZW1lbnQuc3JjID0gcmVzdWx0LnVybDtcblx0XHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRcdC8vIGlmIGBhdXRvX3BsdWdpbmAgbW9kZSwgdGhlbiBjYWNoZSB0aGUgbmF0aXZlIHJlc3VsdCBidXQgdHJ5IHBsdWdpbnMuXG5cdFx0XHRcdGlmIChvcHRpb25zLm1vZGUgIT09ICdhdXRvX3BsdWdpbicpIHtcblx0XHRcdFx0XHRyZXR1cm4gcmVzdWx0O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gaWYgbmF0aXZlIHBsYXliYWNrIGRpZG4ndCB3b3JrLCB0aGVuIHRlc3QgcGx1Z2luc1xuXHRcdGlmIChvcHRpb25zLm1vZGUgPT09ICdhdXRvJyB8fCBvcHRpb25zLm1vZGUgPT09ICdhdXRvX3BsdWdpbicgfHwgb3B0aW9ucy5tb2RlID09PSAnc2hpbScpIHtcblx0XHRcdGZvciAoaT0wOyBpPG1lZGlhRmlsZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0dHlwZSA9IG1lZGlhRmlsZXNbaV0udHlwZTtcblxuXHRcdFx0XHQvLyB0ZXN0IGFsbCBwbHVnaW5zIGluIG9yZGVyIG9mIHByZWZlcmVuY2UgW3NpbHZlcmxpZ2h0LCBmbGFzaF1cblx0XHRcdFx0Zm9yIChqPTA7IGo8b3B0aW9ucy5wbHVnaW5zLmxlbmd0aDsgaisrKSB7XG5cblx0XHRcdFx0XHRwbHVnaW5OYW1lID0gb3B0aW9ucy5wbHVnaW5zW2pdO1xuXHRcdFx0XG5cdFx0XHRcdFx0Ly8gdGVzdCB2ZXJzaW9uIG9mIHBsdWdpbiAoZm9yIGZ1dHVyZSBmZWF0dXJlcylcblx0XHRcdFx0XHRwbHVnaW5WZXJzaW9ucyA9IG1lanMucGx1Z2luc1twbHVnaW5OYW1lXTtcdFx0XHRcdFxuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGZvciAoaz0wOyBrPHBsdWdpblZlcnNpb25zLmxlbmd0aDsgaysrKSB7XG5cdFx0XHRcdFx0XHRwbHVnaW5JbmZvID0gcGx1Z2luVmVyc2lvbnNba107XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHQvLyB0ZXN0IGlmIHVzZXIgaGFzIHRoZSBjb3JyZWN0IHBsdWdpbiB2ZXJzaW9uXG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdC8vIGZvciB5b3V0dWJlL3ZpbWVvXG5cdFx0XHRcdFx0XHRpZiAocGx1Z2luSW5mby52ZXJzaW9uID09IG51bGwgfHwgXG5cdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0XHRtZWpzLlBsdWdpbkRldGVjdG9yLmhhc1BsdWdpblZlcnNpb24ocGx1Z2luTmFtZSwgcGx1Z2luSW5mby52ZXJzaW9uKSkge1xuXG5cdFx0XHRcdFx0XHRcdC8vIHRlc3QgZm9yIHBsdWdpbiBwbGF5YmFjayB0eXBlc1xuXHRcdFx0XHRcdFx0XHRmb3IgKGw9MDsgbDxwbHVnaW5JbmZvLnR5cGVzLmxlbmd0aDsgbCsrKSB7XG5cdFx0XHRcdFx0XHRcdFx0Ly8gZmluZCBwbHVnaW4gdGhhdCBjYW4gcGxheSB0aGUgdHlwZVxuXHRcdFx0XHRcdFx0XHRcdGlmICh0eXBlID09IHBsdWdpbkluZm8udHlwZXNbbF0pIHtcblx0XHRcdFx0XHRcdFx0XHRcdHJlc3VsdC5tZXRob2QgPSBwbHVnaW5OYW1lO1xuXHRcdFx0XHRcdFx0XHRcdFx0cmVzdWx0LnVybCA9IG1lZGlhRmlsZXNbaV0udXJsO1xuXHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0Ly8gYXQgdGhpcyBwb2ludCwgYmVpbmcgaW4gJ2F1dG9fcGx1Z2luJyBtb2RlIGltcGxpZXMgdGhhdCB3ZSB0cmllZCBwbHVnaW5zIGJ1dCBmYWlsZWQuXG5cdFx0Ly8gaWYgd2UgaGF2ZSBuYXRpdmUgc3VwcG9ydCB0aGVuIHJldHVybiB0aGF0LlxuXHRcdGlmIChvcHRpb25zLm1vZGUgPT09ICdhdXRvX3BsdWdpbicgJiYgcmVzdWx0Lm1ldGhvZCA9PT0gJ25hdGl2ZScpIHtcblx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0fVxuXG5cdFx0Ly8gd2hhdCBpZiB0aGVyZSdzIG5vdGhpbmcgdG8gcGxheT8ganVzdCBncmFiIHRoZSBmaXJzdCBhdmFpbGFibGVcblx0XHRpZiAocmVzdWx0Lm1ldGhvZCA9PT0gJycgJiYgbWVkaWFGaWxlcy5sZW5ndGggPiAwKSB7XG5cdFx0XHRyZXN1bHQudXJsID0gbWVkaWFGaWxlc1swXS51cmw7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fSxcblxuXHRmb3JtYXRUeXBlOiBmdW5jdGlvbih1cmwsIHR5cGUpIHtcblx0XHR2YXIgZXh0O1xuXG5cdFx0Ly8gaWYgbm8gdHlwZSBpcyBzdXBwbGllZCwgZmFrZSBpdCB3aXRoIHRoZSBleHRlbnNpb25cblx0XHRpZiAodXJsICYmICF0eXBlKSB7XHRcdFxuXHRcdFx0cmV0dXJuIHRoaXMuZ2V0VHlwZUZyb21GaWxlKHVybCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIG9ubHkgcmV0dXJuIHRoZSBtaW1lIHBhcnQgb2YgdGhlIHR5cGUgaW4gY2FzZSB0aGUgYXR0cmlidXRlIGNvbnRhaW5zIHRoZSBjb2RlY1xuXHRcdFx0Ly8gc2VlIGh0dHA6Ly93d3cud2hhdHdnLm9yZy9zcGVjcy93ZWItYXBwcy9jdXJyZW50LXdvcmsvbXVsdGlwYWdlL3ZpZGVvLmh0bWwjdGhlLXNvdXJjZS1lbGVtZW50XG5cdFx0XHQvLyBgdmlkZW8vbXA0OyBjb2RlY3M9XCJhdmMxLjQyRTAxRSwgbXA0YS40MC4yXCJgIGJlY29tZXMgYHZpZGVvL21wNGBcblx0XHRcdFxuXHRcdFx0aWYgKHR5cGUgJiYgfnR5cGUuaW5kZXhPZignOycpKSB7XG5cdFx0XHRcdHJldHVybiB0eXBlLnN1YnN0cigwLCB0eXBlLmluZGV4T2YoJzsnKSk7IFxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmV0dXJuIHR5cGU7XG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuXHRcblx0Z2V0VHlwZUZyb21GaWxlOiBmdW5jdGlvbih1cmwpIHtcblx0XHR1cmwgPSB1cmwuc3BsaXQoJz8nKVswXTtcblx0XHR2YXIgZXh0ID0gdXJsLnN1YnN0cmluZyh1cmwubGFzdEluZGV4T2YoJy4nKSArIDEpLnRvTG93ZXJDYXNlKCk7XG5cdFx0cmV0dXJuICgvKG1wNHxtNHZ8b2dnfG9ndnxtM3U4fHdlYm18d2VibXZ8Zmx2fHdtdnxtcGVnfG1vdikvZ2kudGVzdChleHQpID8gJ3ZpZGVvJyA6ICdhdWRpbycpICsgJy8nICsgdGhpcy5nZXRUeXBlRnJvbUV4dGVuc2lvbihleHQpO1xuXHR9LFxuXHRcblx0Z2V0VHlwZUZyb21FeHRlbnNpb246IGZ1bmN0aW9uKGV4dCkge1xuXHRcdFxuXHRcdHN3aXRjaCAoZXh0KSB7XG5cdFx0XHRjYXNlICdtcDQnOlxuXHRcdFx0Y2FzZSAnbTR2Jzpcblx0XHRcdGNhc2UgJ200YSc6XG5cdFx0XHRcdHJldHVybiAnbXA0Jztcblx0XHRcdGNhc2UgJ3dlYm0nOlxuXHRcdFx0Y2FzZSAnd2VibWEnOlxuXHRcdFx0Y2FzZSAnd2VibXYnOlx0XG5cdFx0XHRcdHJldHVybiAnd2VibSc7XG5cdFx0XHRjYXNlICdvZ2cnOlxuXHRcdFx0Y2FzZSAnb2dhJzpcblx0XHRcdGNhc2UgJ29ndic6XHRcblx0XHRcdFx0cmV0dXJuICdvZ2cnO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0cmV0dXJuIGV4dDtcblx0XHR9XG5cdH0sXG5cblx0Y3JlYXRlRXJyb3JNZXNzYWdlOiBmdW5jdGlvbihwbGF5YmFjaywgb3B0aW9ucywgcG9zdGVyKSB7XG5cdFx0dmFyIFxuXHRcdFx0aHRtbE1lZGlhRWxlbWVudCA9IHBsYXliYWNrLmh0bWxNZWRpYUVsZW1lbnQsXG5cdFx0XHRlcnJvckNvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdFx0XG5cdFx0ZXJyb3JDb250YWluZXIuY2xhc3NOYW1lID0gJ21lLWNhbm5vdHBsYXknO1xuXG5cdFx0dHJ5IHtcblx0XHRcdGVycm9yQ29udGFpbmVyLnN0eWxlLndpZHRoID0gaHRtbE1lZGlhRWxlbWVudC53aWR0aCArICdweCc7XG5cdFx0XHRlcnJvckNvbnRhaW5lci5zdHlsZS5oZWlnaHQgPSBodG1sTWVkaWFFbGVtZW50LmhlaWdodCArICdweCc7XG5cdFx0fSBjYXRjaCAoZSkge31cblxuICAgIGlmIChvcHRpb25zLmN1c3RvbUVycm9yKSB7XG4gICAgICBlcnJvckNvbnRhaW5lci5pbm5lckhUTUwgPSBvcHRpb25zLmN1c3RvbUVycm9yO1xuICAgIH0gZWxzZSB7XG4gICAgICBlcnJvckNvbnRhaW5lci5pbm5lckhUTUwgPSAocG9zdGVyICE9PSAnJykgP1xuICAgICAgICAnPGEgaHJlZj1cIicgKyBwbGF5YmFjay51cmwgKyAnXCI+PGltZyBzcmM9XCInICsgcG9zdGVyICsgJ1wiIHdpZHRoPVwiMTAwJVwiIGhlaWdodD1cIjEwMCVcIiAvPjwvYT4nIDpcbiAgICAgICAgJzxhIGhyZWY9XCInICsgcGxheWJhY2sudXJsICsgJ1wiPjxzcGFuPicgKyBtZWpzLmkxOG4udCgnRG93bmxvYWQgRmlsZScpICsgJzwvc3Bhbj48L2E+JztcbiAgICB9XG5cblx0XHRodG1sTWVkaWFFbGVtZW50LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGVycm9yQ29udGFpbmVyLCBodG1sTWVkaWFFbGVtZW50KTtcblx0XHRodG1sTWVkaWFFbGVtZW50LnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG5cblx0XHRvcHRpb25zLmVycm9yKGh0bWxNZWRpYUVsZW1lbnQpO1xuXHR9LFxuXG5cdGNyZWF0ZVBsdWdpbjpmdW5jdGlvbihwbGF5YmFjaywgb3B0aW9ucywgcG9zdGVyLCBhdXRvcGxheSwgcHJlbG9hZCwgY29udHJvbHMpIHtcblx0XHR2YXIgXG5cdFx0XHRodG1sTWVkaWFFbGVtZW50ID0gcGxheWJhY2suaHRtbE1lZGlhRWxlbWVudCxcblx0XHRcdHdpZHRoID0gMSxcblx0XHRcdGhlaWdodCA9IDEsXG5cdFx0XHRwbHVnaW5pZCA9ICdtZV8nICsgcGxheWJhY2subWV0aG9kICsgJ18nICsgKG1lanMubWVJbmRleCsrKSxcblx0XHRcdHBsdWdpbk1lZGlhRWxlbWVudCA9IG5ldyBtZWpzLlBsdWdpbk1lZGlhRWxlbWVudChwbHVnaW5pZCwgcGxheWJhY2subWV0aG9kLCBwbGF5YmFjay51cmwpLFxuXHRcdFx0Y29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JyksXG5cdFx0XHRzcGVjaWFsSUVDb250YWluZXIsXG5cdFx0XHRub2RlLFxuXHRcdFx0aW5pdFZhcnM7XG5cblx0XHQvLyBjb3B5IHRhZ05hbWUgZnJvbSBodG1sIG1lZGlhIGVsZW1lbnRcblx0XHRwbHVnaW5NZWRpYUVsZW1lbnQudGFnTmFtZSA9IGh0bWxNZWRpYUVsZW1lbnQudGFnTmFtZVxuXG5cdFx0Ly8gY29weSBhdHRyaWJ1dGVzIGZyb20gaHRtbCBtZWRpYSBlbGVtZW50IHRvIHBsdWdpbiBtZWRpYSBlbGVtZW50XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBodG1sTWVkaWFFbGVtZW50LmF0dHJpYnV0ZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBhdHRyaWJ1dGUgPSBodG1sTWVkaWFFbGVtZW50LmF0dHJpYnV0ZXNbaV07XG5cdFx0XHRpZiAoYXR0cmlidXRlLnNwZWNpZmllZCA9PSB0cnVlKSB7XG5cdFx0XHRcdHBsdWdpbk1lZGlhRWxlbWVudC5zZXRBdHRyaWJ1dGUoYXR0cmlidXRlLm5hbWUsIGF0dHJpYnV0ZS52YWx1ZSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gY2hlY2sgZm9yIHBsYWNlbWVudCBpbnNpZGUgYSA8cD4gdGFnIChzb21ldGltZXMgV1lTSVdZRyBlZGl0b3JzIGRvIHRoaXMpXG5cdFx0bm9kZSA9IGh0bWxNZWRpYUVsZW1lbnQucGFyZW50Tm9kZTtcblx0XHR3aGlsZSAobm9kZSAhPT0gbnVsbCAmJiBub2RlLnRhZ05hbWUudG9Mb3dlckNhc2UoKSAhPT0gJ2JvZHknICYmIG5vZGUucGFyZW50Tm9kZSAhPSBudWxsKSB7XG5cdFx0XHRpZiAobm9kZS5wYXJlbnROb2RlLnRhZ05hbWUudG9Mb3dlckNhc2UoKSA9PT0gJ3AnKSB7XG5cdFx0XHRcdG5vZGUucGFyZW50Tm9kZS5wYXJlbnROb2RlLmluc2VydEJlZm9yZShub2RlLCBub2RlLnBhcmVudE5vZGUpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHRcdG5vZGUgPSBub2RlLnBhcmVudE5vZGU7XG5cdFx0fVxuXG5cdFx0aWYgKHBsYXliYWNrLmlzVmlkZW8pIHtcblx0XHRcdHdpZHRoID0gKG9wdGlvbnMucGx1Z2luV2lkdGggPiAwKSA/IG9wdGlvbnMucGx1Z2luV2lkdGggOiAob3B0aW9ucy52aWRlb1dpZHRoID4gMCkgPyBvcHRpb25zLnZpZGVvV2lkdGggOiAoaHRtbE1lZGlhRWxlbWVudC5nZXRBdHRyaWJ1dGUoJ3dpZHRoJykgIT09IG51bGwpID8gaHRtbE1lZGlhRWxlbWVudC5nZXRBdHRyaWJ1dGUoJ3dpZHRoJykgOiBvcHRpb25zLmRlZmF1bHRWaWRlb1dpZHRoO1xuXHRcdFx0aGVpZ2h0ID0gKG9wdGlvbnMucGx1Z2luSGVpZ2h0ID4gMCkgPyBvcHRpb25zLnBsdWdpbkhlaWdodCA6IChvcHRpb25zLnZpZGVvSGVpZ2h0ID4gMCkgPyBvcHRpb25zLnZpZGVvSGVpZ2h0IDogKGh0bWxNZWRpYUVsZW1lbnQuZ2V0QXR0cmlidXRlKCdoZWlnaHQnKSAhPT0gbnVsbCkgPyBodG1sTWVkaWFFbGVtZW50LmdldEF0dHJpYnV0ZSgnaGVpZ2h0JykgOiBvcHRpb25zLmRlZmF1bHRWaWRlb0hlaWdodDtcblx0XHRcblx0XHRcdC8vIGluIGNhc2Ugb2YgJyUnIG1ha2Ugc3VyZSBpdCdzIGVuY29kZWRcblx0XHRcdHdpZHRoID0gbWVqcy5VdGlsaXR5LmVuY29kZVVybCh3aWR0aCk7XG5cdFx0XHRoZWlnaHQgPSBtZWpzLlV0aWxpdHkuZW5jb2RlVXJsKGhlaWdodCk7XG5cdFx0XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlmIChvcHRpb25zLmVuYWJsZVBsdWdpbkRlYnVnKSB7XG5cdFx0XHRcdHdpZHRoID0gMzIwO1xuXHRcdFx0XHRoZWlnaHQgPSAyNDA7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gcmVnaXN0ZXIgcGx1Z2luXG5cdFx0cGx1Z2luTWVkaWFFbGVtZW50LnN1Y2Nlc3MgPSBvcHRpb25zLnN1Y2Nlc3M7XG5cdFx0bWVqcy5NZWRpYVBsdWdpbkJyaWRnZS5yZWdpc3RlclBsdWdpbkVsZW1lbnQocGx1Z2luaWQsIHBsdWdpbk1lZGlhRWxlbWVudCwgaHRtbE1lZGlhRWxlbWVudCk7XG5cblx0XHQvLyBhZGQgY29udGFpbmVyIChtdXN0IGJlIGFkZGVkIHRvIERPTSBiZWZvcmUgaW5zZXJ0aW5nIEhUTUwgZm9yIElFKVxuXHRcdGNvbnRhaW5lci5jbGFzc05hbWUgPSAnbWUtcGx1Z2luJztcblx0XHRjb250YWluZXIuaWQgPSBwbHVnaW5pZCArICdfY29udGFpbmVyJztcblx0XHRcblx0XHRpZiAocGxheWJhY2suaXNWaWRlbykge1xuXHRcdFx0XHRodG1sTWVkaWFFbGVtZW50LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGNvbnRhaW5lciwgaHRtbE1lZGlhRWxlbWVudCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdFx0ZG9jdW1lbnQuYm9keS5pbnNlcnRCZWZvcmUoY29udGFpbmVyLCBkb2N1bWVudC5ib2R5LmNoaWxkTm9kZXNbMF0pO1xuXHRcdH1cblxuXHRcdC8vIGZsYXNoL3NpbHZlcmxpZ2h0IHZhcnNcblx0XHRpbml0VmFycyA9IFtcblx0XHRcdCdpZD0nICsgcGx1Z2luaWQsXG5cdFx0XHQnanNpbml0ZnVuY3Rpb249JyArIFwibWVqcy5NZWRpYVBsdWdpbkJyaWRnZS5pbml0UGx1Z2luXCIsXG5cdFx0XHQnanNjYWxsYmFja2Z1bmN0aW9uPScgKyBcIm1lanMuTWVkaWFQbHVnaW5CcmlkZ2UuZmlyZUV2ZW50XCIsXG5cdFx0XHQnaXN2aWRlbz0nICsgKChwbGF5YmFjay5pc1ZpZGVvKSA/IFwidHJ1ZVwiIDogXCJmYWxzZVwiKSxcblx0XHRcdCdhdXRvcGxheT0nICsgKChhdXRvcGxheSkgPyBcInRydWVcIiA6IFwiZmFsc2VcIiksXG5cdFx0XHQncHJlbG9hZD0nICsgcHJlbG9hZCxcblx0XHRcdCd3aWR0aD0nICsgd2lkdGgsXG5cdFx0XHQnc3RhcnR2b2x1bWU9JyArIG9wdGlvbnMuc3RhcnRWb2x1bWUsXG5cdFx0XHQndGltZXJyYXRlPScgKyBvcHRpb25zLnRpbWVyUmF0ZSxcblx0XHRcdCdmbGFzaHN0cmVhbWVyPScgKyBvcHRpb25zLmZsYXNoU3RyZWFtZXIsXG5cdFx0XHQnaGVpZ2h0PScgKyBoZWlnaHQsXG5cdFx0XHQncHNldWRvc3RyZWFtc3RhcnQ9JyArIG9wdGlvbnMucHNldWRvU3RyZWFtaW5nU3RhcnRRdWVyeVBhcmFtXTtcblxuXHRcdGlmIChwbGF5YmFjay51cmwgIT09IG51bGwpIHtcblx0XHRcdGlmIChwbGF5YmFjay5tZXRob2QgPT0gJ2ZsYXNoJykge1xuXHRcdFx0XHRpbml0VmFycy5wdXNoKCdmaWxlPScgKyBtZWpzLlV0aWxpdHkuZW5jb2RlVXJsKHBsYXliYWNrLnVybCkpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aW5pdFZhcnMucHVzaCgnZmlsZT0nICsgcGxheWJhY2sudXJsKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKG9wdGlvbnMuZW5hYmxlUGx1Z2luRGVidWcpIHtcblx0XHRcdGluaXRWYXJzLnB1c2goJ2RlYnVnPXRydWUnKTtcblx0XHR9XG5cdFx0aWYgKG9wdGlvbnMuZW5hYmxlUGx1Z2luU21vb3RoaW5nKSB7XG5cdFx0XHRpbml0VmFycy5wdXNoKCdzbW9vdGhpbmc9dHJ1ZScpO1xuXHRcdH1cbiAgICBpZiAob3B0aW9ucy5lbmFibGVQc2V1ZG9TdHJlYW1pbmcpIHtcbiAgICAgIGluaXRWYXJzLnB1c2goJ3BzZXVkb3N0cmVhbWluZz10cnVlJyk7XG4gICAgfVxuXHRcdGlmIChjb250cm9scykge1xuXHRcdFx0aW5pdFZhcnMucHVzaCgnY29udHJvbHM9dHJ1ZScpOyAvLyBzaG93cyBjb250cm9scyBpbiB0aGUgcGx1Z2luIGlmIGRlc2lyZWRcblx0XHR9XG5cdFx0aWYgKG9wdGlvbnMucGx1Z2luVmFycykge1xuXHRcdFx0aW5pdFZhcnMgPSBpbml0VmFycy5jb25jYXQob3B0aW9ucy5wbHVnaW5WYXJzKTtcblx0XHR9XHRcdFxuXG5cdFx0c3dpdGNoIChwbGF5YmFjay5tZXRob2QpIHtcblx0XHRcdGNhc2UgJ3NpbHZlcmxpZ2h0Jzpcblx0XHRcdFx0Y29udGFpbmVyLmlubmVySFRNTCA9XG4nPG9iamVjdCBkYXRhPVwiZGF0YTphcHBsaWNhdGlvbi94LXNpbHZlcmxpZ2h0LTIsXCIgdHlwZT1cImFwcGxpY2F0aW9uL3gtc2lsdmVybGlnaHQtMlwiIGlkPVwiJyArIHBsdWdpbmlkICsgJ1wiIG5hbWU9XCInICsgcGx1Z2luaWQgKyAnXCIgd2lkdGg9XCInICsgd2lkdGggKyAnXCIgaGVpZ2h0PVwiJyArIGhlaWdodCArICdcIiBjbGFzcz1cIm1lanMtc2hpbVwiPicgK1xuJzxwYXJhbSBuYW1lPVwiaW5pdFBhcmFtc1wiIHZhbHVlPVwiJyArIGluaXRWYXJzLmpvaW4oJywnKSArICdcIiAvPicgK1xuJzxwYXJhbSBuYW1lPVwid2luZG93bGVzc1wiIHZhbHVlPVwidHJ1ZVwiIC8+JyArXG4nPHBhcmFtIG5hbWU9XCJiYWNrZ3JvdW5kXCIgdmFsdWU9XCJibGFja1wiIC8+JyArXG4nPHBhcmFtIG5hbWU9XCJtaW5SdW50aW1lVmVyc2lvblwiIHZhbHVlPVwiMy4wLjAuMFwiIC8+JyArXG4nPHBhcmFtIG5hbWU9XCJhdXRvVXBncmFkZVwiIHZhbHVlPVwidHJ1ZVwiIC8+JyArXG4nPHBhcmFtIG5hbWU9XCJzb3VyY2VcIiB2YWx1ZT1cIicgKyBvcHRpb25zLnBsdWdpblBhdGggKyBvcHRpb25zLnNpbHZlcmxpZ2h0TmFtZSArICdcIiAvPicgK1xuJzwvb2JqZWN0Pic7XG5cdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdGNhc2UgJ2ZsYXNoJzpcblxuXHRcdFx0XHRpZiAobWVqcy5NZWRpYUZlYXR1cmVzLmlzSUUpIHtcblx0XHRcdFx0XHRzcGVjaWFsSUVDb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRcdFx0XHRjb250YWluZXIuYXBwZW5kQ2hpbGQoc3BlY2lhbElFQ29udGFpbmVyKTtcblx0XHRcdFx0XHRzcGVjaWFsSUVDb250YWluZXIub3V0ZXJIVE1MID1cbic8b2JqZWN0IGNsYXNzaWQ9XCJjbHNpZDpEMjdDREI2RS1BRTZELTExY2YtOTZCOC00NDQ1NTM1NDAwMDBcIiBjb2RlYmFzZT1cIi8vZG93bmxvYWQubWFjcm9tZWRpYS5jb20vcHViL3Nob2Nrd2F2ZS9jYWJzL2ZsYXNoL3N3Zmxhc2guY2FiXCIgJyArXG4naWQ9XCInICsgcGx1Z2luaWQgKyAnXCIgd2lkdGg9XCInICsgd2lkdGggKyAnXCIgaGVpZ2h0PVwiJyArIGhlaWdodCArICdcIiBjbGFzcz1cIm1lanMtc2hpbVwiPicgK1xuJzxwYXJhbSBuYW1lPVwibW92aWVcIiB2YWx1ZT1cIicgKyBvcHRpb25zLnBsdWdpblBhdGggKyBvcHRpb25zLmZsYXNoTmFtZSArICc/eD0nICsgKG5ldyBEYXRlKCkpICsgJ1wiIC8+JyArXG4nPHBhcmFtIG5hbWU9XCJmbGFzaHZhcnNcIiB2YWx1ZT1cIicgKyBpbml0VmFycy5qb2luKCcmYW1wOycpICsgJ1wiIC8+JyArXG4nPHBhcmFtIG5hbWU9XCJxdWFsaXR5XCIgdmFsdWU9XCJoaWdoXCIgLz4nICtcbic8cGFyYW0gbmFtZT1cImJnY29sb3JcIiB2YWx1ZT1cIiMwMDAwMDBcIiAvPicgK1xuJzxwYXJhbSBuYW1lPVwid21vZGVcIiB2YWx1ZT1cInRyYW5zcGFyZW50XCIgLz4nICtcbic8cGFyYW0gbmFtZT1cImFsbG93U2NyaXB0QWNjZXNzXCIgdmFsdWU9XCJhbHdheXNcIiAvPicgK1xuJzxwYXJhbSBuYW1lPVwiYWxsb3dGdWxsU2NyZWVuXCIgdmFsdWU9XCJ0cnVlXCIgLz4nICtcbic8cGFyYW0gbmFtZT1cInNjYWxlXCIgdmFsdWU9XCJkZWZhdWx0XCIgLz4nICsgXG4nPC9vYmplY3Q+JztcblxuXHRcdFx0XHR9IGVsc2Uge1xuXG5cdFx0XHRcdFx0Y29udGFpbmVyLmlubmVySFRNTCA9XG4nPGVtYmVkIGlkPVwiJyArIHBsdWdpbmlkICsgJ1wiIG5hbWU9XCInICsgcGx1Z2luaWQgKyAnXCIgJyArXG4ncGxheT1cInRydWVcIiAnICtcbidsb29wPVwiZmFsc2VcIiAnICtcbidxdWFsaXR5PVwiaGlnaFwiICcgK1xuJ2JnY29sb3I9XCIjMDAwMDAwXCIgJyArXG4nd21vZGU9XCJ0cmFuc3BhcmVudFwiICcgK1xuJ2FsbG93U2NyaXB0QWNjZXNzPVwiYWx3YXlzXCIgJyArXG4nYWxsb3dGdWxsU2NyZWVuPVwidHJ1ZVwiICcgK1xuJ3R5cGU9XCJhcHBsaWNhdGlvbi94LXNob2Nrd2F2ZS1mbGFzaFwiIHBsdWdpbnNwYWdlPVwiLy93d3cubWFjcm9tZWRpYS5jb20vZ28vZ2V0Zmxhc2hwbGF5ZXJcIiAnICtcbidzcmM9XCInICsgb3B0aW9ucy5wbHVnaW5QYXRoICsgb3B0aW9ucy5mbGFzaE5hbWUgKyAnXCIgJyArXG4nZmxhc2h2YXJzPVwiJyArIGluaXRWYXJzLmpvaW4oJyYnKSArICdcIiAnICtcbid3aWR0aD1cIicgKyB3aWR0aCArICdcIiAnICtcbidoZWlnaHQ9XCInICsgaGVpZ2h0ICsgJ1wiICcgK1xuJ3NjYWxlPVwiZGVmYXVsdFwiJyArIFxuJ2NsYXNzPVwibWVqcy1zaGltXCI+PC9lbWJlZD4nO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0XG5cdFx0XHRjYXNlICd5b3V0dWJlJzpcblx0XHRcdFxuXHRcdFx0XHRcblx0XHRcdFx0dmFyIHZpZGVvSWQ7XG5cdFx0XHRcdC8vIHlvdXR1LmJlIHVybCBmcm9tIHNoYXJlIGJ1dHRvblxuXHRcdFx0XHRpZiAocGxheWJhY2sudXJsLmxhc3RJbmRleE9mKFwieW91dHUuYmVcIikgIT0gLTEpIHtcblx0XHRcdFx0XHR2aWRlb0lkID0gcGxheWJhY2sudXJsLnN1YnN0cihwbGF5YmFjay51cmwubGFzdEluZGV4T2YoJy8nKSsxKTtcblx0XHRcdFx0XHRpZiAodmlkZW9JZC5pbmRleE9mKCc/JykgIT0gLTEpIHtcblx0XHRcdFx0XHRcdHZpZGVvSWQgPSB2aWRlb0lkLnN1YnN0cigwLCB2aWRlb0lkLmluZGV4T2YoJz8nKSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdHZpZGVvSWQgPSBwbGF5YmFjay51cmwuc3Vic3RyKHBsYXliYWNrLnVybC5sYXN0SW5kZXhPZignPScpKzEpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHlvdXR1YmVTZXR0aW5ncyA9IHtcblx0XHRcdFx0XHRcdGNvbnRhaW5lcjogY29udGFpbmVyLFxuXHRcdFx0XHRcdFx0Y29udGFpbmVySWQ6IGNvbnRhaW5lci5pZCxcblx0XHRcdFx0XHRcdHBsdWdpbk1lZGlhRWxlbWVudDogcGx1Z2luTWVkaWFFbGVtZW50LFxuXHRcdFx0XHRcdFx0cGx1Z2luSWQ6IHBsdWdpbmlkLFxuXHRcdFx0XHRcdFx0dmlkZW9JZDogdmlkZW9JZCxcblx0XHRcdFx0XHRcdGhlaWdodDogaGVpZ2h0LFxuXHRcdFx0XHRcdFx0d2lkdGg6IHdpZHRoXHRcblx0XHRcdFx0XHR9O1x0XHRcdFx0XG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAobWVqcy5QbHVnaW5EZXRlY3Rvci5oYXNQbHVnaW5WZXJzaW9uKCdmbGFzaCcsIFsxMCwwLDBdKSApIHtcblx0XHRcdFx0XHRtZWpzLllvdVR1YmVBcGkuY3JlYXRlRmxhc2goeW91dHViZVNldHRpbmdzKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRtZWpzLllvdVR1YmVBcGkuZW5xdWV1ZUlmcmFtZSh5b3V0dWJlU2V0dGluZ3MpO1x0XHRcblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcblx0XHRcdC8vIERFTU8gQ29kZS4gRG9lcyBOT1Qgd29yay5cblx0XHRcdGNhc2UgJ3ZpbWVvJzpcblx0XHRcdFx0dmFyIHBsYXllcl9pZCA9IHBsdWdpbmlkICsgXCJfcGxheWVyXCI7XG5cdFx0XHRcdHBsdWdpbk1lZGlhRWxlbWVudC52aW1lb2lkID0gcGxheWJhY2sudXJsLnN1YnN0cihwbGF5YmFjay51cmwubGFzdEluZGV4T2YoJy8nKSsxKTtcblx0XHRcdFx0XG5cdFx0XHRcdGNvbnRhaW5lci5pbm5lckhUTUwgPSc8aWZyYW1lIHNyYz1cIi8vcGxheWVyLnZpbWVvLmNvbS92aWRlby8nICsgcGx1Z2luTWVkaWFFbGVtZW50LnZpbWVvaWQgKyAnP2FwaT0xJnBvcnRyYWl0PTAmYnlsaW5lPTAmdGl0bGU9MCZwbGF5ZXJfaWQ9JyArIHBsYXllcl9pZCArICdcIiB3aWR0aD1cIicgKyB3aWR0aCArJ1wiIGhlaWdodD1cIicgKyBoZWlnaHQgKydcIiBmcmFtZWJvcmRlcj1cIjBcIiBjbGFzcz1cIm1lanMtc2hpbVwiIGlkPVwiJyArIHBsYXllcl9pZCArICdcIiB3ZWJraXRhbGxvd2Z1bGxzY3JlZW4gbW96YWxsb3dmdWxsc2NyZWVuIGFsbG93ZnVsbHNjcmVlbj48L2lmcmFtZT4nO1xuXHRcdFx0XHRpZiAodHlwZW9mKCRmKSA9PSAnZnVuY3Rpb24nKSB7IC8vIGZyb29nYWxvb3AgYXZhaWxhYmxlXG5cdFx0XHRcdFx0dmFyIHBsYXllciA9ICRmKGNvbnRhaW5lci5jaGlsZE5vZGVzWzBdKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRwbGF5ZXIuYWRkRXZlbnQoJ3JlYWR5JywgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdHBsYXllci5wbGF5VmlkZW8gPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0cGxheWVyLmFwaSggJ3BsYXknICk7XG5cdFx0XHRcdFx0XHR9IFxuXHRcdFx0XHRcdFx0cGxheWVyLnN0b3BWaWRlbyA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRwbGF5ZXIuYXBpKCAndW5sb2FkJyApO1xuXHRcdFx0XHRcdFx0fSBcblx0XHRcdFx0XHRcdHBsYXllci5wYXVzZVZpZGVvID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdHBsYXllci5hcGkoICdwYXVzZScgKTtcblx0XHRcdFx0XHRcdH0gXG5cdFx0XHRcdFx0XHRwbGF5ZXIuc2Vla1RvID0gZnVuY3Rpb24oIHNlY29uZHMgKSB7XG5cdFx0XHRcdFx0XHRcdHBsYXllci5hcGkoICdzZWVrVG8nLCBzZWNvbmRzICk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRwbGF5ZXIuc2V0Vm9sdW1lID0gZnVuY3Rpb24oIHZvbHVtZSApIHtcblx0XHRcdFx0XHRcdFx0cGxheWVyLmFwaSggJ3NldFZvbHVtZScsIHZvbHVtZSApO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cGxheWVyLnNldE11dGVkID0gZnVuY3Rpb24oIG11dGVkICkge1xuXHRcdFx0XHRcdFx0XHRpZiggbXV0ZWQgKSB7XG5cdFx0XHRcdFx0XHRcdFx0cGxheWVyLmxhc3RWb2x1bWUgPSBwbGF5ZXIuYXBpKCAnZ2V0Vm9sdW1lJyApO1xuXHRcdFx0XHRcdFx0XHRcdHBsYXllci5hcGkoICdzZXRWb2x1bWUnLCAwICk7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0cGxheWVyLmFwaSggJ3NldFZvbHVtZScsIHBsYXllci5sYXN0Vm9sdW1lICk7XG5cdFx0XHRcdFx0XHRcdFx0ZGVsZXRlIHBsYXllci5sYXN0Vm9sdW1lO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XHRcdFx0XHRcdFx0XG5cblx0XHRcdFx0XHRcdGZ1bmN0aW9uIGNyZWF0ZUV2ZW50KHBsYXllciwgcGx1Z2luTWVkaWFFbGVtZW50LCBldmVudE5hbWUsIGUpIHtcblx0XHRcdFx0XHRcdFx0dmFyIG9iaiA9IHtcblx0XHRcdFx0XHRcdFx0XHR0eXBlOiBldmVudE5hbWUsXG5cdFx0XHRcdFx0XHRcdFx0dGFyZ2V0OiBwbHVnaW5NZWRpYUVsZW1lbnRcblx0XHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdFx0aWYgKGV2ZW50TmFtZSA9PSAndGltZXVwZGF0ZScpIHtcblx0XHRcdFx0XHRcdFx0XHRwbHVnaW5NZWRpYUVsZW1lbnQuY3VycmVudFRpbWUgPSBvYmouY3VycmVudFRpbWUgPSBlLnNlY29uZHM7XG5cdFx0XHRcdFx0XHRcdFx0cGx1Z2luTWVkaWFFbGVtZW50LmR1cmF0aW9uID0gb2JqLmR1cmF0aW9uID0gZS5kdXJhdGlvbjtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRwbHVnaW5NZWRpYUVsZW1lbnQuZGlzcGF0Y2hFdmVudChvYmoudHlwZSwgb2JqKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0cGxheWVyLmFkZEV2ZW50KCdwbGF5JywgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdGNyZWF0ZUV2ZW50KHBsYXllciwgcGx1Z2luTWVkaWFFbGVtZW50LCAncGxheScpO1xuXHRcdFx0XHRcdFx0XHRjcmVhdGVFdmVudChwbGF5ZXIsIHBsdWdpbk1lZGlhRWxlbWVudCwgJ3BsYXlpbmcnKTtcblx0XHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0XHRwbGF5ZXIuYWRkRXZlbnQoJ3BhdXNlJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdGNyZWF0ZUV2ZW50KHBsYXllciwgcGx1Z2luTWVkaWFFbGVtZW50LCAncGF1c2UnKTtcblx0XHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0XHRwbGF5ZXIuYWRkRXZlbnQoJ2ZpbmlzaCcsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRjcmVhdGVFdmVudChwbGF5ZXIsIHBsdWdpbk1lZGlhRWxlbWVudCwgJ2VuZGVkJyk7XG5cdFx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdFx0cGxheWVyLmFkZEV2ZW50KCdwbGF5UHJvZ3Jlc3MnLCBmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0XHRcdGNyZWF0ZUV2ZW50KHBsYXllciwgcGx1Z2luTWVkaWFFbGVtZW50LCAndGltZXVwZGF0ZScsIGUpO1xuXHRcdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHRcdHBsdWdpbk1lZGlhRWxlbWVudC5wbHVnaW5FbGVtZW50ID0gY29udGFpbmVyO1xuXHRcdFx0XHRcdFx0cGx1Z2luTWVkaWFFbGVtZW50LnBsdWdpbkFwaSA9IHBsYXllcjtcblxuXHRcdFx0XHRcdFx0Ly8gaW5pdCBtZWpzXG5cdFx0XHRcdFx0XHRtZWpzLk1lZGlhUGx1Z2luQnJpZGdlLmluaXRQbHVnaW4ocGx1Z2luaWQpO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdGNvbnNvbGUud2FybihcIllvdSBuZWVkIHRvIGluY2x1ZGUgZnJvb2dhbG9vcCBmb3IgdmltZW8gdG8gd29ya1wiKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRicmVhaztcdFx0XHRcblx0XHR9XG5cdFx0Ly8gaGlkZSBvcmlnaW5hbCBlbGVtZW50XG5cdFx0aHRtbE1lZGlhRWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuXHRcdC8vIHByZXZlbnQgYnJvd3NlciBmcm9tIGF1dG9wbGF5aW5nIHdoZW4gdXNpbmcgYSBwbHVnaW5cblx0XHRodG1sTWVkaWFFbGVtZW50LnJlbW92ZUF0dHJpYnV0ZSgnYXV0b3BsYXknKTtcblxuXHRcdC8vIEZZSTogb3B0aW9ucy5zdWNjZXNzIHdpbGwgYmUgZmlyZWQgYnkgdGhlIE1lZGlhUGx1Z2luQnJpZGdlXG5cdFx0XG5cdFx0cmV0dXJuIHBsdWdpbk1lZGlhRWxlbWVudDtcblx0fSxcblxuXHR1cGRhdGVOYXRpdmU6IGZ1bmN0aW9uKHBsYXliYWNrLCBvcHRpb25zLCBhdXRvcGxheSwgcHJlbG9hZCkge1xuXHRcdFxuXHRcdHZhciBodG1sTWVkaWFFbGVtZW50ID0gcGxheWJhY2suaHRtbE1lZGlhRWxlbWVudCxcblx0XHRcdG07XG5cdFx0XG5cdFx0XG5cdFx0Ly8gYWRkIG1ldGhvZHMgdG8gdmlkZW8gb2JqZWN0IHRvIGJyaW5nIGl0IGludG8gcGFyaXR5IHdpdGggRmxhc2ggT2JqZWN0XG5cdFx0Zm9yIChtIGluIG1lanMuSHRtbE1lZGlhRWxlbWVudCkge1xuXHRcdFx0aHRtbE1lZGlhRWxlbWVudFttXSA9IG1lanMuSHRtbE1lZGlhRWxlbWVudFttXTtcblx0XHR9XG5cblx0XHQvKlxuXHRcdENocm9tZSBub3cgc3VwcG9ydHMgcHJlbG9hZD1cIm5vbmVcIlxuXHRcdGlmIChtZWpzLk1lZGlhRmVhdHVyZXMuaXNDaHJvbWUpIHtcblx0XHRcblx0XHRcdC8vIHNwZWNpYWwgY2FzZSB0byBlbmZvcmNlIHByZWxvYWQgYXR0cmlidXRlIChDaHJvbWUgZG9lc24ndCByZXNwZWN0IHRoaXMpXG5cdFx0XHRpZiAocHJlbG9hZCA9PT0gJ25vbmUnICYmICFhdXRvcGxheSkge1xuXHRcdFx0XG5cdFx0XHRcdC8vIGZvcmNlcyB0aGUgYnJvd3NlciB0byBzdG9wIGxvYWRpbmcgKG5vdGU6IGZhaWxzIGluIElFOSlcblx0XHRcdFx0aHRtbE1lZGlhRWxlbWVudC5zcmMgPSAnJztcblx0XHRcdFx0aHRtbE1lZGlhRWxlbWVudC5sb2FkKCk7XG5cdFx0XHRcdGh0bWxNZWRpYUVsZW1lbnQuY2FuY2VsZWRQcmVsb2FkID0gdHJ1ZTtcblxuXHRcdFx0XHRodG1sTWVkaWFFbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3BsYXknLGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGlmIChodG1sTWVkaWFFbGVtZW50LmNhbmNlbGVkUHJlbG9hZCkge1xuXHRcdFx0XHRcdFx0aHRtbE1lZGlhRWxlbWVudC5zcmMgPSBwbGF5YmFjay51cmw7XG5cdFx0XHRcdFx0XHRodG1sTWVkaWFFbGVtZW50LmxvYWQoKTtcblx0XHRcdFx0XHRcdGh0bWxNZWRpYUVsZW1lbnQucGxheSgpO1xuXHRcdFx0XHRcdFx0aHRtbE1lZGlhRWxlbWVudC5jYW5jZWxlZFByZWxvYWQgPSBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sIGZhbHNlKTtcblx0XHRcdC8vIGZvciBzb21lIHJlYXNvbiBDaHJvbWUgZm9yZ2V0cyBob3cgdG8gYXV0b3BsYXkgc29tZXRpbWVzLlxuXHRcdFx0fSBlbHNlIGlmIChhdXRvcGxheSkge1xuXHRcdFx0XHRodG1sTWVkaWFFbGVtZW50LmxvYWQoKTtcblx0XHRcdFx0aHRtbE1lZGlhRWxlbWVudC5wbGF5KCk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdCovXG5cblx0XHQvLyBmaXJlIHN1Y2Nlc3MgY29kZVxuXHRcdG9wdGlvbnMuc3VjY2VzcyhodG1sTWVkaWFFbGVtZW50LCBodG1sTWVkaWFFbGVtZW50KTtcblx0XHRcblx0XHRyZXR1cm4gaHRtbE1lZGlhRWxlbWVudDtcblx0fVxufTtcblxuLypcbiAtIHRlc3Qgb24gSUUgKG9iamVjdCB2cy4gZW1iZWQpXG4gLSBkZXRlcm1pbmUgd2hlbiB0byB1c2UgaWZyYW1lIChGaXJlZm94LCBTYWZhcmksIE1vYmlsZSkgdnMuIEZsYXNoIChDaHJvbWUsIElFKVxuIC0gZnVsbHNjcmVlbj9cbiovXG5cbi8vIFlvdVR1YmUgRmxhc2ggYW5kIElmcmFtZSBBUElcbm1lanMuWW91VHViZUFwaSA9IHtcblx0aXNJZnJhbWVTdGFydGVkOiBmYWxzZSxcblx0aXNJZnJhbWVMb2FkZWQ6IGZhbHNlLFxuXHRsb2FkSWZyYW1lQXBpOiBmdW5jdGlvbigpIHtcblx0XHRpZiAoIXRoaXMuaXNJZnJhbWVTdGFydGVkKSB7XG5cdFx0XHR2YXIgdGFnID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2NyaXB0Jyk7XG5cdFx0XHR0YWcuc3JjID0gXCIvL3d3dy55b3V0dWJlLmNvbS9wbGF5ZXJfYXBpXCI7XG5cdFx0XHR2YXIgZmlyc3RTY3JpcHRUYWcgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnc2NyaXB0JylbMF07XG5cdFx0XHRmaXJzdFNjcmlwdFRhZy5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0YWcsIGZpcnN0U2NyaXB0VGFnKTtcblx0XHRcdHRoaXMuaXNJZnJhbWVTdGFydGVkID0gdHJ1ZTtcblx0XHR9XG5cdH0sXG5cdGlmcmFtZVF1ZXVlOiBbXSxcblx0ZW5xdWV1ZUlmcmFtZTogZnVuY3Rpb24oeXQpIHtcblx0XHRcblx0XHRpZiAodGhpcy5pc0xvYWRlZCkge1xuXHRcdFx0dGhpcy5jcmVhdGVJZnJhbWUoeXQpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLmxvYWRJZnJhbWVBcGkoKTtcblx0XHRcdHRoaXMuaWZyYW1lUXVldWUucHVzaCh5dCk7XG5cdFx0fVxuXHR9LFxuXHRjcmVhdGVJZnJhbWU6IGZ1bmN0aW9uKHNldHRpbmdzKSB7XG5cdFx0XG5cdFx0dmFyXG5cdFx0cGx1Z2luTWVkaWFFbGVtZW50ID0gc2V0dGluZ3MucGx1Z2luTWVkaWFFbGVtZW50LFx0XG5cdFx0cGxheWVyID0gbmV3IFlULlBsYXllcihzZXR0aW5ncy5jb250YWluZXJJZCwge1xuXHRcdFx0aGVpZ2h0OiBzZXR0aW5ncy5oZWlnaHQsXG5cdFx0XHR3aWR0aDogc2V0dGluZ3Mud2lkdGgsXG5cdFx0XHR2aWRlb0lkOiBzZXR0aW5ncy52aWRlb0lkLFxuXHRcdFx0cGxheWVyVmFyczoge2NvbnRyb2xzOjB9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdCdvblJlYWR5JzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0Ly8gaG9vayB1cCBpZnJhbWUgb2JqZWN0IHRvIE1FanNcblx0XHRcdFx0XHRzZXR0aW5ncy5wbHVnaW5NZWRpYUVsZW1lbnQucGx1Z2luQXBpID0gcGxheWVyO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdC8vIGluaXQgbWVqc1xuXHRcdFx0XHRcdG1lanMuTWVkaWFQbHVnaW5CcmlkZ2UuaW5pdFBsdWdpbihzZXR0aW5ncy5wbHVnaW5JZCk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0Ly8gY3JlYXRlIHRpbWVyXG5cdFx0XHRcdFx0c2V0SW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRtZWpzLllvdVR1YmVBcGkuY3JlYXRlRXZlbnQocGxheWVyLCBwbHVnaW5NZWRpYUVsZW1lbnQsICd0aW1ldXBkYXRlJyk7XG5cdFx0XHRcdFx0fSwgMjUwKTtcdFx0XHRcdFx0XG5cdFx0XHRcdH0sXG5cdFx0XHRcdCdvblN0YXRlQ2hhbmdlJzogZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdG1lanMuWW91VHViZUFwaS5oYW5kbGVTdGF0ZUNoYW5nZShlLmRhdGEsIHBsYXllciwgcGx1Z2luTWVkaWFFbGVtZW50KTtcblx0XHRcdFx0XHRcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXHRcblx0Y3JlYXRlRXZlbnQ6IGZ1bmN0aW9uIChwbGF5ZXIsIHBsdWdpbk1lZGlhRWxlbWVudCwgZXZlbnROYW1lKSB7XG5cdFx0dmFyIG9iaiA9IHtcblx0XHRcdHR5cGU6IGV2ZW50TmFtZSxcblx0XHRcdHRhcmdldDogcGx1Z2luTWVkaWFFbGVtZW50XG5cdFx0fTtcblxuXHRcdGlmIChwbGF5ZXIgJiYgcGxheWVyLmdldER1cmF0aW9uKSB7XG5cdFx0XHRcblx0XHRcdC8vIHRpbWUgXG5cdFx0XHRwbHVnaW5NZWRpYUVsZW1lbnQuY3VycmVudFRpbWUgPSBvYmouY3VycmVudFRpbWUgPSBwbGF5ZXIuZ2V0Q3VycmVudFRpbWUoKTtcblx0XHRcdHBsdWdpbk1lZGlhRWxlbWVudC5kdXJhdGlvbiA9IG9iai5kdXJhdGlvbiA9IHBsYXllci5nZXREdXJhdGlvbigpO1xuXHRcdFx0XG5cdFx0XHQvLyBzdGF0ZVxuXHRcdFx0b2JqLnBhdXNlZCA9IHBsdWdpbk1lZGlhRWxlbWVudC5wYXVzZWQ7XG5cdFx0XHRvYmouZW5kZWQgPSBwbHVnaW5NZWRpYUVsZW1lbnQuZW5kZWQ7XHRcdFx0XG5cdFx0XHRcblx0XHRcdC8vIHNvdW5kXG5cdFx0XHRvYmoubXV0ZWQgPSBwbGF5ZXIuaXNNdXRlZCgpO1xuXHRcdFx0b2JqLnZvbHVtZSA9IHBsYXllci5nZXRWb2x1bWUoKSAvIDEwMDtcblx0XHRcdFxuXHRcdFx0Ly8gcHJvZ3Jlc3Ncblx0XHRcdG9iai5ieXRlc1RvdGFsID0gcGxheWVyLmdldFZpZGVvQnl0ZXNUb3RhbCgpO1xuXHRcdFx0b2JqLmJ1ZmZlcmVkQnl0ZXMgPSBwbGF5ZXIuZ2V0VmlkZW9CeXRlc0xvYWRlZCgpO1xuXHRcdFx0XG5cdFx0XHQvLyBmYWtlIHRoZSBXM0MgYnVmZmVyZWQgVGltZVJhbmdlXG5cdFx0XHR2YXIgYnVmZmVyZWRUaW1lID0gb2JqLmJ1ZmZlcmVkQnl0ZXMgLyBvYmouYnl0ZXNUb3RhbCAqIG9iai5kdXJhdGlvbjtcblx0XHRcdFxuXHRcdFx0b2JqLnRhcmdldC5idWZmZXJlZCA9IG9iai5idWZmZXJlZCA9IHtcblx0XHRcdFx0c3RhcnQ6IGZ1bmN0aW9uKGluZGV4KSB7XG5cdFx0XHRcdFx0cmV0dXJuIDA7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGVuZDogZnVuY3Rpb24gKGluZGV4KSB7XG5cdFx0XHRcdFx0cmV0dXJuIGJ1ZmZlcmVkVGltZTtcblx0XHRcdFx0fSxcblx0XHRcdFx0bGVuZ3RoOiAxXG5cdFx0XHR9O1xuXG5cdFx0fVxuXHRcdFxuXHRcdC8vIHNlbmQgZXZlbnQgdXAgdGhlIGNoYWluXG5cdFx0cGx1Z2luTWVkaWFFbGVtZW50LmRpc3BhdGNoRXZlbnQob2JqLnR5cGUsIG9iaik7XG5cdH0sXHRcblx0XG5cdGlGcmFtZVJlYWR5OiBmdW5jdGlvbigpIHtcblx0XHRcblx0XHR0aGlzLmlzTG9hZGVkID0gdHJ1ZTtcblx0XHR0aGlzLmlzSWZyYW1lTG9hZGVkID0gdHJ1ZTtcblx0XHRcblx0XHR3aGlsZSAodGhpcy5pZnJhbWVRdWV1ZS5sZW5ndGggPiAwKSB7XG5cdFx0XHR2YXIgc2V0dGluZ3MgPSB0aGlzLmlmcmFtZVF1ZXVlLnBvcCgpO1xuXHRcdFx0dGhpcy5jcmVhdGVJZnJhbWUoc2V0dGluZ3MpO1xuXHRcdH1cdFxuXHR9LFxuXHRcblx0Ly8gRkxBU0ghXG5cdGZsYXNoUGxheWVyczoge30sXG5cdGNyZWF0ZUZsYXNoOiBmdW5jdGlvbihzZXR0aW5ncykge1xuXHRcdFxuXHRcdHRoaXMuZmxhc2hQbGF5ZXJzW3NldHRpbmdzLnBsdWdpbklkXSA9IHNldHRpbmdzO1xuXHRcdFxuXHRcdC8qXG5cdFx0c2V0dGluZ3MuY29udGFpbmVyLmlubmVySFRNTCA9XG5cdFx0XHQnPG9iamVjdCB0eXBlPVwiYXBwbGljYXRpb24veC1zaG9ja3dhdmUtZmxhc2hcIiBpZD1cIicgKyBzZXR0aW5ncy5wbHVnaW5JZCArICdcIiBkYXRhPVwiLy93d3cueW91dHViZS5jb20vYXBpcGxheWVyP2VuYWJsZWpzYXBpPTEmYW1wO3BsYXllcmFwaWlkPScgKyBzZXR0aW5ncy5wbHVnaW5JZCAgKyAnJmFtcDt2ZXJzaW9uPTMmYW1wO2F1dG9wbGF5PTAmYW1wO2NvbnRyb2xzPTAmYW1wO21vZGVzdGJyYW5kaW5nPTEmbG9vcD0wXCIgJyArXG5cdFx0XHRcdCd3aWR0aD1cIicgKyBzZXR0aW5ncy53aWR0aCArICdcIiBoZWlnaHQ9XCInICsgc2V0dGluZ3MuaGVpZ2h0ICsgJ1wiIHN0eWxlPVwidmlzaWJpbGl0eTogdmlzaWJsZTsgXCIgY2xhc3M9XCJtZWpzLXNoaW1cIj4nICtcblx0XHRcdFx0JzxwYXJhbSBuYW1lPVwiYWxsb3dTY3JpcHRBY2Nlc3NcIiB2YWx1ZT1cImFsd2F5c1wiPicgK1xuXHRcdFx0XHQnPHBhcmFtIG5hbWU9XCJ3bW9kZVwiIHZhbHVlPVwidHJhbnNwYXJlbnRcIj4nICtcblx0XHRcdCc8L29iamVjdD4nO1xuXHRcdCovXG5cblx0XHR2YXIgc3BlY2lhbElFQ29udGFpbmVyLFxuXHRcdFx0eW91dHViZVVybCA9ICcvL3d3dy55b3V0dWJlLmNvbS9hcGlwbGF5ZXI/ZW5hYmxlanNhcGk9MSZhbXA7cGxheWVyYXBpaWQ9JyArIHNldHRpbmdzLnBsdWdpbklkICArICcmYW1wO3ZlcnNpb249MyZhbXA7YXV0b3BsYXk9MCZhbXA7Y29udHJvbHM9MCZhbXA7bW9kZXN0YnJhbmRpbmc9MSZsb29wPTAnO1xuXHRcdFx0XG5cdFx0aWYgKG1lanMuTWVkaWFGZWF0dXJlcy5pc0lFKSB7XG5cdFx0XHRcblx0XHRcdHNwZWNpYWxJRUNvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdFx0c2V0dGluZ3MuY29udGFpbmVyLmFwcGVuZENoaWxkKHNwZWNpYWxJRUNvbnRhaW5lcik7XG5cdFx0XHRzcGVjaWFsSUVDb250YWluZXIub3V0ZXJIVE1MID0gJzxvYmplY3QgY2xhc3NpZD1cImNsc2lkOkQyN0NEQjZFLUFFNkQtMTFjZi05NkI4LTQ0NDU1MzU0MDAwMFwiIGNvZGViYXNlPVwiLy9kb3dubG9hZC5tYWNyb21lZGlhLmNvbS9wdWIvc2hvY2t3YXZlL2NhYnMvZmxhc2gvc3dmbGFzaC5jYWJcIiAnICtcbidpZD1cIicgKyBzZXR0aW5ncy5wbHVnaW5JZCArICdcIiB3aWR0aD1cIicgKyBzZXR0aW5ncy53aWR0aCArICdcIiBoZWlnaHQ9XCInICsgc2V0dGluZ3MuaGVpZ2h0ICsgJ1wiIGNsYXNzPVwibWVqcy1zaGltXCI+JyArXG5cdCc8cGFyYW0gbmFtZT1cIm1vdmllXCIgdmFsdWU9XCInICsgeW91dHViZVVybCArICdcIiAvPicgK1xuXHQnPHBhcmFtIG5hbWU9XCJ3bW9kZVwiIHZhbHVlPVwidHJhbnNwYXJlbnRcIiAvPicgK1xuXHQnPHBhcmFtIG5hbWU9XCJhbGxvd1NjcmlwdEFjY2Vzc1wiIHZhbHVlPVwiYWx3YXlzXCIgLz4nICtcblx0JzxwYXJhbSBuYW1lPVwiYWxsb3dGdWxsU2NyZWVuXCIgdmFsdWU9XCJ0cnVlXCIgLz4nICtcbic8L29iamVjdD4nO1xuXHRcdH0gZWxzZSB7XG5cdFx0c2V0dGluZ3MuY29udGFpbmVyLmlubmVySFRNTCA9XG5cdFx0XHQnPG9iamVjdCB0eXBlPVwiYXBwbGljYXRpb24veC1zaG9ja3dhdmUtZmxhc2hcIiBpZD1cIicgKyBzZXR0aW5ncy5wbHVnaW5JZCArICdcIiBkYXRhPVwiJyArIHlvdXR1YmVVcmwgKyAnXCIgJyArXG5cdFx0XHRcdCd3aWR0aD1cIicgKyBzZXR0aW5ncy53aWR0aCArICdcIiBoZWlnaHQ9XCInICsgc2V0dGluZ3MuaGVpZ2h0ICsgJ1wiIHN0eWxlPVwidmlzaWJpbGl0eTogdmlzaWJsZTsgXCIgY2xhc3M9XCJtZWpzLXNoaW1cIj4nICtcblx0XHRcdFx0JzxwYXJhbSBuYW1lPVwiYWxsb3dTY3JpcHRBY2Nlc3NcIiB2YWx1ZT1cImFsd2F5c1wiPicgK1xuXHRcdFx0XHQnPHBhcmFtIG5hbWU9XCJ3bW9kZVwiIHZhbHVlPVwidHJhbnNwYXJlbnRcIj4nICtcblx0XHRcdCc8L29iamVjdD4nO1xuXHRcdH1cdFx0XG5cdFx0XG5cdH0sXG5cdFxuXHRmbGFzaFJlYWR5OiBmdW5jdGlvbihpZCkge1xuXHRcdHZhclxuXHRcdFx0c2V0dGluZ3MgPSB0aGlzLmZsYXNoUGxheWVyc1tpZF0sXG5cdFx0XHRwbGF5ZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCksXG5cdFx0XHRwbHVnaW5NZWRpYUVsZW1lbnQgPSBzZXR0aW5ncy5wbHVnaW5NZWRpYUVsZW1lbnQ7XG5cdFx0XG5cdFx0Ly8gaG9vayB1cCBhbmQgcmV0dXJuIHRvIE1lZGlhRUxlbWVudFBsYXllci5zdWNjZXNzXHRcblx0XHRwbHVnaW5NZWRpYUVsZW1lbnQucGx1Z2luQXBpID0gXG5cdFx0cGx1Z2luTWVkaWFFbGVtZW50LnBsdWdpbkVsZW1lbnQgPSBwbGF5ZXI7XG5cdFx0bWVqcy5NZWRpYVBsdWdpbkJyaWRnZS5pbml0UGx1Z2luKGlkKTtcblx0XHRcblx0XHQvLyBsb2FkIHRoZSB5b3V0dWJlIHZpZGVvXG5cdFx0cGxheWVyLmN1ZVZpZGVvQnlJZChzZXR0aW5ncy52aWRlb0lkKTtcblx0XHRcblx0XHR2YXIgY2FsbGJhY2tOYW1lID0gc2V0dGluZ3MuY29udGFpbmVySWQgKyAnX2NhbGxiYWNrJztcblx0XHRcblx0XHR3aW5kb3dbY2FsbGJhY2tOYW1lXSA9IGZ1bmN0aW9uKGUpIHtcblx0XHRcdG1lanMuWW91VHViZUFwaS5oYW5kbGVTdGF0ZUNoYW5nZShlLCBwbGF5ZXIsIHBsdWdpbk1lZGlhRWxlbWVudCk7XG5cdFx0fVxuXHRcdFxuXHRcdHBsYXllci5hZGRFdmVudExpc3RlbmVyKCdvblN0YXRlQ2hhbmdlJywgY2FsbGJhY2tOYW1lKTtcblx0XHRcblx0XHRzZXRJbnRlcnZhbChmdW5jdGlvbigpIHtcblx0XHRcdG1lanMuWW91VHViZUFwaS5jcmVhdGVFdmVudChwbGF5ZXIsIHBsdWdpbk1lZGlhRWxlbWVudCwgJ3RpbWV1cGRhdGUnKTtcblx0XHR9LCAyNTApO1xuXHRcdFxuXHRcdG1lanMuWW91VHViZUFwaS5jcmVhdGVFdmVudChwbGF5ZXIsIHBsdWdpbk1lZGlhRWxlbWVudCwgJ2NhbnBsYXknKTtcblx0fSxcblx0XG5cdGhhbmRsZVN0YXRlQ2hhbmdlOiBmdW5jdGlvbih5b3VUdWJlU3RhdGUsIHBsYXllciwgcGx1Z2luTWVkaWFFbGVtZW50KSB7XG5cdFx0c3dpdGNoICh5b3VUdWJlU3RhdGUpIHtcblx0XHRcdGNhc2UgLTE6IC8vIG5vdCBzdGFydGVkXG5cdFx0XHRcdHBsdWdpbk1lZGlhRWxlbWVudC5wYXVzZWQgPSB0cnVlO1xuXHRcdFx0XHRwbHVnaW5NZWRpYUVsZW1lbnQuZW5kZWQgPSB0cnVlO1xuXHRcdFx0XHRtZWpzLllvdVR1YmVBcGkuY3JlYXRlRXZlbnQocGxheWVyLCBwbHVnaW5NZWRpYUVsZW1lbnQsICdsb2FkZWRtZXRhZGF0YScpO1xuXHRcdFx0XHQvL2NyZWF0ZVlvdVR1YmVFdmVudChwbGF5ZXIsIHBsdWdpbk1lZGlhRWxlbWVudCwgJ2xvYWRlZGRhdGEnKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIDA6XG5cdFx0XHRcdHBsdWdpbk1lZGlhRWxlbWVudC5wYXVzZWQgPSBmYWxzZTtcblx0XHRcdFx0cGx1Z2luTWVkaWFFbGVtZW50LmVuZGVkID0gdHJ1ZTtcblx0XHRcdFx0bWVqcy5Zb3VUdWJlQXBpLmNyZWF0ZUV2ZW50KHBsYXllciwgcGx1Z2luTWVkaWFFbGVtZW50LCAnZW5kZWQnKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIDE6XG5cdFx0XHRcdHBsdWdpbk1lZGlhRWxlbWVudC5wYXVzZWQgPSBmYWxzZTtcblx0XHRcdFx0cGx1Z2luTWVkaWFFbGVtZW50LmVuZGVkID0gZmFsc2U7XHRcdFx0XHRcblx0XHRcdFx0bWVqcy5Zb3VUdWJlQXBpLmNyZWF0ZUV2ZW50KHBsYXllciwgcGx1Z2luTWVkaWFFbGVtZW50LCAncGxheScpO1xuXHRcdFx0XHRtZWpzLllvdVR1YmVBcGkuY3JlYXRlRXZlbnQocGxheWVyLCBwbHVnaW5NZWRpYUVsZW1lbnQsICdwbGF5aW5nJyk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAyOlxuXHRcdFx0XHRwbHVnaW5NZWRpYUVsZW1lbnQucGF1c2VkID0gdHJ1ZTtcblx0XHRcdFx0cGx1Z2luTWVkaWFFbGVtZW50LmVuZGVkID0gZmFsc2U7XHRcdFx0XHRcblx0XHRcdFx0bWVqcy5Zb3VUdWJlQXBpLmNyZWF0ZUV2ZW50KHBsYXllciwgcGx1Z2luTWVkaWFFbGVtZW50LCAncGF1c2UnKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIDM6IC8vIGJ1ZmZlcmluZ1xuXHRcdFx0XHRtZWpzLllvdVR1YmVBcGkuY3JlYXRlRXZlbnQocGxheWVyLCBwbHVnaW5NZWRpYUVsZW1lbnQsICdwcm9ncmVzcycpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgNTpcblx0XHRcdFx0Ly8gY3VlZD9cblx0XHRcdFx0YnJlYWs7XHRcdFx0XHRcdFx0XG5cdFx0XHRcblx0XHR9XHRcdFx0XG5cdFx0XG5cdH1cbn1cbi8vIElGUkFNRVxuZnVuY3Rpb24gb25Zb3VUdWJlUGxheWVyQVBJUmVhZHkoKSB7XG5cdG1lanMuWW91VHViZUFwaS5pRnJhbWVSZWFkeSgpO1xufVxuLy8gRkxBU0hcbmZ1bmN0aW9uIG9uWW91VHViZVBsYXllclJlYWR5KGlkKSB7XG5cdG1lanMuWW91VHViZUFwaS5mbGFzaFJlYWR5KGlkKTtcbn1cblxud2luZG93Lm1lanMgPSBtZWpzO1xud2luZG93Lk1lZGlhRWxlbWVudCA9IG1lanMuTWVkaWFFbGVtZW50O1xuXG4vKlxuICogQWRkcyBJbnRlcm5hdGlvbmFsaXphdGlvbiBhbmQgbG9jYWxpemF0aW9uIHRvIG1lZGlhZWxlbWVudC5cbiAqXG4gKiBUaGlzIGZpbGUgZG9lcyBub3QgY29udGFpbiB0cmFuc2xhdGlvbnMsIHlvdSBoYXZlIHRvIGFkZCB0aGVtIG1hbnVhbGx5LlxuICogVGhlIHNjaGVtYSBpcyBhbHdheXMgdGhlIHNhbWU6IG1lLWkxOG4tbG9jYWxlLVtJRVRGLWxhbmd1YWdlLXRhZ10uanNcbiAqXG4gKiBFeGFtcGxlcyBhcmUgcHJvdmlkZWQgYm90aCBmb3IgZ2VybWFuIGFuZCBjaGluZXNlIHRyYW5zbGF0aW9uLlxuICpcbiAqXG4gKiBXaGF0IGlzIHRoZSBjb25jZXB0IGJleW9uZCBpMThuP1xuICogICBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0ludGVybmF0aW9uYWxpemF0aW9uX2FuZF9sb2NhbGl6YXRpb25cbiAqXG4gKiBXaGF0IGxhbmdjb2RlIHNob3VsZCBpIHVzZT9cbiAqICAgaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9JRVRGX2xhbmd1YWdlX3RhZ1xuICogICBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNTY0NlxuICpcbiAqXG4gKiBMaWNlbnNlP1xuICpcbiAqICAgVGhlIGkxOG4gZmlsZSB1c2VzIG1ldGhvZHMgZnJvbSB0aGUgRHJ1cGFsIHByb2plY3QgKGRydXBhbC5qcyk6XG4gKiAgICAgLSBpMThuLm1ldGhvZHMudCgpIChtb2RpZmllZClcbiAqICAgICAtIGkxOG4ubWV0aG9kcy5jaGVja1BsYWluKCkgKGZ1bGwgY29weSlcbiAqXG4gKiAgIFRoZSBEcnVwYWwgcHJvamVjdCBpcyAobGlrZSBtZWRpYWVsZW1lbnRqcykgbGljZW5zZWQgdW5kZXIgR1BMdjIuXG4gKiAgICAtIGh0dHA6Ly9kcnVwYWwub3JnL2xpY2Vuc2luZy9mYXEvI3ExXG4gKiAgICAtIGh0dHBzOi8vZ2l0aHViLmNvbS9qb2huZHllci9tZWRpYWVsZW1lbnRcbiAqICAgIC0gaHR0cDovL3d3dy5nbnUub3JnL2xpY2Vuc2VzL29sZC1saWNlbnNlcy9ncGwtMi4wLmh0bWxcbiAqXG4gKlxuICogQGF1dGhvclxuICogICBUaW0gTGF0eiAobGF0ei50aW1AZ21haWwuY29tKVxuICpcbiAqXG4gKiBAcGFyYW1zXG4gKiAgLSBjb250ZXh0IC0gZG9jdW1lbnQsIGlmcmFtZSAuLlxuICogIC0gZXhwb3J0cyAtIENvbW1vbkpTLCB3aW5kb3cgLi5cbiAqXG4gKi9cbjsoZnVuY3Rpb24oY29udGV4dCwgZXhwb3J0cywgdW5kZWZpbmVkKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICB2YXIgaTE4biA9IHtcbiAgICAgICAgXCJsb2NhbGVcIjoge1xuICAgICAgICAgICAgLy8gRW5zdXJlIHByZXZpb3VzIHZhbHVlcyBhcmVuJ3Qgb3ZlcndyaXR0ZW4uXG4gICAgICAgICAgICBcImxhbmd1YWdlXCIgOiAoZXhwb3J0cy5pMThuICYmIGV4cG9ydHMuaTE4bi5sb2NhbGUubGFuZ3VhZ2UpIHx8ICcnLFxuICAgICAgICAgICAgXCJzdHJpbmdzXCIgOiAoZXhwb3J0cy5pMThuICYmIGV4cG9ydHMuaTE4bi5sb2NhbGUuc3RyaW5ncykgfHwge31cbiAgICAgICAgfSxcbiAgICAgICAgXCJpZXRmX2xhbmdfcmVnZXhcIiA6IC9eKHhcXC0pP1thLXpdezIsfShcXC1cXHd7Mix9KT8oXFwtXFx3ezIsfSk/JC8sXG4gICAgICAgIFwibWV0aG9kc1wiIDoge31cbiAgICB9O1xuLy8gc3RhcnQgaTE4blxuXG5cbiAgICAvKipcbiAgICAgKiBHZXQgbGFuZ3VhZ2UsIGZhbGxiYWNrIHRvIGJyb3dzZXIncyBsYW5ndWFnZSBpZiBlbXB0eVxuICAgICAqXG4gICAgICogSUVURjogUkZDIDU2NDYsIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM1NjQ2XG4gICAgICogRXhhbXBsZXM6IGVuLCB6aC1DTiwgY21uLUhhbnMtQ04sIHNyLUxhdG4tUlMsIGVzLTQxOSwgeC1wcml2YXRlXG4gICAgICovXG4gICAgaTE4bi5nZXRMYW5ndWFnZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGxhbmd1YWdlID0gaTE4bi5sb2NhbGUubGFuZ3VhZ2UgfHwgd2luZG93Lm5hdmlnYXRvci51c2VyTGFuZ3VhZ2UgfHwgd2luZG93Lm5hdmlnYXRvci5sYW5ndWFnZTtcbiAgICAgICAgcmV0dXJuIGkxOG4uaWV0Zl9sYW5nX3JlZ2V4LmV4ZWMobGFuZ3VhZ2UpID8gbGFuZ3VhZ2UgOiBudWxsO1xuXG4gICAgICAgIC8vKFdBUzogY29udmVydCB0byBpc28gNjM5LTEgKDItbGV0dGVycywgbG93ZXIgY2FzZSkpXG4gICAgICAgIC8vcmV0dXJuIGxhbmd1YWdlLnN1YnN0cigwLCAyKS50b0xvd2VyQ2FzZSgpO1xuICAgIH07XG5cbiAgICAvLyBpMThuIGZpeGVzIGZvciBjb21wYXRpYmlsaXR5IHdpdGggV29yZFByZXNzXG4gICAgaWYgKCB0eXBlb2YgbWVqc0wxMG4gIT0gJ3VuZGVmaW5lZCcgKSB7XG4gICAgICAgIGkxOG4ubG9jYWxlLmxhbmd1YWdlID0gbWVqc0wxMG4ubGFuZ3VhZ2U7XG4gICAgfVxuXG5cblxuICAgIC8qKlxuICAgICAqIEVuY29kZSBzcGVjaWFsIGNoYXJhY3RlcnMgaW4gYSBwbGFpbi10ZXh0IHN0cmluZyBmb3IgZGlzcGxheSBhcyBIVE1MLlxuICAgICAqL1xuICAgIGkxOG4ubWV0aG9kcy5jaGVja1BsYWluID0gZnVuY3Rpb24gKHN0cikge1xuICAgICAgICB2YXIgY2hhcmFjdGVyLCByZWdleCxcbiAgICAgICAgcmVwbGFjZSA9IHtcbiAgICAgICAgICAgICcmJzogJyZhbXA7JyxcbiAgICAgICAgICAgICdcIic6ICcmcXVvdDsnLFxuICAgICAgICAgICAgJzwnOiAnJmx0OycsXG4gICAgICAgICAgICAnPic6ICcmZ3Q7J1xuICAgICAgICB9O1xuICAgICAgICBzdHIgPSBTdHJpbmcoc3RyKTtcbiAgICAgICAgZm9yIChjaGFyYWN0ZXIgaW4gcmVwbGFjZSkge1xuICAgICAgICAgICAgaWYgKHJlcGxhY2UuaGFzT3duUHJvcGVydHkoY2hhcmFjdGVyKSkge1xuICAgICAgICAgICAgICAgIHJlZ2V4ID0gbmV3IFJlZ0V4cChjaGFyYWN0ZXIsICdnJyk7XG4gICAgICAgICAgICAgICAgc3RyID0gc3RyLnJlcGxhY2UocmVnZXgsIHJlcGxhY2VbY2hhcmFjdGVyXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0cjtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogVHJhbnNsYXRlIHN0cmluZ3MgdG8gdGhlIHBhZ2UgbGFuZ3VhZ2Ugb3IgYSBnaXZlbiBsYW5ndWFnZS5cbiAgICAgKlxuICAgICAqXG4gICAgICogQHBhcmFtIHN0clxuICAgICAqICAgQSBzdHJpbmcgY29udGFpbmluZyB0aGUgRW5nbGlzaCBzdHJpbmcgdG8gdHJhbnNsYXRlLlxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgIC0gJ2NvbnRleHQnIChkZWZhdWx0cyB0byB0aGUgZGVmYXVsdCBjb250ZXh0KTogVGhlIGNvbnRleHQgdGhlIHNvdXJjZSBzdHJpbmdcbiAgICAgKiAgICAgYmVsb25ncyB0by5cbiAgICAgKlxuICAgICAqIEByZXR1cm5cbiAgICAgKiAgIFRoZSB0cmFuc2xhdGVkIHN0cmluZywgZXNjYXBlZCB2aWEgaTE4bi5tZXRob2RzLmNoZWNrUGxhaW4oKVxuICAgICAqL1xuICAgIGkxOG4ubWV0aG9kcy50ID0gZnVuY3Rpb24gKHN0ciwgb3B0aW9ucykge1xuXG4gICAgICAgIC8vIEZldGNoIHRoZSBsb2NhbGl6ZWQgdmVyc2lvbiBvZiB0aGUgc3RyaW5nLlxuICAgICAgICBpZiAoaTE4bi5sb2NhbGUuc3RyaW5ncyAmJiBpMThuLmxvY2FsZS5zdHJpbmdzW29wdGlvbnMuY29udGV4dF0gJiYgaTE4bi5sb2NhbGUuc3RyaW5nc1tvcHRpb25zLmNvbnRleHRdW3N0cl0pIHtcbiAgICAgICAgICAgIHN0ciA9IGkxOG4ubG9jYWxlLnN0cmluZ3Nbb3B0aW9ucy5jb250ZXh0XVtzdHJdO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGkxOG4ubWV0aG9kcy5jaGVja1BsYWluKHN0cik7XG4gICAgfTtcblxuXG4gICAgLyoqXG4gICAgICogV3JhcHBlciBmb3IgaTE4bi5tZXRob2RzLnQoKVxuICAgICAqXG4gICAgICogQHNlZSBpMThuLm1ldGhvZHMudCgpXG4gICAgICogQHRocm93cyBJbnZhbGlkQXJndW1lbnRFeGNlcHRpb25cbiAgICAgKi9cbiAgICBpMThuLnQgPSBmdW5jdGlvbihzdHIsIG9wdGlvbnMpIHtcblxuICAgICAgICBpZiAodHlwZW9mIHN0ciA9PT0gJ3N0cmluZycgJiYgc3RyLmxlbmd0aCA+IDApIHtcblxuICAgICAgICAgICAgLy8gY2hlY2sgZXZlcnkgdGltZSBkdWUgbGFuZ3VhZ2UgY2FuIGNoYW5nZSBmb3JcbiAgICAgICAgICAgIC8vIGRpZmZlcmVudCByZWFzb25zICh0cmFuc2xhdGlvbiwgbGFuZyBzd2l0Y2hlciAuLilcbiAgICAgICAgICAgIHZhciBsYW5ndWFnZSA9IGkxOG4uZ2V0TGFuZ3VhZ2UoKTtcblxuICAgICAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge1xuICAgICAgICAgICAgICAgIFwiY29udGV4dFwiIDogbGFuZ3VhZ2VcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHJldHVybiBpMThuLm1ldGhvZHMudChzdHIsIG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cge1xuICAgICAgICAgICAgICAgIFwibmFtZVwiIDogJ0ludmFsaWRBcmd1bWVudEV4Y2VwdGlvbicsXG4gICAgICAgICAgICAgICAgXCJtZXNzYWdlXCIgOiAnRmlyc3QgYXJndW1lbnQgaXMgZWl0aGVyIG5vdCBhIHN0cmluZyBvciBlbXB0eS4nXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfTtcblxuLy8gZW5kIGkxOG5cbiAgICBleHBvcnRzLmkxOG4gPSBpMThuO1xufShkb2N1bWVudCwgbWVqcykpO1xuXG4vLyBpMThuIGZpeGVzIGZvciBjb21wYXRpYmlsaXR5IHdpdGggV29yZFByZXNzXG47KGZ1bmN0aW9uKGV4cG9ydHMsIHVuZGVmaW5lZCkge1xuXG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICBpZiAoIHR5cGVvZiBtZWpzTDEwbiAhPSAndW5kZWZpbmVkJyApIHtcbiAgICAgICAgZXhwb3J0c1ttZWpzTDEwbi5sYW5ndWFnZV0gPSBtZWpzTDEwbi5zdHJpbmdzO1xuICAgIH1cblxufShtZWpzLmkxOG4ubG9jYWxlLnN0cmluZ3MpKTtcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJvTWZwQW5cIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi8uLi9ib3dlcl9jb21wb25lbnRzL21lZGlhZWxlbWVudC9idWlsZC9tZWRpYWVsZW1lbnQuanNcIixcIi8uLi8uLi9ib3dlcl9jb21wb25lbnRzL21lZGlhZWxlbWVudC9idWlsZFwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbi8qIVxuICogVGhlIGJ1ZmZlciBtb2R1bGUgZnJvbSBub2RlLmpzLCBmb3IgdGhlIGJyb3dzZXIuXG4gKlxuICogQGF1dGhvciAgIEZlcm9zcyBBYm91a2hhZGlqZWggPGZlcm9zc0BmZXJvc3Mub3JnPiA8aHR0cDovL2Zlcm9zcy5vcmc+XG4gKiBAbGljZW5zZSAgTUlUXG4gKi9cblxudmFyIGJhc2U2NCA9IHJlcXVpcmUoJ2Jhc2U2NC1qcycpXG52YXIgaWVlZTc1NCA9IHJlcXVpcmUoJ2llZWU3NTQnKVxuXG5leHBvcnRzLkJ1ZmZlciA9IEJ1ZmZlclxuZXhwb3J0cy5TbG93QnVmZmVyID0gQnVmZmVyXG5leHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTID0gNTBcbkJ1ZmZlci5wb29sU2l6ZSA9IDgxOTJcblxuLyoqXG4gKiBJZiBgQnVmZmVyLl91c2VUeXBlZEFycmF5c2A6XG4gKiAgID09PSB0cnVlICAgIFVzZSBVaW50OEFycmF5IGltcGxlbWVudGF0aW9uIChmYXN0ZXN0KVxuICogICA9PT0gZmFsc2UgICBVc2UgT2JqZWN0IGltcGxlbWVudGF0aW9uIChjb21wYXRpYmxlIGRvd24gdG8gSUU2KVxuICovXG5CdWZmZXIuX3VzZVR5cGVkQXJyYXlzID0gKGZ1bmN0aW9uICgpIHtcbiAgLy8gRGV0ZWN0IGlmIGJyb3dzZXIgc3VwcG9ydHMgVHlwZWQgQXJyYXlzLiBTdXBwb3J0ZWQgYnJvd3NlcnMgYXJlIElFIDEwKywgRmlyZWZveCA0KyxcbiAgLy8gQ2hyb21lIDcrLCBTYWZhcmkgNS4xKywgT3BlcmEgMTEuNissIGlPUyA0LjIrLiBJZiB0aGUgYnJvd3NlciBkb2VzIG5vdCBzdXBwb3J0IGFkZGluZ1xuICAvLyBwcm9wZXJ0aWVzIHRvIGBVaW50OEFycmF5YCBpbnN0YW5jZXMsIHRoZW4gdGhhdCdzIHRoZSBzYW1lIGFzIG5vIGBVaW50OEFycmF5YCBzdXBwb3J0XG4gIC8vIGJlY2F1c2Ugd2UgbmVlZCB0byBiZSBhYmxlIHRvIGFkZCBhbGwgdGhlIG5vZGUgQnVmZmVyIEFQSSBtZXRob2RzLiBUaGlzIGlzIGFuIGlzc3VlXG4gIC8vIGluIEZpcmVmb3ggNC0yOS4gTm93IGZpeGVkOiBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD02OTU0MzhcbiAgdHJ5IHtcbiAgICB2YXIgYnVmID0gbmV3IEFycmF5QnVmZmVyKDApXG4gICAgdmFyIGFyciA9IG5ldyBVaW50OEFycmF5KGJ1ZilcbiAgICBhcnIuZm9vID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gNDIgfVxuICAgIHJldHVybiA0MiA9PT0gYXJyLmZvbygpICYmXG4gICAgICAgIHR5cGVvZiBhcnIuc3ViYXJyYXkgPT09ICdmdW5jdGlvbicgLy8gQ2hyb21lIDktMTAgbGFjayBgc3ViYXJyYXlgXG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufSkoKVxuXG4vKipcbiAqIENsYXNzOiBCdWZmZXJcbiAqID09PT09PT09PT09PT1cbiAqXG4gKiBUaGUgQnVmZmVyIGNvbnN0cnVjdG9yIHJldHVybnMgaW5zdGFuY2VzIG9mIGBVaW50OEFycmF5YCB0aGF0IGFyZSBhdWdtZW50ZWRcbiAqIHdpdGggZnVuY3Rpb24gcHJvcGVydGllcyBmb3IgYWxsIHRoZSBub2RlIGBCdWZmZXJgIEFQSSBmdW5jdGlvbnMuIFdlIHVzZVxuICogYFVpbnQ4QXJyYXlgIHNvIHRoYXQgc3F1YXJlIGJyYWNrZXQgbm90YXRpb24gd29ya3MgYXMgZXhwZWN0ZWQgLS0gaXQgcmV0dXJuc1xuICogYSBzaW5nbGUgb2N0ZXQuXG4gKlxuICogQnkgYXVnbWVudGluZyB0aGUgaW5zdGFuY2VzLCB3ZSBjYW4gYXZvaWQgbW9kaWZ5aW5nIHRoZSBgVWludDhBcnJheWBcbiAqIHByb3RvdHlwZS5cbiAqL1xuZnVuY3Rpb24gQnVmZmVyIChzdWJqZWN0LCBlbmNvZGluZywgbm9aZXJvKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBCdWZmZXIpKVxuICAgIHJldHVybiBuZXcgQnVmZmVyKHN1YmplY3QsIGVuY29kaW5nLCBub1plcm8pXG5cbiAgdmFyIHR5cGUgPSB0eXBlb2Ygc3ViamVjdFxuXG4gIC8vIFdvcmthcm91bmQ6IG5vZGUncyBiYXNlNjQgaW1wbGVtZW50YXRpb24gYWxsb3dzIGZvciBub24tcGFkZGVkIHN0cmluZ3NcbiAgLy8gd2hpbGUgYmFzZTY0LWpzIGRvZXMgbm90LlxuICBpZiAoZW5jb2RpbmcgPT09ICdiYXNlNjQnICYmIHR5cGUgPT09ICdzdHJpbmcnKSB7XG4gICAgc3ViamVjdCA9IHN0cmluZ3RyaW0oc3ViamVjdClcbiAgICB3aGlsZSAoc3ViamVjdC5sZW5ndGggJSA0ICE9PSAwKSB7XG4gICAgICBzdWJqZWN0ID0gc3ViamVjdCArICc9J1xuICAgIH1cbiAgfVxuXG4gIC8vIEZpbmQgdGhlIGxlbmd0aFxuICB2YXIgbGVuZ3RoXG4gIGlmICh0eXBlID09PSAnbnVtYmVyJylcbiAgICBsZW5ndGggPSBjb2VyY2Uoc3ViamVjdClcbiAgZWxzZSBpZiAodHlwZSA9PT0gJ3N0cmluZycpXG4gICAgbGVuZ3RoID0gQnVmZmVyLmJ5dGVMZW5ndGgoc3ViamVjdCwgZW5jb2RpbmcpXG4gIGVsc2UgaWYgKHR5cGUgPT09ICdvYmplY3QnKVxuICAgIGxlbmd0aCA9IGNvZXJjZShzdWJqZWN0Lmxlbmd0aCkgLy8gYXNzdW1lIHRoYXQgb2JqZWN0IGlzIGFycmF5LWxpa2VcbiAgZWxzZVxuICAgIHRocm93IG5ldyBFcnJvcignRmlyc3QgYXJndW1lbnQgbmVlZHMgdG8gYmUgYSBudW1iZXIsIGFycmF5IG9yIHN0cmluZy4nKVxuXG4gIHZhciBidWZcbiAgaWYgKEJ1ZmZlci5fdXNlVHlwZWRBcnJheXMpIHtcbiAgICAvLyBQcmVmZXJyZWQ6IFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlIGZvciBiZXN0IHBlcmZvcm1hbmNlXG4gICAgYnVmID0gQnVmZmVyLl9hdWdtZW50KG5ldyBVaW50OEFycmF5KGxlbmd0aCkpXG4gIH0gZWxzZSB7XG4gICAgLy8gRmFsbGJhY2s6IFJldHVybiBUSElTIGluc3RhbmNlIG9mIEJ1ZmZlciAoY3JlYXRlZCBieSBgbmV3YClcbiAgICBidWYgPSB0aGlzXG4gICAgYnVmLmxlbmd0aCA9IGxlbmd0aFxuICAgIGJ1Zi5faXNCdWZmZXIgPSB0cnVlXG4gIH1cblxuICB2YXIgaVxuICBpZiAoQnVmZmVyLl91c2VUeXBlZEFycmF5cyAmJiB0eXBlb2Ygc3ViamVjdC5ieXRlTGVuZ3RoID09PSAnbnVtYmVyJykge1xuICAgIC8vIFNwZWVkIG9wdGltaXphdGlvbiAtLSB1c2Ugc2V0IGlmIHdlJ3JlIGNvcHlpbmcgZnJvbSBhIHR5cGVkIGFycmF5XG4gICAgYnVmLl9zZXQoc3ViamVjdClcbiAgfSBlbHNlIGlmIChpc0FycmF5aXNoKHN1YmplY3QpKSB7XG4gICAgLy8gVHJlYXQgYXJyYXktaXNoIG9iamVjdHMgYXMgYSBieXRlIGFycmF5XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoQnVmZmVyLmlzQnVmZmVyKHN1YmplY3QpKVxuICAgICAgICBidWZbaV0gPSBzdWJqZWN0LnJlYWRVSW50OChpKVxuICAgICAgZWxzZVxuICAgICAgICBidWZbaV0gPSBzdWJqZWN0W2ldXG4gICAgfVxuICB9IGVsc2UgaWYgKHR5cGUgPT09ICdzdHJpbmcnKSB7XG4gICAgYnVmLndyaXRlKHN1YmplY3QsIDAsIGVuY29kaW5nKVxuICB9IGVsc2UgaWYgKHR5cGUgPT09ICdudW1iZXInICYmICFCdWZmZXIuX3VzZVR5cGVkQXJyYXlzICYmICFub1plcm8pIHtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIGJ1ZltpXSA9IDBcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYnVmXG59XG5cbi8vIFNUQVRJQyBNRVRIT0RTXG4vLyA9PT09PT09PT09PT09PVxuXG5CdWZmZXIuaXNFbmNvZGluZyA9IGZ1bmN0aW9uIChlbmNvZGluZykge1xuICBzd2l0Y2ggKFN0cmluZyhlbmNvZGluZykudG9Mb3dlckNhc2UoKSkge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICBjYXNlICdiaW5hcnknOlxuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgY2FzZSAncmF3JzpcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0dXJuIHRydWVcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuQnVmZmVyLmlzQnVmZmVyID0gZnVuY3Rpb24gKGIpIHtcbiAgcmV0dXJuICEhKGIgIT09IG51bGwgJiYgYiAhPT0gdW5kZWZpbmVkICYmIGIuX2lzQnVmZmVyKVxufVxuXG5CdWZmZXIuYnl0ZUxlbmd0aCA9IGZ1bmN0aW9uIChzdHIsIGVuY29kaW5nKSB7XG4gIHZhciByZXRcbiAgc3RyID0gc3RyICsgJydcbiAgc3dpdGNoIChlbmNvZGluZyB8fCAndXRmOCcpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgICAgcmV0ID0gc3RyLmxlbmd0aCAvIDJcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0ID0gdXRmOFRvQnl0ZXMoc3RyKS5sZW5ndGhcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYXNjaWknOlxuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgY2FzZSAncmF3JzpcbiAgICAgIHJldCA9IHN0ci5sZW5ndGhcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgIHJldCA9IGJhc2U2NFRvQnl0ZXMoc3RyKS5sZW5ndGhcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldCA9IHN0ci5sZW5ndGggKiAyXG4gICAgICBicmVha1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gZW5jb2RpbmcnKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuQnVmZmVyLmNvbmNhdCA9IGZ1bmN0aW9uIChsaXN0LCB0b3RhbExlbmd0aCkge1xuICBhc3NlcnQoaXNBcnJheShsaXN0KSwgJ1VzYWdlOiBCdWZmZXIuY29uY2F0KGxpc3QsIFt0b3RhbExlbmd0aF0pXFxuJyArXG4gICAgICAnbGlzdCBzaG91bGQgYmUgYW4gQXJyYXkuJylcblxuICBpZiAobGlzdC5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gbmV3IEJ1ZmZlcigwKVxuICB9IGVsc2UgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgcmV0dXJuIGxpc3RbMF1cbiAgfVxuXG4gIHZhciBpXG4gIGlmICh0eXBlb2YgdG90YWxMZW5ndGggIT09ICdudW1iZXInKSB7XG4gICAgdG90YWxMZW5ndGggPSAwXG4gICAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRvdGFsTGVuZ3RoICs9IGxpc3RbaV0ubGVuZ3RoXG4gICAgfVxuICB9XG5cbiAgdmFyIGJ1ZiA9IG5ldyBCdWZmZXIodG90YWxMZW5ndGgpXG4gIHZhciBwb3MgPSAwXG4gIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGl0ZW0gPSBsaXN0W2ldXG4gICAgaXRlbS5jb3B5KGJ1ZiwgcG9zKVxuICAgIHBvcyArPSBpdGVtLmxlbmd0aFxuICB9XG4gIHJldHVybiBidWZcbn1cblxuLy8gQlVGRkVSIElOU1RBTkNFIE1FVEhPRFNcbi8vID09PT09PT09PT09PT09PT09PT09PT09XG5cbmZ1bmN0aW9uIF9oZXhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIG9mZnNldCA9IE51bWJlcihvZmZzZXQpIHx8IDBcbiAgdmFyIHJlbWFpbmluZyA9IGJ1Zi5sZW5ndGggLSBvZmZzZXRcbiAgaWYgKCFsZW5ndGgpIHtcbiAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgfSBlbHNlIHtcbiAgICBsZW5ndGggPSBOdW1iZXIobGVuZ3RoKVxuICAgIGlmIChsZW5ndGggPiByZW1haW5pbmcpIHtcbiAgICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICAgIH1cbiAgfVxuXG4gIC8vIG11c3QgYmUgYW4gZXZlbiBudW1iZXIgb2YgZGlnaXRzXG4gIHZhciBzdHJMZW4gPSBzdHJpbmcubGVuZ3RoXG4gIGFzc2VydChzdHJMZW4gJSAyID09PSAwLCAnSW52YWxpZCBoZXggc3RyaW5nJylcblxuICBpZiAobGVuZ3RoID4gc3RyTGVuIC8gMikge1xuICAgIGxlbmd0aCA9IHN0ckxlbiAvIDJcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGJ5dGUgPSBwYXJzZUludChzdHJpbmcuc3Vic3RyKGkgKiAyLCAyKSwgMTYpXG4gICAgYXNzZXJ0KCFpc05hTihieXRlKSwgJ0ludmFsaWQgaGV4IHN0cmluZycpXG4gICAgYnVmW29mZnNldCArIGldID0gYnl0ZVxuICB9XG4gIEJ1ZmZlci5fY2hhcnNXcml0dGVuID0gaSAqIDJcbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gX3V0ZjhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBjaGFyc1dyaXR0ZW4gPSBCdWZmZXIuX2NoYXJzV3JpdHRlbiA9XG4gICAgYmxpdEJ1ZmZlcih1dGY4VG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxuICByZXR1cm4gY2hhcnNXcml0dGVuXG59XG5cbmZ1bmN0aW9uIF9hc2NpaVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgdmFyIGNoYXJzV3JpdHRlbiA9IEJ1ZmZlci5fY2hhcnNXcml0dGVuID1cbiAgICBibGl0QnVmZmVyKGFzY2lpVG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxuICByZXR1cm4gY2hhcnNXcml0dGVuXG59XG5cbmZ1bmN0aW9uIF9iaW5hcnlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBfYXNjaWlXcml0ZShidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIF9iYXNlNjRXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBjaGFyc1dyaXR0ZW4gPSBCdWZmZXIuX2NoYXJzV3JpdHRlbiA9XG4gICAgYmxpdEJ1ZmZlcihiYXNlNjRUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG4gIHJldHVybiBjaGFyc1dyaXR0ZW5cbn1cblxuZnVuY3Rpb24gX3V0ZjE2bGVXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBjaGFyc1dyaXR0ZW4gPSBCdWZmZXIuX2NoYXJzV3JpdHRlbiA9XG4gICAgYmxpdEJ1ZmZlcih1dGYxNmxlVG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxuICByZXR1cm4gY2hhcnNXcml0dGVuXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpIHtcbiAgLy8gU3VwcG9ydCBib3RoIChzdHJpbmcsIG9mZnNldCwgbGVuZ3RoLCBlbmNvZGluZylcbiAgLy8gYW5kIHRoZSBsZWdhY3kgKHN0cmluZywgZW5jb2RpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICBpZiAoaXNGaW5pdGUob2Zmc2V0KSkge1xuICAgIGlmICghaXNGaW5pdGUobGVuZ3RoKSkge1xuICAgICAgZW5jb2RpbmcgPSBsZW5ndGhcbiAgICAgIGxlbmd0aCA9IHVuZGVmaW5lZFxuICAgIH1cbiAgfSBlbHNlIHsgIC8vIGxlZ2FjeVxuICAgIHZhciBzd2FwID0gZW5jb2RpbmdcbiAgICBlbmNvZGluZyA9IG9mZnNldFxuICAgIG9mZnNldCA9IGxlbmd0aFxuICAgIGxlbmd0aCA9IHN3YXBcbiAgfVxuXG4gIG9mZnNldCA9IE51bWJlcihvZmZzZXQpIHx8IDBcbiAgdmFyIHJlbWFpbmluZyA9IHRoaXMubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cbiAgZW5jb2RpbmcgPSBTdHJpbmcoZW5jb2RpbmcgfHwgJ3V0ZjgnKS50b0xvd2VyQ2FzZSgpXG5cbiAgdmFyIHJldFxuICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldCA9IF9oZXhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1dGY4JzpcbiAgICBjYXNlICd1dGYtOCc6XG4gICAgICByZXQgPSBfdXRmOFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgIHJldCA9IF9hc2NpaVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICByZXQgPSBfYmluYXJ5V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgIHJldCA9IF9iYXNlNjRXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0ID0gX3V0ZjE2bGVXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGVuY29kaW5nJylcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiAoZW5jb2RpbmcsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgZW5jb2RpbmcgPSBTdHJpbmcoZW5jb2RpbmcgfHwgJ3V0ZjgnKS50b0xvd2VyQ2FzZSgpXG4gIHN0YXJ0ID0gTnVtYmVyKHN0YXJ0KSB8fCAwXG4gIGVuZCA9IChlbmQgIT09IHVuZGVmaW5lZClcbiAgICA/IE51bWJlcihlbmQpXG4gICAgOiBlbmQgPSBzZWxmLmxlbmd0aFxuXG4gIC8vIEZhc3RwYXRoIGVtcHR5IHN0cmluZ3NcbiAgaWYgKGVuZCA9PT0gc3RhcnQpXG4gICAgcmV0dXJuICcnXG5cbiAgdmFyIHJldFxuICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldCA9IF9oZXhTbGljZShzZWxmLCBzdGFydCwgZW5kKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1dGY4JzpcbiAgICBjYXNlICd1dGYtOCc6XG4gICAgICByZXQgPSBfdXRmOFNsaWNlKHNlbGYsIHN0YXJ0LCBlbmQpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgIHJldCA9IF9hc2NpaVNsaWNlKHNlbGYsIHN0YXJ0LCBlbmQpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICByZXQgPSBfYmluYXJ5U2xpY2Uoc2VsZiwgc3RhcnQsIGVuZClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgIHJldCA9IF9iYXNlNjRTbGljZShzZWxmLCBzdGFydCwgZW5kKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0ID0gX3V0ZjE2bGVTbGljZShzZWxmLCBzdGFydCwgZW5kKVxuICAgICAgYnJlYWtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGVuY29kaW5nJylcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4ge1xuICAgIHR5cGU6ICdCdWZmZXInLFxuICAgIGRhdGE6IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHRoaXMuX2FyciB8fCB0aGlzLCAwKVxuICB9XG59XG5cbi8vIGNvcHkodGFyZ2V0QnVmZmVyLCB0YXJnZXRTdGFydD0wLCBzb3VyY2VTdGFydD0wLCBzb3VyY2VFbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uICh0YXJnZXQsIHRhcmdldF9zdGFydCwgc3RhcnQsIGVuZCkge1xuICB2YXIgc291cmNlID0gdGhpc1xuXG4gIGlmICghc3RhcnQpIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCAmJiBlbmQgIT09IDApIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICghdGFyZ2V0X3N0YXJ0KSB0YXJnZXRfc3RhcnQgPSAwXG5cbiAgLy8gQ29weSAwIGJ5dGVzOyB3ZSdyZSBkb25lXG4gIGlmIChlbmQgPT09IHN0YXJ0KSByZXR1cm5cbiAgaWYgKHRhcmdldC5sZW5ndGggPT09IDAgfHwgc291cmNlLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgLy8gRmF0YWwgZXJyb3IgY29uZGl0aW9uc1xuICBhc3NlcnQoZW5kID49IHN0YXJ0LCAnc291cmNlRW5kIDwgc291cmNlU3RhcnQnKVxuICBhc3NlcnQodGFyZ2V0X3N0YXJ0ID49IDAgJiYgdGFyZ2V0X3N0YXJ0IDwgdGFyZ2V0Lmxlbmd0aCxcbiAgICAgICd0YXJnZXRTdGFydCBvdXQgb2YgYm91bmRzJylcbiAgYXNzZXJ0KHN0YXJ0ID49IDAgJiYgc3RhcnQgPCBzb3VyY2UubGVuZ3RoLCAnc291cmNlU3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGFzc2VydChlbmQgPj0gMCAmJiBlbmQgPD0gc291cmNlLmxlbmd0aCwgJ3NvdXJjZUVuZCBvdXQgb2YgYm91bmRzJylcblxuICAvLyBBcmUgd2Ugb29iP1xuICBpZiAoZW5kID4gdGhpcy5sZW5ndGgpXG4gICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldC5sZW5ndGggLSB0YXJnZXRfc3RhcnQgPCBlbmQgLSBzdGFydClcbiAgICBlbmQgPSB0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0X3N0YXJ0ICsgc3RhcnRcblxuICB2YXIgbGVuID0gZW5kIC0gc3RhcnRcblxuICBpZiAobGVuIDwgMTAwIHx8ICFCdWZmZXIuX3VzZVR5cGVkQXJyYXlzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIHRhcmdldFtpICsgdGFyZ2V0X3N0YXJ0XSA9IHRoaXNbaSArIHN0YXJ0XVxuICB9IGVsc2Uge1xuICAgIHRhcmdldC5fc2V0KHRoaXMuc3ViYXJyYXkoc3RhcnQsIHN0YXJ0ICsgbGVuKSwgdGFyZ2V0X3N0YXJ0KVxuICB9XG59XG5cbmZ1bmN0aW9uIF9iYXNlNjRTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIGlmIChzdGFydCA9PT0gMCAmJiBlbmQgPT09IGJ1Zi5sZW5ndGgpIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmKVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYuc2xpY2Uoc3RhcnQsIGVuZCkpXG4gIH1cbn1cblxuZnVuY3Rpb24gX3V0ZjhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXMgPSAnJ1xuICB2YXIgdG1wID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgaWYgKGJ1ZltpXSA8PSAweDdGKSB7XG4gICAgICByZXMgKz0gZGVjb2RlVXRmOENoYXIodG1wKSArIFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldKVxuICAgICAgdG1wID0gJydcbiAgICB9IGVsc2Uge1xuICAgICAgdG1wICs9ICclJyArIGJ1ZltpXS50b1N0cmluZygxNilcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzICsgZGVjb2RlVXRmOENoYXIodG1wKVxufVxuXG5mdW5jdGlvbiBfYXNjaWlTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXQgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspXG4gICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldKVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIF9iaW5hcnlTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHJldHVybiBfYXNjaWlTbGljZShidWYsIHN0YXJ0LCBlbmQpXG59XG5cbmZ1bmN0aW9uIF9oZXhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG5cbiAgaWYgKCFzdGFydCB8fCBzdGFydCA8IDApIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCB8fCBlbmQgPCAwIHx8IGVuZCA+IGxlbikgZW5kID0gbGVuXG5cbiAgdmFyIG91dCA9ICcnXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgb3V0ICs9IHRvSGV4KGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gb3V0XG59XG5cbmZ1bmN0aW9uIF91dGYxNmxlU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgYnl0ZXMgPSBidWYuc2xpY2Uoc3RhcnQsIGVuZClcbiAgdmFyIHJlcyA9ICcnXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYnl0ZXMubGVuZ3RoOyBpICs9IDIpIHtcbiAgICByZXMgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShieXRlc1tpXSArIGJ5dGVzW2krMV0gKiAyNTYpXG4gIH1cbiAgcmV0dXJuIHJlc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnNsaWNlID0gZnVuY3Rpb24gKHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIHN0YXJ0ID0gY2xhbXAoc3RhcnQsIGxlbiwgMClcbiAgZW5kID0gY2xhbXAoZW5kLCBsZW4sIGxlbilcblxuICBpZiAoQnVmZmVyLl91c2VUeXBlZEFycmF5cykge1xuICAgIHJldHVybiBCdWZmZXIuX2F1Z21lbnQodGhpcy5zdWJhcnJheShzdGFydCwgZW5kKSlcbiAgfSBlbHNlIHtcbiAgICB2YXIgc2xpY2VMZW4gPSBlbmQgLSBzdGFydFxuICAgIHZhciBuZXdCdWYgPSBuZXcgQnVmZmVyKHNsaWNlTGVuLCB1bmRlZmluZWQsIHRydWUpXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzbGljZUxlbjsgaSsrKSB7XG4gICAgICBuZXdCdWZbaV0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gICAgcmV0dXJuIG5ld0J1ZlxuICB9XG59XG5cbi8vIGBnZXRgIHdpbGwgYmUgcmVtb3ZlZCBpbiBOb2RlIDAuMTMrXG5CdWZmZXIucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChvZmZzZXQpIHtcbiAgY29uc29sZS5sb2coJy5nZXQoKSBpcyBkZXByZWNhdGVkLiBBY2Nlc3MgdXNpbmcgYXJyYXkgaW5kZXhlcyBpbnN0ZWFkLicpXG4gIHJldHVybiB0aGlzLnJlYWRVSW50OChvZmZzZXQpXG59XG5cbi8vIGBzZXRgIHdpbGwgYmUgcmVtb3ZlZCBpbiBOb2RlIDAuMTMrXG5CdWZmZXIucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uICh2LCBvZmZzZXQpIHtcbiAgY29uc29sZS5sb2coJy5zZXQoKSBpcyBkZXByZWNhdGVkLiBBY2Nlc3MgdXNpbmcgYXJyYXkgaW5kZXhlcyBpbnN0ZWFkLicpXG4gIHJldHVybiB0aGlzLndyaXRlVUludDgodiwgb2Zmc2V0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50OCA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgPCB0aGlzLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIGlmIChvZmZzZXQgPj0gdGhpcy5sZW5ndGgpXG4gICAgcmV0dXJuXG5cbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XVxufVxuXG5mdW5jdGlvbiBfcmVhZFVJbnQxNiAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAxIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIHZhciB2YWxcbiAgaWYgKGxpdHRsZUVuZGlhbikge1xuICAgIHZhbCA9IGJ1ZltvZmZzZXRdXG4gICAgaWYgKG9mZnNldCArIDEgPCBsZW4pXG4gICAgICB2YWwgfD0gYnVmW29mZnNldCArIDFdIDw8IDhcbiAgfSBlbHNlIHtcbiAgICB2YWwgPSBidWZbb2Zmc2V0XSA8PCA4XG4gICAgaWYgKG9mZnNldCArIDEgPCBsZW4pXG4gICAgICB2YWwgfD0gYnVmW29mZnNldCArIDFdXG4gIH1cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZFVJbnQxNih0aGlzLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZFVJbnQxNih0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3JlYWRVSW50MzIgKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICB2YXIgdmFsXG4gIGlmIChsaXR0bGVFbmRpYW4pIHtcbiAgICBpZiAob2Zmc2V0ICsgMiA8IGxlbilcbiAgICAgIHZhbCA9IGJ1ZltvZmZzZXQgKyAyXSA8PCAxNlxuICAgIGlmIChvZmZzZXQgKyAxIDwgbGVuKVxuICAgICAgdmFsIHw9IGJ1ZltvZmZzZXQgKyAxXSA8PCA4XG4gICAgdmFsIHw9IGJ1ZltvZmZzZXRdXG4gICAgaWYgKG9mZnNldCArIDMgPCBsZW4pXG4gICAgICB2YWwgPSB2YWwgKyAoYnVmW29mZnNldCArIDNdIDw8IDI0ID4+PiAwKVxuICB9IGVsc2Uge1xuICAgIGlmIChvZmZzZXQgKyAxIDwgbGVuKVxuICAgICAgdmFsID0gYnVmW29mZnNldCArIDFdIDw8IDE2XG4gICAgaWYgKG9mZnNldCArIDIgPCBsZW4pXG4gICAgICB2YWwgfD0gYnVmW29mZnNldCArIDJdIDw8IDhcbiAgICBpZiAob2Zmc2V0ICsgMyA8IGxlbilcbiAgICAgIHZhbCB8PSBidWZbb2Zmc2V0ICsgM11cbiAgICB2YWwgPSB2YWwgKyAoYnVmW29mZnNldF0gPDwgMjQgPj4+IDApXG4gIH1cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZFVJbnQzMih0aGlzLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZFVJbnQzMih0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50OCA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLFxuICAgICAgICAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgPCB0aGlzLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIGlmIChvZmZzZXQgPj0gdGhpcy5sZW5ndGgpXG4gICAgcmV0dXJuXG5cbiAgdmFyIG5lZyA9IHRoaXNbb2Zmc2V0XSAmIDB4ODBcbiAgaWYgKG5lZylcbiAgICByZXR1cm4gKDB4ZmYgLSB0aGlzW29mZnNldF0gKyAxKSAqIC0xXG4gIGVsc2VcbiAgICByZXR1cm4gdGhpc1tvZmZzZXRdXG59XG5cbmZ1bmN0aW9uIF9yZWFkSW50MTYgKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMSA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICB2YXIgdmFsID0gX3JlYWRVSW50MTYoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgdHJ1ZSlcbiAgdmFyIG5lZyA9IHZhbCAmIDB4ODAwMFxuICBpZiAobmVnKVxuICAgIHJldHVybiAoMHhmZmZmIC0gdmFsICsgMSkgKiAtMVxuICBlbHNlXG4gICAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkSW50MTYodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZEludDE2KHRoaXMsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfcmVhZEludDMyIChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDMgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgdmFyIHZhbCA9IF9yZWFkVUludDMyKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIHRydWUpXG4gIHZhciBuZWcgPSB2YWwgJiAweDgwMDAwMDAwXG4gIGlmIChuZWcpXG4gICAgcmV0dXJuICgweGZmZmZmZmZmIC0gdmFsICsgMSkgKiAtMVxuICBlbHNlXG4gICAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkSW50MzIodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZEludDMyKHRoaXMsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfcmVhZEZsb2F0IChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgKyAzIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIHJldHVybiBpZWVlNzU0LnJlYWQoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0TEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRGbG9hdCh0aGlzLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdEJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkRmxvYXQodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF9yZWFkRG91YmxlIChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgKyA3IDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIHJldHVybiBpZWVlNzU0LnJlYWQoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgNTIsIDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkRG91YmxlKHRoaXMsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkRG91YmxlKHRoaXMsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDggPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0IDwgdGhpcy5sZW5ndGgsICd0cnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmdWludCh2YWx1ZSwgMHhmZilcbiAgfVxuXG4gIGlmIChvZmZzZXQgPj0gdGhpcy5sZW5ndGgpIHJldHVyblxuXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlXG59XG5cbmZ1bmN0aW9uIF93cml0ZVVJbnQxNiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAxIDwgYnVmLmxlbmd0aCwgJ3RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZ1aW50KHZhbHVlLCAweGZmZmYpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBmb3IgKHZhciBpID0gMCwgaiA9IE1hdGgubWluKGxlbiAtIG9mZnNldCwgMik7IGkgPCBqOyBpKyspIHtcbiAgICBidWZbb2Zmc2V0ICsgaV0gPVxuICAgICAgICAodmFsdWUgJiAoMHhmZiA8PCAoOCAqIChsaXR0bGVFbmRpYW4gPyBpIDogMSAtIGkpKSkpID4+PlxuICAgICAgICAgICAgKGxpdHRsZUVuZGlhbiA/IGkgOiAxIC0gaSkgKiA4XG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF93cml0ZVVJbnQzMiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAzIDwgYnVmLmxlbmd0aCwgJ3RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZ1aW50KHZhbHVlLCAweGZmZmZmZmZmKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgZm9yICh2YXIgaSA9IDAsIGogPSBNYXRoLm1pbihsZW4gLSBvZmZzZXQsIDQpOyBpIDwgajsgaSsrKSB7XG4gICAgYnVmW29mZnNldCArIGldID1cbiAgICAgICAgKHZhbHVlID4+PiAobGl0dGxlRW5kaWFuID8gaSA6IDMgLSBpKSAqIDgpICYgMHhmZlxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50OCA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgPCB0aGlzLmxlbmd0aCwgJ1RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZzaW50KHZhbHVlLCAweDdmLCAtMHg4MClcbiAgfVxuXG4gIGlmIChvZmZzZXQgPj0gdGhpcy5sZW5ndGgpXG4gICAgcmV0dXJuXG5cbiAgaWYgKHZhbHVlID49IDApXG4gICAgdGhpcy53cml0ZVVJbnQ4KHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KVxuICBlbHNlXG4gICAgdGhpcy53cml0ZVVJbnQ4KDB4ZmYgKyB2YWx1ZSArIDEsIG9mZnNldCwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF93cml0ZUludDE2IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDEgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZnNpbnQodmFsdWUsIDB4N2ZmZiwgLTB4ODAwMClcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIGlmICh2YWx1ZSA+PSAwKVxuICAgIF93cml0ZVVJbnQxNihidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpXG4gIGVsc2VcbiAgICBfd3JpdGVVSW50MTYoYnVmLCAweGZmZmYgKyB2YWx1ZSArIDEsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2TEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3dyaXRlSW50MzIgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmc2ludCh2YWx1ZSwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBpZiAodmFsdWUgPj0gMClcbiAgICBfd3JpdGVVSW50MzIoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KVxuICBlbHNlXG4gICAgX3dyaXRlVUludDMyKGJ1ZiwgMHhmZmZmZmZmZiArIHZhbHVlICsgMSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyQkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfd3JpdGVGbG9hdCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAzIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZJRUVFNzU0KHZhbHVlLCAzLjQwMjgyMzQ2NjM4NTI4ODZlKzM4LCAtMy40MDI4MjM0NjYzODUyODg2ZSszOClcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0QkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfd3JpdGVEb3VibGUgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgNyA8IGJ1Zi5sZW5ndGgsXG4gICAgICAgICdUcnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmSUVFRTc1NCh2YWx1ZSwgMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgsIC0xLjc5NzY5MzEzNDg2MjMxNTdFKzMwOClcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDUyLCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlTEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlQkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuLy8gZmlsbCh2YWx1ZSwgc3RhcnQ9MCwgZW5kPWJ1ZmZlci5sZW5ndGgpXG5CdWZmZXIucHJvdG90eXBlLmZpbGwgPSBmdW5jdGlvbiAodmFsdWUsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKCF2YWx1ZSkgdmFsdWUgPSAwXG4gIGlmICghc3RhcnQpIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCkgZW5kID0gdGhpcy5sZW5ndGhcblxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgIHZhbHVlID0gdmFsdWUuY2hhckNvZGVBdCgwKVxuICB9XG5cbiAgYXNzZXJ0KHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicgJiYgIWlzTmFOKHZhbHVlKSwgJ3ZhbHVlIGlzIG5vdCBhIG51bWJlcicpXG4gIGFzc2VydChlbmQgPj0gc3RhcnQsICdlbmQgPCBzdGFydCcpXG5cbiAgLy8gRmlsbCAwIGJ5dGVzOyB3ZSdyZSBkb25lXG4gIGlmIChlbmQgPT09IHN0YXJ0KSByZXR1cm5cbiAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm5cblxuICBhc3NlcnQoc3RhcnQgPj0gMCAmJiBzdGFydCA8IHRoaXMubGVuZ3RoLCAnc3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGFzc2VydChlbmQgPj0gMCAmJiBlbmQgPD0gdGhpcy5sZW5ndGgsICdlbmQgb3V0IG9mIGJvdW5kcycpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICB0aGlzW2ldID0gdmFsdWVcbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluc3BlY3QgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBvdXQgPSBbXVxuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgIG91dFtpXSA9IHRvSGV4KHRoaXNbaV0pXG4gICAgaWYgKGkgPT09IGV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVMpIHtcbiAgICAgIG91dFtpICsgMV0gPSAnLi4uJ1xuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cbiAgcmV0dXJuICc8QnVmZmVyICcgKyBvdXQuam9pbignICcpICsgJz4nXG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBgQXJyYXlCdWZmZXJgIHdpdGggdGhlICpjb3BpZWQqIG1lbW9yeSBvZiB0aGUgYnVmZmVyIGluc3RhbmNlLlxuICogQWRkZWQgaW4gTm9kZSAwLjEyLiBPbmx5IGF2YWlsYWJsZSBpbiBicm93c2VycyB0aGF0IHN1cHBvcnQgQXJyYXlCdWZmZXIuXG4gKi9cbkJ1ZmZlci5wcm90b3R5cGUudG9BcnJheUJ1ZmZlciA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHR5cGVvZiBVaW50OEFycmF5ICE9PSAndW5kZWZpbmVkJykge1xuICAgIGlmIChCdWZmZXIuX3VzZVR5cGVkQXJyYXlzKSB7XG4gICAgICByZXR1cm4gKG5ldyBCdWZmZXIodGhpcykpLmJ1ZmZlclxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgYnVmID0gbmV3IFVpbnQ4QXJyYXkodGhpcy5sZW5ndGgpXG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gYnVmLmxlbmd0aDsgaSA8IGxlbjsgaSArPSAxKVxuICAgICAgICBidWZbaV0gPSB0aGlzW2ldXG4gICAgICByZXR1cm4gYnVmLmJ1ZmZlclxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0J1ZmZlci50b0FycmF5QnVmZmVyIG5vdCBzdXBwb3J0ZWQgaW4gdGhpcyBicm93c2VyJylcbiAgfVxufVxuXG4vLyBIRUxQRVIgRlVOQ1RJT05TXG4vLyA9PT09PT09PT09PT09PT09XG5cbmZ1bmN0aW9uIHN0cmluZ3RyaW0gKHN0cikge1xuICBpZiAoc3RyLnRyaW0pIHJldHVybiBzdHIudHJpbSgpXG4gIHJldHVybiBzdHIucmVwbGFjZSgvXlxccyt8XFxzKyQvZywgJycpXG59XG5cbnZhciBCUCA9IEJ1ZmZlci5wcm90b3R5cGVcblxuLyoqXG4gKiBBdWdtZW50IGEgVWludDhBcnJheSAqaW5zdGFuY2UqIChub3QgdGhlIFVpbnQ4QXJyYXkgY2xhc3MhKSB3aXRoIEJ1ZmZlciBtZXRob2RzXG4gKi9cbkJ1ZmZlci5fYXVnbWVudCA9IGZ1bmN0aW9uIChhcnIpIHtcbiAgYXJyLl9pc0J1ZmZlciA9IHRydWVcblxuICAvLyBzYXZlIHJlZmVyZW5jZSB0byBvcmlnaW5hbCBVaW50OEFycmF5IGdldC9zZXQgbWV0aG9kcyBiZWZvcmUgb3ZlcndyaXRpbmdcbiAgYXJyLl9nZXQgPSBhcnIuZ2V0XG4gIGFyci5fc2V0ID0gYXJyLnNldFxuXG4gIC8vIGRlcHJlY2F0ZWQsIHdpbGwgYmUgcmVtb3ZlZCBpbiBub2RlIDAuMTMrXG4gIGFyci5nZXQgPSBCUC5nZXRcbiAgYXJyLnNldCA9IEJQLnNldFxuXG4gIGFyci53cml0ZSA9IEJQLndyaXRlXG4gIGFyci50b1N0cmluZyA9IEJQLnRvU3RyaW5nXG4gIGFyci50b0xvY2FsZVN0cmluZyA9IEJQLnRvU3RyaW5nXG4gIGFyci50b0pTT04gPSBCUC50b0pTT05cbiAgYXJyLmNvcHkgPSBCUC5jb3B5XG4gIGFyci5zbGljZSA9IEJQLnNsaWNlXG4gIGFyci5yZWFkVUludDggPSBCUC5yZWFkVUludDhcbiAgYXJyLnJlYWRVSW50MTZMRSA9IEJQLnJlYWRVSW50MTZMRVxuICBhcnIucmVhZFVJbnQxNkJFID0gQlAucmVhZFVJbnQxNkJFXG4gIGFyci5yZWFkVUludDMyTEUgPSBCUC5yZWFkVUludDMyTEVcbiAgYXJyLnJlYWRVSW50MzJCRSA9IEJQLnJlYWRVSW50MzJCRVxuICBhcnIucmVhZEludDggPSBCUC5yZWFkSW50OFxuICBhcnIucmVhZEludDE2TEUgPSBCUC5yZWFkSW50MTZMRVxuICBhcnIucmVhZEludDE2QkUgPSBCUC5yZWFkSW50MTZCRVxuICBhcnIucmVhZEludDMyTEUgPSBCUC5yZWFkSW50MzJMRVxuICBhcnIucmVhZEludDMyQkUgPSBCUC5yZWFkSW50MzJCRVxuICBhcnIucmVhZEZsb2F0TEUgPSBCUC5yZWFkRmxvYXRMRVxuICBhcnIucmVhZEZsb2F0QkUgPSBCUC5yZWFkRmxvYXRCRVxuICBhcnIucmVhZERvdWJsZUxFID0gQlAucmVhZERvdWJsZUxFXG4gIGFyci5yZWFkRG91YmxlQkUgPSBCUC5yZWFkRG91YmxlQkVcbiAgYXJyLndyaXRlVUludDggPSBCUC53cml0ZVVJbnQ4XG4gIGFyci53cml0ZVVJbnQxNkxFID0gQlAud3JpdGVVSW50MTZMRVxuICBhcnIud3JpdGVVSW50MTZCRSA9IEJQLndyaXRlVUludDE2QkVcbiAgYXJyLndyaXRlVUludDMyTEUgPSBCUC53cml0ZVVJbnQzMkxFXG4gIGFyci53cml0ZVVJbnQzMkJFID0gQlAud3JpdGVVSW50MzJCRVxuICBhcnIud3JpdGVJbnQ4ID0gQlAud3JpdGVJbnQ4XG4gIGFyci53cml0ZUludDE2TEUgPSBCUC53cml0ZUludDE2TEVcbiAgYXJyLndyaXRlSW50MTZCRSA9IEJQLndyaXRlSW50MTZCRVxuICBhcnIud3JpdGVJbnQzMkxFID0gQlAud3JpdGVJbnQzMkxFXG4gIGFyci53cml0ZUludDMyQkUgPSBCUC53cml0ZUludDMyQkVcbiAgYXJyLndyaXRlRmxvYXRMRSA9IEJQLndyaXRlRmxvYXRMRVxuICBhcnIud3JpdGVGbG9hdEJFID0gQlAud3JpdGVGbG9hdEJFXG4gIGFyci53cml0ZURvdWJsZUxFID0gQlAud3JpdGVEb3VibGVMRVxuICBhcnIud3JpdGVEb3VibGVCRSA9IEJQLndyaXRlRG91YmxlQkVcbiAgYXJyLmZpbGwgPSBCUC5maWxsXG4gIGFyci5pbnNwZWN0ID0gQlAuaW5zcGVjdFxuICBhcnIudG9BcnJheUJ1ZmZlciA9IEJQLnRvQXJyYXlCdWZmZXJcblxuICByZXR1cm4gYXJyXG59XG5cbi8vIHNsaWNlKHN0YXJ0LCBlbmQpXG5mdW5jdGlvbiBjbGFtcCAoaW5kZXgsIGxlbiwgZGVmYXVsdFZhbHVlKSB7XG4gIGlmICh0eXBlb2YgaW5kZXggIT09ICdudW1iZXInKSByZXR1cm4gZGVmYXVsdFZhbHVlXG4gIGluZGV4ID0gfn5pbmRleDsgIC8vIENvZXJjZSB0byBpbnRlZ2VyLlxuICBpZiAoaW5kZXggPj0gbGVuKSByZXR1cm4gbGVuXG4gIGlmIChpbmRleCA+PSAwKSByZXR1cm4gaW5kZXhcbiAgaW5kZXggKz0gbGVuXG4gIGlmIChpbmRleCA+PSAwKSByZXR1cm4gaW5kZXhcbiAgcmV0dXJuIDBcbn1cblxuZnVuY3Rpb24gY29lcmNlIChsZW5ndGgpIHtcbiAgLy8gQ29lcmNlIGxlbmd0aCB0byBhIG51bWJlciAocG9zc2libHkgTmFOKSwgcm91bmQgdXBcbiAgLy8gaW4gY2FzZSBpdCdzIGZyYWN0aW9uYWwgKGUuZy4gMTIzLjQ1NikgdGhlbiBkbyBhXG4gIC8vIGRvdWJsZSBuZWdhdGUgdG8gY29lcmNlIGEgTmFOIHRvIDAuIEVhc3ksIHJpZ2h0P1xuICBsZW5ndGggPSB+fk1hdGguY2VpbCgrbGVuZ3RoKVxuICByZXR1cm4gbGVuZ3RoIDwgMCA/IDAgOiBsZW5ndGhcbn1cblxuZnVuY3Rpb24gaXNBcnJheSAoc3ViamVjdCkge1xuICByZXR1cm4gKEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKHN1YmplY3QpIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHN1YmplY3QpID09PSAnW29iamVjdCBBcnJheV0nXG4gIH0pKHN1YmplY3QpXG59XG5cbmZ1bmN0aW9uIGlzQXJyYXlpc2ggKHN1YmplY3QpIHtcbiAgcmV0dXJuIGlzQXJyYXkoc3ViamVjdCkgfHwgQnVmZmVyLmlzQnVmZmVyKHN1YmplY3QpIHx8XG4gICAgICBzdWJqZWN0ICYmIHR5cGVvZiBzdWJqZWN0ID09PSAnb2JqZWN0JyAmJlxuICAgICAgdHlwZW9mIHN1YmplY3QubGVuZ3RoID09PSAnbnVtYmVyJ1xufVxuXG5mdW5jdGlvbiB0b0hleCAobikge1xuICBpZiAobiA8IDE2KSByZXR1cm4gJzAnICsgbi50b1N0cmluZygxNilcbiAgcmV0dXJuIG4udG9TdHJpbmcoMTYpXG59XG5cbmZ1bmN0aW9uIHV0ZjhUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGIgPSBzdHIuY2hhckNvZGVBdChpKVxuICAgIGlmIChiIDw9IDB4N0YpXG4gICAgICBieXRlQXJyYXkucHVzaChzdHIuY2hhckNvZGVBdChpKSlcbiAgICBlbHNlIHtcbiAgICAgIHZhciBzdGFydCA9IGlcbiAgICAgIGlmIChiID49IDB4RDgwMCAmJiBiIDw9IDB4REZGRikgaSsrXG4gICAgICB2YXIgaCA9IGVuY29kZVVSSUNvbXBvbmVudChzdHIuc2xpY2Uoc3RhcnQsIGkrMSkpLnN1YnN0cigxKS5zcGxpdCgnJScpXG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGgubGVuZ3RoOyBqKyspXG4gICAgICAgIGJ5dGVBcnJheS5wdXNoKHBhcnNlSW50KGhbal0sIDE2KSlcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiBhc2NpaVRvQnl0ZXMgKHN0cikge1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICAvLyBOb2RlJ3MgY29kZSBzZWVtcyB0byBiZSBkb2luZyB0aGlzIGFuZCBub3QgJiAweDdGLi5cbiAgICBieXRlQXJyYXkucHVzaChzdHIuY2hhckNvZGVBdChpKSAmIDB4RkYpXG4gIH1cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiB1dGYxNmxlVG9CeXRlcyAoc3RyKSB7XG4gIHZhciBjLCBoaSwgbG9cbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgYyA9IHN0ci5jaGFyQ29kZUF0KGkpXG4gICAgaGkgPSBjID4+IDhcbiAgICBsbyA9IGMgJSAyNTZcbiAgICBieXRlQXJyYXkucHVzaChsbylcbiAgICBieXRlQXJyYXkucHVzaChoaSlcbiAgfVxuXG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gYmFzZTY0VG9CeXRlcyAoc3RyKSB7XG4gIHJldHVybiBiYXNlNjQudG9CeXRlQXJyYXkoc3RyKVxufVxuXG5mdW5jdGlvbiBibGl0QnVmZmVyIChzcmMsIGRzdCwgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgdmFyIHBvc1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKChpICsgb2Zmc2V0ID49IGRzdC5sZW5ndGgpIHx8IChpID49IHNyYy5sZW5ndGgpKVxuICAgICAgYnJlYWtcbiAgICBkc3RbaSArIG9mZnNldF0gPSBzcmNbaV1cbiAgfVxuICByZXR1cm4gaVxufVxuXG5mdW5jdGlvbiBkZWNvZGVVdGY4Q2hhciAoc3RyKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChzdHIpXG4gIH0gY2F0Y2ggKGVycikge1xuICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKDB4RkZGRCkgLy8gVVRGIDggaW52YWxpZCBjaGFyXG4gIH1cbn1cblxuLypcbiAqIFdlIGhhdmUgdG8gbWFrZSBzdXJlIHRoYXQgdGhlIHZhbHVlIGlzIGEgdmFsaWQgaW50ZWdlci4gVGhpcyBtZWFucyB0aGF0IGl0XG4gKiBpcyBub24tbmVnYXRpdmUuIEl0IGhhcyBubyBmcmFjdGlvbmFsIGNvbXBvbmVudCBhbmQgdGhhdCBpdCBkb2VzIG5vdFxuICogZXhjZWVkIHRoZSBtYXhpbXVtIGFsbG93ZWQgdmFsdWUuXG4gKi9cbmZ1bmN0aW9uIHZlcmlmdWludCAodmFsdWUsIG1heCkge1xuICBhc3NlcnQodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJywgJ2Nhbm5vdCB3cml0ZSBhIG5vbi1udW1iZXIgYXMgYSBudW1iZXInKVxuICBhc3NlcnQodmFsdWUgPj0gMCwgJ3NwZWNpZmllZCBhIG5lZ2F0aXZlIHZhbHVlIGZvciB3cml0aW5nIGFuIHVuc2lnbmVkIHZhbHVlJylcbiAgYXNzZXJ0KHZhbHVlIDw9IG1heCwgJ3ZhbHVlIGlzIGxhcmdlciB0aGFuIG1heGltdW0gdmFsdWUgZm9yIHR5cGUnKVxuICBhc3NlcnQoTWF0aC5mbG9vcih2YWx1ZSkgPT09IHZhbHVlLCAndmFsdWUgaGFzIGEgZnJhY3Rpb25hbCBjb21wb25lbnQnKVxufVxuXG5mdW5jdGlvbiB2ZXJpZnNpbnQgKHZhbHVlLCBtYXgsIG1pbikge1xuICBhc3NlcnQodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJywgJ2Nhbm5vdCB3cml0ZSBhIG5vbi1udW1iZXIgYXMgYSBudW1iZXInKVxuICBhc3NlcnQodmFsdWUgPD0gbWF4LCAndmFsdWUgbGFyZ2VyIHRoYW4gbWF4aW11bSBhbGxvd2VkIHZhbHVlJylcbiAgYXNzZXJ0KHZhbHVlID49IG1pbiwgJ3ZhbHVlIHNtYWxsZXIgdGhhbiBtaW5pbXVtIGFsbG93ZWQgdmFsdWUnKVxuICBhc3NlcnQoTWF0aC5mbG9vcih2YWx1ZSkgPT09IHZhbHVlLCAndmFsdWUgaGFzIGEgZnJhY3Rpb25hbCBjb21wb25lbnQnKVxufVxuXG5mdW5jdGlvbiB2ZXJpZklFRUU3NTQgKHZhbHVlLCBtYXgsIG1pbikge1xuICBhc3NlcnQodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJywgJ2Nhbm5vdCB3cml0ZSBhIG5vbi1udW1iZXIgYXMgYSBudW1iZXInKVxuICBhc3NlcnQodmFsdWUgPD0gbWF4LCAndmFsdWUgbGFyZ2VyIHRoYW4gbWF4aW11bSBhbGxvd2VkIHZhbHVlJylcbiAgYXNzZXJ0KHZhbHVlID49IG1pbiwgJ3ZhbHVlIHNtYWxsZXIgdGhhbiBtaW5pbXVtIGFsbG93ZWQgdmFsdWUnKVxufVxuXG5mdW5jdGlvbiBhc3NlcnQgKHRlc3QsIG1lc3NhZ2UpIHtcbiAgaWYgKCF0ZXN0KSB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZSB8fCAnRmFpbGVkIGFzc2VydGlvbicpXG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwib01mcEFuXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vLi4vbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL2luZGV4LmpzXCIsXCIvLi4vLi4vbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xudmFyIGxvb2t1cCA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvJztcblxuOyhmdW5jdGlvbiAoZXhwb3J0cykge1xuXHQndXNlIHN0cmljdCc7XG5cbiAgdmFyIEFyciA9ICh0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcpXG4gICAgPyBVaW50OEFycmF5XG4gICAgOiBBcnJheVxuXG5cdHZhciBQTFVTICAgPSAnKycuY2hhckNvZGVBdCgwKVxuXHR2YXIgU0xBU0ggID0gJy8nLmNoYXJDb2RlQXQoMClcblx0dmFyIE5VTUJFUiA9ICcwJy5jaGFyQ29kZUF0KDApXG5cdHZhciBMT1dFUiAgPSAnYScuY2hhckNvZGVBdCgwKVxuXHR2YXIgVVBQRVIgID0gJ0EnLmNoYXJDb2RlQXQoMClcblx0dmFyIFBMVVNfVVJMX1NBRkUgPSAnLScuY2hhckNvZGVBdCgwKVxuXHR2YXIgU0xBU0hfVVJMX1NBRkUgPSAnXycuY2hhckNvZGVBdCgwKVxuXG5cdGZ1bmN0aW9uIGRlY29kZSAoZWx0KSB7XG5cdFx0dmFyIGNvZGUgPSBlbHQuY2hhckNvZGVBdCgwKVxuXHRcdGlmIChjb2RlID09PSBQTFVTIHx8XG5cdFx0ICAgIGNvZGUgPT09IFBMVVNfVVJMX1NBRkUpXG5cdFx0XHRyZXR1cm4gNjIgLy8gJysnXG5cdFx0aWYgKGNvZGUgPT09IFNMQVNIIHx8XG5cdFx0ICAgIGNvZGUgPT09IFNMQVNIX1VSTF9TQUZFKVxuXHRcdFx0cmV0dXJuIDYzIC8vICcvJ1xuXHRcdGlmIChjb2RlIDwgTlVNQkVSKVxuXHRcdFx0cmV0dXJuIC0xIC8vbm8gbWF0Y2hcblx0XHRpZiAoY29kZSA8IE5VTUJFUiArIDEwKVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBOVU1CRVIgKyAyNiArIDI2XG5cdFx0aWYgKGNvZGUgPCBVUFBFUiArIDI2KVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBVUFBFUlxuXHRcdGlmIChjb2RlIDwgTE9XRVIgKyAyNilcblx0XHRcdHJldHVybiBjb2RlIC0gTE9XRVIgKyAyNlxuXHR9XG5cblx0ZnVuY3Rpb24gYjY0VG9CeXRlQXJyYXkgKGI2NCkge1xuXHRcdHZhciBpLCBqLCBsLCB0bXAsIHBsYWNlSG9sZGVycywgYXJyXG5cblx0XHRpZiAoYjY0Lmxlbmd0aCAlIDQgPiAwKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgc3RyaW5nLiBMZW5ndGggbXVzdCBiZSBhIG11bHRpcGxlIG9mIDQnKVxuXHRcdH1cblxuXHRcdC8vIHRoZSBudW1iZXIgb2YgZXF1YWwgc2lnbnMgKHBsYWNlIGhvbGRlcnMpXG5cdFx0Ly8gaWYgdGhlcmUgYXJlIHR3byBwbGFjZWhvbGRlcnMsIHRoYW4gdGhlIHR3byBjaGFyYWN0ZXJzIGJlZm9yZSBpdFxuXHRcdC8vIHJlcHJlc2VudCBvbmUgYnl0ZVxuXHRcdC8vIGlmIHRoZXJlIGlzIG9ubHkgb25lLCB0aGVuIHRoZSB0aHJlZSBjaGFyYWN0ZXJzIGJlZm9yZSBpdCByZXByZXNlbnQgMiBieXRlc1xuXHRcdC8vIHRoaXMgaXMganVzdCBhIGNoZWFwIGhhY2sgdG8gbm90IGRvIGluZGV4T2YgdHdpY2Vcblx0XHR2YXIgbGVuID0gYjY0Lmxlbmd0aFxuXHRcdHBsYWNlSG9sZGVycyA9ICc9JyA9PT0gYjY0LmNoYXJBdChsZW4gLSAyKSA/IDIgOiAnPScgPT09IGI2NC5jaGFyQXQobGVuIC0gMSkgPyAxIDogMFxuXG5cdFx0Ly8gYmFzZTY0IGlzIDQvMyArIHVwIHRvIHR3byBjaGFyYWN0ZXJzIG9mIHRoZSBvcmlnaW5hbCBkYXRhXG5cdFx0YXJyID0gbmV3IEFycihiNjQubGVuZ3RoICogMyAvIDQgLSBwbGFjZUhvbGRlcnMpXG5cblx0XHQvLyBpZiB0aGVyZSBhcmUgcGxhY2Vob2xkZXJzLCBvbmx5IGdldCB1cCB0byB0aGUgbGFzdCBjb21wbGV0ZSA0IGNoYXJzXG5cdFx0bCA9IHBsYWNlSG9sZGVycyA+IDAgPyBiNjQubGVuZ3RoIC0gNCA6IGI2NC5sZW5ndGhcblxuXHRcdHZhciBMID0gMFxuXG5cdFx0ZnVuY3Rpb24gcHVzaCAodikge1xuXHRcdFx0YXJyW0wrK10gPSB2XG5cdFx0fVxuXG5cdFx0Zm9yIChpID0gMCwgaiA9IDA7IGkgPCBsOyBpICs9IDQsIGogKz0gMykge1xuXHRcdFx0dG1wID0gKGRlY29kZShiNjQuY2hhckF0KGkpKSA8PCAxOCkgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA8PCAxMikgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDIpKSA8PCA2KSB8IGRlY29kZShiNjQuY2hhckF0KGkgKyAzKSlcblx0XHRcdHB1c2goKHRtcCAmIDB4RkYwMDAwKSA+PiAxNilcblx0XHRcdHB1c2goKHRtcCAmIDB4RkYwMCkgPj4gOClcblx0XHRcdHB1c2godG1wICYgMHhGRilcblx0XHR9XG5cblx0XHRpZiAocGxhY2VIb2xkZXJzID09PSAyKSB7XG5cdFx0XHR0bXAgPSAoZGVjb2RlKGI2NC5jaGFyQXQoaSkpIDw8IDIpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAxKSkgPj4gNClcblx0XHRcdHB1c2godG1wICYgMHhGRilcblx0XHR9IGVsc2UgaWYgKHBsYWNlSG9sZGVycyA9PT0gMSkge1xuXHRcdFx0dG1wID0gKGRlY29kZShiNjQuY2hhckF0KGkpKSA8PCAxMCkgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA8PCA0KSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMikpID4+IDIpXG5cdFx0XHRwdXNoKCh0bXAgPj4gOCkgJiAweEZGKVxuXHRcdFx0cHVzaCh0bXAgJiAweEZGKVxuXHRcdH1cblxuXHRcdHJldHVybiBhcnJcblx0fVxuXG5cdGZ1bmN0aW9uIHVpbnQ4VG9CYXNlNjQgKHVpbnQ4KSB7XG5cdFx0dmFyIGksXG5cdFx0XHRleHRyYUJ5dGVzID0gdWludDgubGVuZ3RoICUgMywgLy8gaWYgd2UgaGF2ZSAxIGJ5dGUgbGVmdCwgcGFkIDIgYnl0ZXNcblx0XHRcdG91dHB1dCA9IFwiXCIsXG5cdFx0XHR0ZW1wLCBsZW5ndGhcblxuXHRcdGZ1bmN0aW9uIGVuY29kZSAobnVtKSB7XG5cdFx0XHRyZXR1cm4gbG9va3VwLmNoYXJBdChudW0pXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gdHJpcGxldFRvQmFzZTY0IChudW0pIHtcblx0XHRcdHJldHVybiBlbmNvZGUobnVtID4+IDE4ICYgMHgzRikgKyBlbmNvZGUobnVtID4+IDEyICYgMHgzRikgKyBlbmNvZGUobnVtID4+IDYgJiAweDNGKSArIGVuY29kZShudW0gJiAweDNGKVxuXHRcdH1cblxuXHRcdC8vIGdvIHRocm91Z2ggdGhlIGFycmF5IGV2ZXJ5IHRocmVlIGJ5dGVzLCB3ZSdsbCBkZWFsIHdpdGggdHJhaWxpbmcgc3R1ZmYgbGF0ZXJcblx0XHRmb3IgKGkgPSAwLCBsZW5ndGggPSB1aW50OC5sZW5ndGggLSBleHRyYUJ5dGVzOyBpIDwgbGVuZ3RoOyBpICs9IDMpIHtcblx0XHRcdHRlbXAgPSAodWludDhbaV0gPDwgMTYpICsgKHVpbnQ4W2kgKyAxXSA8PCA4KSArICh1aW50OFtpICsgMl0pXG5cdFx0XHRvdXRwdXQgKz0gdHJpcGxldFRvQmFzZTY0KHRlbXApXG5cdFx0fVxuXG5cdFx0Ly8gcGFkIHRoZSBlbmQgd2l0aCB6ZXJvcywgYnV0IG1ha2Ugc3VyZSB0byBub3QgZm9yZ2V0IHRoZSBleHRyYSBieXRlc1xuXHRcdHN3aXRjaCAoZXh0cmFCeXRlcykge1xuXHRcdFx0Y2FzZSAxOlxuXHRcdFx0XHR0ZW1wID0gdWludDhbdWludDgubGVuZ3RoIC0gMV1cblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSh0ZW1wID4+IDIpXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPDwgNCkgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gJz09J1xuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSAyOlxuXHRcdFx0XHR0ZW1wID0gKHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDJdIDw8IDgpICsgKHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDFdKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKHRlbXAgPj4gMTApXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPj4gNCkgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKCh0ZW1wIDw8IDIpICYgMHgzRilcblx0XHRcdFx0b3V0cHV0ICs9ICc9J1xuXHRcdFx0XHRicmVha1xuXHRcdH1cblxuXHRcdHJldHVybiBvdXRwdXRcblx0fVxuXG5cdGV4cG9ydHMudG9CeXRlQXJyYXkgPSBiNjRUb0J5dGVBcnJheVxuXHRleHBvcnRzLmZyb21CeXRlQXJyYXkgPSB1aW50OFRvQmFzZTY0XG59KHR5cGVvZiBleHBvcnRzID09PSAndW5kZWZpbmVkJyA/ICh0aGlzLmJhc2U2NGpzID0ge30pIDogZXhwb3J0cykpXG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwib01mcEFuXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vLi4vbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL25vZGVfbW9kdWxlcy9iYXNlNjQtanMvbGliL2I2NC5qc1wiLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9ub2RlX21vZHVsZXMvYmFzZTY0LWpzL2xpYlwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbmV4cG9ydHMucmVhZCA9IGZ1bmN0aW9uIChidWZmZXIsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtXG4gIHZhciBlTGVuID0gbkJ5dGVzICogOCAtIG1MZW4gLSAxXG4gIHZhciBlTWF4ID0gKDEgPDwgZUxlbikgLSAxXG4gIHZhciBlQmlhcyA9IGVNYXggPj4gMVxuICB2YXIgbkJpdHMgPSAtN1xuICB2YXIgaSA9IGlzTEUgPyAobkJ5dGVzIC0gMSkgOiAwXG4gIHZhciBkID0gaXNMRSA/IC0xIDogMVxuICB2YXIgcyA9IGJ1ZmZlcltvZmZzZXQgKyBpXVxuXG4gIGkgKz0gZFxuXG4gIGUgPSBzICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpXG4gIHMgPj49ICgtbkJpdHMpXG4gIG5CaXRzICs9IGVMZW5cbiAgZm9yICg7IG5CaXRzID4gMDsgZSA9IGUgKiAyNTYgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCkge31cblxuICBtID0gZSAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKVxuICBlID4+PSAoLW5CaXRzKVxuICBuQml0cyArPSBtTGVuXG4gIGZvciAoOyBuQml0cyA+IDA7IG0gPSBtICogMjU2ICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpIHt9XG5cbiAgaWYgKGUgPT09IDApIHtcbiAgICBlID0gMSAtIGVCaWFzXG4gIH0gZWxzZSBpZiAoZSA9PT0gZU1heCkge1xuICAgIHJldHVybiBtID8gTmFOIDogKChzID8gLTEgOiAxKSAqIEluZmluaXR5KVxuICB9IGVsc2Uge1xuICAgIG0gPSBtICsgTWF0aC5wb3coMiwgbUxlbilcbiAgICBlID0gZSAtIGVCaWFzXG4gIH1cbiAgcmV0dXJuIChzID8gLTEgOiAxKSAqIG0gKiBNYXRoLnBvdygyLCBlIC0gbUxlbilcbn1cblxuZXhwb3J0cy53cml0ZSA9IGZ1bmN0aW9uIChidWZmZXIsIHZhbHVlLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbSwgY1xuICB2YXIgZUxlbiA9IG5CeXRlcyAqIDggLSBtTGVuIC0gMVxuICB2YXIgZU1heCA9ICgxIDw8IGVMZW4pIC0gMVxuICB2YXIgZUJpYXMgPSBlTWF4ID4+IDFcbiAgdmFyIHJ0ID0gKG1MZW4gPT09IDIzID8gTWF0aC5wb3coMiwgLTI0KSAtIE1hdGgucG93KDIsIC03NykgOiAwKVxuICB2YXIgaSA9IGlzTEUgPyAwIDogKG5CeXRlcyAtIDEpXG4gIHZhciBkID0gaXNMRSA/IDEgOiAtMVxuICB2YXIgcyA9IHZhbHVlIDwgMCB8fCAodmFsdWUgPT09IDAgJiYgMSAvIHZhbHVlIDwgMCkgPyAxIDogMFxuXG4gIHZhbHVlID0gTWF0aC5hYnModmFsdWUpXG5cbiAgaWYgKGlzTmFOKHZhbHVlKSB8fCB2YWx1ZSA9PT0gSW5maW5pdHkpIHtcbiAgICBtID0gaXNOYU4odmFsdWUpID8gMSA6IDBcbiAgICBlID0gZU1heFxuICB9IGVsc2Uge1xuICAgIGUgPSBNYXRoLmZsb29yKE1hdGgubG9nKHZhbHVlKSAvIE1hdGguTE4yKVxuICAgIGlmICh2YWx1ZSAqIChjID0gTWF0aC5wb3coMiwgLWUpKSA8IDEpIHtcbiAgICAgIGUtLVxuICAgICAgYyAqPSAyXG4gICAgfVxuICAgIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgdmFsdWUgKz0gcnQgLyBjXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlICs9IHJ0ICogTWF0aC5wb3coMiwgMSAtIGVCaWFzKVxuICAgIH1cbiAgICBpZiAodmFsdWUgKiBjID49IDIpIHtcbiAgICAgIGUrK1xuICAgICAgYyAvPSAyXG4gICAgfVxuXG4gICAgaWYgKGUgKyBlQmlhcyA+PSBlTWF4KSB7XG4gICAgICBtID0gMFxuICAgICAgZSA9IGVNYXhcbiAgICB9IGVsc2UgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICBtID0gKHZhbHVlICogYyAtIDEpICogTWF0aC5wb3coMiwgbUxlbilcbiAgICAgIGUgPSBlICsgZUJpYXNcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IHZhbHVlICogTWF0aC5wb3coMiwgZUJpYXMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pXG4gICAgICBlID0gMFxuICAgIH1cbiAgfVxuXG4gIGZvciAoOyBtTGVuID49IDg7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IG0gJiAweGZmLCBpICs9IGQsIG0gLz0gMjU2LCBtTGVuIC09IDgpIHt9XG5cbiAgZSA9IChlIDw8IG1MZW4pIHwgbVxuICBlTGVuICs9IG1MZW5cbiAgZm9yICg7IGVMZW4gPiAwOyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBlICYgMHhmZiwgaSArPSBkLCBlIC89IDI1NiwgZUxlbiAtPSA4KSB7fVxuXG4gIGJ1ZmZlcltvZmZzZXQgKyBpIC0gZF0gfD0gcyAqIDEyOFxufVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIm9NZnBBblwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9ub2RlX21vZHVsZXMvaWVlZTc1NC9pbmRleC5qc1wiLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9ub2RlX21vZHVsZXMvaWVlZTc1NFwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gW107XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn1cblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIm9NZnBBblwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qc1wiLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3NcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQHR5cGUge0NoYXB0ZXJzfVxuICovXG52YXIgQ2hhcHRlcnMgPSByZXF1aXJlKCcuL21vZHVsZXMvY2hhcHRlcicpO1xuXG5mdW5jdGlvbiBjcmVhdGVUaW1lQ29udHJvbHMoKSB7XG4gIHJldHVybiAkKCc8dWwgY2xhc3M9XCJ0aW1lY29udHJvbGJhclwiPjwvdWw+Jyk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUJveCgpIHtcbiAgcmV0dXJuICQoJzxkaXYgY2xhc3M9XCJjb250cm9sYmFyIGJhclwiPjwvZGl2PicpO1xufVxuXG5mdW5jdGlvbiBwbGF5ZXJTdGFydGVkKHBsYXllcikge1xuICByZXR1cm4gKCh0eXBlb2YgcGxheWVyLmN1cnJlbnRUaW1lID09PSAnbnVtYmVyJykgJiYgKHBsYXllci5jdXJyZW50VGltZSA+IDApKTtcbn1cblxuZnVuY3Rpb24gZ2V0Q29tYmluZWRDYWxsYmFjayhjYWxsYmFjaykge1xuICByZXR1cm4gZnVuY3Rpb24gKGV2dCkge1xuICAgIGNvbnNvbGUuZGVidWcoJ0NvbnRyb2xzJywgJ2NvbnRyb2xidXR0b24gY2xpY2tlZCcsIGV2dCk7XG4gICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgY29uc29sZS5kZWJ1ZygnQ29udHJvbHMnLCAncGxheWVyIHN0YXJ0ZWQ/JywgcGxheWVyU3RhcnRlZCh0aGlzLnBsYXllcikpO1xuICAgIGlmICghcGxheWVyU3RhcnRlZCh0aGlzLnBsYXllcikpIHtcbiAgICAgIHRoaXMucGxheWVyLnBsYXkoKTtcbiAgICB9XG4gICAgdmFyIGJvdW5kQ2FsbEJhY2sgPSBjYWxsYmFjay5iaW5kKHRoaXMpO1xuICAgIGJvdW5kQ2FsbEJhY2soKTtcbiAgfTtcbn1cblxuLyoqXG4gKiBpbnN0YW50aWF0ZSBuZXcgY29udHJvbHMgZWxlbWVudFxuICogQHBhcmFtIHtqUXVlcnl8SFRNTEVsZW1lbnR9IHBsYXllciBQbGF5ZXIgZWxlbWVudCByZWZlcmVuY2VcbiAqIEBwYXJhbSB7VGltZWxpbmV9IHRpbWVsaW5lIFRpbWVsaW5lIG9iamVjdCBmb3IgdGhpcyBwbGF5ZXJcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBDb250cm9scyAodGltZWxpbmUpIHtcbiAgdGhpcy5wbGF5ZXIgPSB0aW1lbGluZS5wbGF5ZXI7XG4gIHRoaXMudGltZWxpbmUgPSB0aW1lbGluZTtcbiAgdGhpcy5ib3ggPSBjcmVhdGVCb3goKTtcbiAgdGhpcy50aW1lQ29udHJvbEVsZW1lbnQgPSBjcmVhdGVUaW1lQ29udHJvbHMoKTtcbiAgdGhpcy5ib3guYXBwZW5kKHRoaXMudGltZUNvbnRyb2xFbGVtZW50KTtcbn1cblxuLyoqXG4gKiBjcmVhdGUgdGltZSBjb250cm9sIGJ1dHRvbnMgYW5kIGFkZCB0aGVtIHRvIHRpbWVDb250cm9sRWxlbWVudFxuICogQHBhcmFtIHtudWxsfENoYXB0ZXJzfSBjaGFwdGVyTW9kdWxlIHdoZW4gcHJlc2VudCB3aWxsIGFkZCBuZXh0IGFuZCBwcmV2aW91cyBjaGFwdGVyIGNvbnRyb2xzXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuQ29udHJvbHMucHJvdG90eXBlLmNyZWF0ZVRpbWVDb250cm9scyA9IGZ1bmN0aW9uIChjaGFwdGVyTW9kdWxlKSB7XG4gIHZhciBoYXNDaGFwdGVycyA9IChjaGFwdGVyTW9kdWxlIGluc3RhbmNlb2YgQ2hhcHRlcnMpO1xuICBpZiAoIWhhc0NoYXB0ZXJzKSB7XG4gICAgY29uc29sZS5pbmZvKCdDb250cm9scycsICdjcmVhdGVUaW1lQ29udHJvbHMnLCAnbm8gY2hhcHRlclRhYiBmb3VuZCcpO1xuICB9XG4gIGlmIChoYXNDaGFwdGVycykge1xuICAgIHRoaXMuY3JlYXRlQnV0dG9uKCdwd3AtY29udHJvbHMtcHJldmlvdXMtY2hhcHRlcicsICdadXLDvGNrIHp1bSB2b3JpZ2VuIEthcGl0ZWwnLCBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgYWN0aXZlQ2hhcHRlciA9IGNoYXB0ZXJNb2R1bGUuZ2V0QWN0aXZlQ2hhcHRlcigpO1xuICAgICAgaWYgKHRoaXMudGltZWxpbmUuZ2V0VGltZSgpID4gYWN0aXZlQ2hhcHRlci5zdGFydCArIDEwKSB7XG4gICAgICAgIGNvbnNvbGUuZGVidWcoJ0NvbnRyb2xzJywgJ1p1csO8Y2sgenVtIEthcGl0ZWxhbmZhbmcnLCBjaGFwdGVyTW9kdWxlLmN1cnJlbnRDaGFwdGVyLCAnZnJvbScsIHRoaXMudGltZWxpbmUuZ2V0VGltZSgpKTtcbiAgICAgICAgcmV0dXJuIGNoYXB0ZXJNb2R1bGUucGxheUN1cnJlbnRDaGFwdGVyKCk7XG4gICAgICB9XG4gICAgICBjb25zb2xlLmRlYnVnKCdDb250cm9scycsICdadXLDvGNrIHp1bSB2b3JpZ2VuIEthcGl0ZWwnLCBjaGFwdGVyTW9kdWxlLmN1cnJlbnRDaGFwdGVyKTtcbiAgICAgIHJldHVybiBjaGFwdGVyTW9kdWxlLnByZXZpb3VzKCk7XG4gICAgfSk7XG4gIH1cblxuICB0aGlzLmNyZWF0ZUJ1dHRvbigncHdwLWNvbnRyb2xzLWJhY2stMzAnLCAnMzAgU2VrdW5kZW4genVyw7xjaycsIGZ1bmN0aW9uICgpIHtcbiAgICBjb25zb2xlLmRlYnVnKCdDb250cm9scycsICdyZXdpbmQgYmVmb3JlJywgdGhpcy50aW1lbGluZS5nZXRUaW1lKCkpO1xuICAgIHRoaXMudGltZWxpbmUuc2V0VGltZSh0aGlzLnRpbWVsaW5lLmdldFRpbWUoKSAtIDMwKTtcbiAgICBjb25zb2xlLmRlYnVnKCdDb250cm9scycsICdyZXdpbmQgYWZ0ZXInLCB0aGlzLnRpbWVsaW5lLmdldFRpbWUoKSk7XG4gIH0pO1xuXG4gIHRoaXMuY3JlYXRlQnV0dG9uKCdwd3AtY29udHJvbHMtZm9yd2FyZC0zMCcsICczMCBTZWt1bmRlbiB2b3InLCBmdW5jdGlvbiAoKSB7XG4gICAgY29uc29sZS5kZWJ1ZygnQ29udHJvbHMnLCAnZmZ3ZCBiZWZvcmUnLCB0aGlzLnRpbWVsaW5lLmdldFRpbWUoKSk7XG4gICAgdGhpcy50aW1lbGluZS5zZXRUaW1lKHRoaXMudGltZWxpbmUuZ2V0VGltZSgpICsgMzApO1xuICAgIGNvbnNvbGUuZGVidWcoJ0NvbnRyb2xzJywgJ2Zmd2QgYWZ0ZXInLCB0aGlzLnRpbWVsaW5lLmdldFRpbWUoKSk7XG4gIH0pO1xuXG4gIGlmIChoYXNDaGFwdGVycykge1xuICAgIHRoaXMuY3JlYXRlQnV0dG9uKCdwd3AtY29udHJvbHMtbmV4dC1jaGFwdGVyJywgJ1p1bSBuw6RjaHN0ZW4gS2FwaXRlbCBzcHJpbmdlbicsIGZ1bmN0aW9uICgpIHtcbiAgICAgIGNvbnNvbGUuZGVidWcoJ0NvbnRyb2xzJywgJ25leHQgQ2hhcHRlciBiZWZvcmUnLCB0aGlzLnRpbWVsaW5lLmdldFRpbWUoKSk7XG4gICAgICBjaGFwdGVyTW9kdWxlLm5leHQoKTtcbiAgICAgIGNvbnNvbGUuZGVidWcoJ0NvbnRyb2xzJywgJ25leHQgQ2hhcHRlciBhZnRlcicsIHRoaXMudGltZWxpbmUuZ2V0VGltZSgpKTtcbiAgICB9KTtcbiAgfVxufTtcblxuQ29udHJvbHMucHJvdG90eXBlLmNyZWF0ZUJ1dHRvbiA9IGZ1bmN0aW9uIGNyZWF0ZUJ1dHRvbihpY29uLCB0aXRsZSwgY2FsbGJhY2spIHtcbiAgdmFyIGJ1dHRvbiA9ICQoJzxsaT48YSBocmVmPVwiI1wiIGNsYXNzPVwiYnV0dG9uIGJ1dHRvbi1jb250cm9sXCIgdGl0bGU9XCInICsgdGl0bGUgKyAnXCI+JyArXG4gICAgJzxpIGNsYXNzPVwiaWNvbiAnICsgaWNvbiArICdcIj48L2k+PC9hPjwvbGk+Jyk7XG4gIHRoaXMudGltZUNvbnRyb2xFbGVtZW50LmFwcGVuZChidXR0b24pO1xuICB2YXIgY29tYmluZWRDYWxsYmFjayA9IGdldENvbWJpbmVkQ2FsbGJhY2soY2FsbGJhY2spO1xuICBidXR0b24ub24oJ2NsaWNrJywgY29tYmluZWRDYWxsYmFjay5iaW5kKHRoaXMpKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29udHJvbHM7XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwib01mcEFuXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvY29udHJvbHMuanNcIixcIi9cIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4ndXNlIHN0cmljdCc7XG5cbi8vIGV2ZXJ5dGhpbmcgZm9yIGFuIGVtYmVkZGVkIHBsYXllclxudmFyXG4gIHBsYXllcnMgPSBbXSxcbiAgbGFzdEhlaWdodCA9IDAsXG4gICRib2R5O1xuXG5mdW5jdGlvbiBwb3N0VG9PcGVuZXIob2JqKSB7XG4gIGNvbnNvbGUuZGVidWcoJ3Bvc3RUb09wZW5lcicsIG9iaik7XG4gIHdpbmRvdy5wYXJlbnQucG9zdE1lc3NhZ2Uob2JqLCAnKicpO1xufVxuXG5mdW5jdGlvbiBtZXNzYWdlTGlzdGVuZXIgKGV2ZW50KSB7XG4gIHZhciBvcmlnID0gZXZlbnQub3JpZ2luYWxFdmVudDtcblxuICBpZiAob3JpZy5kYXRhLmFjdGlvbiA9PT0gJ3BhdXNlJykge1xuICAgIHBsYXllcnMuZm9yRWFjaChmdW5jdGlvbiAocGxheWVyKSB7XG4gICAgICBwbGF5ZXIucGF1c2UoKTtcbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiB3YWl0Rm9yTWV0YWRhdGEgKGNhbGxiYWNrKSB7XG4gIGZ1bmN0aW9uIG1ldGFEYXRhTGlzdGVuZXIgKGV2ZW50KSB7XG4gICAgdmFyIG9yaWcgPSBldmVudC5vcmlnaW5hbEV2ZW50O1xuICAgIGlmIChvcmlnLmRhdGEucGxheWVyT3B0aW9ucykge1xuICAgICAgY2FsbGJhY2sob3JpZy5kYXRhLnBsYXllck9wdGlvbnMpO1xuICAgIH1cbiAgfVxuICAkKHdpbmRvdykub24oJ21lc3NhZ2UnLCBtZXRhRGF0YUxpc3RlbmVyKTtcbn1cblxuZnVuY3Rpb24gcG9sbEhlaWdodCgpIHtcbiAgdmFyIG5ld0hlaWdodCA9ICRib2R5LmhlaWdodCgpO1xuICBpZiAobGFzdEhlaWdodCAhPT0gbmV3SGVpZ2h0KSB7XG4gICAgcG9zdFRvT3BlbmVyKHtcbiAgICAgIGFjdGlvbjogJ3Jlc2l6ZScsXG4gICAgICBhcmc6IG5ld0hlaWdodFxuICAgIH0pO1xuICB9XG5cbiAgbGFzdEhlaWdodCA9IG5ld0hlaWdodDtcbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHBvbGxIZWlnaHQsIGRvY3VtZW50LmJvZHkpO1xufVxuXG4vKipcbiAqIGluaXRpYWxpemUgZW1iZWQgZnVuY3Rpb25hbGl0eVxuICogQHBhcmFtIHtmdW5jdGlvbn0gJCBqUXVlcnlcbiAqIEBwYXJhbSB7QXJyYXl9IHBsYXllckxpc3QgYWxsIHBsYXllcnNpbiB0aGlzIHdpbmRvd1xuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbmZ1bmN0aW9uIGluaXQoJCwgcGxheWVyTGlzdCkge1xuICBwbGF5ZXJzID0gcGxheWVyTGlzdDtcbiAgJGJvZHkgPSAkKGRvY3VtZW50LmJvZHkpO1xuICAkKHdpbmRvdykub24oJ21lc3NhZ2UnLCBtZXNzYWdlTGlzdGVuZXIpO1xuICBwb2xsSGVpZ2h0KCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBwb3N0VG9PcGVuZXI6IHBvc3RUb09wZW5lcixcbiAgd2FpdEZvck1ldGFkYXRhOiB3YWl0Rm9yTWV0YWRhdGEsXG4gIGluaXQ6IGluaXRcbn07XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwib01mcEFuXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvZW1iZWQuanNcIixcIi9cIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4vKiohXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBQb2Rsb3ZlIFdlYiBQbGF5ZXIgdjMuMC4wLWFscGhhXG4gKiBMaWNlbnNlZCB1bmRlciBUaGUgQlNEIDItQ2xhdXNlIExpY2Vuc2VcbiAqIGh0dHA6Ly9vcGVuc291cmNlLm9yZy9saWNlbnNlcy9CU0QtMi1DbGF1c2VcbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqIENvcHlyaWdodCAoYykgMjAxNCwgR2Vycml0IHZhbiBBYWtlbiAoaHR0cHM6Ly9naXRodWIuY29tL2dlcnJpdHZhbmFha2VuLyksIFNpbW9uIFdhbGRoZXJyIChodHRwczovL2dpdGh1Yi5jb20vc2ltb253YWxkaGVyci8pLCBGcmFuayBIYXNlIChodHRwczovL2dpdGh1Yi5jb20vS2FtYmZoYXNlLyksIEVyaWMgVGV1YmVydCAoaHR0cHM6Ly9naXRodWIuY29tL2V0ZXViZXJ0LykgYW5kIG90aGVycyAoaHR0cHM6Ly9naXRodWIuY29tL3BvZGxvdmUvcG9kbG92ZS13ZWItcGxheWVyL2NvbnRyaWJ1dG9ycylcbiAqIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogUmVkaXN0cmlidXRpb24gYW5kIHVzZSBpbiBzb3VyY2UgYW5kIGJpbmFyeSBmb3Jtcywgd2l0aCBvciB3aXRob3V0IG1vZGlmaWNhdGlvbiwgYXJlIHBlcm1pdHRlZCBwcm92aWRlZCB0aGF0IHRoZSBmb2xsb3dpbmcgY29uZGl0aW9ucyBhcmUgbWV0OlxuICpcbiAqIC0gUmVkaXN0cmlidXRpb25zIG9mIHNvdXJjZSBjb2RlIG11c3QgcmV0YWluIHRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlLCB0aGlzIGxpc3Qgb2YgY29uZGl0aW9ucyBhbmQgdGhlIGZvbGxvd2luZyBkaXNjbGFpbWVyLlxuICogLSBSZWRpc3RyaWJ1dGlvbnMgaW4gYmluYXJ5IGZvcm0gbXVzdCByZXByb2R1Y2UgdGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UsIHRoaXMgbGlzdCBvZiBjb25kaXRpb25zIGFuZCB0aGUgZm9sbG93aW5nIGRpc2NsYWltZXIgaW4gdGhlIGRvY3VtZW50YXRpb24gYW5kL29yIG90aGVyIG1hdGVyaWFscyBwcm92aWRlZCB3aXRoIHRoZSBkaXN0cmlidXRpb24uXG4gKlxuICogVEhJUyBTT0ZUV0FSRSBJUyBQUk9WSURFRCBCWSBUSEUgQ09QWVJJR0hUIEhPTERFUlMgQU5EIENPTlRSSUJVVE9SUyBcIkFTIElTXCIgQU5EIEFOWSBFWFBSRVNTIE9SIElNUExJRUQgV0FSUkFOVElFUywgSU5DTFVESU5HLCBCVVQgTk9UIExJTUlURUQgVE8sIFRIRSBJTVBMSUVEIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZIEFORCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBUkUgRElTQ0xBSU1FRC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFIENPUFlSSUdIVCBIT0xERVIgT1IgQ09OVFJJQlVUT1JTIEJFIExJQUJMRSBGT1IgQU5ZIERJUkVDVCwgSU5ESVJFQ1QsIElOQ0lERU5UQUwsIFNQRUNJQUwsIEVYRU1QTEFSWSwgT1IgQ09OU0VRVUVOVElBTCBEQU1BR0VTIChJTkNMVURJTkcsIEJVVCBOT1QgTElNSVRFRCBUTywgUFJPQ1VSRU1FTlQgT0YgU1VCU1RJVFVURSBHT09EUyBPUiBTRVJWSUNFUzsgTE9TUyBPRiBVU0UsIERBVEEsIE9SIFBST0ZJVFM7IE9SIEJVU0lORVNTIElOVEVSUlVQVElPTikgSE9XRVZFUiBDQVVTRUQgQU5EIE9OIEFOWSBUSEVPUlkgT0YgTElBQklMSVRZLCBXSEVUSEVSIElOIENPTlRSQUNULCBTVFJJQ1QgTElBQklMSVRZLCBPUiBUT1JUIChJTkNMVURJTkcgTkVHTElHRU5DRSBPUiBPVEhFUldJU0UpIEFSSVNJTkcgSU4gQU5ZIFdBWSBPVVQgT0YgVEhFIFVTRSBPRiBUSElTIFNPRlRXQVJFLCBFVkVOIElGIEFEVklTRUQgT0YgVEhFIFBPU1NJQklMSVRZIE9GIFNVQ0ggREFNQUdFLlxuICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBUYWJSZWdpc3RyeSA9IHJlcXVpcmUoJy4vdGFicmVnaXN0cnknKSxcbiAgZW1iZWQgPSByZXF1aXJlKCcuL2VtYmVkJyksXG4gIFRpbWVsaW5lID0gcmVxdWlyZSgnLi90aW1lbGluZScpLFxuICBJbmZvID0gcmVxdWlyZSgnLi9tb2R1bGVzL2luZm8nKSxcbiAgU2hhcmUgPSByZXF1aXJlKCcuL21vZHVsZXMvc2hhcmUnKSxcbiAgRG93bmxvYWRzID0gcmVxdWlyZSgnLi9tb2R1bGVzL2Rvd25sb2FkcycpLFxuICBDaGFwdGVycyA9IHJlcXVpcmUoJy4vbW9kdWxlcy9jaGFwdGVyJyksXG4gIFNhdmVUaW1lID0gcmVxdWlyZSgnLi9tb2R1bGVzL3NhdmV0aW1lJyksXG4gIENvbnRyb2xzID0gcmVxdWlyZSgnLi9jb250cm9scycpLFxuICBQbGF5ZXIgPSByZXF1aXJlKCcuL3BsYXllcicpLFxuICBQcm9ncmVzc0JhciA9IHJlcXVpcmUoJy4vbW9kdWxlcy9wcm9ncmVzc2JhcicpO1xuXG52YXIgcHdwO1xuXG4vLyB3aWxsIGV4cG9zZS9hdHRhY2ggaXRzZWxmIHRvIHRoZSAkIGdsb2JhbFxucmVxdWlyZSgnLi4vLi4vYm93ZXJfY29tcG9uZW50cy9tZWRpYWVsZW1lbnQvYnVpbGQvbWVkaWFlbGVtZW50LmpzJyk7XG5cbi8qKlxuICogVGhlIG1vc3QgbWlzc2luZyBmZWF0dXJlIHJlZ2FyZGluZyBlbWJlZGRlZCBwbGF5ZXJzXG4gKiBAcGFyYW0ge3N0cmluZ30gdGl0bGUgdGhlIHRpdGxlIG9mIHRoZSBzaG93XG4gKiBAcGFyYW0ge3N0cmluZ30gdXJsIChvcHRpb25hbCkgdGhlIGxpbmsgdG8gdGhlIHNob3dcbiAqIEByZXR1cm5zIHtzdHJpbmd9XG4gKi9cbmZ1bmN0aW9uIHJlbmRlclNob3dUaXRsZSh0aXRsZSwgdXJsKSB7XG4gIGlmICghdGl0bGUpIHtcbiAgICByZXR1cm4gJyc7XG4gIH1cbiAgaWYgKHVybCkge1xuICAgIHRpdGxlID0gJzxhIGhyZWY9XCInICsgdXJsICsgJ1wiIHRpdGxlPVwiTGluayB6dXIgU2hvd1wiPicgKyB0aXRsZSArICc8L2E+JztcbiAgfVxuICByZXR1cm4gJzxoMyBjbGFzcz1cInNob3d0aXRsZVwiPicgKyB0aXRsZSArICc8L2gzPic7XG59XG5cbi8qKlxuICogUmVuZGVyIGVwaXNvZGUgdGl0bGUgSFRNTFxuICogQHBhcmFtIHtzdHJpbmd9IHRleHRcbiAqIEBwYXJhbSB7c3RyaW5nfSBsaW5rXG4gKiBAcmV0dXJucyB7c3RyaW5nfVxuICovXG5mdW5jdGlvbiByZW5kZXJUaXRsZSh0ZXh0LCBsaW5rKSB7XG4gIHZhciB0aXRsZUJlZ2luID0gJzxoMSBjbGFzcz1cImVwaXNvZGV0aXRsZVwiPicsXG4gICAgdGl0bGVFbmQgPSAnPC9oMT4nO1xuICBpZiAodGV4dCAhPT0gdW5kZWZpbmVkICYmIGxpbmsgIT09IHVuZGVmaW5lZCkge1xuICAgIHRleHQgPSAnPGEgaHJlZj1cIicgKyBsaW5rICsgJ1wiIHRpdGxlPVwiTGluayB6dXIgRXBpc29kZVwiPicgKyB0ZXh0ICsgJzwvYT4nO1xuICB9XG4gIHJldHVybiB0aXRsZUJlZ2luICsgdGV4dCArIHRpdGxlRW5kO1xufVxuXG4vKipcbiAqIFJlbmRlciBIVE1MIHN1YnRpdGxlXG4gKiBAcGFyYW0ge3N0cmluZ30gdGV4dFxuICogQHJldHVybnMge3N0cmluZ31cbiAqL1xuZnVuY3Rpb24gcmVuZGVyU3ViVGl0bGUodGV4dCkge1xuICBpZiAoIXRleHQpIHtcbiAgICByZXR1cm4gJyc7XG4gIH1cbiAgcmV0dXJuICc8aDIgY2xhc3M9XCJzdWJ0aXRsZVwiPicgKyB0ZXh0ICsgJzwvaDI+Jztcbn1cblxuLyoqXG4gKiBSZW5kZXIgSFRNTCB0aXRsZSBhcmVhXG4gKiBAcGFyYW0gcGFyYW1zXG4gKiBAcmV0dXJucyB7c3RyaW5nfVxuICovXG5mdW5jdGlvbiByZW5kZXJUaXRsZUFyZWEocGFyYW1zKSB7XG4gIHJldHVybiAnPGhlYWRlcj4nICtcbiAgICByZW5kZXJTaG93VGl0bGUocGFyYW1zLnNob3cudGl0bGUsIHBhcmFtcy5zaG93LnVybCkgK1xuICAgIHJlbmRlclRpdGxlKHBhcmFtcy50aXRsZSwgcGFyYW1zLnBlcm1hbGluaykgK1xuICAgIHJlbmRlclN1YlRpdGxlKHBhcmFtcy5zdWJ0aXRsZSkgK1xuICAgICc8L2hlYWRlcj4nO1xufVxuXG4vKipcbiAqIFJlbmRlciBIVE1MIHBsYXlidXR0b25cbiAqIEByZXR1cm5zIHtzdHJpbmd9XG4gKi9cbmZ1bmN0aW9uIHJlbmRlclBsYXlidXR0b24oKSB7XG4gIHJldHVybiAkKCc8YSBjbGFzcz1cInBsYXlcIiB0aXRsZT1cIkFic3BpZWxlblwiIGhyZWY9XCJqYXZhc2NyaXB0OjtcIj48L2E+Jyk7XG59XG5cbi8qKlxuICogUmVuZGVyIHRoZSBwb3N0ZXIgaW1hZ2UgaW4gSFRNTFxuICogcmV0dXJucyBhbiBlbXB0eSBzdHJpbmcgaWYgcG9zdGVyVXJsIGlzIGVtcHR5XG4gKiBAcGFyYW0ge3N0cmluZ30gcG9zdGVyVXJsXG4gKiBAcmV0dXJucyB7c3RyaW5nfSByZW5kZXJlZCBIVE1MXG4gKi9cbmZ1bmN0aW9uIHJlbmRlclBvc3Rlcihwb3N0ZXJVcmwpIHtcbiAgaWYgKCFwb3N0ZXJVcmwpIHtcbiAgICByZXR1cm4gJyc7XG4gIH1cbiAgcmV0dXJuICc8ZGl2IGNsYXNzPVwiY292ZXJhcnRcIj48aW1nIGNsYXNzPVwiY292ZXJpbWdcIiBzcmM9XCInICsgcG9zdGVyVXJsICsgJ1wiIGRhdGEtaW1nPVwiJyArIHBvc3RlclVybCArICdcIiBhbHQ9XCJQb3N0ZXIgSW1hZ2VcIj48L2Rpdj4nO1xufVxuXG4vKipcbiAqIGNoZWNrcyBpZiB0aGUgY3VycmVudCB3aW5kb3cgaXMgaGlkZGVuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gdHJ1ZSBpZiB0aGUgd2luZG93IGlzIGhpZGRlblxuICovXG5mdW5jdGlvbiBpc0hpZGRlbigpIHtcbiAgdmFyIHByb3BzID0gW1xuICAgICdoaWRkZW4nLFxuICAgICdtb3pIaWRkZW4nLFxuICAgICdtc0hpZGRlbicsXG4gICAgJ3dlYmtpdEhpZGRlbidcbiAgXTtcblxuICBmb3IgKHZhciBpbmRleCBpbiBwcm9wcykge1xuICAgIGlmIChwcm9wc1tpbmRleF0gaW4gZG9jdW1lbnQpIHtcbiAgICAgIHJldHVybiAhIWRvY3VtZW50W3Byb3BzW2luZGV4XV07XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gcmVuZGVyTW9kdWxlcyh0aW1lbGluZSwgd3JhcHBlciwgcGFyYW1zKSB7XG4gIHZhclxuICAgIHRhYnMgPSBuZXcgVGFiUmVnaXN0cnkoKSxcbiAgICBoYXNDaGFwdGVycyA9IHRpbWVsaW5lLmhhc0NoYXB0ZXJzLFxuICAgIGNvbnRyb2xzID0gbmV3IENvbnRyb2xzKHRpbWVsaW5lKSxcbiAgICBjb250cm9sQm94ID0gY29udHJvbHMuYm94O1xuXG4gIC8qKlxuICAgKiAtLSBNT0RVTEVTIC0tXG4gICAqL1xuICB2YXIgY2hhcHRlcnM7XG4gIGlmIChoYXNDaGFwdGVycykge1xuICAgIGNoYXB0ZXJzID0gbmV3IENoYXB0ZXJzKHRpbWVsaW5lLCBwYXJhbXMpO1xuICAgIHRpbWVsaW5lLmFkZE1vZHVsZShjaGFwdGVycyk7XG4gIH1cbiAgY29udHJvbHMuY3JlYXRlVGltZUNvbnRyb2xzKGNoYXB0ZXJzKTtcblxuICB2YXIgc2F2ZVRpbWUgPSBuZXcgU2F2ZVRpbWUodGltZWxpbmUsIHBhcmFtcyk7XG4gIHRpbWVsaW5lLmFkZE1vZHVsZShzYXZlVGltZSk7XG5cbiAgdmFyIHByb2dyZXNzQmFyID0gbmV3IFByb2dyZXNzQmFyKHRpbWVsaW5lKTtcbiAgdGltZWxpbmUuYWRkTW9kdWxlKHByb2dyZXNzQmFyKTtcblxuICB2YXIgc2hhcmluZyA9IG5ldyBTaGFyZShwYXJhbXMpO1xuICB2YXIgZG93bmxvYWRzID0gbmV3IERvd25sb2FkcyhwYXJhbXMpO1xuICB2YXIgaW5mb3MgPSBuZXcgSW5mbyhwYXJhbXMpO1xuXG4gIC8qKlxuICAgKiAtLSBUQUJTIC0tXG4gICAqIFRoZSB0YWJzIGluIGNvbnRyb2xiYXIgd2lsbCBhcHBlYXIgaW4gZm9sbG93aW5nIG9yZGVyOlxuICAgKi9cblxuICBpZiAoaGFzQ2hhcHRlcnMpIHtcbiAgICB0YWJzLmFkZChjaGFwdGVycy50YWIpO1xuICB9XG5cbiAgdGFicy5hZGQoc2hhcmluZy50YWIpO1xuICB0YWJzLmFkZChkb3dubG9hZHMudGFiKTtcbiAgdGFicy5hZGQoaW5mb3MudGFiKTtcblxuICB0YWJzLm9wZW5Jbml0aWFsKHBhcmFtcy5hY3RpdmVUYWIpO1xuXG4gIC8vIFJlbmRlciBjb250cm9sYmFyIHdpdGggdG9nZ2xlYmFyIGFuZCB0aW1lY29udHJvbHNcbiAgdmFyIGNvbnRyb2xiYXJXcmFwcGVyID0gJCgnPGRpdiBjbGFzcz1cImNvbnRyb2xiYXItd3JhcHBlclwiPjwvZGl2PicpO1xuICBjb250cm9sYmFyV3JhcHBlci5hcHBlbmQodGFicy50b2dnbGViYXIpO1xuICBjb250cm9sYmFyV3JhcHBlci5hcHBlbmQoY29udHJvbEJveCk7XG5cbiAgLy8gcmVuZGVyIHByb2dyZXNzYmFyLCBjb250cm9sYmFyIGFuZCB0YWJzXG4gIHdyYXBwZXJcbiAgICAuYXBwZW5kKHByb2dyZXNzQmFyLnJlbmRlcigpKVxuICAgIC5hcHBlbmQoY29udHJvbGJhcldyYXBwZXIpXG4gICAgLmFwcGVuZCh0YWJzLmNvbnRhaW5lcik7XG5cbiAgcHJvZ3Jlc3NCYXIuYWRkRXZlbnRzKCk7XG59XG5cbi8qKlxuICogYWRkIGNoYXB0ZXIgYmVoYXZpb3IgYW5kIGRlZXBsaW5raW5nOiBza2lwIHRvIHJlZmVyZW5jZWRcbiAqIHRpbWUgcG9zaXRpb24gJiB3cml0ZSBjdXJyZW50IHRpbWUgaW50byBhZGRyZXNzXG4gKiBAcGFyYW0ge29iamVjdH0gcGxheWVyXG4gKiBAcGFyYW0ge29iamVjdH0gcGFyYW1zXG4gKiBAcGFyYW0ge29iamVjdH0gd3JhcHBlclxuICovXG5mdW5jdGlvbiBhZGRCZWhhdmlvcihwbGF5ZXIsIHBhcmFtcywgd3JhcHBlcikge1xuICB2YXIganFQbGF5ZXIgPSAkKHBsYXllciksXG4gICAgdGltZWxpbmUgPSBuZXcgVGltZWxpbmUocGxheWVyLCBwYXJhbXMpLFxuXG4gICAgbWV0YUVsZW1lbnQgPSAkKCc8ZGl2IGNsYXNzPVwidGl0bGViYXJcIj48L2Rpdj4nKSxcbiAgICBwbGF5ZXJUeXBlID0gcGFyYW1zLnR5cGUsXG4gICAgcGxheUJ1dHRvbiA9IHJlbmRlclBsYXlidXR0b24oKSxcbiAgICBwb3N0ZXIgPSBwYXJhbXMucG9zdGVyIHx8IGpxUGxheWVyLmF0dHIoJ3Bvc3RlcicpO1xuXG4gIHZhciBkZWVwTGluaztcblxuICBjb25zb2xlLmRlYnVnKCd3ZWJwbGF5ZXInLCAnbWV0YWRhdGEnLCB0aW1lbGluZS5nZXREYXRhKCkpO1xuICBqcVBsYXllci5wcm9wKHtcbiAgICBjb250cm9sczogbnVsbCxcbiAgICBwcmVsb2FkOiAnbWV0YWRhdGEnXG4gIH0pO1xuXG4gIC8qKlxuICAgKiBCdWlsZCByaWNoIHBsYXllciB3aXRoIG1ldGEgZGF0YVxuICAgKi9cbiAgd3JhcHBlclxuICAgIC5hZGRDbGFzcygncG9kbG92ZXdlYnBsYXllcl8nICsgcGxheWVyVHlwZSlcbiAgICAuZGF0YSgncG9kbG92ZXdlYnBsYXllcicsIHtcbiAgICBwbGF5ZXI6IGpxUGxheWVyXG4gIH0pO1xuXG4gIGlmIChwbGF5ZXJUeXBlID09PSAnYXVkaW8nKSB7XG4gICAgLy8gUmVuZGVyIHBsYXlidXR0b24gaW4gdGl0bGViYXJcbiAgICBtZXRhRWxlbWVudC5wcmVwZW5kKHBsYXlCdXR0b24pO1xuICAgIG1ldGFFbGVtZW50LmFwcGVuZChyZW5kZXJQb3N0ZXIocG9zdGVyKSk7XG4gICAgd3JhcHBlci5wcmVwZW5kKG1ldGFFbGVtZW50KTtcbiAgfVxuXG4gIGlmIChwbGF5ZXJUeXBlID09PSAndmlkZW8nKSB7XG4gICAgdmFyIHZpZGVvUGFuZSA9ICQoJzxkaXYgY2xhc3M9XCJ2aWRlby1wYW5lXCI+PC9kaXY+Jyk7XG4gICAgdmFyIG92ZXJsYXkgPSAkKCc8ZGl2IGNsYXNzPVwidmlkZW8tb3ZlcmxheVwiPjwvZGl2PicpO1xuICAgIG92ZXJsYXkuYXBwZW5kKHBsYXlCdXR0b24pO1xuICAgIG92ZXJsYXkub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKHBsYXllci5wYXVzZWQpIHtcbiAgICAgICAgcGxheUJ1dHRvbi5hZGRDbGFzcygncGxheWluZycpO1xuICAgICAgICBwbGF5ZXIucGxheSgpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBwbGF5QnV0dG9uLnJlbW92ZUNsYXNzKCdwbGF5aW5nJyk7XG4gICAgICBwbGF5ZXIucGF1c2UoKTtcbiAgICB9KTtcblxuICAgIHZpZGVvUGFuZVxuICAgICAgLmFwcGVuZChvdmVybGF5KVxuICAgICAgLmFwcGVuZChqcVBsYXllcik7XG5cbiAgICB3cmFwcGVyXG4gICAgICAuYXBwZW5kKG1ldGFFbGVtZW50KVxuICAgICAgLmFwcGVuZCh2aWRlb1BhbmUpO1xuXG4gICAganFQbGF5ZXIucHJvcCh7cG9zdGVyOiBwb3N0ZXJ9KTtcbiAgfVxuXG4gIC8vIFJlbmRlciB0aXRsZSBhcmVhIHdpdGggdGl0bGUgaDIgYW5kIHN1YnRpdGxlIGgzXG4gIG1ldGFFbGVtZW50LmFwcGVuZChyZW5kZXJUaXRsZUFyZWEocGFyYW1zKSk7XG5cbiAgLy8gcGFyc2UgZGVlcGxpbmtcbiAgZGVlcExpbmsgPSByZXF1aXJlKCcuL3VybCcpLmNoZWNrQ3VycmVudCgpO1xuICBpZiAoZGVlcExpbmtbMF0gJiYgcHdwLnBsYXllcnMubGVuZ3RoID09PSAxKSB7XG4gICAgdmFyIHBsYXllckF0dHJpYnV0ZXMgPSB7cHJlbG9hZDogJ2F1dG8nfTtcbiAgICBpZiAoIWlzSGlkZGVuKCkpIHtcbiAgICAgIHBsYXllckF0dHJpYnV0ZXMuYXV0b3BsYXkgPSAnYXV0b3BsYXknO1xuICAgIH1cbiAgICBqcVBsYXllci5hdHRyKHBsYXllckF0dHJpYnV0ZXMpO1xuICAgIC8vc3RvcEF0VGltZSA9IGRlZXBMaW5rWzFdO1xuICAgIHRpbWVsaW5lLnBsYXlSYW5nZShkZWVwTGluayk7XG5cbiAgICAkKCdodG1sLCBib2R5JykuZGVsYXkoMTUwKS5hbmltYXRlKHtcbiAgICAgIHNjcm9sbFRvcDogJCgnLmNvbnRhaW5lcjpmaXJzdCcpLm9mZnNldCgpLnRvcCAtIDI1XG4gICAgfSk7XG4gIH1cblxuICBwbGF5QnV0dG9uLm9uKCdjbGljaycsIGZ1bmN0aW9uIChldnQpIHtcbiAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICBldnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cbiAgICBpZiAocGxheWVyLmN1cnJlbnRUaW1lICYmIHBsYXllci5jdXJyZW50VGltZSA+IDAgJiYgIXBsYXllci5wYXVzZWQpIHtcbiAgICAgIHBsYXlCdXR0b24ucmVtb3ZlQ2xhc3MoJ3BsYXlpbmcnKTtcbiAgICAgIHBsYXllci5wYXVzZSgpO1xuICAgICAgaWYgKHBsYXllci5wbHVnaW5UeXBlID09PSAnZmxhc2gnKSB7XG4gICAgICAgIHBsYXllci5wYXVzZSgpOyAgICAvLyBmbGFzaCBmYWxsYmFjayBuZWVkcyBhZGRpdGlvbmFsIHBhdXNlXG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCFwbGF5QnV0dG9uLmhhc0NsYXNzKCdwbGF5aW5nJykpIHtcbiAgICAgIHBsYXlCdXR0b24uYWRkQ2xhc3MoJ3BsYXlpbmcnKTtcbiAgICB9XG4gICAgcGxheWVyLnBsYXkoKTtcbiAgfSk7XG5cbiAgJChkb2N1bWVudClcbiAgICAub24oJ2tleWRvd24nLCBmdW5jdGlvbiAoZSkge1xuICAgICAgY29uc29sZS5sb2coJ3Byb2dyZXNzJywgJ2tleWRvd24nLCBlKTtcbiAgICAgIC8qXG4gICAgICAgaWYgKChuZXcgRGF0ZSgpIC0gbGFzdEtleVByZXNzVGltZSkgPj0gMTAwMCkge1xuICAgICAgIHN0YXJ0ZWRQYXVzZWQgPSBtZWRpYS5wYXVzZWQ7XG4gICAgICAgfVxuICAgICAgICovXG4gICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuXG4gICAgICB2YXIga2V5Q29kZSA9IGUud2hpY2gsXG4gICAgICAgIGR1cmF0aW9uID0gdGltZWxpbmUucGxheWVyLmR1cmF0aW9uLFxuICAgICAgICBzZWVrVGltZSA9IHRpbWVsaW5lLnBsYXllci5jdXJyZW50VGltZTtcblxuICAgICAgc3dpdGNoIChrZXlDb2RlKSB7XG4gICAgICAgIGNhc2UgMzc6IC8vIGxlZnRcbiAgICAgICAgICBzZWVrVGltZSAtPSAxO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDM5OiAvLyBSaWdodFxuICAgICAgICAgIHNlZWtUaW1lICs9IDE7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMzg6IC8vIFVwXG4gICAgICAgICAgaWYgKHRpbWVsaW5lLmhhc0NoYXB0ZXJzKSB7XG4gICAgICAgICAgICB0aW1lbGluZS5tb2R1bGVzWzBdLm5leHQoKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgc2Vla1RpbWUgKz0gTWF0aC5mbG9vcihkdXJhdGlvbiAqIDAuMSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgNDA6IC8vIERvd25cbiAgICAgICAgICBpZiAodGltZWxpbmUuaGFzQ2hhcHRlcnMpIHtcbiAgICAgICAgICAgIHRpbWVsaW5lLm1vZHVsZXNbMF0ucHJldmlvdXMoKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgc2Vla1RpbWUgLT0gTWF0aC5mbG9vcihkdXJhdGlvbiAqIDAuMSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMzY6IC8vIEhvbWVcbiAgICAgICAgICBzZWVrVGltZSA9IDA7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMzU6IC8vIGVuZFxuICAgICAgICAgIHNlZWtUaW1lID0gZHVyYXRpb247XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMTA6IC8vIGVudGVyXG4gICAgICAgIGNhc2UgMzI6IC8vIHNwYWNlXG4gICAgICAgICAgaWYgKHRpbWVsaW5lLnBsYXllci5wYXVzZWQpIHtcbiAgICAgICAgICAgIHRpbWVsaW5lLnBsYXllci5wbGF5KCk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICAgICAgdGltZWxpbmUucGxheWVyLnBhdXNlKCk7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgdGltZWxpbmUuc2V0VGltZShzZWVrVGltZSk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSk7XG5cbiAganFQbGF5ZXJcbiAgICAub24oJ3RpbWVsaW5lRWxlbWVudCcsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgY29uc29sZS5sb2coZXZlbnQuY3VycmVudFRhcmdldC5pZCwgZXZlbnQpO1xuICAgIH0pXG4gICAgLm9uKCd0aW1ldXBkYXRlIHByb2dyZXNzJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICB0aW1lbGluZS51cGRhdGUoZXZlbnQpO1xuICAgIH0pXG4gICAgLy8gdXBkYXRlIHBsYXkvcGF1c2Ugc3RhdHVzXG4gICAgLm9uKCdwbGF5JywgZnVuY3Rpb24gKCkge30pXG4gICAgLm9uKCdwbGF5aW5nJywgZnVuY3Rpb24gKCkge1xuICAgICAgcGxheUJ1dHRvbi5hZGRDbGFzcygncGxheWluZycpO1xuICAgICAgZW1iZWQucG9zdFRvT3BlbmVyKHsgYWN0aW9uOiAncGxheScsIGFyZzogcGxheWVyLmN1cnJlbnRUaW1lIH0pO1xuICAgIH0pXG4gICAgLm9uKCdwYXVzZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHBsYXlCdXR0b24ucmVtb3ZlQ2xhc3MoJ3BsYXlpbmcnKTtcbiAgICAgIGVtYmVkLnBvc3RUb09wZW5lcih7IGFjdGlvbjogJ3BhdXNlJywgYXJnOiBwbGF5ZXIuY3VycmVudFRpbWUgfSk7XG4gICAgfSlcbiAgICAub24oJ2VuZGVkJywgZnVuY3Rpb24gKCkge1xuICAgICAgZW1iZWQucG9zdFRvT3BlbmVyKHsgYWN0aW9uOiAnc3RvcCcsIGFyZzogcGxheWVyLmN1cnJlbnRUaW1lIH0pO1xuICAgICAgLy8gZGVsZXRlIHRoZSBjYWNoZWQgcGxheSB0aW1lXG4gICAgICB0aW1lbGluZS5yZXdpbmQoKTtcbiAgICB9KTtcblxuICB2YXIgZGVsYXlNb2R1bGVSZW5kZXJpbmcgPSAhdGltZWxpbmUuZHVyYXRpb24gfHwgaXNOYU4odGltZWxpbmUuZHVyYXRpb24pIHx8IHRpbWVsaW5lLmR1cmF0aW9uIDw9IDA7XG5cbiAgaWYgKCFkZWxheU1vZHVsZVJlbmRlcmluZykge1xuICAgIHJlbmRlck1vZHVsZXModGltZWxpbmUsIHdyYXBwZXIsIHBhcmFtcyk7XG4gIH1cblxuICBqcVBsYXllci5vbmUoJ2NhbnBsYXknLCBmdW5jdGlvbiAoKSB7XG4gICAgLy8gY29ycmVjdCBkdXJhdGlvbiBqdXN0IGluIGNhc2VcbiAgICB0aW1lbGluZS5kdXJhdGlvbiA9IHBsYXllci5kdXJhdGlvbjtcbiAgICBpZiAoZGVsYXlNb2R1bGVSZW5kZXJpbmcpIHtcbiAgICAgIHJlbmRlck1vZHVsZXModGltZWxpbmUsIHdyYXBwZXIsIHBhcmFtcyk7XG4gICAgfVxuICB9KTtcbn1cblxuLyoqXG4gKiByZXR1cm4gY2FsbGJhY2sgZnVuY3Rpb24gdGhhdCB3aWxsIGF0dGFjaCBzb3VyY2UgZWxlbWVudHMgdG8gdGhlIGRlZmVycmVkIGF1ZGlvIGVsZW1lbnRcbiAqIEBwYXJhbSB7b2JqZWN0fSBkZWZlcnJlZFBsYXllclxuICogQHJldHVybnMge0Z1bmN0aW9ufVxuICovXG5mdW5jdGlvbiBnZXREZWZlcnJlZFBsYXllckNhbGxCYWNrKGRlZmVycmVkUGxheWVyKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoZGF0YSkge1xuICAgIHZhciBwYXJhbXMgPSAkLmV4dGVuZCh7fSwgUGxheWVyLmRlZmF1bHRzLCBkYXRhKTtcbiAgICBkYXRhLnNvdXJjZXMuZm9yRWFjaChmdW5jdGlvbiAoc291cmNlT2JqZWN0KSB7XG4gICAgICAkKCc8c291cmNlPicsIHNvdXJjZU9iamVjdCkuYXBwZW5kVG8oZGVmZXJyZWRQbGF5ZXIpO1xuICAgIH0pO1xuICAgIFBsYXllci5jcmVhdGUoZGVmZXJyZWRQbGF5ZXIsIHBhcmFtcywgYWRkQmVoYXZpb3IpO1xuICB9O1xufVxuXG4vKipcbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0aW9uc1xuICogQHJldHVybnMge2pRdWVyeX1cbiAqL1xuJC5mbi5wb2Rsb3Zld2VicGxheWVyID0gZnVuY3Rpb24gd2ViUGxheWVyKG9wdGlvbnMpIHtcbiAgaWYgKG9wdGlvbnMuZGVmZXJyZWQpIHtcbiAgICB2YXIgZGVmZXJyZWRQbGF5ZXIgPSB0aGlzWzBdO1xuICAgIHZhciBjYWxsYmFjayA9IGdldERlZmVycmVkUGxheWVyQ2FsbEJhY2soZGVmZXJyZWRQbGF5ZXIpO1xuICAgIGVtYmVkLndhaXRGb3JNZXRhZGF0YShjYWxsYmFjayk7XG4gICAgZW1iZWQucG9zdFRvT3BlbmVyKHthY3Rpb246ICd3YWl0aW5nJ30pO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gQWRkaXRpb25hbCBwYXJhbWV0ZXJzIGRlZmF1bHQgdmFsdWVzXG4gIHZhciBwYXJhbXMgPSAkLmV4dGVuZCh7fSwgUGxheWVyLmRlZmF1bHRzLCBvcHRpb25zKTtcblxuICAvLyB0dXJuIGVhY2ggcGxheWVyIGluIHRoZSBjdXJyZW50IHNldCBpbnRvIGEgUG9kbG92ZSBXZWIgUGxheWVyXG4gIHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKGksIHBsYXllckVsZW1lbnQpIHtcbiAgICBQbGF5ZXIuY3JlYXRlKHBsYXllckVsZW1lbnQsIHBhcmFtcywgYWRkQmVoYXZpb3IpO1xuICB9KTtcbn07XG5cbnB3cCA9IHsgcGxheWVyczogUGxheWVyLnBsYXllcnMgfTtcblxuZW1iZWQuaW5pdCgkLCBQbGF5ZXIucGxheWVycyk7XG5cbndpbmRvdy5wd3AgPSBwd3A7XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwib01mcEFuXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvZmFrZV80NjQ2MDY0Ni5qc1wiLFwiL1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0JztcblxudmFyIHRjID0gcmVxdWlyZSgnLi4vdGltZWNvZGUnKVxuICAsIFRhYiA9IHJlcXVpcmUoJy4uL3RhYicpXG4gIDtcblxudmFyIEFDVElWRV9DSEFQVEVSX1RIUkVTSEhPTEQgPSAwLjE7XG5cbmZ1bmN0aW9uIHJvd0NsaWNrSGFuZGxlciAoZSkge1xuICBlLnByZXZlbnREZWZhdWx0KCk7XG4gIHZhciBjaGFwdGVycyA9IGUuZGF0YS5tb2R1bGU7XG4gIGNvbnNvbGUubG9nKCdDaGFwdGVyJywgJ2NsaWNrSGFuZGxlcicsICdzZXRDdXJyZW50Q2hhcHRlciB0bycsIGUuZGF0YS5pbmRleCk7XG4gIGNoYXB0ZXJzLnNldEN1cnJlbnRDaGFwdGVyKGUuZGF0YS5pbmRleCk7XG4gIGNoYXB0ZXJzLnBsYXlDdXJyZW50Q2hhcHRlcigpO1xuICBjaGFwdGVycy50aW1lbGluZS5wbGF5ZXIucGxheSgpO1xuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIHRyYW5zZm9ybUNoYXB0ZXIoY2hhcHRlcikge1xuICBjaGFwdGVyLmNvZGUgPSBjaGFwdGVyLnRpdGxlO1xuICBpZiAodHlwZW9mIGNoYXB0ZXIuc3RhcnQgPT09ICdzdHJpbmcnKSB7XG4gICAgY2hhcHRlci5zdGFydCA9IHRjLmdldFN0YXJ0VGltZUNvZGUoY2hhcHRlci5zdGFydCk7XG4gIH1cbiAgcmV0dXJuIGNoYXB0ZXI7XG59XG5cbi8qKlxuICogYWRkIGBlbmRgIHByb3BlcnR5IHRvIGVhY2ggc2ltcGxlIGNoYXB0ZXIsXG4gKiBuZWVkZWQgZm9yIHByb3BlciBmb3JtYXR0aW5nXG4gKiBAcGFyYW0ge251bWJlcn0gZHVyYXRpb25cbiAqIEByZXR1cm5zIHtmdW5jdGlvbn1cbiAqL1xuZnVuY3Rpb24gYWRkRW5kVGltZShkdXJhdGlvbikge1xuICByZXR1cm4gZnVuY3Rpb24gKGNoYXB0ZXIsIGksIGNoYXB0ZXJzKSB7XG4gICAgdmFyIG5leHQgPSBjaGFwdGVyc1tpICsgMV07XG4gICAgY2hhcHRlci5lbmQgPSBuZXh0ID8gbmV4dC5zdGFydCA6IGR1cmF0aW9uO1xuICAgIHJldHVybiBjaGFwdGVyO1xuICB9O1xufVxuXG5mdW5jdGlvbiByZW5kZXIoaHRtbCkge1xuICByZXR1cm4gJChodG1sKTtcbn1cblxuLyoqXG4gKiByZW5kZXIgSFRNTFRhYmxlRWxlbWVudCBmb3IgY2hhcHRlcnNcbiAqIEByZXR1cm5zIHtqUXVlcnl8SFRNTEVsZW1lbnR9XG4gKi9cbmZ1bmN0aW9uIHJlbmRlckNoYXB0ZXJUYWJsZSgpIHtcbiAgcmV0dXJuIHJlbmRlcihcbiAgICAnPHRhYmxlIGNsYXNzPVwicG9kbG92ZXdlYnBsYXllcl9jaGFwdGVyc1wiPjxjYXB0aW9uPkthcGl0ZWw8L2NhcHRpb24+JyArXG4gICAgICAnPHRoZWFkPicgK1xuICAgICAgICAnPHRyPicgK1xuICAgICAgICAgICc8dGggc2NvcGU9XCJjb2xcIj5LYXBpdGVsbnVtbWVyPC90aD4nICtcbiAgICAgICAgICAnPHRoIHNjb3BlPVwiY29sXCI+U3RhcnR6ZWl0PC90aD4nICtcbiAgICAgICAgICAnPHRoIHNjb3BlPVwiY29sXCI+VGl0ZWw8L3RoPicgK1xuICAgICAgICAgICc8dGggc2NvcGU9XCJjb2xcIj5EYXVlcjwvdGg+JyArXG4gICAgICAgICc8L3RyPicgK1xuICAgICAgJzwvdGhlYWQ+JyArXG4gICAgICAnPHRib2R5PjwvdGJvZHk+JyArXG4gICAgJzwvdGFibGU+J1xuICApO1xufVxuXG4vKipcbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gY2hhcHRlclxuICogQHJldHVybnMge2pRdWVyeXxIVE1MRWxlbWVudH1cbiAqL1xuZnVuY3Rpb24gcmVuZGVyUm93IChjaGFwdGVyLCBpbmRleCkge1xuICByZXR1cm4gcmVuZGVyKFxuICAgICc8dHIgY2xhc3M9XCJjaGFwdGVyXCI+JyArXG4gICAgICAnPHRkIGNsYXNzPVwiY2hhcHRlci1udW1iZXJcIj48c3BhbiBjbGFzcz1cImJhZGdlXCI+JyArIChpbmRleCArIDEpICsgJzwvc3Bhbj48L3RkPicgK1xuICAgICAgJzx0ZCBjbGFzcz1cImNoYXB0ZXItbmFtZVwiPjxzcGFuPicgKyBjaGFwdGVyLmNvZGUgKyAnPC9zcGFuPjwvdGQ+JyArXG4gICAgICAnPHRkIGNsYXNzPVwiY2hhcHRlci1kdXJhdGlvblwiPjxzcGFuPicgKyBjaGFwdGVyLmR1cmF0aW9uICsgJzwvc3Bhbj48L3RkPicgK1xuICAgICc8L3RyPidcbiAgKTtcbn1cblxuLyoqXG4gKlxuICogQHBhcmFtIHtBcnJheX0gY2hhcHRlcnNcbiAqIEByZXR1cm5zIHtudW1iZXJ9XG4gKi9cbmZ1bmN0aW9uIGdldE1heENoYXB0ZXJTdGFydChjaGFwdGVycykge1xuICBmdW5jdGlvbiBnZXRTdGFydFRpbWUgKGNoYXB0ZXIpIHtcbiAgICByZXR1cm4gY2hhcHRlci5zdGFydDtcbiAgfVxuICByZXR1cm4gTWF0aC5tYXguYXBwbHkoTWF0aCwgJC5tYXAoY2hhcHRlcnMsIGdldFN0YXJ0VGltZSkpO1xufVxuXG4vKipcbiAqXG4gKiBAcGFyYW0ge3tlbmQ6e251bWJlcn0sIHN0YXJ0OntudW1iZXJ9fX0gY2hhcHRlclxuICogQHBhcmFtIHtudW1iZXJ9IGN1cnJlbnRUaW1lXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNBY3RpdmVDaGFwdGVyIChjaGFwdGVyLCBjdXJyZW50VGltZSkge1xuICBpZiAoIWNoYXB0ZXIpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIChjdXJyZW50VGltZSA+IGNoYXB0ZXIuc3RhcnQgLSBBQ1RJVkVfQ0hBUFRFUl9USFJFU0hIT0xEICYmIGN1cnJlbnRUaW1lIDw9IGNoYXB0ZXIuZW5kKTtcbn1cblxuLyoqXG4gKiB1cGRhdGUgdGhlIGNoYXB0ZXIgbGlzdCB3aGVuIHRoZSBkYXRhIGlzIGxvYWRlZFxuICogQHBhcmFtIHtUaW1lbGluZX0gdGltZWxpbmVcbiAqL1xuZnVuY3Rpb24gdXBkYXRlICh0aW1lbGluZSkge1xuICB2YXIgYWN0aXZlQ2hhcHRlciA9IHRoaXMuZ2V0QWN0aXZlQ2hhcHRlcigpXG4gICAgLCBjdXJyZW50VGltZSA9IHRpbWVsaW5lLmdldFRpbWUoKTtcblxuICBjb25zb2xlLmRlYnVnKCdDaGFwdGVycycsICd1cGRhdGUnLCB0aGlzLCBhY3RpdmVDaGFwdGVyLCBjdXJyZW50VGltZSk7XG4gIGlmIChpc0FjdGl2ZUNoYXB0ZXIoYWN0aXZlQ2hhcHRlciwgY3VycmVudFRpbWUpKSB7XG4gICAgY29uc29sZS5sb2coJ0NoYXB0ZXJzJywgJ3VwZGF0ZScsICdhbHJlYWR5IHNldCcsIHRoaXMuY3VycmVudENoYXB0ZXIpO1xuICAgIHJldHVybjtcbiAgfVxuICBmdW5jdGlvbiBtYXJrQ2hhcHRlciAoY2hhcHRlciwgaSkge1xuICAgIHZhciBpc0FjdGl2ZSA9IGlzQWN0aXZlQ2hhcHRlcihjaGFwdGVyLCBjdXJyZW50VGltZSk7XG4gICAgaWYgKGlzQWN0aXZlKSB7XG4gICAgICB0aGlzLnNldEN1cnJlbnRDaGFwdGVyKGkpO1xuICAgIH1cbiAgfVxuICB0aGlzLmNoYXB0ZXJzLmZvckVhY2gobWFya0NoYXB0ZXIsIHRoaXMpO1xufVxuXG4vKipcbiAqIGNoYXB0ZXIgaGFuZGxpbmdcbiAqIEBwYXJhbXMge1RpbWVsaW5lfSBwYXJhbXNcbiAqIEByZXR1cm4ge0NoYXB0ZXJzfSBjaGFwdGVyIG1vZHVsZVxuICovXG5mdW5jdGlvbiBDaGFwdGVycyAodGltZWxpbmUsIHBhcmFtcykge1xuXG4gIGlmICghdGltZWxpbmUgfHwgIXRpbWVsaW5lLmhhc0NoYXB0ZXJzKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgaWYgKHRpbWVsaW5lLmR1cmF0aW9uID09PSAwKSB7XG4gICAgY29uc29sZS53YXJuKCdDaGFwdGVycycsICdjb25zdHJ1Y3RvcicsICdaZXJvIGxlbmd0aCBtZWRpYT8nLCB0aW1lbGluZSk7XG4gIH1cblxuICB0aGlzLnRpbWVsaW5lID0gdGltZWxpbmU7XG4gIHRoaXMuZHVyYXRpb24gPSB0aW1lbGluZS5kdXJhdGlvbjtcbiAgdGhpcy5jaGFwdGVybGlua3MgPSAhIXRpbWVsaW5lLmNoYXB0ZXJsaW5rcztcbiAgdGhpcy5jdXJyZW50Q2hhcHRlciA9IDA7XG4gIHRoaXMuY2hhcHRlcnMgPSB0aGlzLnBhcnNlU2ltcGxlQ2hhcHRlcihwYXJhbXMpO1xuICB0aGlzLmRhdGEgPSB0aGlzLmNoYXB0ZXJzO1xuXG4gIHRoaXMudGFiID0gbmV3IFRhYih7XG4gICAgaWNvbjogJ3B3cC1jaGFwdGVycycsXG4gICAgdGl0bGU6ICdLYXBpdGVsIGFuemVpZ2VuIC8gdmVyYmVyZ2VuJyxcbiAgICBoZWFkbGluZTogJ0thcGl0ZWwnLFxuICAgIG5hbWU6ICdwb2Rsb3Zld2VicGxheWVyX2NoYXB0ZXJib3gnXG4gIH0pO1xuXG4gIHRoaXMudGFiXG4gICAgLmNyZWF0ZU1haW5Db250ZW50KCcnKVxuICAgIC5hcHBlbmQodGhpcy5nZW5lcmF0ZVRhYmxlKCkpO1xuXG4gIHRoaXMudXBkYXRlID0gdXBkYXRlLmJpbmQodGhpcyk7XG59XG5cbi8qKlxuICogR2l2ZW4gYSBsaXN0IG9mIGNoYXB0ZXJzLCB0aGlzIGZ1bmN0aW9uIGNyZWF0ZXMgdGhlIGNoYXB0ZXIgdGFibGUgZm9yIHRoZSBwbGF5ZXIuXG4gKiBAcmV0dXJucyB7alF1ZXJ5fEhUTUxEaXZFbGVtZW50fVxuICovXG5DaGFwdGVycy5wcm90b3R5cGUuZ2VuZXJhdGVUYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHRhYmxlLCB0Ym9keSwgbWF4Y2hhcHRlcnN0YXJ0LCBmb3JjZUhvdXJzO1xuXG4gIHRhYmxlID0gcmVuZGVyQ2hhcHRlclRhYmxlKCk7XG4gIHRib2R5ID0gdGFibGUuY2hpbGRyZW4oJ3Rib2R5Jyk7XG5cbiAgbWF4Y2hhcHRlcnN0YXJ0ID0gZ2V0TWF4Q2hhcHRlclN0YXJ0KHRoaXMuY2hhcHRlcnMpO1xuICBmb3JjZUhvdXJzID0gKG1heGNoYXB0ZXJzdGFydCA+PSAzNjAwKTtcblxuICBmdW5jdGlvbiBidWlsZENoYXB0ZXIoY2hhcHRlciwgaW5kZXgpIHtcbiAgICB2YXIgZHVyYXRpb24gPSBNYXRoLnJvdW5kKGNoYXB0ZXIuZW5kIC0gY2hhcHRlci5zdGFydCk7XG5cbiAgICAvL21ha2Ugc3VyZSB0aGUgZHVyYXRpb24gZm9yIGFsbCBjaGFwdGVycyBhcmUgZXF1YWxseSBmb3JtYXR0ZWRcbiAgICBjaGFwdGVyLmR1cmF0aW9uID0gdGMuZ2VuZXJhdGUoW2R1cmF0aW9uXSwgZmFsc2UpO1xuXG4gICAgLy9pZiB0aGVyZSBpcyBhIGNoYXB0ZXIgdGhhdCBzdGFydHMgYWZ0ZXIgYW4gaG91ciwgZm9yY2UgJzAwOicgb24gYWxsIHByZXZpb3VzIGNoYXB0ZXJzXG4gICAgY2hhcHRlci5zdGFydFRpbWUgPSB0Yy5nZW5lcmF0ZShbTWF0aC5yb3VuZChjaGFwdGVyLnN0YXJ0KV0sIHRydWUsIGZvcmNlSG91cnMpO1xuXG4gICAgLy9pbnNlcnQgdGhlIGNoYXB0ZXIgZGF0YVxuICAgIHZhciByb3cgPSByZW5kZXJSb3coY2hhcHRlciwgaW5kZXgpO1xuICAgIHJvdy5vbignY2xpY2snLCB7bW9kdWxlOiB0aGlzLCBpbmRleDogaW5kZXh9LCByb3dDbGlja0hhbmRsZXIpO1xuICAgIHJvdy5hcHBlbmRUbyh0Ym9keSk7XG4gICAgY2hhcHRlci5lbGVtZW50ID0gcm93O1xuICB9XG5cbiAgdGhpcy5jaGFwdGVycy5mb3JFYWNoKGJ1aWxkQ2hhcHRlciwgdGhpcyk7XG4gIHJldHVybiB0YWJsZTtcbn07XG5cbkNoYXB0ZXJzLnByb3RvdHlwZS5nZXRBY3RpdmVDaGFwdGVyID0gZnVuY3Rpb24gKCkge1xuICB2YXIgYWN0aXZlID0gdGhpcy5jaGFwdGVyc1t0aGlzLmN1cnJlbnRDaGFwdGVyXTtcbiAgY29uc29sZS5sb2coJ0NoYXB0ZXJzJywgJ2dldEFjdGl2ZUNoYXB0ZXInLCBhY3RpdmUpO1xuICByZXR1cm4gYWN0aXZlO1xufTtcblxuLyoqXG4gKlxuICogQHBhcmFtIHtudW1iZXJ9IGNoYXB0ZXJJbmRleFxuICovXG5DaGFwdGVycy5wcm90b3R5cGUuc2V0Q3VycmVudENoYXB0ZXIgPSBmdW5jdGlvbiAoY2hhcHRlckluZGV4KSB7XG4gIGlmIChjaGFwdGVySW5kZXggPCB0aGlzLmNoYXB0ZXJzLmxlbmd0aCAmJiBjaGFwdGVySW5kZXggPj0gMCkge1xuICAgIHRoaXMuY3VycmVudENoYXB0ZXIgPSBjaGFwdGVySW5kZXg7XG4gIH1cbiAgdGhpcy5tYXJrQWN0aXZlQ2hhcHRlcigpO1xuICBjb25zb2xlLmxvZygnQ2hhcHRlcnMnLCAnc2V0Q3VycmVudENoYXB0ZXInLCAndG8nLCB0aGlzLmN1cnJlbnRDaGFwdGVyKTtcbn07XG5cbkNoYXB0ZXJzLnByb3RvdHlwZS5tYXJrQWN0aXZlQ2hhcHRlciA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGFjdGl2ZUNoYXB0ZXIgPSB0aGlzLmdldEFjdGl2ZUNoYXB0ZXIoKTtcbiAgJC5lYWNoKHRoaXMuY2hhcHRlcnMsIGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmVsZW1lbnQucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICB9KTtcbiAgYWN0aXZlQ2hhcHRlci5lbGVtZW50LmFkZENsYXNzKCdhY3RpdmUnKTtcbn07XG5cbkNoYXB0ZXJzLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgY3VycmVudCA9IHRoaXMuY3VycmVudENoYXB0ZXIsXG4gICAgbmV4dCA9IHRoaXMuc2V0Q3VycmVudENoYXB0ZXIoY3VycmVudCArIDEpO1xuICBpZiAoY3VycmVudCA9PT0gbmV4dCkge1xuICAgIGNvbnNvbGUubG9nKCdDaGFwdGVycycsICduZXh0JywgJ2FscmVhZHkgaW4gbGFzdCBjaGFwdGVyJyk7XG4gICAgcmV0dXJuIGN1cnJlbnQ7XG4gIH1cbiAgY29uc29sZS5sb2coJ0NoYXB0ZXJzJywgJ25leHQnLCAnY2hhcHRlcicsIHRoaXMuY3VycmVudENoYXB0ZXIpO1xuICB0aGlzLnBsYXlDdXJyZW50Q2hhcHRlcigpO1xuICByZXR1cm4gbmV4dDtcbn07XG5cbkNoYXB0ZXJzLnByb3RvdHlwZS5wcmV2aW91cyA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGN1cnJlbnQgPSB0aGlzLmN1cnJlbnRDaGFwdGVyLFxuICAgIHByZXZpb3VzID0gdGhpcy5zZXRDdXJyZW50Q2hhcHRlcihjdXJyZW50IC0gMSk7XG4gIGlmIChjdXJyZW50ID09PSBwcmV2aW91cykge1xuICAgIGNvbnNvbGUuZGVidWcoJ0NoYXB0ZXJzJywgJ3ByZXZpb3VzJywgJ2FscmVhZHkgaW4gZmlyc3QgY2hhcHRlcicpO1xuICAgIHRoaXMucGxheUN1cnJlbnRDaGFwdGVyKCk7XG4gICAgcmV0dXJuIGN1cnJlbnQ7XG4gIH1cbiAgY29uc29sZS5kZWJ1ZygnQ2hhcHRlcnMnLCAncHJldmlvdXMnLCAnY2hhcHRlcicsIHRoaXMuY3VycmVudENoYXB0ZXIpO1xuICB0aGlzLnBsYXlDdXJyZW50Q2hhcHRlcigpO1xuICByZXR1cm4gcHJldmlvdXM7XG59O1xuXG5DaGFwdGVycy5wcm90b3R5cGUucGxheUN1cnJlbnRDaGFwdGVyID0gZnVuY3Rpb24gKCkge1xuICB2YXIgc3RhcnQgPSB0aGlzLmdldEFjdGl2ZUNoYXB0ZXIoKS5zdGFydDtcbiAgY29uc29sZS5sb2coJ0NoYXB0ZXJzJywgJyNwbGF5Q3VycmVudENoYXB0ZXInLCAnc3RhcnQnLCBzdGFydCk7XG4gIHZhciB0aW1lID0gdGhpcy50aW1lbGluZS5zZXRUaW1lKHN0YXJ0KTtcbiAgY29uc29sZS5sb2coJ0NoYXB0ZXJzJywgJyNwbGF5Q3VycmVudENoYXB0ZXInLCAnY3VycmVudFRpbWUnLCB0aW1lKTtcbn07XG5cbkNoYXB0ZXJzLnByb3RvdHlwZS5wYXJzZVNpbXBsZUNoYXB0ZXIgPSBmdW5jdGlvbiAocGFyYW1zKSB7XG4gIHZhciBjaGFwdGVycyA9IHBhcmFtcy5jaGFwdGVycztcbiAgaWYgKCFjaGFwdGVycykge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIHJldHVybiBjaGFwdGVyc1xuICAgIC5tYXAodHJhbnNmb3JtQ2hhcHRlcilcbiAgICAubWFwKGFkZEVuZFRpbWUodGhpcy5kdXJhdGlvbikpXG4gICAgLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHsgLy8gb3JkZXIgaXMgbm90IGd1YXJhbnRlZWQ6IGh0dHA6Ly9wb2Rsb3ZlLm9yZy9zaW1wbGUtY2hhcHRlcnMvXG4gICAgICByZXR1cm4gYS5zdGFydCAtIGIuc3RhcnQ7XG4gICAgfSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENoYXB0ZXJzO1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIm9NZnBBblwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiL21vZHVsZXMvY2hhcHRlci5qc1wiLFwiL21vZHVsZXNcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4ndXNlIHN0cmljdCc7XG5cbnZhciBUYWIgPSByZXF1aXJlKCcuLi90YWInKTtcblxuLyoqXG4gKiBDYWxjdWxhdGUgdGhlIGZpbGVzaXplIGludG8gS0IgYW5kIE1CXG4gKiBAcGFyYW0gc2l6ZVxuICogQHJldHVybnMge3N0cmluZ31cbiAqL1xuZnVuY3Rpb24gZm9ybWF0U2l6ZShzaXplKSB7XG4gIHZhciBvbmVNYiA9IDEwNDg1NzY7XG4gIHZhciBmaWxlU2l6ZSA9IHBhcnNlSW50KHNpemUsIDEwKTtcbiAgdmFyIGtCRmlsZVNpemUgPSBNYXRoLnJvdW5kKGZpbGVTaXplIC8gMTAyNCk7XG4gIHZhciBtQkZpbGVTSXplID0gTWF0aC5yb3VuZChmaWxlU2l6ZSAvIDEwMjQgLyAxMDI0KTtcbiAgaWYgKCFzaXplKSB7XG4gICAgcmV0dXJuICcgLS0gJztcbiAgfVxuICAvLyBpbiBjYXNlLCB0aGUgZmlsZXNpemUgaXMgc21hbGxlciB0aGFuIDFNQixcbiAgLy8gdGhlIGZvcm1hdCB3aWxsIGJlIHJlbmRlcmVkIGluIEtCXG4gIC8vIG90aGVyd2lzZSBpbiBNQlxuICByZXR1cm4gKGZpbGVTaXplIDwgb25lTWIpID8ga0JGaWxlU2l6ZSArICcgS0InIDogbUJGaWxlU0l6ZSArICcgTUInO1xufVxuXG4vKipcbiAqXG4gKiBAcGFyYW0gbGlzdEVsZW1lbnRcbiAqIEByZXR1cm5zIHtzdHJpbmd9XG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZU9wdGlvbihsaXN0RWxlbWVudCkge1xuICBjb25zb2xlLmxvZyhsaXN0RWxlbWVudCk7XG4gIHJldHVybiAnPG9wdGlvbj4nICsgbGlzdEVsZW1lbnQuYXNzZXRUaXRsZSArICcgJiM4MjI2OyAnICsgZm9ybWF0U2l6ZShsaXN0RWxlbWVudC5zaXplKSArICc8L29wdGlvbj4nO1xufVxuXG4vKipcbiAqXG4gKiBAcGFyYW0gZWxlbWVudFxuICogQHJldHVybnMge3thc3NldFRpdGxlOiBTdHJpbmcsIGRvd25sb2FkVXJsOiBTdHJpbmcsIHVybDogU3RyaW5nLCBzaXplOiBOdW1iZXJ9fVxuICovXG5mdW5jdGlvbiBub3JtYWxpemVEb3dubG9hZCAoZWxlbWVudCkge1xuICByZXR1cm4ge1xuICAgIGFzc2V0VGl0bGU6IGVsZW1lbnQubmFtZSxcbiAgICBkb3dubG9hZFVybDogZWxlbWVudC5kbHVybCxcbiAgICB1cmw6IGVsZW1lbnQudXJsLFxuICAgIHNpemU6IGVsZW1lbnQuc2l6ZVxuICB9O1xufVxuXG4vKipcbiAqXG4gKiBAcGFyYW0gZWxlbWVudFxuICogQHJldHVybnMge3thc3NldFRpdGxlOiBTdHJpbmcsIGRvd25sb2FkVXJsOiBTdHJpbmcsIHVybDogU3RyaW5nLCBzaXplOiBOdW1iZXJ9fVxuICovXG5mdW5jdGlvbiBub3JtYWxpemVTb3VyY2UoZWxlbWVudCkge1xuICB2YXIgc291cmNlID0gKHR5cGVvZiBlbGVtZW50ID09PSAnc3RyaW5nJykgPyBlbGVtZW50IDogZWxlbWVudC5zcmM7XG4gIHZhciBwYXJ0cyA9IHNvdXJjZS5zcGxpdCgnLicpO1xuICByZXR1cm4ge1xuICAgIGFzc2V0VGl0bGU6IHBhcnRzW3BhcnRzLmxlbmd0aCAtIDFdLFxuICAgIGRvd25sb2FkVXJsOiBzb3VyY2UsXG4gICAgdXJsOiBzb3VyY2UsXG4gICAgc2l6ZTogLTFcbiAgfTtcbn1cblxuLyoqXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHBhcmFtc1xuICogQHJldHVybnMge0FycmF5fVxuICovXG5mdW5jdGlvbiBjcmVhdGVMaXN0IChwYXJhbXMpIHtcbiAgaWYgKHBhcmFtcy5kb3dubG9hZHMgJiYgcGFyYW1zLmRvd25sb2Fkc1swXS5hc3NldFRpdGxlKSB7XG4gICAgcmV0dXJuIHBhcmFtcy5kb3dubG9hZHM7XG4gIH1cblxuICBpZiAocGFyYW1zLmRvd25sb2Fkcykge1xuICAgIHJldHVybiBwYXJhbXMuZG93bmxvYWRzLm1hcChub3JtYWxpemVEb3dubG9hZCk7XG4gIH1cbiAgLy8gYnVpbGQgZnJvbSBzb3VyY2UgZWxlbWVudHNcbiAgcmV0dXJuIHBhcmFtcy5zb3VyY2VzLm1hcChub3JtYWxpemVTb3VyY2UpO1xufVxuXG4vKipcbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gcGFyYW1zXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gRG93bmxvYWRzIChwYXJhbXMpIHtcbiAgdGhpcy5saXN0ID0gY3JlYXRlTGlzdChwYXJhbXMpO1xuICB0aGlzLnRhYiA9IHRoaXMuY3JlYXRlRG93bmxvYWRUYWIocGFyYW1zKTtcbn1cblxuLyoqXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IHBhcmFtc1xuICogQHJldHVybnMge251bGx8VGFifSBkb3dubG9hZCB0YWJcbiAqL1xuRG93bmxvYWRzLnByb3RvdHlwZS5jcmVhdGVEb3dubG9hZFRhYiA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgaWYgKCghcGFyYW1zLmRvd25sb2FkcyAmJiAhcGFyYW1zLnNvdXJjZXMpIHx8IHBhcmFtcy5oaWRlZG93bmxvYWRidXR0b24gPT09IHRydWUpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICB2YXIgZG93bmxvYWRUYWIgPSBuZXcgVGFiKHtcbiAgICBpY29uOiAncHdwLWRvd25sb2FkJyxcbiAgICB0aXRsZTogJ0Rvd25sb2FkcyBhbnplaWdlbiAvIHZlcmJlcmdlbicsXG4gICAgbmFtZTogJ2Rvd25sb2FkcycsXG4gICAgaGVhZGxpbmU6ICdEb3dubG9hZCdcbiAgfSk7XG5cbiAgdmFyICR0YWJDb250ZW50ID0gZG93bmxvYWRUYWIuY3JlYXRlTWFpbkNvbnRlbnQoXG4gICAgJzxkaXYgY2xhc3M9XCJkb3dubG9hZFwiPicgK1xuICAgICc8Zm9ybSBhY3Rpb249XCJcIiBtZXRob2Q9XCJcIj4nICtcbiAgICAgICc8c2VsZWN0IGNsYXNzPVwic2VsZWN0XCIgbmFtZT1cInNlbGVjdC1maWxlXCI+JyArIHRoaXMubGlzdC5tYXAoY3JlYXRlT3B0aW9uKSArICc8L3NlbGVjdD4nICtcbiAgICAgICc8YnV0dG9uIGNsYXNzPVwiZG93bmxvYWQgYnV0dG9uLXN1Ym1pdCBpY29uIHB3cC1kb3dubG9hZFwiIG5hbWU9XCJkb3dubG9hZC1maWxlXCI+JyArXG4gICAgICAnPHNwYW4gY2xhc3M9XCJkb3dubG9hZCBsYWJlbFwiPkRvd25sb2FkPC9zcGFuPicgK1xuICAgICAgJzwvYnV0dG9uPicgK1xuICAgICc8L2Zvcm0+JyArXG4gICAgJzwvZGl2PidcbiAgKTtcbiAgZG93bmxvYWRUYWIuYm94LmFwcGVuZCgkdGFiQ29udGVudCk7XG5cbiAgcmV0dXJuIGRvd25sb2FkVGFiO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBEb3dubG9hZHM7XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwib01mcEFuXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvbW9kdWxlcy9kb3dubG9hZHMuanNcIixcIi9tb2R1bGVzXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgVGFiID0gcmVxdWlyZSgnLi4vdGFiJylcbiAgLCB0aW1lQ29kZSA9IHJlcXVpcmUoJy4uL3RpbWVjb2RlJylcbiAgLCBzZXJ2aWNlcyA9IHJlcXVpcmUoJy4uL3NvY2lhbC1uZXR3b3JrcycpO1xuXG5mdW5jdGlvbiBnZXRQdWJsaWNhdGlvbkRhdGUocmF3RGF0ZSkge1xuICBpZiAoIXJhd0RhdGUpIHtcbiAgICByZXR1cm4gJyc7XG4gIH1cbiAgdmFyIGRhdGUgPSBuZXcgRGF0ZShyYXdEYXRlKTtcbiAgcmV0dXJuICc8cD5WZXLDtmZmZW50bGljaHQgYW06ICcgKyBkYXRlLmdldERhdGUoKSArICcuJyArIGRhdGUuZ2V0TW9udGgoKSArICcuJyArIGRhdGUuZ2V0RnVsbFllYXIoKSArICc8L3A+Jztcbn1cblxuZnVuY3Rpb24gY3JlYXRlRXBpc29kZUluZm8odGFiLCBwYXJhbXMpIHtcbiAgdGFiLmNyZWF0ZU1haW5Db250ZW50KFxuICAgICc8aDI+JyArIHBhcmFtcy50aXRsZSArICc8L2gyPicgK1xuICAgICc8aDM+JyArIHBhcmFtcy5zdWJ0aXRsZSArICc8L2gzPicgK1xuICAgICc8cD4nICsgcGFyYW1zLnN1bW1hcnkgKyAnPC9wPicgK1xuICAgICc8cD5EYXVlcjogJyArIHRpbWVDb2RlLmZyb21UaW1lU3RhbXAocGFyYW1zLmR1cmF0aW9uKSArICc8L3A+JyArXG4gICAgIGdldFB1YmxpY2F0aW9uRGF0ZShwYXJhbXMucHVibGljYXRpb25EYXRlKSArXG4gICAgJzxwPicgK1xuICAgICAgJ1Blcm1hbGluazo8YnI+JyArXG4gICAgICAnPGEgaHJlZj1cIicgKyBwYXJhbXMucGVybWFsaW5rICsgJ1wiIHRpdGxlPVwiUGVybWFsaW5rIGbDvHIgZGllIEVwaXNvZGVcIj4nICsgcGFyYW1zLnBlcm1hbGluayArICc8L2E+JyArXG4gICAgJzwvcD4nXG4gICk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVBvc3RlckltYWdlKHBvc3Rlcikge1xuICBpZiAoIXBvc3Rlcikge1xuICAgIHJldHVybiAnJztcbiAgfVxuICByZXR1cm4gJzxkaXYgY2xhc3M9XCJwb3N0ZXItaW1hZ2VcIj4nICtcbiAgICAnPGltZyBzcmM9XCInICsgcG9zdGVyICsgJ1wiIGRhdGEtaW1nPVwiJyArIHBvc3RlciArICdcIiBhbHQ9XCJQb3N0ZXIgSW1hZ2VcIj4nICtcbiAgICAnPC9kaXY+Jztcbn1cblxuZnVuY3Rpb24gY3JlYXRlU3Vic2NyaWJlQnV0dG9uKHBhcmFtcykge1xuICBpZiAoIXBhcmFtcy5zdWJzY3JpYmVCdXR0b24pIHtcbiAgICByZXR1cm4gJyc7XG4gIH1cbiAgcmV0dXJuICc8YnV0dG9uIGNsYXNzPVwiYnV0dG9uLXN1Ym1pdFwiPicgK1xuICAgICAgJzxzcGFuIGNsYXNzPVwic2hvd3RpdGxlLWxhYmVsXCI+JyArIHBhcmFtcy5zaG93LnRpdGxlICsgJzwvc3Bhbj4nICtcbiAgICAgICc8c3BhbiBjbGFzcz1cInN1Ym1pdC1sYWJlbFwiPicgKyBwYXJhbXMuc3Vic2NyaWJlQnV0dG9uICsgJzwvc3Bhbj4nICtcbiAgICAnPC9idXR0b24+Jztcbn1cblxuZnVuY3Rpb24gY3JlYXRlU2hvd0luZm8gKHRhYiwgcGFyYW1zKSB7XG4gIHRhYi5jcmVhdGVBc2lkZShcbiAgICAnPGgyPicgKyBwYXJhbXMuc2hvdy50aXRsZSArICc8L2gyPicgK1xuICAgICc8aDM+JyArIHBhcmFtcy5zaG93LnN1YnRpdGxlICsgJzwvaDM+JyArXG4gICAgY3JlYXRlUG9zdGVySW1hZ2UocGFyYW1zLnNob3cucG9zdGVyKSArXG4gICAgY3JlYXRlU3Vic2NyaWJlQnV0dG9uKHBhcmFtcykgK1xuICAgICc8cD5MaW5rIHp1ciBTaG93Ojxicj4nICtcbiAgICAgICc8YSBocmVmPVwiJyArIHBhcmFtcy5zaG93LnVybCArICdcIiB0aXRsZT1cIkxpbmsgenVyIFNob3dcIj4nICsgcGFyYW1zLnNob3cudXJsICsgJzwvYT48L3A+J1xuICApO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVTb2NpYWxMaW5rKG9wdGlvbnMpIHtcbiAgdmFyIHNlcnZpY2UgPSBzZXJ2aWNlcy5nZXQob3B0aW9ucy5zZXJ2aWNlTmFtZSk7XG4gIHZhciBsaXN0SXRlbSA9ICQoJzxsaT48L2xpPicpO1xuICB2YXIgYnV0dG9uID0gc2VydmljZS5nZXRCdXR0b24ob3B0aW9ucyk7XG4gIGxpc3RJdGVtLmFwcGVuZChidXR0b24uZWxlbWVudCk7XG4gIHRoaXMuYXBwZW5kKGxpc3RJdGVtKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlU29jaWFsSW5mbyhwcm9maWxlcykge1xuICBpZiAoIXByb2ZpbGVzKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICB2YXIgcHJvZmlsZUxpc3QgPSAkKCc8dWw+PC91bD4nKTtcbiAgcHJvZmlsZXMuZm9yRWFjaChjcmVhdGVTb2NpYWxMaW5rLCBwcm9maWxlTGlzdCk7XG5cbiAgdmFyIGNvbnRhaW5lciA9ICQoJzxkaXYgY2xhc3M9XCJzb2NpYWwtbGlua3NcIj48aDM+QmxlaWIgaW4gVmVyYmluZHVuZzwvaDM+PC9kaXY+Jyk7XG4gIGNvbnRhaW5lci5hcHBlbmQocHJvZmlsZUxpc3QpO1xuICByZXR1cm4gY29udGFpbmVyO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVTb2NpYWxBbmRMaWNlbnNlSW5mbyAodGFiLCBwYXJhbXMpIHtcbiAgaWYgKCFwYXJhbXMubGljZW5zZSAmJiAhcGFyYW1zLnByb2ZpbGVzKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHRhYi5jcmVhdGVGb290ZXIoXG4gICAgJzxwPkRpZSBTaG93IFwiJyArIHBhcmFtcy5zaG93LnRpdGxlICsgJ1wiIGlzdCBsaXplbnNpZXJ0IHVudGVyPGJyPicgK1xuICAgICAgJzxhIGhyZWY9XCInICsgcGFyYW1zLmxpY2Vuc2UudXJsICsgJ1wiIHRpdGxlPVwiTGl6ZW56IGFuc2VoZW5cIj4nICsgcGFyYW1zLmxpY2Vuc2UubmFtZSArICc8L2E+JyArXG4gICAgJzwvcD4nXG4gICkucHJlcGVuZChjcmVhdGVTb2NpYWxJbmZvKHBhcmFtcy5wcm9maWxlcykpO1xufVxuXG4vKipcbiAqIGNyZWF0ZSBpbmZvIHRhYiBpZiBwYXJhbXMuc3VtbWFyeSBpcyBkZWZpbmVkXG4gKiBAcGFyYW0ge29iamVjdH0gcGFyYW1zIHBhcmFtZXRlciBvYmplY3RcbiAqIEByZXR1cm5zIHtudWxsfFRhYn0gaW5mbyB0YWIgaW5zdGFuY2Ugb3IgbnVsbFxuICovXG5mdW5jdGlvbiBjcmVhdGVJbmZvVGFiKHBhcmFtcykge1xuICBpZiAoIXBhcmFtcy5zdW1tYXJ5KSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgdmFyIGluZm9UYWIgPSBuZXcgVGFiKHtcbiAgICBpY29uOiAncHdwLWluZm8nLFxuICAgIHRpdGxlOiAnSW5mb3MgYW56ZWlnZW4gLyB2ZXJiZXJnZW4nLFxuICAgIGhlYWRsaW5lOiAnSW5mbycsXG4gICAgbmFtZTogJ2luZm8nXG4gIH0pO1xuXG4gIGNyZWF0ZUVwaXNvZGVJbmZvKGluZm9UYWIsIHBhcmFtcyk7XG4gIGNyZWF0ZVNob3dJbmZvKGluZm9UYWIsIHBhcmFtcyk7XG4gIGNyZWF0ZVNvY2lhbEFuZExpY2Vuc2VJbmZvKGluZm9UYWIsIHBhcmFtcyk7XG5cbiAgcmV0dXJuIGluZm9UYWI7XG59XG5cbi8qKlxuICogSW5mb3JtYXRpb24gbW9kdWxlIHRvIGRpc3BsYXkgcG9kY2FzdCBhbmQgZXBpc29kZSBpbmZvXG4gKiBAcGFyYW0ge29iamVjdH0gcGFyYW1zIHBhcmFtZXRlciBvYmplY3RcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBJbmZvKHBhcmFtcykge1xuICB0aGlzLnRhYiA9IGNyZWF0ZUluZm9UYWIocGFyYW1zKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBJbmZvO1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIm9NZnBBblwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiL21vZHVsZXMvaW5mby5qc1wiLFwiL21vZHVsZXNcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4ndXNlIHN0cmljdCc7XG5cbnZhciB0YyA9IHJlcXVpcmUoJy4uL3RpbWVjb2RlJyk7XG52YXIgY2FwID0gcmVxdWlyZSgnLi4vdXRpbCcpLmNhcDtcblxuZnVuY3Rpb24gcmVuZGVyVGltZUVsZW1lbnQoY2xhc3NOYW1lLCB0aW1lKSB7XG4gIHJldHVybiAkKCc8ZGl2IGNsYXNzPVwidGltZSB0aW1lLScgKyBjbGFzc05hbWUgKyAnXCI+JyArIHRpbWUgKyAnPC9kaXY+Jyk7XG59XG5cbi8qKlxuICogUmVuZGVyIGFuIEhUTUwgRWxlbWVudCBmb3IgdGhlIGN1cnJlbnQgY2hhcHRlclxuICogQHJldHVybnMge2pRdWVyeXxIVE1MRWxlbWVudH1cbiAqL1xuZnVuY3Rpb24gcmVuZGVyQ3VycmVudENoYXB0ZXJFbGVtZW50KCkge1xuICB2YXIgY2hhcHRlckVsZW1lbnQgPSAkKCc8ZGl2IGNsYXNzPVwiY2hhcHRlclwiPjwvZGl2PicpO1xuXG4gIGlmICghdGhpcy5jaGFwdGVyTW9kdWxlKSB7XG4gICAgcmV0dXJuIGNoYXB0ZXJFbGVtZW50O1xuICB9XG5cbiAgdmFyIGluZGV4ID0gdGhpcy5jaGFwdGVyTW9kdWxlLmN1cnJlbnRDaGFwdGVyO1xuICB2YXIgY2hhcHRlciA9IHRoaXMuY2hhcHRlck1vZHVsZS5jaGFwdGVyc1tpbmRleF07XG4gIGNvbnNvbGUuZGVidWcoJ1Byb2dyZXNzYmFyJywgJ3JlbmRlckN1cnJlbnRDaGFwdGVyRWxlbWVudCcsIGluZGV4LCBjaGFwdGVyKTtcblxuICB0aGlzLmNoYXB0ZXJCYWRnZSA9ICQoJzxzcGFuIGNsYXNzPVwiYmFkZ2VcIj4nICsgKGluZGV4ICsgMSkgKyAnPC9zcGFuPicpO1xuICB0aGlzLmNoYXB0ZXJUaXRsZSA9ICQoJzxzcGFuIGNsYXNzPVwiY2hhcHRlci10aXRsZVwiPicgKyBjaGFwdGVyLnRpdGxlICsgJzwvc3Bhbj4nKTtcblxuICBjaGFwdGVyRWxlbWVudFxuICAgIC5hcHBlbmQodGhpcy5jaGFwdGVyQmFkZ2UpXG4gICAgLmFwcGVuZCh0aGlzLmNoYXB0ZXJUaXRsZSk7XG5cbiAgcmV0dXJuIGNoYXB0ZXJFbGVtZW50O1xufVxuXG5mdW5jdGlvbiByZW5kZXJQcm9ncmVzc0luZm8ocHJvZ3Jlc3NCYXIpIHtcbiAgdmFyIHByb2dyZXNzSW5mbyA9ICQoJzxkaXYgY2xhc3M9XCJwcm9ncmVzcy1pbmZvXCI+PC9kaXY+Jyk7XG5cbiAgcmV0dXJuIHByb2dyZXNzSW5mb1xuICAgIC5hcHBlbmQocHJvZ3Jlc3NCYXIuY3VycmVudFRpbWUpXG4gICAgLmFwcGVuZChyZW5kZXJDdXJyZW50Q2hhcHRlckVsZW1lbnQuY2FsbChwcm9ncmVzc0JhcikpXG4gICAgLmFwcGVuZChwcm9ncmVzc0Jhci5kdXJhdGlvblRpbWVFbGVtZW50KTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlVGltZXMocHJvZ3Jlc3NCYXIpIHtcbiAgdmFyIHRpbWUgPSBwcm9ncmVzc0Jhci50aW1lbGluZS5nZXRUaW1lKCk7XG4gIHByb2dyZXNzQmFyLmN1cnJlbnRUaW1lLmh0bWwodGMuZnJvbVRpbWVTdGFtcCh0aW1lKSk7XG5cbiAgaWYgKHByb2dyZXNzQmFyLnNob3dEdXJhdGlvbikgeyByZXR1cm47IH1cblxuICB2YXIgcmVtYWluaW5nVGltZSA9IE1hdGguYWJzKHRpbWUgLSBwcm9ncmVzc0Jhci5kdXJhdGlvbik7XG4gIHByb2dyZXNzQmFyLmR1cmF0aW9uVGltZUVsZW1lbnQudGV4dCgnLScgKyB0Yy5mcm9tVGltZVN0YW1wKHJlbWFpbmluZ1RpbWUpKTtcbn1cblxuZnVuY3Rpb24gcmVuZGVyRHVyYXRpb25UaW1lRWxlbWVudChwcm9ncmVzc0Jhcikge1xuICB2YXIgZm9ybWF0dGVkRHVyYXRpb24gPSB0Yy5mcm9tVGltZVN0YW1wKHByb2dyZXNzQmFyLmR1cmF0aW9uKTtcbiAgdmFyIGR1cmF0aW9uVGltZUVsZW1lbnQgPSByZW5kZXJUaW1lRWxlbWVudCgnZHVyYXRpb24nLCAwKTtcblxuICBkdXJhdGlvblRpbWVFbGVtZW50Lm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICBwcm9ncmVzc0Jhci5zaG93RHVyYXRpb24gPSAhcHJvZ3Jlc3NCYXIuc2hvd0R1cmF0aW9uO1xuICAgIGlmIChwcm9ncmVzc0Jhci5zaG93RHVyYXRpb24pIHtcbiAgICAgIGR1cmF0aW9uVGltZUVsZW1lbnQudGV4dChmb3JtYXR0ZWREdXJhdGlvbik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHVwZGF0ZVRpbWVzKHByb2dyZXNzQmFyKTtcbiAgfSk7XG5cbiAgcmV0dXJuIGR1cmF0aW9uVGltZUVsZW1lbnQ7XG59XG5cbmZ1bmN0aW9uIHJlbmRlck1hcmtlckF0KHRpbWUpIHtcbiAgdmFyIHBlcmNlbnQgPSAxMDAgKiB0aW1lIC8gdGhpcy5kdXJhdGlvbjtcbiAgcmV0dXJuICQoJzxkaXYgY2xhc3M9XCJtYXJrZXJcIiBzdHlsZT1cImxlZnQ6JyArIHBlcmNlbnQgKyAnJTtcIj48L2Rpdj4nKTtcbn1cblxuZnVuY3Rpb24gcmVuZGVyQ2hhcHRlck1hcmtlcihjaGFwdGVyKSB7XG4gIHJldHVybiByZW5kZXJNYXJrZXJBdC5jYWxsKHRoaXMsIGNoYXB0ZXIuc3RhcnQpO1xufVxuXG4vKipcbiAqIFRoaXMgdXBkYXRlIG1ldGhvZCBpcyB0byBiZSBjYWxsZWQgd2hlbiBhIHBsYXllcnMgYGN1cnJlbnRUaW1lYCBjaGFuZ2VzLlxuICovXG5mdW5jdGlvbiB1cGRhdGUgKHRpbWVsaW5lKSB7XG4gIHRoaXMuc2V0UHJvZ3Jlc3ModGltZWxpbmUuZ2V0VGltZSgpKTtcbiAgdGhpcy5idWZmZXIudmFsKHRpbWVsaW5lLmdldEJ1ZmZlcmVkKCkpO1xuICB0aGlzLnNldENoYXB0ZXIoKTtcbn1cblxuLyoqXG4gKiBAY29uc3RydWN0b3JcbiAqIENyZWF0ZXMgYSBuZXcgcHJvZ3Jlc3MgYmFyIG9iamVjdC5cbiAqIEBwYXJhbSB7VGltZWxpbmV9IHRpbWVsaW5lIC0gVGhlIHBsYXllcnMgdGltZWxpbmUgdG8gYXR0YWNoIHRvLlxuICovXG5mdW5jdGlvbiBQcm9ncmVzc0Jhcih0aW1lbGluZSkge1xuICBpZiAoIXRpbWVsaW5lKSB7XG4gICAgY29uc29sZS5lcnJvcignVGltZWxpbmUgbWlzc2luZycsIGFyZ3VtZW50cyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIHRoaXMudGltZWxpbmUgPSB0aW1lbGluZTtcbiAgdGhpcy5kdXJhdGlvbiA9IHRpbWVsaW5lLmR1cmF0aW9uO1xuXG4gIHRoaXMuYmFyID0gbnVsbDtcbiAgdGhpcy5jdXJyZW50VGltZSA9IG51bGw7XG5cbiAgaWYgKHRpbWVsaW5lLmhhc0NoYXB0ZXJzKSB7XG4gICAgLy8gRklYTUUgZ2V0IGFjY2VzcyB0byBjaGFwdGVyTW9kdWxlIHJlbGlhYmx5XG4gICAgLy8gdGhpcy50aW1lbGluZS5nZXRNb2R1bGUoJ2NoYXB0ZXJzJylcbiAgICB0aGlzLmNoYXB0ZXJNb2R1bGUgPSB0aGlzLnRpbWVsaW5lLm1vZHVsZXNbMF07XG4gICAgdGhpcy5jaGFwdGVyQmFkZ2UgPSBudWxsO1xuICAgIHRoaXMuY2hhcHRlclRpdGxlID0gbnVsbDtcbiAgfVxuXG4gIHRoaXMuc2hvd0R1cmF0aW9uID0gZmFsc2U7XG4gIHRoaXMucHJvZ3Jlc3MgPSBudWxsO1xuICB0aGlzLmJ1ZmZlciA9IG51bGw7XG4gIHRoaXMudXBkYXRlID0gdXBkYXRlLmJpbmQodGhpcyk7XG59XG5cblByb2dyZXNzQmFyLnByb3RvdHlwZS5zZXRIYW5kbGVQb3NpdGlvbiA9IGZ1bmN0aW9uICh0aW1lKSB7XG4gIHZhciBwZXJjZW50ID0gdGltZSAvIHRoaXMuZHVyYXRpb24gKiAxMDA7XG4gIHZhciBuZXdMZWZ0T2Zmc2V0ID0gcGVyY2VudCArICclJztcbiAgY29uc29sZS5kZWJ1ZygnUHJvZ3Jlc3NCYXInLCAnc2V0SGFuZGxlUG9zaXRpb24nLCAndGltZScsIHRpbWUsICduZXdMZWZ0T2Zmc2V0JywgbmV3TGVmdE9mZnNldCk7XG4gIHRoaXMuaGFuZGxlLmNzcygnbGVmdCcsIG5ld0xlZnRPZmZzZXQpO1xufTtcblxuLyoqXG4gKiBzZXQgcHJvZ3Jlc3MgYmFyIHZhbHVlLCBzbGlkZXIgcG9zaXRpb24gYW5kIGN1cnJlbnQgdGltZVxuICogQHBhcmFtIHtudW1iZXJ9IHRpbWVcbiAqL1xuUHJvZ3Jlc3NCYXIucHJvdG90eXBlLnNldFByb2dyZXNzID0gZnVuY3Rpb24gKHRpbWUpIHtcbiAgdGhpcy5wcm9ncmVzcy52YWwodGltZSk7XG4gIHRoaXMuc2V0SGFuZGxlUG9zaXRpb24odGltZSk7XG4gIHVwZGF0ZVRpbWVzKHRoaXMpO1xufTtcblxuLyoqXG4gKiBzZXQgY2hhcHRlciB0aXRsZSBhbmQgYmFkZ2VcbiAqL1xuUHJvZ3Jlc3NCYXIucHJvdG90eXBlLnNldENoYXB0ZXIgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICghdGhpcy5jaGFwdGVyTW9kdWxlKSB7IHJldHVybjsgfVxuXG4gIHZhciBpbmRleCA9IHRoaXMuY2hhcHRlck1vZHVsZS5jdXJyZW50Q2hhcHRlcjtcbiAgdmFyIGNoYXB0ZXIgPSB0aGlzLmNoYXB0ZXJNb2R1bGUuY2hhcHRlcnNbaW5kZXhdO1xuICB0aGlzLmNoYXB0ZXJCYWRnZS50ZXh0KGluZGV4ICsgMSk7XG4gIHRoaXMuY2hhcHRlclRpdGxlLnRleHQoY2hhcHRlci50aXRsZSk7XG59O1xuXG4vKipcbiAqIFJlbmRlcnMgYSBuZXcgcHJvZ3Jlc3MgYmFyIGpRdWVyeSBvYmplY3QuXG4gKi9cblByb2dyZXNzQmFyLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbiAoKSB7XG5cbiAgLy8gdGltZSBlbGVtZW50c1xuICB2YXIgaW5pdGlhbFRpbWUgPSB0Yy5mcm9tVGltZVN0YW1wKHRoaXMudGltZWxpbmUuZ2V0VGltZSgpKTtcbiAgdGhpcy5jdXJyZW50VGltZSA9IHJlbmRlclRpbWVFbGVtZW50KCdjdXJyZW50JywgaW5pdGlhbFRpbWUpO1xuICB0aGlzLmR1cmF0aW9uVGltZUVsZW1lbnQgPSByZW5kZXJEdXJhdGlvblRpbWVFbGVtZW50KHRoaXMpO1xuXG4gIC8vIHByb2dyZXNzIGluZm9cbiAgdmFyIHByb2dyZXNzSW5mbyA9IHJlbmRlclByb2dyZXNzSW5mbyh0aGlzKTtcbiAgdXBkYXRlVGltZXModGhpcyk7XG5cbiAgLy8gdGltZWxpbmUgYW5kIGJ1ZmZlciBiYXJzXG4gIHZhciBwcm9ncmVzcyA9ICQoJzxkaXYgY2xhc3M9XCJwcm9ncmVzc1wiPjwvZGl2PicpO1xuICB2YXIgdGltZWxpbmVCYXIgPSAkKCc8cHJvZ3Jlc3MgY2xhc3M9XCJjdXJyZW50XCI+PC9wcm9ncmVzcz4nKVxuICAgICAgLmF0dHIoeyBtaW46IDAsIG1heDogdGhpcy5kdXJhdGlvbn0pO1xuICB2YXIgYnVmZmVyID0gJCgnPHByb2dyZXNzIGNsYXNzPVwiYnVmZmVyXCI+PC9wcm9ncmVzcz4nKVxuICAgICAgLmF0dHIoe21pbjogMCwgbWF4OiB0aGlzLmR1cmF0aW9ufSk7XG4gIHZhciBoYW5kbGUgPSAkKCc8ZGl2IGNsYXNzPVwiaGFuZGxlXCI+PGRpdiBjbGFzcz1cImlubmVyLWhhbmRsZVwiPjwvZGl2PjwvZGl2PicpO1xuXG4gIHByb2dyZXNzXG4gICAgLmFwcGVuZCh0aW1lbGluZUJhcilcbiAgICAuYXBwZW5kKGJ1ZmZlcilcbiAgICAuYXBwZW5kKGhhbmRsZSk7XG5cbiAgdGhpcy5wcm9ncmVzcyA9IHRpbWVsaW5lQmFyO1xuICB0aGlzLmJ1ZmZlciA9IGJ1ZmZlcjtcbiAgdGhpcy5oYW5kbGUgPSBoYW5kbGU7XG4gIHRoaXMuc2V0UHJvZ3Jlc3ModGhpcy50aW1lbGluZS5nZXRUaW1lKCkpO1xuXG4gIGlmICh0aGlzLmNoYXB0ZXJNb2R1bGUpIHtcbiAgICB2YXIgY2hhcHRlck1hcmtlcnMgPSB0aGlzLmNoYXB0ZXJNb2R1bGUuY2hhcHRlcnMubWFwKHJlbmRlckNoYXB0ZXJNYXJrZXIsIHRoaXMpO1xuICAgIGNoYXB0ZXJNYXJrZXJzLnNoaWZ0KCk7IC8vIHJlbW92ZSBmaXJzdCBvbmVcbiAgICBwcm9ncmVzcy5hcHBlbmQoY2hhcHRlck1hcmtlcnMpO1xuICB9XG5cbiAgLy8gcHJvZ3Jlc3MgYmFyXG4gIHZhciBiYXIgPSAkKCc8ZGl2IGNsYXNzPVwicHJvZ3Jlc3NiYXJcIj48L2Rpdj4nKTtcbiAgYmFyXG4gICAgLmFwcGVuZChwcm9ncmVzc0luZm8pXG4gICAgLmFwcGVuZChwcm9ncmVzcyk7XG5cbiAgdGhpcy5iYXIgPSBiYXI7XG4gIHJldHVybiBiYXI7XG59O1xuXG5Qcm9ncmVzc0Jhci5wcm90b3R5cGUuYWRkRXZlbnRzID0gZnVuY3Rpb24oKSB7XG4gIHZhciBtb3VzZUlzRG93biA9IGZhbHNlO1xuICB2YXIgdGltZWxpbmUgPSB0aGlzLnRpbWVsaW5lO1xuICB2YXIgcHJvZ3Jlc3MgPSB0aGlzLnByb2dyZXNzO1xuXG4gIGZ1bmN0aW9uIGNhbGN1bGF0ZU5ld1RpbWUgKHBhZ2VYKSB7XG4gICAgLy8gbW91c2UgcG9zaXRpb24gcmVsYXRpdmUgdG8gdGhlIG9iamVjdFxuICAgIHZhciB3aWR0aCA9IHByb2dyZXNzLm91dGVyV2lkdGgodHJ1ZSk7XG4gICAgdmFyIG9mZnNldCA9IHByb2dyZXNzLm9mZnNldCgpO1xuICAgIHZhciBwb3MgPSBjYXAocGFnZVggLSBvZmZzZXQubGVmdCwgMCwgd2lkdGgpO1xuICAgIHZhciBwZXJjZW50YWdlID0gKHBvcyAvIHdpZHRoKTtcbiAgICByZXR1cm4gcGVyY2VudGFnZSAqIHRpbWVsaW5lLmR1cmF0aW9uO1xuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlTW91c2VNb3ZlIChldmVudCkge1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cbiAgICB2YXIgeCA9IGV2ZW50LnBhZ2VYO1xuICAgIGlmIChldmVudC5vcmlnaW5hbEV2ZW50LmNoYW5nZWRUb3VjaGVzKSB7XG4gICAgICB4ID0gZXZlbnQub3JpZ2luYWxFdmVudC5jaGFuZ2VkVG91Y2hlc1swXS5wYWdlWDtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHRpbWVsaW5lLmR1cmF0aW9uICE9PSAnbnVtYmVyJyB8fCAhbW91c2VJc0Rvd24gKSB7IHJldHVybjsgfVxuICAgIHZhciBuZXdUaW1lID0gY2FsY3VsYXRlTmV3VGltZSh4KTtcbiAgICBpZiAobmV3VGltZSA9PT0gdGltZWxpbmUuZ2V0VGltZSgpKSB7IHJldHVybjsgfVxuICAgIHRpbWVsaW5lLnNlZWsobmV3VGltZSk7XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVNb3VzZVVwICgpIHtcbiAgICBtb3VzZUlzRG93biA9IGZhbHNlO1xuICAgICQoZG9jdW1lbnQpLnVuYmluZCgndG91Y2hlbmQuZHVyIG1vdXNldXAuZHVyIHRvdWNobW92ZS5kdXIgbW91c2Vtb3ZlLmR1cicpO1xuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlTW91c2VEb3duIChldmVudCkge1xuICAgIGlmIChldmVudC53aGljaCAhPT0gMCAmJiBldmVudC53aGljaCAhPT0gMSkgeyByZXR1cm47IH1cblxuICAgIG1vdXNlSXNEb3duID0gdHJ1ZTtcbiAgICBoYW5kbGVNb3VzZU1vdmUoZXZlbnQpO1xuICAgICQoZG9jdW1lbnQpXG4gICAgICAuYmluZCgnbW91c2Vtb3ZlLmR1ciB0b3VjaG1vdmUuZHVyJywgaGFuZGxlTW91c2VNb3ZlKVxuICAgICAgLmJpbmQoJ21vdXNldXAuZHVyIHRvdWNoZW5kLmR1cicsIGhhbmRsZU1vdXNlVXApO1xuICB9XG5cbiAgLy8gaGFuZGxlIGNsaWNrIGFuZCBkcmFnIHdpdGggbW91c2Ugb3IgdG91Y2ggaW4gcHJvZ3Jlc3NiYXIgYW5kIG9uIGhhbmRsZVxuICB0aGlzLnByb2dyZXNzLmJpbmQoJ21vdXNlZG93biB0b3VjaHN0YXJ0JywgaGFuZGxlTW91c2VEb3duKTtcblxuICB0aGlzLmhhbmRsZS5iaW5kKCd0b3VjaHN0YXJ0IG1vdXNlZG93bicsIGhhbmRsZU1vdXNlRG93bik7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFByb2dyZXNzQmFyO1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIm9NZnBBblwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiL21vZHVsZXMvcHJvZ3Jlc3NiYXIuanNcIixcIi9tb2R1bGVzXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFNhdmluZyB0aGUgcGxheXRpbWVcbiAqL1xudmFyIHByZWZpeCA9ICdwb2Rsb3ZlLXdlYi1wbGF5ZXItcGxheXRpbWUtJztcblxuZnVuY3Rpb24gZ2V0SXRlbSAoKSB7XG4gIHJldHVybiArbG9jYWxTdG9yYWdlW3RoaXMua2V5XTtcbn1cblxuZnVuY3Rpb24gcmVtb3ZlSXRlbSAoKSB7XG4gIHJldHVybiBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSh0aGlzLmtleSk7XG59XG5cbmZ1bmN0aW9uIGhhc0l0ZW0gKCkge1xuICByZXR1cm4gKHRoaXMua2V5KSBpbiBsb2NhbFN0b3JhZ2U7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZSAoKSB7XG4gIGNvbnNvbGUuZGVidWcoJ1NhdmVUaW1lJywgJ3VwZGF0ZScsIHRoaXMudGltZWxpbmUuZ2V0VGltZSgpKTtcbiAgaWYgKHRoaXMudGltZWxpbmUuZ2V0VGltZSgpID09PSAwKSB7XG4gICAgcmV0dXJuIHJlbW92ZUl0ZW0uY2FsbCh0aGlzKTtcbiAgfVxuICB0aGlzLnNldEl0ZW0odGhpcy50aW1lbGluZS5nZXRUaW1lKCkpO1xufVxuXG5mdW5jdGlvbiBTYXZlVGltZSh0aW1lbGluZSwgcGFyYW1zKSB7XG4gIHRoaXMudGltZWxpbmUgPSB0aW1lbGluZTtcbiAgdGhpcy5rZXkgPSBwcmVmaXggKyBwYXJhbXMucGVybWFsaW5rO1xuICB0aGlzLmdldEl0ZW0gPSBnZXRJdGVtLmJpbmQodGhpcyk7XG4gIHRoaXMucmVtb3ZlSXRlbSA9IHJlbW92ZUl0ZW0uYmluZCh0aGlzKTtcbiAgdGhpcy5oYXNJdGVtID0gaGFzSXRlbS5iaW5kKHRoaXMpO1xuICB0aGlzLnVwZGF0ZSA9IHVwZGF0ZS5iaW5kKHRoaXMpO1xuXG4gIC8vIHNldCB0aGUgdGltZSBvbiBzdGFydFxuICBpZiAodGhpcy5oYXNJdGVtKCkpIHtcbiAgICB0aW1lbGluZS5zZXRUaW1lKHRoaXMuZ2V0SXRlbSgpKTtcbiAgfVxufVxuXG5TYXZlVGltZS5wcm90b3R5cGUuc2V0SXRlbSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICBsb2NhbFN0b3JhZ2VbdGhpcy5rZXldID0gdmFsdWU7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNhdmVUaW1lO1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIm9NZnBBblwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiL21vZHVsZXMvc2F2ZXRpbWUuanNcIixcIi9tb2R1bGVzXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgVGFiID0gcmVxdWlyZSgnLi4vdGFiJylcbiAgLCBTb2NpYWxCdXR0b25MaXN0ID0gcmVxdWlyZSgnLi4vc29jaWFsLWJ1dHRvbi1saXN0Jyk7XG5cbnZhciBzZXJ2aWNlcyA9IFsndHdpdHRlcicsICdmYWNlYm9vaycsICdncGx1cycsICd0dW1ibHInLCAnZW1haWwnXVxuICAsIHNoYXJlT3B0aW9ucyA9IFtcbiAgICB7bmFtZTogJ1Nob3cnLCB2YWx1ZTogJ3Nob3cnfSxcbiAgICB7bmFtZTogJ0VwaXNvZGUnLCB2YWx1ZTogJ2VwaXNvZGUnLCBkZWZhdWx0OiB0cnVlfSxcbiAgICB7bmFtZTogJ0NoYXB0ZXInLCB2YWx1ZTogJ2NoYXB0ZXInLCBkaXNhYmxlZDogdHJ1ZX0sXG4gICAge25hbWU6ICdFeGFjdGx5IHRoaXMgcGFydCBoZXJlJywgdmFsdWU6ICd0aW1lZCcsIGRpc2FibGVkOiB0cnVlfVxuICBdXG4gICwgc2hhcmVEYXRhID0ge307XG5cbi8vIG1vZHVsZSBnbG9iYWxzXG52YXIgc2VsZWN0ZWRPcHRpb24sIHNoYXJlQnV0dG9ucywgbGlua0lucHV0O1xuXG5mdW5jdGlvbiBnZXRTaGFyZURhdGEodmFsdWUpIHtcbiAgaWYgKHZhbHVlID09PSAnc2hvdycpIHtcbiAgICByZXR1cm4gc2hhcmVEYXRhLnNob3c7XG4gIH1cbiAgdmFyIGRhdGEgPSBzaGFyZURhdGEuZXBpc29kZTtcbiAgLy8gdG9kbyBhZGQgY2hhcHRlciBzdGFydCBhbmQgZW5kIHRpbWUgdG8gdXJsXG4gIC8vaWYgKHZhbHVlID09PSAnY2hhcHRlcicpIHtcbiAgLy99XG4gIC8vIHRvZG8gYWRkIHNlbGVjdGVkIHN0YXJ0IGFuZCBlbmQgdGltZSB0byB1cmxcbiAgLy9pZiAodmFsdWUgPT09ICd0aW1lZCcpIHtcbiAgLy99XG4gIHJldHVybiBkYXRhO1xufVxuXG5mdW5jdGlvbiB1cGRhdGVVcmxzKGRhdGEpIHtcbiAgc2hhcmVCdXR0b25zLnVwZGF0ZShkYXRhKTtcbiAgbGlua0lucHV0LnVwZGF0ZShkYXRhKTtcbn1cblxuZnVuY3Rpb24gb25TaGFyZU9wdGlvbkNoYW5nZVRvIChlbGVtZW50LCB2YWx1ZSkge1xuICB2YXIgZGF0YSA9IGdldFNoYXJlRGF0YSh2YWx1ZSk7XG4gIHZhciByYWRpbyA9IGVsZW1lbnQuZmluZCgnW3R5cGU9cmFkaW9dJyk7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICBzZWxlY3RlZE9wdGlvbi5yZW1vdmVDbGFzcygnc2VsZWN0ZWQnKTtcblxuICAgIHJhZGlvLnByb3AoJ2NoZWNrZWQnLCB0cnVlKTtcbiAgICBlbGVtZW50LmFkZENsYXNzKCdzZWxlY3RlZCcpO1xuICAgIHNlbGVjdGVkT3B0aW9uID0gZWxlbWVudDtcbiAgICBjb25zb2xlLmxvZygnc2hhcmluZyBvcHRpb25zIGNoYW5nZWQnLCBlbGVtZW50LCB2YWx1ZSk7XG5cbiAgICB1cGRhdGVVcmxzKGRhdGEpO1xuICB9O1xufVxuXG4vKipcbiAqIGNyZWF0ZSBzaGFyaW5nIGJ1dHRvblxuICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbiBzaGFyaW5nIG9wdGlvbiBkZWZpbml0aW9uXG4gKiBAcmV0dXJucyB7alF1ZXJ5fSBzaGFyZSBidXR0b24gcmVmZXJlbmNlXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZU9wdGlvbihvcHRpb24pIHtcbiAgaWYgKG9wdGlvbi5kaXNhYmxlZCkge1xuICAgIGNvbnNvbGUubG9nKCdTaGFyZScsICdjcmVhdGVPcHRpb24nLCAnb21pdCBkaXNhYmxlZCBvcHRpb24nLCBvcHRpb24ubmFtZSk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICB2YXIgZGF0YSA9IGdldFNoYXJlRGF0YShvcHRpb24udmFsdWUpO1xuXG4gIGlmICghZGF0YSkge1xuICAgIGNvbnNvbGUubG9nKCdTaGFyZScsICdjcmVhdGVPcHRpb24nLCAnb21pdCBvcHRpb24gd2l0aG91dCBkYXRhJywgb3B0aW9uLm5hbWUpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgdmFyIGVsZW1lbnQgPSAkKCc8dHIgY2xhc3M9XCJzaGFyZS1zZWxlY3Qtb3B0aW9uXCI+JyArXG4gICAgJzx0ZCBjbGFzcz1cInNoYXJlLWRlc2NyaXB0aW9uXCI+JyArIG9wdGlvbi5uYW1lICsgJzwvdGQ+JyArXG4gICAgJzx0ZCBjbGFzcz1cInNoYXJlLXJhZGlvXCI+PGlucHV0IHR5cGU9XCJyYWRpb1wiIGlkPVwic2hhcmUtb3B0aW9uLScgKyBvcHRpb24ubmFtZSArICdcIiBuYW1lPVwici1ncm91cFwiIHZhbHVlPVwiJyArIG9wdGlvbi50aXRsZSArICdcIj48L3RkPicgK1xuICAgICc8dGQgY2xhc3M9XCJzaGFyZS1sYWJlbFwiPjxsYWJlbCBmb3I9XCJzaGFyZS1vcHRpb24tJyArIG9wdGlvbi5uYW1lICsgJ1wiPicgKyBvcHRpb24udGl0bGUgKyAnPC9sYWJlbD48L3RkPicgK1xuICAgICc8L3RyPidcbiAgKTtcbiAgdmFyIHJhZGlvID0gZWxlbWVudC5maW5kKCdbdHlwZT1yYWRpb10nKTtcblxuICBpZiAob3B0aW9uLmRlZmF1bHQpIHtcbiAgICBzZWxlY3RlZE9wdGlvbiA9IGVsZW1lbnQ7XG4gICAgZWxlbWVudC5hZGRDbGFzcygnc2VsZWN0ZWQnKTtcbiAgICByYWRpby5wcm9wKCdjaGVja2VkJywgdHJ1ZSk7XG4gICAgdXBkYXRlVXJscyhkYXRhKTtcbiAgfVxuICB2YXIgY2hhbmdlSGFuZGxlciA9IG9uU2hhcmVPcHRpb25DaGFuZ2VUbyhlbGVtZW50LCBvcHRpb24udmFsdWUpO1xuICBlbGVtZW50Lm9uKCdjbGljaycsIGNoYW5nZUhhbmRsZXIpO1xuICByZXR1cm4gZWxlbWVudDtcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGFuIGh0bWwgdGFibGUgZWxlbWVudCB0byB3cmFwIGFsbCBzaGFyZSBidXR0b25zXG4gKiBAcmV0dXJucyB7alF1ZXJ5fEhUTUxFbGVtZW50fSBzaGFyZSBidXR0b24gd3JhcHBlciByZWZlcmVuY2VcbiAqL1xuZnVuY3Rpb24gY3JlYXRlU2hhcmVMaXN0KHBhcmFtcykge1xuICBzaGFyZU9wdGlvbnNbMF0udGl0bGUgPSBwYXJhbXMuc2hvdy50aXRsZTtcbiAgc2hhcmVPcHRpb25zWzFdLnRpdGxlID0gcGFyYW1zLnRpdGxlO1xuICB2YXIgdGFibGUgPSAkKCc8dGFibGUgY2xhc3M9XCJzaGFyZS1idXR0b24td3JhcHBlclwiIGRhdGEtdG9nZ2xlPVwiYnV0dG9uc1wiPjxjYXB0aW9uPlBvZGNhc3QgdGVpbGVuPC9jYXB0aW9uPjx0Ym9keT48L3Rib2R5PC90YWJsZT4nKTtcbiAgdGFibGUuYXBwZW5kKHNoYXJlT3B0aW9ucy5tYXAoY3JlYXRlT3B0aW9uKSk7XG4gIHJldHVybiB0YWJsZTtcbn1cblxuLyoqXG4gKiBjcmVhdGUgc2hhcmluZyBidXR0b25zIGluIGEgZm9ybVxuICogQHJldHVybnMge2pRdWVyeX0gZm9ybSBlbGVtZW50IHJlZmVyZW5jZVxuICovXG5mdW5jdGlvbiBjcmVhdGVTaGFyZU9wdGlvbnMocGFyYW1zKSB7XG4gIHZhciBmb3JtID0gJCgnPGZvcm0+JyArXG4gICAgJzxoMz5XYXMgbcO2Y2h0ZXN0IGR1IHRlaWxlbj88L2gzPicgK1xuICAnPC9mb3JtPicpO1xuICBmb3JtLmFwcGVuZChjcmVhdGVTaGFyZUxpc3QocGFyYW1zKSk7XG4gIHJldHVybiBmb3JtO1xufVxuXG4vKipcbiAqIGJ1aWxkIGFuZCByZXR1cm4gdGFiIGluc3RhbmNlIGZvciBzaGFyaW5nXG4gKiBAcGFyYW0ge29iamVjdH0gcGFyYW1zIHBsYXllciBjb25maWd1cmF0aW9uXG4gKiBAcmV0dXJucyB7bnVsbHxUYWJ9IHNoYXJpbmcgdGFiIGluc3RhbmNlIG9yIG51bGwgaWYgcGVybWFsaW5rIG1pc3Npbmcgb3Igc2hhcmluZyBkaXNhYmxlZFxuICovXG5mdW5jdGlvbiBjcmVhdGVTaGFyZVRhYihwYXJhbXMpIHtcbiAgaWYgKCFwYXJhbXMucGVybWFsaW5rIHx8IHBhcmFtcy5oaWRlc2hhcmVidXR0b24gPT09IHRydWUpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHZhciBzaGFyZVRhYiA9IG5ldyBUYWIoe1xuICAgIGljb246ICdwd3Atc2hhcmUnLFxuICAgIHRpdGxlOiAnVGVpbGVuIGFuemVpZ2VuIC8gdmVyYmVyZ2VuJyxcbiAgICBuYW1lOiAncG9kbG92ZXdlYnBsYXllcl9zaGFyZScsXG4gICAgaGVhZGxpbmU6ICdUZWlsZW4nXG4gIH0pO1xuXG4gIHNoYXJlQnV0dG9ucyA9IG5ldyBTb2NpYWxCdXR0b25MaXN0KHNlcnZpY2VzLCBnZXRTaGFyZURhdGEoJ2VwaXNvZGUnKSk7XG4gIGxpbmtJbnB1dCA9ICQoJzxoMz5EaXJla3RlciBMaW5rPC9oMz4nICtcbiAgICAnPGlucHV0IHR5cGU9XCJ1cmxcIiBuYW1lPVwic2hhcmUtbGluay11cmxcIiByZWFkb25seT4nKTtcbiAgbGlua0lucHV0LnVwZGF0ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICB0aGlzLnZhbChkYXRhLnJhd1VybCk7XG4gIH07XG5cbiAgc2hhcmVUYWIuY3JlYXRlTWFpbkNvbnRlbnQoJycpXG4gICAgLmFwcGVuZChjcmVhdGVTaGFyZU9wdGlvbnMocGFyYW1zKSlcbiAgICAuYXBwZW5kKCc8aDM+VGVpbGVuIHZpYSAuLi48L2gzPicpXG4gICAgLmFwcGVuZChzaGFyZUJ1dHRvbnMubGlzdCk7XG4gIHNoYXJlVGFiLmNyZWF0ZUZvb3RlcignJykuYXBwZW5kKGxpbmtJbnB1dCk7XG5cbiAgcmV0dXJuIHNoYXJlVGFiO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIFNoYXJlKHBhcmFtcykge1xuICBzaGFyZURhdGEuZXBpc29kZSA9IHtcbiAgICBwb3N0ZXI6IHBhcmFtcy5wb3N0ZXIsXG4gICAgdGl0bGU6IGVuY29kZVVSSUNvbXBvbmVudChwYXJhbXMudGl0bGUpLFxuICAgIHVybDogZW5jb2RlVVJJQ29tcG9uZW50KHBhcmFtcy5wZXJtYWxpbmspLFxuICAgIHJhd1VybDogcGFyYW1zLnBlcm1hbGluayxcbiAgICB0ZXh0OiBlbmNvZGVVUklDb21wb25lbnQocGFyYW1zLnRpdGxlICsgJyAnICsgcGFyYW1zLnBlcm1hbGluaylcbiAgfTtcbiAgc2hhcmVEYXRhLmNoYXB0ZXJzID0gcGFyYW1zLmNoYXB0ZXJzO1xuXG4gIGlmIChwYXJhbXMuc2hvdy51cmwpIHtcbiAgICBzaGFyZURhdGEuc2hvdyA9IHtcbiAgICAgIHBvc3RlcjogcGFyYW1zLnNob3cucG9zdGVyLFxuICAgICAgdGl0bGU6IGVuY29kZVVSSUNvbXBvbmVudChwYXJhbXMuc2hvdy50aXRsZSksXG4gICAgICB1cmw6IGVuY29kZVVSSUNvbXBvbmVudChwYXJhbXMuc2hvdy51cmwpLFxuICAgICAgcmF3VXJsOiBwYXJhbXMuc2hvdy51cmwsXG4gICAgICB0ZXh0OiBlbmNvZGVVUklDb21wb25lbnQocGFyYW1zLnNob3cudGl0bGUgKyAnICcgKyBwYXJhbXMuc2hvdy51cmwpXG4gICAgfTtcbiAgfVxuXG4gIHNlbGVjdGVkT3B0aW9uID0gJ2VwaXNvZGUnO1xuICB0aGlzLnRhYiA9IGNyZWF0ZVNoYXJlVGFiKHBhcmFtcyk7XG59O1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIm9NZnBBblwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiL21vZHVsZXMvc2hhcmUuanNcIixcIi9tb2R1bGVzXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgcGFyc2VUaW1lY29kZSA9IHJlcXVpcmUoJy4vdGltZWNvZGUnKS5wYXJzZTtcblxuLyoqXG4gKiBwbGF5ZXJcbiAqL1xudmFyXG4vLyBLZWVwIGFsbCBQbGF5ZXJzIG9uIHNpdGUgLSBmb3IgaW5saW5lIHBsYXllcnNcbi8vIGVtYmVkZGVkIHBsYXllcnMgYXJlIHJlZ2lzdGVyZWQgaW4gcG9kbG92ZS13ZWJwbGF5ZXItbW9kZXJhdG9yIGluIHRoZSBlbWJlZGRpbmcgcGFnZVxuICBwbGF5ZXJzID0gW10sXG4vLyBhbGwgdXNlZCBmdW5jdGlvbnNcbiAgbWVqc29wdGlvbnMgPSB7XG4gICAgZGVmYXVsdFZpZGVvV2lkdGg6IDQ4MCxcbiAgICBkZWZhdWx0VmlkZW9IZWlnaHQ6IDI3MCxcbiAgICB2aWRlb1dpZHRoOiAtMSxcbiAgICB2aWRlb0hlaWdodDogLTEsXG4gICAgYXVkaW9XaWR0aDogLTEsXG4gICAgYXVkaW9IZWlnaHQ6IDMwLFxuICAgIHN0YXJ0Vm9sdW1lOiAwLjgsXG4gICAgbG9vcDogZmFsc2UsXG4gICAgZW5hYmxlQXV0b3NpemU6IHRydWUsXG4gICAgZmVhdHVyZXM6IFsncGxheXBhdXNlJywgJ2N1cnJlbnQnLCAncHJvZ3Jlc3MnLCAnZHVyYXRpb24nLCAndHJhY2tzJywgJ2Z1bGxzY3JlZW4nXSxcbiAgICBhbHdheXNTaG93Q29udHJvbHM6IGZhbHNlLFxuICAgIGlQYWRVc2VOYXRpdmVDb250cm9sczogZmFsc2UsXG4gICAgaVBob25lVXNlTmF0aXZlQ29udHJvbHM6IGZhbHNlLFxuICAgIEFuZHJvaWRVc2VOYXRpdmVDb250cm9sczogZmFsc2UsXG4gICAgYWx3YXlzU2hvd0hvdXJzOiBmYWxzZSxcbiAgICBzaG93VGltZWNvZGVGcmFtZUNvdW50OiBmYWxzZSxcbiAgICBmcmFtZXNQZXJTZWNvbmQ6IDI1LFxuICAgIGVuYWJsZUtleWJvYXJkOiB0cnVlLFxuICAgIHBhdXNlT3RoZXJQbGF5ZXJzOiB0cnVlLFxuICAgIGR1cmF0aW9uOiBmYWxzZSxcbiAgICBwbHVnaW5zOiBbJ2ZsYXNoJywgJ3NpbHZlcmxpZ2h0J10sXG4gICAgcGx1Z2luUGF0aDogJy4vYmluLycsXG4gICAgZmxhc2hOYW1lOiAnZmxhc2htZWRpYWVsZW1lbnQuc3dmJyxcbiAgICBzaWx2ZXJsaWdodE5hbWU6ICdzaWx2ZXJsaWdodG1lZGlhZWxlbWVudC54YXAnXG4gIH0sXG4gIGRlZmF1bHRzID0ge1xuICAgIGNoYXB0ZXJsaW5rczogJ2FsbCcsXG4gICAgd2lkdGg6ICcxMDAlJyxcbiAgICBkdXJhdGlvbjogZmFsc2UsXG4gICAgY2hhcHRlcnNWaXNpYmxlOiBmYWxzZSxcbiAgICB0aW1lY29udHJvbHNWaXNpYmxlOiBmYWxzZSxcbiAgICBzaGFyZWJ1dHRvbnNWaXNpYmxlOiBmYWxzZSxcbiAgICBkb3dubG9hZGJ1dHRvbnNWaXNpYmxlOiBmYWxzZSxcbiAgICBzdW1tYXJ5VmlzaWJsZTogZmFsc2UsXG4gICAgaGlkZXRpbWVidXR0b246IGZhbHNlLFxuICAgIGhpZGVkb3dubG9hZGJ1dHRvbjogZmFsc2UsXG4gICAgaGlkZXNoYXJlYnV0dG9uOiBmYWxzZSxcbiAgICBzaGFyZXdob2xlZXBpc29kZTogZmFsc2UsXG4gICAgc291cmNlczogW11cbiAgfTtcblxuLyoqXG4gKiByZW1vdmUgJ3B4JyB1bml0LCBzZXQgd2l0ZHRoIHRvIDEwMCUgZm9yICdhdXRvJ1xuICogQHBhcmFtIHtzdHJpbmd9IHdpZHRoXG4gKiBAcmV0dXJucyB7c3RyaW5nfVxuICovXG5mdW5jdGlvbiBub3JtYWxpemVXaWR0aCh3aWR0aCkge1xuICBpZiAod2lkdGgudG9Mb3dlckNhc2UoKSA9PT0gJ2F1dG8nKSB7XG4gICAgcmV0dXJuICcxMDAlJztcbiAgfVxuICByZXR1cm4gd2lkdGgucmVwbGFjZSgncHgnLCAnJyk7XG59XG5cbi8qKlxuICogYXVkaW8gb3IgdmlkZW8gdGFnXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBwbGF5ZXJcbiAqIEByZXR1cm5zIHtzdHJpbmd9ICdhdWRpbycgfCAndmlkZW8nXG4gKi9cbmZ1bmN0aW9uIGdldFBsYXllclR5cGUgKHBsYXllcikge1xuICByZXR1cm4gcGxheWVyLnRhZ05hbWUudG9Mb3dlckNhc2UoKTtcbn1cblxuLyoqXG4gKiBraWxsIHBsYXkvcGF1c2UgYnV0dG9uIGZyb20gbWluaXBsYXllclxuICogQHBhcmFtIG9wdGlvbnNcbiAqL1xuZnVuY3Rpb24gcmVtb3ZlUGxheVBhdXNlKG9wdGlvbnMpIHtcbiAgJC5lYWNoKG9wdGlvbnMuZmVhdHVyZXMsIGZ1bmN0aW9uIChpKSB7XG4gICAgaWYgKHRoaXMgPT09ICdwbGF5cGF1c2UnKSB7XG4gICAgICBvcHRpb25zLmZlYXR1cmVzLnNwbGljZShpLCAxKTtcbiAgICB9XG4gIH0pO1xufVxuXG4vKipcbiAqIHBsYXllciBlcnJvciBoYW5kbGluZyBmdW5jdGlvblxuICogd2lsbCByZW1vdmUgdGhlIHRvcG1vc3QgbWVkaWFmaWxlIGZyb20gc3JjIG9yIHNvdXJjZSBsaXN0XG4gKiBwb3NzaWJsZSBmaXggZm9yIEZpcmVmb3ggQUFDIGlzc3Vlc1xuICovXG5mdW5jdGlvbiByZW1vdmVVbnBsYXlhYmxlTWVkaWEoKSB7XG4gIHZhciAkdGhpcyA9ICQodGhpcyk7XG4gIGlmICgkdGhpcy5hdHRyKCdzcmMnKSkge1xuICAgICR0aGlzLnJlbW92ZUF0dHIoJ3NyYycpO1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgc291cmNlTGlzdCA9ICR0aGlzLmNoaWxkcmVuKCdzb3VyY2UnKTtcbiAgaWYgKHNvdXJjZUxpc3QubGVuZ3RoKSB7XG4gICAgc291cmNlTGlzdC5maXJzdCgpLnJlbW92ZSgpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZShwbGF5ZXIsIHBhcmFtcywgY2FsbGJhY2spIHtcbiAgdmFyIGpxUGxheWVyLFxuICAgIHBsYXllclR5cGUgPSBnZXRQbGF5ZXJUeXBlKHBsYXllciksXG4gICAgc2VjQXJyYXksXG4gICAgd3JhcHBlcjtcblxuICBqcVBsYXllciA9ICQocGxheWVyKTtcbiAgd3JhcHBlciA9ICQoJzxkaXYgY2xhc3M9XCJjb250YWluZXJcIj48L2Rpdj4nKTtcbiAganFQbGF5ZXIucmVwbGFjZVdpdGgod3JhcHBlcik7XG5cbiAgLy9maW5lIHR1bmluZyBwYXJhbXNcbiAgcGFyYW1zLndpZHRoID0gbm9ybWFsaXplV2lkdGgocGFyYW1zLndpZHRoKTtcbiAgaWYgKHBsYXllclR5cGUgPT09ICdhdWRpbycpIHtcbiAgICAvLyBGSVhNRTogU2luY2UgdGhlIHBsYXllciBpcyBubyBsb25nZXIgdmlzaWJsZSBpdCBoYXMgbm8gd2lkdGhcbiAgICBpZiAocGFyYW1zLmF1ZGlvV2lkdGggIT09IHVuZGVmaW5lZCkge1xuICAgICAgcGFyYW1zLndpZHRoID0gcGFyYW1zLmF1ZGlvV2lkdGg7XG4gICAgfVxuICAgIG1lanNvcHRpb25zLmF1ZGlvV2lkdGggPSBwYXJhbXMud2lkdGg7XG4gICAgLy9raWxsIGZ1bGxzY3JlZW4gYnV0dG9uXG4gICAgJC5lYWNoKG1lanNvcHRpb25zLmZlYXR1cmVzLCBmdW5jdGlvbiAoaSkge1xuICAgICAgaWYgKHRoaXMgPT09ICdmdWxsc2NyZWVuJykge1xuICAgICAgICBtZWpzb3B0aW9ucy5mZWF0dXJlcy5zcGxpY2UoaSwgMSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmVtb3ZlUGxheVBhdXNlKG1lanNvcHRpb25zKTtcbiAgfVxuICBlbHNlIGlmIChwbGF5ZXJUeXBlID09PSAndmlkZW8nKSB7XG4gICAgLy92aWRlbyBwYXJhbXNcbiAgICBpZiAoZmFsc2UgJiYgcGFyYW1zLmhlaWdodCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBtZWpzb3B0aW9ucy52aWRlb1dpZHRoID0gcGFyYW1zLndpZHRoO1xuICAgICAgbWVqc29wdGlvbnMudmlkZW9IZWlnaHQgPSBwYXJhbXMuaGVpZ2h0O1xuICAgIH1cbiAgICAvLyBGSVhNRVxuICAgIGlmIChmYWxzZSAmJiAkKHBsYXllcikuYXR0cignd2lkdGgnKSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBwYXJhbXMud2lkdGggPSAkKHBsYXllcikuYXR0cignd2lkdGgnKTtcbiAgICB9XG4gIH1cblxuICAvL2R1cmF0aW9uIGNhbiBiZSBnaXZlbiBpbiBzZWNvbmRzIG9yIGluIE5QVCBmb3JtYXRcbiAgaWYgKHBhcmFtcy5kdXJhdGlvbiAmJiBwYXJhbXMuZHVyYXRpb24gIT09IHBhcnNlSW50KHBhcmFtcy5kdXJhdGlvbiwgMTApKSB7XG4gICAgc2VjQXJyYXkgPSBwYXJzZVRpbWVjb2RlKHBhcmFtcy5kdXJhdGlvbik7XG4gICAgcGFyYW1zLmR1cmF0aW9uID0gc2VjQXJyYXlbMF07XG4gIH1cblxuICAvL092ZXJ3cml0ZSBNRUpTIGRlZmF1bHQgdmFsdWVzIHdpdGggYWN0dWFsIGRhdGFcbiAgJC5lYWNoKG1lanNvcHRpb25zLCBmdW5jdGlvbiAoa2V5KSB7XG4gICAgaWYgKGtleSBpbiBwYXJhbXMpIHtcbiAgICAgIG1lanNvcHRpb25zW2tleV0gPSBwYXJhbXNba2V5XTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vd3JhcHBlciBhbmQgaW5pdCBzdHVmZlxuICAvLyBGSVhNRTogYmV0dGVyIGNoZWNrIGZvciBudW1lcmljYWwgdmFsdWVcbiAgaWYgKHBhcmFtcy53aWR0aC50b1N0cmluZygpLnRyaW0oKSA9PT0gcGFyc2VJbnQocGFyYW1zLndpZHRoLCAxMCkudG9TdHJpbmcoKSkge1xuICAgIHBhcmFtcy53aWR0aCA9IHBhcnNlSW50KHBhcmFtcy53aWR0aCwgMTApICsgJ3B4JztcbiAgfVxuXG4gIHBsYXllcnMucHVzaChwbGF5ZXIpO1xuXG4gIC8vYWRkIHBhcmFtcyBmcm9tIGF1ZGlvIGFuZCB2aWRlbyBlbGVtZW50c1xuICBqcVBsYXllci5maW5kKCdzb3VyY2UnKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXBhcmFtcy5zb3VyY2VzKSB7XG4gICAgICBwYXJhbXMuc291cmNlcyA9IFtdO1xuICAgIH1cbiAgICBwYXJhbXMuc291cmNlcy5wdXNoKCQodGhpcykuYXR0cignc3JjJykpO1xuICB9KTtcblxuICBwYXJhbXMudHlwZSA9IHBsYXllclR5cGU7XG4gIC8vIGluaXQgTUVKUyB0byBwbGF5ZXJcbiAgbWVqc29wdGlvbnMuc3VjY2VzcyA9IGZ1bmN0aW9uIChwbGF5ZXJFbGVtZW50KSB7XG4gICAganFQbGF5ZXIub24oJ2Vycm9yJywgcmVtb3ZlVW5wbGF5YWJsZU1lZGlhKTsgICAvLyBUaGlzIG1pZ2h0IGJlIGEgZml4IHRvIHNvbWUgRmlyZWZveCBBQUMgaXNzdWVzLlxuICAgIGNhbGxiYWNrKHBsYXllckVsZW1lbnQsIHBhcmFtcywgd3JhcHBlcik7XG4gIH07XG4gIHZhciBtZSA9IG5ldyBNZWRpYUVsZW1lbnQocGxheWVyLCBtZWpzb3B0aW9ucyk7XG4gIGNvbnNvbGUubG9nKCdNZWRpYUVsZW1lbnQnLCBtZSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBjcmVhdGU6IGNyZWF0ZSxcbiAgZGVmYXVsdHM6IGRlZmF1bHRzLFxuICBwbGF5ZXJzOiBwbGF5ZXJzXG59O1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIm9NZnBBblwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiL3BsYXllci5qc1wiLFwiL1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0JztcblxudmFyIHNvY2lhbE5ldHdvcmtzID0gcmVxdWlyZSgnLi9zb2NpYWwtbmV0d29ya3MnKTtcblxuZnVuY3Rpb24gY3JlYXRlQnV0dG9uV2l0aChvcHRpb25zKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoc2VydmljZU5hbWUpIHtcbiAgICB2YXIgc2VydmljZSA9IHNvY2lhbE5ldHdvcmtzLmdldChzZXJ2aWNlTmFtZSk7XG4gICAgcmV0dXJuIHNlcnZpY2UuZ2V0QnV0dG9uKG9wdGlvbnMpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBTb2NpYWxCdXR0b25MaXN0IChzZXJ2aWNlcywgb3B0aW9ucykge1xuICB2YXIgY3JlYXRlQnV0dG9uID0gY3JlYXRlQnV0dG9uV2l0aChvcHRpb25zKTtcbiAgdGhpcy5idXR0b25zID0gc2VydmljZXMubWFwKGNyZWF0ZUJ1dHRvbik7XG5cbiAgdGhpcy5saXN0ID0gJCgnPHVsIGNsYXNzPVwic29jaWFsLW5ldHdvcmstYnV0dG9uc1wiPjwvdWw+Jyk7XG4gIHRoaXMuYnV0dG9ucy5mb3JFYWNoKGZ1bmN0aW9uIChidXR0b24pIHtcbiAgICB2YXIgbGlzdEVsZW1lbnQgPSAkKCc8bGk+PC9saT4nKS5hcHBlbmQoYnV0dG9uLmVsZW1lbnQpO1xuICAgIHRoaXMubGlzdC5hcHBlbmQobGlzdEVsZW1lbnQpO1xuICB9LCB0aGlzKTtcbn1cblxuU29jaWFsQnV0dG9uTGlzdC5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgdGhpcy5idXR0b25zLmZvckVhY2goZnVuY3Rpb24gKGJ1dHRvbikge1xuICAgIGJ1dHRvbi51cGRhdGVVcmwob3B0aW9ucyk7XG4gIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTb2NpYWxCdXR0b25MaXN0O1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIm9NZnBBblwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiL3NvY2lhbC1idXR0b24tbGlzdC5qc1wiLFwiL1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gY3JlYXRlQnV0dG9uIChvcHRpb25zKSB7XG4gIHJldHVybiAkKCc8YSBjbGFzcz1cInB3cC1jb250cmFzdC0nICsgb3B0aW9ucy5pY29uICsgJ1wiIHRhcmdldD1cIl9ibGFua1wiIGhyZWY9XCInICsgb3B0aW9ucy51cmwgKyAnXCIgJyArXG4gICd0aXRsZT1cIicgKyBvcHRpb25zLnRpdGxlICsgJ1wiPjxpIGNsYXNzPVwiaWNvbiBwd3AtJyArIG9wdGlvbnMuaWNvbiArICdcIj48L2k+PC9hPicgK1xuICAnPHNwYW4+JyArIG9wdGlvbnMudGl0bGUgKyAnPC9zcGFuPicpO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYW4gb2JqZWN0IHRvIGludGVyYWN0IHdpdGggYSBzb2NpYWwgbmV0d29ya1xuICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgSWNvbiwgdGl0bGUgcHJvZmlsZS0gYW5kIHNoYXJpbmctVVJMLXRlbXBsYXRlc1xuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFNvY2lhbE5ldHdvcmsgKG9wdGlvbnMpIHtcbiAgdGhpcy5pY29uID0gb3B0aW9ucy5pY29uO1xuICB0aGlzLnRpdGxlID0gb3B0aW9ucy50aXRsZTtcbiAgdGhpcy51cmwgPSBvcHRpb25zLnByb2ZpbGVVcmw7XG4gIHRoaXMuc2hhcmVVcmwgPSBvcHRpb25zLnNoYXJlVXJsO1xufVxuXG4vKipcbiAqIGJ1aWxkIFVSTCBmb3Igc2hhcmluZyBhIHRleHQsIGEgdGl0bGUgYW5kIGEgdXJsXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyBjb250ZW50cyB0byBiZSBzaGFyZWRcbiAqIEByZXR1cm5zIHtzdHJpbmd9IFVSTCB0byBzaGFyZSB0aGUgY29udGVudHNcbiAqL1xuU29jaWFsTmV0d29yay5wcm90b3R5cGUuZ2V0U2hhcmVVcmwgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICB2YXIgc2hhcmVVcmwgPSB0aGlzLnNoYXJlVXJsXG4gICAgLnJlcGxhY2UoJyR0ZXh0JCcsIG9wdGlvbnMudGV4dClcbiAgICAucmVwbGFjZSgnJHRpdGxlJCcsIG9wdGlvbnMudGl0bGUpXG4gICAgLnJlcGxhY2UoJyR1cmwkJywgb3B0aW9ucy51cmwpO1xuICByZXR1cm4gdGhpcy51cmwgKyBzaGFyZVVybDtcbn07XG5cbi8qKlxuICogYnVpbGQgVVJMIHRvIGEgZ2l2ZW4gcHJvZmlsZVxuICogQHBhcmFtIHtvYmplY3R9IHByb2ZpbGUgVXNlcm5hbWUgdG8gbGluayB0b1xuICogQHJldHVybnMge3N0cmluZ30gcHJvZmlsZSBVUkxcbiAqL1xuU29jaWFsTmV0d29yay5wcm90b3R5cGUuZ2V0UHJvZmlsZVVybCA9IGZ1bmN0aW9uIChwcm9maWxlKSB7XG4gIHJldHVybiB0aGlzLnVybCArIHByb2ZpbGU7XG59O1xuXG4vKipcbiAqIGdldCBwcm9maWxlIGJ1dHRvbiBlbGVtZW50XG4gKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyBvcHRpb25zLnByb2ZpbGUgZGVmaW5lcyB0aGUgcHJvZmlsZSB0aGUgYnV0dG9uIGxpbmtzIHRvXG4gKiBAcmV0dXJucyB7e2VsZW1lbnQ6e2pRdWVyeX19fSBidXR0b24gcmVmZXJlbmNlXG4gKi9cblNvY2lhbE5ldHdvcmsucHJvdG90eXBlLmdldFByb2ZpbGVCdXR0b24gPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICBpZiAoIW9wdGlvbnMucHJvZmlsZSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIHJldHVybiB7XG4gICAgZWxlbWVudDogY3JlYXRlQnV0dG9uKHtcbiAgICAgIHVybDogdGhpcy5nZXRQcm9maWxlVXJsKG9wdGlvbnMucHJvZmlsZSksXG4gICAgICB0aXRsZTogdGhpcy50aXRsZSxcbiAgICAgIGljb246IHRoaXMuaWNvblxuICAgIH0pXG4gIH07XG59O1xuXG4vKipcbiAqIGdldCBzaGFyZSBidXR0b24gZWxlbWVudCBhbmQgVVJMIHVwZGF0ZSBmdW5jdGlvblxuICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgaW5pdGlhbCBjb250ZW50cyB0byBiZSBzaGFyZWQgd2l0aCB0aGUgYnV0dG9uXG4gKiBAcmV0dXJucyB7e2VsZW1lbnQ6e2pRdWVyeX0sIHVwZGF0ZVVybDp7ZnVuY3Rpb259fX0gYnV0dG9uIHJlZmVyZW5jZSBhbmQgdXBkYXRlIGZ1bmN0aW9uXG4gKi9cblNvY2lhbE5ldHdvcmsucHJvdG90eXBlLmdldFNoYXJlQnV0dG9uID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcblxuICBpZiAoIXRoaXMuc2hhcmVVcmwgfHwgIW9wdGlvbnMudGl0bGUgfHwgIW9wdGlvbnMudXJsKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBpZiAoIW9wdGlvbnMudGV4dCkge1xuICAgIG9wdGlvbnMudGV4dCA9IG9wdGlvbnMudGl0bGUgKyAnJTIwJyArIG9wdGlvbnMudXJsO1xuICB9XG5cbiAgdmFyIGVsZW1lbnQgPSBjcmVhdGVCdXR0b24oe1xuICAgIHVybDogdGhpcy5nZXRTaGFyZVVybChvcHRpb25zKSxcbiAgICB0aXRsZTogdGhpcy50aXRsZSxcbiAgICBpY29uOiB0aGlzLmljb25cbiAgfSk7XG5cbiAgdmFyIHVwZGF0ZVVybCA9IGZ1bmN0aW9uICh1cGRhdGVPcHRpb25zKSB7XG4gICAgZWxlbWVudC5nZXQoMCkuaHJlZiA9IHRoaXMuZ2V0U2hhcmVVcmwodXBkYXRlT3B0aW9ucyk7XG4gIH0uYmluZCh0aGlzKTtcblxuICByZXR1cm4ge1xuICAgIGVsZW1lbnQ6IGVsZW1lbnQsXG4gICAgdXBkYXRlVXJsOiB1cGRhdGVVcmxcbiAgfTtcbn07XG5cbi8qKlxuICogZ2V0IHNoYXJlIG9yIHByb2ZpbGUgYnV0dG9uIGRlcGVuZGluZyBvbiB0aGUgb3B0aW9ucyBnaXZlblxuICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgb2JqZWN0IHdpdGggZWl0aGVyIHByb2ZpbGVuYW1lIG9yIGNvbnRlbnRzIHRvIHNoYXJlXG4gKiBAcmV0dXJucyB7b2JqZWN0fSBidXR0b24gb2JqZWN0XG4gKi9cblNvY2lhbE5ldHdvcmsucHJvdG90eXBlLmdldEJ1dHRvbiA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gIGlmIChvcHRpb25zLnByb2ZpbGUpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRQcm9maWxlQnV0dG9uKG9wdGlvbnMpO1xuICB9XG4gIGlmICh0aGlzLnNoYXJlVXJsICYmIG9wdGlvbnMudGl0bGUgJiYgb3B0aW9ucy51cmwpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRTaGFyZUJ1dHRvbihvcHRpb25zKTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU29jaWFsTmV0d29yaztcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJvTWZwQW5cIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi9zb2NpYWwtbmV0d29yay5qc1wiLFwiL1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0JztcblxudmFyIFNvY2lhbE5ldHdvcmsgPSByZXF1aXJlKCcuL3NvY2lhbC1uZXR3b3JrJyk7XG52YXIgc29jaWFsTmV0d29ya3MgPSB7XG4gIHR3aXR0ZXI6IG5ldyBTb2NpYWxOZXR3b3JrKHtcbiAgICBpY29uOiAndHdpdHRlcicsXG4gICAgdGl0bGU6ICdUd2l0dGVyJyxcbiAgICBwcm9maWxlVXJsOiAnaHR0cHM6Ly90d2l0dGVyLmNvbS8nLFxuICAgIHNoYXJlVXJsOiAnc2hhcmU/dGV4dD0kdGV4dCQmdXJsPSR1cmwkJ1xuICB9KSxcblxuICBmbGF0dHI6IG5ldyBTb2NpYWxOZXR3b3JrKHtcbiAgICBpY29uOiAnZmxhdHRyJyxcbiAgICB0aXRsZTogJ0ZsYXR0cicsXG4gICAgcHJvZmlsZVVybDogJ2h0dHBzOi8vZmxhdHRyLmNvbS9wcm9maWxlLycsXG4gICAgc2hhcmVVcmw6ICdzaGFyZT90ZXh0PSR0ZXh0JCZ1cmw9JHVybCQnXG4gIH0pLFxuXG4gIGZhY2Vib29rOiBuZXcgU29jaWFsTmV0d29yayh7XG4gICAgaWNvbjogJ2ZhY2Vib29rJyxcbiAgICB0aXRsZTogJ0ZhY2Vib29rJyxcbiAgICBwcm9maWxlVXJsOiAnaHR0cHM6Ly9mYWNlYm9vay5jb20vJyxcbiAgICBzaGFyZVVybDogJ3NoYXJlLnBocD90PSR0ZXh0JCZ1PSR1cmwkJ1xuICB9KSxcblxuICBhZG46IG5ldyBTb2NpYWxOZXR3b3JrKHtcbiAgICBpY29uOiAnYWRuJyxcbiAgICB0aXRsZTogJ0FwcC5uZXQnLFxuICAgIHByb2ZpbGVVcmw6ICdodHRwczovL2FscGhhLmFwcC5uZXQvJyxcbiAgICBzaGFyZVVybDogJ2ludGVudC9wb3N0P3RleHQ9JHRleHQkJ1xuICB9KSxcblxuICBzb3VuZGNsb3VkOiBuZXcgU29jaWFsTmV0d29yayh7XG4gICAgaWNvbjogJ3NvdW5kY2xvdWQnLFxuICAgIHRpdGxlOiAnU291bmRDbG91ZCcsXG4gICAgcHJvZmlsZVVybDogJ2h0dHBzOi8vc291bmRjbG91ZC5jb20vJyxcbiAgICBzaGFyZVVybDogJ3NoYXJlP3RpdGxlPSR0aXRsZSQmdXJsPSR1cmwkJ1xuICB9KSxcblxuICBpbnN0YWdyYW06IG5ldyBTb2NpYWxOZXR3b3JrKHtcbiAgICBpY29uOiAnaW5zdGFncmFtJyxcbiAgICB0aXRsZTogJ0luc3RhZ3JhbScsXG4gICAgcHJvZmlsZVVybDogJ2h0dHA6Ly9pbnN0YWdyYW0uY29tLycsXG4gICAgc2hhcmVVcmw6ICdzaGFyZT90aXRsZT0kdGl0bGUkJnVybD0kdXJsJCdcbiAgfSksXG5cbiAgdHVtYmxyOiBuZXcgU29jaWFsTmV0d29yayh7XG4gICAgaWNvbjogJ3R1bWJscicsXG4gICAgdGl0bGU6ICdUdW1ibHInLFxuICAgIHByb2ZpbGVVcmw6ICdodHRwczovL3d3dy50dW1ibHIuY29tLycsXG4gICAgc2hhcmVVcmw6ICdzaGFyZT90aXRsZT0kdGl0bGUkJnVybD0kdXJsJCdcbiAgfSksXG5cbiAgZW1haWw6IG5ldyBTb2NpYWxOZXR3b3JrKHtcbiAgICBpY29uOiAnbWVzc2FnZScsXG4gICAgdGl0bGU6ICdFLU1haWwnLFxuICAgIHByb2ZpbGVVcmw6ICdtYWlsdG86JyxcbiAgICBzaGFyZVVybDogJz9zdWJqZWN0PSR0aXRsZSQmYm9keT0kdGV4dCQnXG4gIH0pLFxuXG4gIGdwbHVzOiBuZXcgU29jaWFsTmV0d29yayh7XG4gICAgaWNvbjogJ2dvb2dsZS1wbHVzJyxcbiAgICB0aXRsZTogJ0dvb2dsZSsnLFxuICAgIHByb2ZpbGVVcmw6ICdodHRwczovL3BsdXMuZ29vZ2xlLmNvbS8nLFxuICAgIHNoYXJlVXJsOiAnc2hhcmU/dGl0bGU9JHRpdGxlJCZ1cmw9JHVybCQnXG4gIH0pXG59O1xuXG4vKipcbiAqIHJldHVybnMgdGhlIHNlcnZpY2UgcmVnaXN0ZXJlZCB3aXRoIHRoZSBnaXZlbiBuYW1lXG4gKiBAcGFyYW0ge3N0cmluZ30gc2VydmljZU5hbWUgVGhlIG5hbWUgb2YgdGhlIHNvY2lhbCBuZXR3b3JrXG4gKiBAcmV0dXJucyB7U29jaWFsTmV0d29ya30gVGhlIG5ldHdvcmsgd2l0aCB0aGUgZ2l2ZW4gbmFtZVxuICovXG5mdW5jdGlvbiBnZXRTZXJ2aWNlIChzZXJ2aWNlTmFtZSkge1xuICB2YXIgc2VydmljZSA9IHNvY2lhbE5ldHdvcmtzW3NlcnZpY2VOYW1lXTtcbiAgaWYgKCFzZXJ2aWNlKSB7XG4gICAgY29uc29sZS5lcnJvcignVW5rbm93biBzZXJ2aWNlJywgc2VydmljZU5hbWUpO1xuICB9XG4gIHJldHVybiBzZXJ2aWNlO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgZ2V0OiBnZXRTZXJ2aWNlXG59O1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIm9NZnBBblwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiL3NvY2lhbC1uZXR3b3Jrcy5qc1wiLFwiL1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBXaGVuIHRhYiBjb250ZW50IGlzIHNjcm9sbGVkLCBhIGJveHNoYWRvdyBpcyBhZGRlZCB0byB0aGUgaGVhZGVyXG4gKiBAcGFyYW0gZXZlbnRcbiAqL1xuZnVuY3Rpb24gYWRkU2hhZG93T25TY3JvbGwoZXZlbnQpIHtcbiAgdmFyIHNjcm9sbCA9IGV2ZW50LmN1cnJlbnRUYXJnZXQuc2Nyb2xsVG9wO1xuICBldmVudC5kYXRhLmhlYWRlci50b2dnbGVDbGFzcygnc2Nyb2xsZWQnLCAoc2Nyb2xsID49IDUgKSk7XG59XG5cbi8qKlxuICogUmV0dXJuIGFuIGh0bWwgc2VjdGlvbiBlbGVtZW50IGFzIGEgd3JhcHBlciBmb3IgdGhlIHRhYlxuICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm5zIHsqfGpRdWVyeXxIVE1MRWxlbWVudH1cbiAqL1xuZnVuY3Rpb24gY3JlYXRlQ29udGVudEJveChvcHRpb25zKSB7XG4gIHZhciBjbGFzc2VzID0gWyd0YWInXTtcbiAgY2xhc3Nlcy5wdXNoKG9wdGlvbnMubmFtZSk7XG4gIGlmIChvcHRpb25zLmFjdGl2ZSkge1xuICAgIGNsYXNzZXMucHVzaCgnYWN0aXZlJyk7XG4gIH1cbiAgcmV0dXJuICQoJzxzZWN0aW9uIGNsYXNzPVwiJyArIGNsYXNzZXMuam9pbignICcpICsgJ1wiPjwvc2VjdGlvbj4nKTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSB0YWJcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gVGFiKG9wdGlvbnMpIHtcbiAgdGhpcy5pY29uID0gb3B0aW9ucy5pY29uO1xuICB0aGlzLnRpdGxlID0gb3B0aW9ucy50aXRsZTtcbiAgdGhpcy5oZWFkbGluZSA9IG9wdGlvbnMuaGVhZGxpbmU7XG5cbiAgdGhpcy5ib3ggPSBjcmVhdGVDb250ZW50Qm94KG9wdGlvbnMpO1xuICB2YXIgaGVhZGVyID0gdGhpcy5jcmVhdGVIZWFkZXIoKTtcbiAgdGhpcy5ib3gub24oJ3Njcm9sbCcsIHtoZWFkZXI6IGhlYWRlcn0sIGFkZFNoYWRvd09uU2Nyb2xsKTtcblxuICB0aGlzLmFjdGl2ZSA9IGZhbHNlO1xuICB0aGlzLnRvZ2dsZSA9IG51bGw7XG59XG5cbi8qKlxuICogQWRkIGNsYXNzICdhY3RpdmUnIHRvIHRoZSBhY3RpdmUgdGFiXG4gKi9cblRhYi5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5hY3RpdmUgPSB0cnVlO1xuICB0aGlzLmJveC5hZGRDbGFzcygnYWN0aXZlJyk7XG4gIHRoaXMudG9nZ2xlLmFkZENsYXNzKCdhY3RpdmUnKTtcbn07XG5cbi8qKlxuICogUmVtb3ZlIGNsYXNzICdhY3RpdmUnIGZyb20gdGhlIGluYWN0aXZlIHRhYlxuICovXG5UYWIucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmFjdGl2ZSA9IGZhbHNlO1xuICB0aGlzLmJveC5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gIHRoaXMudG9nZ2xlLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbn07XG5cbi8qKlxuICogUmV0dXJuIGFuIGh0bWwgaGVhZGVyIGVsZW1lbnQgd2l0aCBhIGhlYWRsaW5lXG4gKi9cblRhYi5wcm90b3R5cGUuY3JlYXRlSGVhZGVyID0gZnVuY3Rpb24oKSB7XG4gIHZhciBoZWFkZXIgPSAkKCc8aGVhZGVyIGNsYXNzPVwidGFiLWhlYWRlclwiPjxoMiBjbGFzcz1cInRhYi1oZWFkbGluZVwiPicgK1xuICAgICc8aSBjbGFzcz1cImljb24gJyArIHRoaXMuaWNvbiArICdcIj48L2k+JyArIHRoaXMuaGVhZGxpbmUgKyAnPC9oMj48L2hlYWRlcj4nKTtcbiAgdGhpcy5ib3guYXBwZW5kKGhlYWRlcik7XG4gIHJldHVybiBoZWFkZXI7XG59O1xuXG4vKipcbiAqIEFwcGVuZCBhbiBodG1sIGRpdiBlbGVtZW50IHdpdGggY2xhc3MgbWFpbiB0byB0aGUgdGFiJ3MgY29udGVudCBib3hcbiAqIEBwYXJhbSBjb250ZW50XG4gKi9cblRhYi5wcm90b3R5cGUuY3JlYXRlTWFpbkNvbnRlbnQgPSBmdW5jdGlvbihjb250ZW50KSB7XG4gIHZhciBtYWluRGl2ID0gJCgnPGRpdiBjbGFzcz1cIm1haW5cIj4nICsgY29udGVudCArICc8L2RpdicpO1xuICB0aGlzLmJveC5hcHBlbmQobWFpbkRpdik7XG4gIHJldHVybiBtYWluRGl2O1xufTtcblxuLyoqXG4gKiBBcHBlbmQgYW4gaHRtbCBhc2lkZSBlbGVtZW50IHRvIHRoZSB0YWIncyBjb250ZW50IGJveFxuICogQHBhcmFtIGNvbnRlbnRcbiAqL1xuVGFiLnByb3RvdHlwZS5jcmVhdGVBc2lkZSA9IGZ1bmN0aW9uKGNvbnRlbnQpIHtcbiAgdmFyIGFzaWRlID0gJCgnPGFzaWRlIGNsYXNzPVwiYXNpZGVcIj4nICsgY29udGVudCArICc8L2FzaWRlPicpO1xuICB0aGlzLmJveC5hcHBlbmQoYXNpZGUpO1xuICByZXR1cm4gYXNpZGU7XG59O1xuXG4vKipcbiAqIEFwcGVuZCBhbiBodG1sIGZvb3RlciBlbGVtZW50IHRvIHRoZSB0YWIncyBjb250ZW50IGJveFxuICogQHBhcmFtIGNvbnRlbnRcbiAqL1xuVGFiLnByb3RvdHlwZS5jcmVhdGVGb290ZXIgPSBmdW5jdGlvbihjb250ZW50KSB7XG4gIHZhciBmb290ZXIgPSAkKCc8Zm9vdGVyPicgKyBjb250ZW50ICsgJzwvZm9vdGVyPicpO1xuICB0aGlzLmJveC5hcHBlbmQoZm9vdGVyKTtcbiAgcmV0dXJuIGZvb3Rlcjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVGFiO1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIm9NZnBBblwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiL3RhYi5qc1wiLFwiL1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKlxuICogQHBhcmFtIHtUYWJ9IHRhYlxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGdldFRvZ2dsZUNsaWNrSGFuZGxlcih0YWIpIHtcbiAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgY29uc29sZS5kZWJ1ZygnVGFiUmVnaXN0cnknLCAnYWN0aXZlVGFiJywgdGhpcy5hY3RpdmVUYWIpO1xuICBpZiAodGhpcy5hY3RpdmVUYWIpIHtcbiAgICB0aGlzLmFjdGl2ZVRhYi5jbG9zZSgpO1xuICB9XG4gIGlmICh0aGlzLmFjdGl2ZVRhYiA9PT0gdGFiKSB7XG4gICAgdGhpcy5hY3RpdmVUYWIgPSBudWxsO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICB0aGlzLmFjdGl2ZVRhYiA9IHRhYjtcbiAgdGhpcy5hY3RpdmVUYWIub3BlbigpO1xuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICpcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IHBsYXllclxuICovXG5mdW5jdGlvbiBsb2dDdXJyZW50VGltZSAocGxheWVyKSB7XG4gIGNvbnNvbGUubG9nKCdwbGF5ZXIuY3VycmVudFRpbWUnLCBwbGF5ZXIuY3VycmVudFRpbWUpO1xufVxuXG5mdW5jdGlvbiBUYWJSZWdpc3RyeSgpIHtcbiAgLyoqXG4gICAqIHdpbGwgc3RvcmUgYSByZWZlcmVuY2UgdG8gY3VycmVudGx5IGFjdGl2ZSB0YWIgaW5zdGFuY2UgdG8gY2xvc2UgaXQgd2hlbiBhbm90aGVyIG9uZSBpcyBvcGVuZWRcbiAgICogQHR5cGUge29iamVjdH1cbiAgICovXG4gIHRoaXMuYWN0aXZlVGFiID0gbnVsbDtcbiAgdGhpcy50b2dnbGViYXIgPSAkKCc8ZGl2IGNsYXNzPVwidG9nZ2xlYmFyIGJhclwiPjwvZGl2PicpO1xuICB0aGlzLnRvZ2dsZUxpc3QgPSAkKCc8dWwgY2xhc3M9XCJ0YWJsaXN0XCI+PC91bD4nKTtcbiAgdGhpcy50b2dnbGViYXIuYXBwZW5kKHRoaXMudG9nZ2xlTGlzdCk7XG4gIHRoaXMuY29udGFpbmVyID0gJCgnPGRpdiBjbGFzcz1cInRhYnNcIj48L2Rpdj4nKTtcbiAgdGhpcy5saXN0ZW5lcnMgPSBbbG9nQ3VycmVudFRpbWVdO1xuICB0aGlzLnRhYnMgPSBbXTtcbn1cblxuVGFiUmVnaXN0cnkucHJvdG90eXBlLmNyZWF0ZVRvZ2dsZUZvciA9IGZ1bmN0aW9uICh0YWIpIHtcbiAgdmFyIHRvZ2dsZSA9ICQoJzxsaSB0aXRsZT1cIicgKyB0YWIudGl0bGUgKyAnXCI+JyArXG4gICAgICAnPGEgaHJlZj1cImphdmFzY3JpcHQ6O1wiIGNsYXNzPVwiYnV0dG9uIGJ1dHRvbi10b2dnbGUgJyArIHRhYi5pY29uICsgJ1wiPjwvYT4nICtcbiAgICAnPC9saT4nKTtcbiAgdG9nZ2xlLm9uKCdjbGljaycsIGdldFRvZ2dsZUNsaWNrSGFuZGxlci5iaW5kKHRoaXMsIHRhYikpO1xuICB0aGlzLnRvZ2dsZUxpc3QuYXBwZW5kKHRvZ2dsZSk7XG4gIHJldHVybiB0b2dnbGU7XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVyIGEgdGFiIGFuZCBvcGVuIGl0IGlmIGl0IGlzIGluaXRpYWxseSB2aXNpYmxlXG4gKiBAcGFyYW0ge1RhYn0gdGFiXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHZpc2libGVcbiAqL1xuVGFiUmVnaXN0cnkucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKHRhYikge1xuICBpZiAodGFiID09PSBudWxsKSB7IHJldHVybjsgfVxuICB0aGlzLnRhYnMucHVzaCh0YWIpO1xuICB0aGlzLmNvbnRhaW5lci5hcHBlbmQodGFiLmJveCk7XG4gIHRhYi50b2dnbGUgPSB0aGlzLmNyZWF0ZVRvZ2dsZUZvcih0YWIpO1xufTtcblxuVGFiUmVnaXN0cnkucHJvdG90eXBlLm9wZW5Jbml0aWFsID0gZnVuY3Rpb24gKHRhYk5hbWUpIHtcbiAgaWYgKCF0YWJOYW1lKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHZhciBtYXRjaGluZ1RhYnMgPSB0aGlzLnRhYnMuZmlsdGVyKGZ1bmN0aW9uICh0YWIpIHtcbiAgICByZXR1cm4gKHRhYi5oZWFkbGluZSA9PT0gdGFiTmFtZSk7XG4gIH0pO1xuICBpZiAobWF0Y2hpbmdUYWJzLmxlbmd0aCA9PT0gMCkge1xuICAgIGNvbnNvbGUud2FybignVGFiUmVnaXN0cnkub3BlbkluaXRpYWw6IENvdWxkIG5vdCBvcGVuIHRhYicsIHRhYk5hbWUpO1xuICB9XG4gIHZhciBpbml0aWFsQWN0aXZlVGFiID0gbWF0Y2hpbmdUYWJzLnBvcCgpO1xuICBpbml0aWFsQWN0aXZlVGFiLm9wZW4oKTtcbiAgdGhpcy5hY3RpdmVUYWIgPSBpbml0aWFsQWN0aXZlVGFiO1xufTtcblxuLyoqXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IG1vZHVsZVxuICovXG5UYWJSZWdpc3RyeS5wcm90b3R5cGUuYWRkTW9kdWxlID0gZnVuY3Rpb24obW9kdWxlKSB7XG4gIGlmIChtb2R1bGUudGFiKSB7XG4gICAgdGhpcy5hZGQobW9kdWxlLnRhYik7XG4gIH1cbiAgaWYgKG1vZHVsZS51cGRhdGUpIHtcbiAgICB0aGlzLmxpc3RlbmVycy5wdXNoKG1vZHVsZS51cGRhdGUpO1xuICB9XG59O1xuXG5UYWJSZWdpc3RyeS5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgY29uc29sZS5sb2coJ1RhYlJlZ2lzdHJ5I3VwZGF0ZScsIGV2ZW50KTtcbiAgdmFyIHBsYXllciA9IGV2ZW50LmN1cnJlbnRUYXJnZXQ7XG4gICQuZWFjaCh0aGlzLmxpc3RlbmVycywgZnVuY3Rpb24gKGksIGxpc3RlbmVyKSB7IGxpc3RlbmVyKHBsYXllcik7IH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBUYWJSZWdpc3RyeTtcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJvTWZwQW5cIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi90YWJyZWdpc3RyeS5qc1wiLFwiL1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0JztcblxudmFyIHplcm9GaWxsID0gcmVxdWlyZSgnLi91dGlsJykuemVyb0ZpbGw7XG5cbi8qKlxuICogVGltZWNvZGUgYXMgZGVzY3JpYmVkIGluIGh0dHA6Ly9wb2Rsb3ZlLm9yZy9kZWVwLWxpbmsvXG4gKiBhbmQgaHR0cDovL3d3dy53My5vcmcvVFIvbWVkaWEtZnJhZ3MvI2ZyYWdtZW50LWRpbWVuc2lvbnNcbiAqL1xudmFyIHRpbWVDb2RlTWF0Y2hlciA9IC8oPzooXFxkKyk6KT8oXFxkezEsMn0pOihcXGRcXGQpKFxcLlxcZHsxLDN9KT8vO1xuXG4vKipcbiAqIGNvbnZlcnQgYW4gYXJyYXkgb2Ygc3RyaW5nIHRvIHRpbWVjb2RlXG4gKiBAcGFyYW0ge3N0cmluZ30gdGNcbiAqIEByZXR1cm5zIHtudW1iZXJ8Ym9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gZXh0cmFjdFRpbWUodGMpIHtcbiAgaWYgKCF0Yykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICB2YXIgcGFydHMgPSB0aW1lQ29kZU1hdGNoZXIuZXhlYyh0Yyk7XG4gIGlmICghcGFydHMpIHtcbiAgICBjb25zb2xlLndhcm4oJ0NvdWxkIG5vdCBleHRyYWN0IHRpbWUgZnJvbScsIHRjKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgdmFyIHRpbWUgPSAwO1xuICAvLyBob3Vyc1xuICB0aW1lICs9IHBhcnRzWzFdID8gcGFyc2VJbnQocGFydHNbMV0sIDEwKSAqIDYwICogNjAgOiAwO1xuICAvLyBtaW51dGVzXG4gIHRpbWUgKz0gcGFyc2VJbnQocGFydHNbMl0sIDEwKSAqIDYwO1xuICAvLyBzZWNvbmRzXG4gIHRpbWUgKz0gcGFyc2VJbnQocGFydHNbM10sIDEwKTtcbiAgLy8gbWlsbGlzZWNvbmRzXG4gIHRpbWUgKz0gcGFydHNbNF0gPyBwYXJzZUZsb2F0KHBhcnRzWzRdKSA6IDA7XG4gIC8vIG5vIG5lZ2F0aXZlIHRpbWVcbiAgdGltZSA9IE1hdGgubWF4KHRpbWUsIDApO1xuICByZXR1cm4gdGltZTtcbn1cblxuLyoqXG4gKiBjb252ZXJ0IGEgdGltZXN0YW1wIHRvIGEgdGltZWNvZGUgaW4gJHtpbnNlcnQgUkZDIGhlcmV9IGZvcm1hdFxuICogQHBhcmFtIHtOdW1iZXJ9IHRpbWVcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gbGVhZGluZ1plcm9zXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtmb3JjZUhvdXJzXSBmb3JjZSBvdXRwdXQgb2YgaG91cnMsIGRlZmF1bHRzIHRvIGZhbHNlXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtzaG93TWlsbGlzXSBvdXRwdXQgbWlsbGlzZWNvbmRzIHNlcGFyYXRlZCB3aXRoIGEgZG90IGZyb20gdGhlIHNlY29uZHMgLSBkZWZhdWx0cyB0byBmYWxzZVxuICogQHJldHVybiB7c3RyaW5nfVxuICovXG5mdW5jdGlvbiB0czJ0Yyh0aW1lLCBsZWFkaW5nWmVyb3MsIGZvcmNlSG91cnMsIHNob3dNaWxsaXMpIHtcbiAgdmFyIGhvdXJzLCBtaW51dGVzLCBzZWNvbmRzLCBtaWxsaXNlY29uZHM7XG4gIHZhciB0aW1lY29kZSA9ICcnO1xuXG4gIGlmICh0aW1lID09PSAwKSB7XG4gICAgcmV0dXJuIChmb3JjZUhvdXJzID8gJzAwOjAwOjAwJyA6ICcwMDowMCcpO1xuICB9XG5cbiAgLy8gcHJldmVudCBuZWdhdGl2ZSB2YWx1ZXMgZnJvbSBwbGF5ZXJcbiAgaWYgKCF0aW1lIHx8IHRpbWUgPD0gMCkge1xuICAgIHJldHVybiAoZm9yY2VIb3VycyA/ICctLTotLTotLScgOiAnLS06LS0nKTtcbiAgfVxuXG4gIGhvdXJzID0gTWF0aC5mbG9vcih0aW1lIC8gNjAgLyA2MCk7XG4gIG1pbnV0ZXMgPSBNYXRoLmZsb29yKHRpbWUgLyA2MCkgJSA2MDtcbiAgc2Vjb25kcyA9IE1hdGguZmxvb3IodGltZSAlIDYwKSAlIDYwO1xuICBtaWxsaXNlY29uZHMgPSBNYXRoLmZsb29yKHRpbWUgJSAxICogMTAwMCk7XG5cbiAgaWYgKHNob3dNaWxsaXMgJiYgbWlsbGlzZWNvbmRzKSB7XG4gICAgdGltZWNvZGUgPSAnLicgKyB6ZXJvRmlsbChtaWxsaXNlY29uZHMsIDMpO1xuICB9XG5cbiAgdGltZWNvZGUgPSAnOicgKyB6ZXJvRmlsbChzZWNvbmRzLCAyKSArIHRpbWVjb2RlO1xuXG4gIGlmIChob3VycyA9PT0gMCAmJiAhZm9yY2VIb3VycyAmJiAhbGVhZGluZ1plcm9zICkge1xuICAgIHJldHVybiBtaW51dGVzLnRvU3RyaW5nKCkgKyB0aW1lY29kZTtcbiAgfVxuXG4gIHRpbWVjb2RlID0gemVyb0ZpbGwobWludXRlcywgMikgKyB0aW1lY29kZTtcblxuICBpZiAoaG91cnMgPT09IDAgJiYgIWZvcmNlSG91cnMpIHtcbiAgICAvLyByZXF1aXJlZCAobWludXRlcyA6IHNlY29uZHMpXG4gICAgcmV0dXJuIHRpbWVjb2RlO1xuICB9XG5cbiAgaWYgKGxlYWRpbmdaZXJvcykge1xuICAgIHJldHVybiB6ZXJvRmlsbChob3VycywgMikgKyAnOicgKyB0aW1lY29kZTtcbiAgfVxuXG4gIHJldHVybiBob3VycyArICc6JyArIHRpbWVjb2RlO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAvKipcbiAgICogY29udmVuaWVuY2UgbWV0aG9kIGZvciBjb252ZXJ0aW5nIHRpbWVzdGFtcHMgdG9cbiAgICogQHBhcmFtIHtOdW1iZXJ9IHRpbWVzdGFtcFxuICAgKiBAcmV0dXJucyB7U3RyaW5nfSB0aW1lY29kZVxuICAgKi9cbiAgZnJvbVRpbWVTdGFtcDogZnVuY3Rpb24gKHRpbWVzdGFtcCkge1xuICAgIHJldHVybiB0czJ0Yyh0aW1lc3RhbXAsIHRydWUsIHRydWUpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBhY2NlcHRzIGFycmF5IHdpdGggc3RhcnQgYW5kIGVuZCB0aW1lIGluIHNlY29uZHNcbiAgICogcmV0dXJucyB0aW1lY29kZSBpbiBkZWVwLWxpbmtpbmcgZm9ybWF0XG4gICAqIEBwYXJhbSB7QXJyYXl9IHRpbWVzXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gbGVhZGluZ1plcm9zXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gW2ZvcmNlSG91cnNdXG4gICAqIEByZXR1cm4ge3N0cmluZ31cbiAgICovXG4gIGdlbmVyYXRlOiBmdW5jdGlvbiAodGltZXMsIGxlYWRpbmdaZXJvcywgZm9yY2VIb3Vycykge1xuICAgIGlmICh0aW1lc1sxXSA+IDAgJiYgdGltZXNbMV0gPCA5OTk5OTk5ICYmIHRpbWVzWzBdIDwgdGltZXNbMV0pIHtcbiAgICAgIHJldHVybiB0czJ0Yyh0aW1lc1swXSwgbGVhZGluZ1plcm9zLCBmb3JjZUhvdXJzKSArICcsJyArIHRzMnRjKHRpbWVzWzFdLCBsZWFkaW5nWmVyb3MsIGZvcmNlSG91cnMpO1xuICAgIH1cbiAgICByZXR1cm4gdHMydGModGltZXNbMF0sIGxlYWRpbmdaZXJvcywgZm9yY2VIb3Vycyk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIHBhcnNlcyB0aW1lIGNvZGUgaW50byBzZWNvbmRzXG4gICAqIEBwYXJhbSB7U3RyaW5nfSB0aW1lY29kZVxuICAgKiBAcmV0dXJuIHtBcnJheX1cbiAgICovXG4gIHBhcnNlOiBmdW5jdGlvbiAodGltZWNvZGUpIHtcbiAgICBpZiAoIXRpbWVjb2RlKSB7XG4gICAgICByZXR1cm4gW2ZhbHNlLCBmYWxzZV07XG4gICAgfVxuXG4gICAgdmFyIHRpbWVwYXJ0cyA9IHRpbWVjb2RlLnNwbGl0KCctJyk7XG5cbiAgICBpZiAoIXRpbWVwYXJ0cy5sZW5ndGgpIHtcbiAgICAgIGNvbnNvbGUud2Fybignbm8gdGltZXBhcnRzOicsIHRpbWVjb2RlKTtcbiAgICAgIHJldHVybiBbZmFsc2UsIGZhbHNlXTtcbiAgICB9XG5cbiAgICB2YXIgc3RhcnRUaW1lID0gZXh0cmFjdFRpbWUodGltZXBhcnRzLnNoaWZ0KCkpO1xuICAgIHZhciBlbmRUaW1lID0gZXh0cmFjdFRpbWUodGltZXBhcnRzLnNoaWZ0KCkpO1xuXG4gICAgcmV0dXJuIChlbmRUaW1lID4gc3RhcnRUaW1lKSA/IFtzdGFydFRpbWUsIGVuZFRpbWVdIDogW3N0YXJ0VGltZSwgZmFsc2VdO1xuICB9LFxuXG4gIGdldFN0YXJ0VGltZUNvZGU6IGZ1bmN0aW9uIGdldFN0YXJ0VGltZWNvZGUoc3RhcnQpIHtcbiAgICAgIHJldHVybiB0aGlzLnBhcnNlKHN0YXJ0KVswXTtcbiAgfVxufTtcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJvTWZwQW5cIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi90aW1lY29kZS5qc1wiLFwiL1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbid1c2Ugc3RyaWN0JztcblxuLypcbiBbXG4ge3R5cGU6IFwiaW1hZ2VcIiwgXCJ0aXRsZVwiOiBcIlRoZSB2ZXJ5IGJlc3QgSW1hZ2VcIiwgXCJ1cmxcIjogXCJodHRwOi8vZG9tYWluLmNvbS9pbWFnZXMvdGVzdDEucG5nXCJ9LFxuIHt0eXBlOiBcInNob3dub3RlXCIsIFwidGV4dFwiOiBcIlBBUEFQQVBBUEFQQUdFTk9cIn0sXG4ge3R5cGU6IFwidG9waWNcIiwgc3RhcnQ6IDAsIGVuZDogMSwgcTp0cnVlLCB0aXRsZTogXCJUaGUgdmVyeSBmaXJzdCBjaGFwdGVyXCIgfSxcbiB7dHlwZTogXCJhdWRpb1wiLCBzdGFydDogMCwgZW5kOiAxLCBxOnRydWUsIGNsYXNzOiAnc3BlZWNoJ30sXG4ge3R5cGU6IFwiYXVkaW9cIiwgc3RhcnQ6IDEsIGVuZDogMiwgcTp0cnVlLCBjbGFzczogJ211c2ljJ30sXG4ge3R5cGU6IFwiYXVkaW9cIiwgc3RhcnQ6IDIsIGVuZDogMywgcTp0cnVlLCBjbGFzczogJ25vaXNlJ30sXG4ge3R5cGU6IFwiYXVkaW9cIiwgc3RhcnQ6IDQsIGVuZDogNSwgcTp0cnVlLCBjbGFzczogJ3NpbGVuY2UnfSxcbiB7dHlwZTogXCJjb250ZW50XCIsIHN0YXJ0OiAwLCBlbmQ6IDEsIHE6dHJ1ZSwgdGl0bGU6IFwiVGhlIHZlcnkgZmlyc3QgY2hhcHRlclwiLCBjbGFzczonYWR2ZXJ0aXNlbWVudCd9LFxuIHt0eXBlOiBcImxvY2F0aW9uXCIsIHN0YXJ0OiAwLCBlbmQ6IDEsIHE6ZmFsc2UsIHRpdGxlOiBcIkFyb3VuZCBCZXJsaW5cIiwgbGF0OjEyLjEyMywgbG9uOjUyLjIzNCwgZGlhbWV0ZXI6MTIzIH0sXG4ge3R5cGU6IFwiY2hhdFwiLCBxOmZhbHNlLCBzdGFydDogMC4xMiwgXCJkYXRhXCI6IFwiRVJTVEVSICYgSElUTEVSISEhXCJ9LFxuIHt0eXBlOiBcInNob3dub3RlXCIsIHN0YXJ0OiAwLjIzLCBcImRhdGFcIjogXCJKZW1hbmQgdmFkZXJ0XCJ9LFxuIHt0eXBlOiBcImltYWdlXCIsIFwibmFtZVwiOiBcIlRoZSB2ZXJ5IGJlc3QgSW1hZ2VcIiwgXCJ1cmxcIjogXCJodHRwOi8vZG9tYWluLmNvbS9pbWFnZXMvdGVzdDEucG5nXCJ9LFxuIHt0eXBlOiBcImxpbmtcIiwgXCJuYW1lXCI6IFwiQW4gaW50ZXJlc3RpbmcgbGlua1wiLCBcInVybFwiOiBcImh0dHA6Ly9cIn0sXG4ge3R5cGU6IFwidG9waWNcIiwgc3RhcnQ6IDEsIGVuZDogMiwgXCJuYW1lXCI6IFwiVGhlIHZlcnkgZmlyc3QgY2hhcHRlclwiLCBcInVybFwiOiBcIlwifSxcbiBdXG4gKi9cbnZhciBjYXAgPSByZXF1aXJlKCcuL3V0aWwnKS5jYXA7XG5cbmZ1bmN0aW9uIGNhbGwobGlzdGVuZXIpIHtcbiAgbGlzdGVuZXIodGhpcyk7XG59XG5cbmZ1bmN0aW9uIGZpbHRlckJ5VHlwZSh0eXBlKSB7XG4gIHJldHVybiBmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgcmV0dXJuIChyZWNvcmQudHlwZSA9PT0gdHlwZSk7XG4gIH07XG59XG5cbi8qKlxuICpcbiAqIEBwYXJhbSB7VGltZWxpbmV9IHRpbWVsaW5lXG4gKi9cbmZ1bmN0aW9uIGxvZ0N1cnJlbnRUaW1lKHRpbWVsaW5lKSB7XG4gIGNvbnNvbGUubG9nKCdUaW1lbGluZScsICdjdXJyZW50VGltZScsIHRpbWVsaW5lLmdldFRpbWUoKSk7XG59XG5cbi8qKlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBwYXJhbXNcbiAqIEByZXR1cm5zIHtib29sZWFufSB0cnVlIGlmIGF0IGxlYXN0IG9uZSBjaGFwdGVyIGlzIHByZXNlbnRcbiAqL1xuZnVuY3Rpb24gY2hlY2tGb3JDaGFwdGVycyhwYXJhbXMpIHtcbiAgcmV0dXJuICEhcGFyYW1zLmNoYXB0ZXJzICYmIChcbiAgICB0eXBlb2YgcGFyYW1zLmNoYXB0ZXJzID09PSAnb2JqZWN0JyAmJiBwYXJhbXMuY2hhcHRlcnMubGVuZ3RoID4gMVxuICAgICk7XG59XG5cbmZ1bmN0aW9uIHN0b3BPbkVuZFRpbWUoKSB7XG4gIGlmICh0aGlzLmN1cnJlbnRUaW1lID49IHRoaXMuZW5kVGltZSkge1xuICAgIGNvbnNvbGUubG9nKCdFTkRUSU1FIFJFQUNIRUQnKTtcbiAgICB0aGlzLnBsYXllci5zdG9wKCk7XG4gICAgZGVsZXRlIHRoaXMuZW5kVGltZTtcbiAgfVxufVxuXG4vKipcbiAqXG4gKiBAcGFyYW0ge0hUTUxNZWRpYUVsZW1lbnR9IHBsYXllclxuICogQHBhcmFtIHtvYmplY3R9IGRhdGFcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBUaW1lbGluZShwbGF5ZXIsIGRhdGEpIHtcbiAgdGhpcy5wbGF5ZXIgPSBwbGF5ZXI7XG4gIHRoaXMuaGFzQ2hhcHRlcnMgPSBjaGVja0ZvckNoYXB0ZXJzKGRhdGEpO1xuICB0aGlzLm1vZHVsZXMgPSBbXTtcbiAgdGhpcy5saXN0ZW5lcnMgPSBbbG9nQ3VycmVudFRpbWVdO1xuICB0aGlzLmN1cnJlbnRUaW1lID0gLTE7XG4gIHRoaXMuZHVyYXRpb24gPSBkYXRhLmR1cmF0aW9uO1xuICB0aGlzLmJ1ZmZlcmVkVGltZSA9IDA7XG4gIHRoaXMucmVzdW1lID0gcGxheWVyLnBhdXNlZDtcbiAgdGhpcy5zZWVraW5nID0gZmFsc2U7XG59XG5cblRpbWVsaW5lLnByb3RvdHlwZS5nZXREYXRhID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5kYXRhO1xufTtcblxuVGltZWxpbmUucHJvdG90eXBlLmdldERhdGFCeVR5cGUgPSBmdW5jdGlvbiAodHlwZSkge1xuICByZXR1cm4gdGhpcy5kYXRhLmZpbHRlcihmaWx0ZXJCeVR5cGUodHlwZSkpO1xufTtcblxuVGltZWxpbmUucHJvdG90eXBlLmFkZE1vZHVsZSA9IGZ1bmN0aW9uIChtb2R1bGUpIHtcbiAgaWYgKG1vZHVsZS51cGRhdGUpIHtcbiAgICB0aGlzLmxpc3RlbmVycy5wdXNoKG1vZHVsZS51cGRhdGUpO1xuICB9XG4gIGlmIChtb2R1bGUuZGF0YSkge1xuICAgIHRoaXMuZGF0YSA9IG1vZHVsZS5kYXRhO1xuICB9XG4gIHRoaXMubW9kdWxlcy5wdXNoKG1vZHVsZSk7XG59O1xuXG5UaW1lbGluZS5wcm90b3R5cGUucGxheVJhbmdlID0gZnVuY3Rpb24gKHJhbmdlKSB7XG4gIGlmICghcmFuZ2UgfHwgIXJhbmdlLmxlbmd0aCB8fCAhcmFuZ2Uuc2hpZnQpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaW1lbGluZS5wbGF5UmFuZ2UgY2FsbGVkIHdpdGhvdXQgYSByYW5nZScpO1xuICB9XG4gIHRoaXMuc2V0VGltZShyYW5nZS5zaGlmdCgpKTtcbiAgdGhpcy5zdG9wQXQocmFuZ2Uuc2hpZnQoKSk7XG59O1xuXG5UaW1lbGluZS5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gIGNvbnNvbGUubG9nKCdUaW1lbGluZScsICd1cGRhdGUnLCBldmVudCk7XG4gIHRoaXMuc2V0QnVmZmVyZWRUaW1lKGV2ZW50KTtcblxuICBpZiAoZXZlbnQgJiYgZXZlbnQudHlwZSA9PT0gJ3RpbWV1cGRhdGUnKSB7XG4gICAgdGhpcy5jdXJyZW50VGltZSA9IHRoaXMucGxheWVyLmN1cnJlbnRUaW1lO1xuICB9XG4gIHRoaXMubGlzdGVuZXJzLmZvckVhY2goY2FsbCwgdGhpcyk7XG59O1xuXG5UaW1lbGluZS5wcm90b3R5cGUuZW1pdEV2ZW50c0JldHdlZW4gPSBmdW5jdGlvbiAoc3RhcnQsIGVuZCkge1xuICB2YXIgZW1pdFN0YXJ0ZWQgPSBmYWxzZSxcbiAgICBlbWl0ID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICB2YXIgY3VzdG9tRXZlbnQgPSBuZXcgJC5FdmVudChldmVudC50eXBlLCBldmVudCk7XG4gICAgICAkKHRoaXMpLnRyaWdnZXIoY3VzdG9tRXZlbnQpO1xuICAgIH0uYmluZCh0aGlzKTtcbiAgdGhpcy5kYXRhLm1hcChmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICB2YXIgbGF0ZXIgPSAoZXZlbnQuc3RhcnQgPiBzdGFydCksXG4gICAgICBlYXJsaWVyID0gKGV2ZW50LmVuZCA8IHN0YXJ0KSxcbiAgICAgIGVuZGVkID0gKGV2ZW50LmVuZCA8IGVuZCk7XG5cbiAgICBpZiAobGF0ZXIgJiYgZWFybGllciAmJiAhZW5kZWQgfHwgZW1pdFN0YXJ0ZWQpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdUaW1lbGluZScsICdFbWl0JywgZXZlbnQpO1xuICAgICAgZW1pdChldmVudCk7XG4gICAgfVxuICAgIGVtaXRTdGFydGVkID0gbGF0ZXI7XG4gIH0pO1xufTtcblxuLyoqXG4gKiByZXR1cm5zIGlmIHRpbWUgaXMgYSB2YWxpZCB0aW1lc3RhbXAgaW4gY3VycmVudCB0aW1lbGluZVxuICogQHBhcmFtIHsqfSB0aW1lXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuVGltZWxpbmUucHJvdG90eXBlLmlzVmFsaWRUaW1lID0gZnVuY3Rpb24gKHRpbWUpIHtcbiAgcmV0dXJuICh0eXBlb2YgdGltZSA9PT0gJ251bWJlcicgJiYgIWlzTmFOKHRpbWUpICYmIHRpbWUgPj0gMCAmJiB0aW1lIDw9IHRoaXMuZHVyYXRpb24pO1xufTtcblxuVGltZWxpbmUucHJvdG90eXBlLnNldFRpbWUgPSBmdW5jdGlvbiAodGltZSkge1xuICBpZiAoIXRoaXMuaXNWYWxpZFRpbWUodGltZSkpIHtcbiAgICBjb25zb2xlLndhcm4oJ1RpbWVsaW5lJywgJ3NldFRpbWUnLCAndGltZSBvdXQgb2YgYm91bmRzJywgdGltZSk7XG4gICAgcmV0dXJuIHRoaXMuY3VycmVudFRpbWU7XG4gIH1cblxuICBjb25zb2xlLmxvZygnVGltZWxpbmUnLCAnc2V0VGltZScsICd0aW1lJywgdGltZSk7XG4gIHRoaXMuY3VycmVudFRpbWUgPSB0aW1lO1xuICB0aGlzLnVwZGF0ZSgpO1xuXG4gIGNvbnNvbGUubG9nKCdjYW5wbGF5JywgJ3NldFRpbWUnLCAncGxheWVyU3RhdGUnLCB0aGlzLnBsYXllci5yZWFkeVN0YXRlKTtcbiAgaWYgKHRoaXMucGxheWVyLnJlYWR5U3RhdGUgPT09IHRoaXMucGxheWVyLkhBVkVfRU5PVUdIX0RBVEEpIHtcbiAgICB0aGlzLnBsYXllci5zZXRDdXJyZW50VGltZSh0aW1lKTtcbiAgICByZXR1cm4gdGhpcy5jdXJyZW50VGltZTtcbiAgfVxuXG4gIC8vIFRPRE8gdmlzdWFsaXplIGJ1ZmZlciBzdGF0ZVxuICAvLyAkKGRvY3VtZW50KS5maW5kKCcucGxheScpLmNzcyh7Y29sb3I6J3JlZCd9KTtcbiAgJCh0aGlzLnBsYXllcikub25lKCdjYW5wbGF5JywgZnVuY3Rpb24gKCkge1xuICAgIC8vIFRPRE8gcmVtb3ZlIGJ1ZmZlciBzdGF0ZSB2aXN1YWxcbiAgICAvLyAkKGRvY3VtZW50KS5maW5kKCcucGxheScpLmNzcyh7Y29sb3I6J3doaXRlJ30pO1xuICAgIGNvbnNvbGUubG9nKCdQbGF5ZXInLCAnY2FucGxheScsICdidWZmZXJlZCcsIHRpbWUpO1xuICAgIHRoaXMuc2V0Q3VycmVudFRpbWUodGltZSk7XG4gIH0pO1xuXG4gIHJldHVybiB0aGlzLmN1cnJlbnRUaW1lO1xufTtcblxuVGltZWxpbmUucHJvdG90eXBlLnNlZWsgPSBmdW5jdGlvbiAodGltZSkge1xuICBjb25zb2xlLmRlYnVnKCdUaW1lbGluZScsICdzZWVrJywgdGltZSk7XG4gIHRoaXMuY3VycmVudFRpbWUgPSBjYXAodGltZSwgMCwgdGhpcy5kdXJhdGlvbik7XG4gIHRoaXMuc2V0VGltZSh0aGlzLmN1cnJlbnRUaW1lKTtcbn07XG5cblRpbWVsaW5lLnByb3RvdHlwZS5zdG9wQXQgPSBmdW5jdGlvbiAodGltZSkge1xuICBpZiAoIXRpbWUgfHwgdGltZSA8PSAwIHx8IHRpbWUgPiB0aGlzLmR1cmF0aW9uKSB7XG4gICAgcmV0dXJuIGNvbnNvbGUud2FybignVGltZWxpbmUnLCAnc3RvcEF0JywgJ3RpbWUgb3V0IG9mIGJvdW5kcycsIHRpbWUpO1xuICB9XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5lbmRUaW1lID0gdGltZTtcbiAgdGhpcy5saXN0ZW5lcnMucHVzaChmdW5jdGlvbiAoKSB7XG4gICAgc3RvcE9uRW5kVGltZS5jYWxsKHNlbGYpO1xuICB9KTtcbn07XG5cblRpbWVsaW5lLnByb3RvdHlwZS5nZXRUaW1lID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5jdXJyZW50VGltZTtcbn07XG5cblRpbWVsaW5lLnByb3RvdHlwZS5nZXRCdWZmZXJlZCA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKGlzTmFOKHRoaXMuYnVmZmVyZWRUaW1lKSkge1xuICAgIGNvbnNvbGUud2FybignVGltZWxpbmUnLCAnZ2V0QnVmZmVyZWQnLCAnYnVmZmVyZWRUaW1lIGlzIG5vdCBhIG51bWJlcicpO1xuICAgIHJldHVybiAwO1xuICB9XG4gIHJldHVybiB0aGlzLmJ1ZmZlcmVkVGltZTtcbn07XG5cblRpbWVsaW5lLnByb3RvdHlwZS5zZXRCdWZmZXJlZFRpbWUgPSBmdW5jdGlvbiAoZSkge1xuICB2YXIgdGFyZ2V0ID0gKGUgIT09IHVuZGVmaW5lZCkgPyBlLnRhcmdldCA6IHRoaXMucGxheWVyO1xuICB2YXIgYnVmZmVyZWQgPSAwO1xuXG4gIC8vIG5ld2VzdCBIVE1MNSBzcGVjIGhhcyBidWZmZXJlZCBhcnJheSAoRkY0LCBXZWJraXQpXG4gIGlmICh0YXJnZXQgJiYgdGFyZ2V0LmJ1ZmZlcmVkICYmIHRhcmdldC5idWZmZXJlZC5sZW5ndGggPiAwICYmIHRhcmdldC5idWZmZXJlZC5lbmQgJiYgdGFyZ2V0LmR1cmF0aW9uKSB7XG4gICAgYnVmZmVyZWQgPSB0YXJnZXQuYnVmZmVyZWQuZW5kKHRhcmdldC5idWZmZXJlZC5sZW5ndGggLSAxKTtcbiAgfVxuICAvLyBTb21lIGJyb3dzZXJzIChlLmcuLCBGRjMuNiBhbmQgU2FmYXJpIDUpIGNhbm5vdCBjYWxjdWxhdGUgdGFyZ2V0LmJ1ZmZlcmVyZWQuZW5kKClcbiAgLy8gdG8gYmUgYW55dGhpbmcgb3RoZXIgdGhhbiAwLiBJZiB0aGUgYnl0ZSBjb3VudCBpcyBhdmFpbGFibGUgd2UgdXNlIHRoaXMgaW5zdGVhZC5cbiAgLy8gQnJvd3NlcnMgdGhhdCBzdXBwb3J0IHRoZSBlbHNlIGlmIGRvIG5vdCBzZWVtIHRvIGhhdmUgdGhlIGJ1ZmZlcmVkQnl0ZXMgdmFsdWUgYW5kXG4gIC8vIHNob3VsZCBza2lwIHRvIHRoZXJlLiBUZXN0ZWQgaW4gU2FmYXJpIDUsIFdlYmtpdCBoZWFkLCBGRjMuNiwgQ2hyb21lIDYsIElFIDcvOC5cbiAgZWxzZSBpZiAodGFyZ2V0ICYmIHRhcmdldC5ieXRlc1RvdGFsICE9PSB1bmRlZmluZWQgJiYgdGFyZ2V0LmJ5dGVzVG90YWwgPiAwICYmIHRhcmdldC5idWZmZXJlZEJ5dGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICBidWZmZXJlZCA9IHRhcmdldC5idWZmZXJlZEJ5dGVzIC8gdGFyZ2V0LmJ5dGVzVG90YWwgKiB0YXJnZXQuZHVyYXRpb247XG4gIH1cbiAgLy8gRmlyZWZveCAzIHdpdGggYW4gT2dnIGZpbGUgc2VlbXMgdG8gZ28gdGhpcyB3YXlcbiAgZWxzZSBpZiAoZSAmJiBlLmxlbmd0aENvbXB1dGFibGUgJiYgZS50b3RhbCAhPT0gMCkge1xuICAgIGJ1ZmZlcmVkID0gZS5sb2FkZWQgLyBlLnRvdGFsICogdGFyZ2V0LmR1cmF0aW9uO1xuICB9XG4gIHZhciBjYXBwZWRUaW1lID0gY2FwKGJ1ZmZlcmVkLCAwLCB0YXJnZXQuZHVyYXRpb24pO1xuICBjb25zb2xlLmxvZygnVGltZWxpbmUnLCAnc2V0QnVmZmVyZWRUaW1lJywgY2FwcGVkVGltZSk7XG4gIHRoaXMuYnVmZmVyZWRUaW1lID0gY2FwcGVkVGltZTtcbn07XG5cblRpbWVsaW5lLnByb3RvdHlwZS5yZXdpbmQgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuc2V0VGltZSgwKTtcbiAgdmFyIGNhbGxMaXN0ZW5lcldpdGhUaGlzID0gZnVuY3Rpb24gX2NhbGxMaXN0ZW5lcldpdGhUaGlzKGksIGxpc3RlbmVyKSB7XG4gICAgbGlzdGVuZXIodGhpcyk7XG4gIH0uYmluZCh0aGlzKTtcbiAgJC5lYWNoKHRoaXMubGlzdGVuZXJzLCBjYWxsTGlzdGVuZXJXaXRoVGhpcyk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRpbWVsaW5lO1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIm9NZnBBblwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiL3RpbWVsaW5lLmpzXCIsXCIvXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgdGMgPSByZXF1aXJlKCcuL3RpbWVjb2RlJyk7XG5cbi8qXG4gIFwidD0xXCJcdFsoXCJ0XCIsIFwiMVwiKV1cdHNpbXBsZSBjYXNlXG4gIFwidD0xJnQ9MlwiXHRbKFwidFwiLCBcIjFcIiksIChcInRcIiwgXCIyXCIpXVx0cmVwZWF0ZWQgbmFtZVxuICBcImE9Yj1jXCJcdFsoXCJhXCIsIFwiYj1jXCIpXVx0XCI9XCIgaW4gdmFsdWVcbiAgXCJhJmI9Y1wiXHRbKFwiYVwiLCBcIlwiKSwgKFwiYlwiLCBcImNcIildXHRtaXNzaW5nIHZhbHVlXG4gIFwiJTc0PSU2ZXB0JTNBJTMxMFwiXHRbKFwidFwiLCBcIm5wdDoxMFwiKV1cdHVubmVjc3NhcnkgcGVyY2VudC1lbmNvZGluZ1xuICBcImlkPSV4eSZ0PTFcIlx0WyhcInRcIiwgXCIxXCIpXVx0aW52YWxpZCBwZXJjZW50LWVuY29kaW5nXG4gIFwiaWQ9JUU0ciZ0PTFcIlx0WyhcInRcIiwgXCIxXCIpXVx0aW52YWxpZCBVVEYtOFxuICovXG5cbi8qKlxuICogZ2V0IHRoZSB2YWx1ZSBvZiBhIHNwZWNpZmljIFVSTCBoYXNoIGZyYWdtZW50XG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5IG5hbWUgb2YgdGhlIGZyYWdtZW50XG4gKiBAcmV0dXJucyB7c3RyaW5nfGJvb2xlYW59IHZhbHVlIG9mIHRoZSBmcmFnbWVudCBvciBmYWxzZSB3aGVuIG5vdCBmb3VuZCBpbiBVUkxcbiAqL1xuZnVuY3Rpb24gZ2V0RnJhZ21lbnQoa2V5KSB7XG4gIHZhciBxdWVyeSA9IHdpbmRvdy5sb2NhdGlvbi5oYXNoLnN1YnN0cmluZygxKSxcbiAgICBwYWlycyA9IHF1ZXJ5LnNwbGl0KCcmJyk7XG5cbiAgaWYgKHF1ZXJ5LmluZGV4T2Yoa2V5KSA9PT0gLTEpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBmb3IgKHZhciBpID0gMCwgbCA9IHBhaXJzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIHZhciBwYWlyID0gcGFpcnNbaV0uc3BsaXQoJz0nKTtcbiAgICBpZiAocGFpclswXSAhPT0ga2V5KSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYgKHBhaXIubGVuZ3RoID09PSAxKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChwYWlyWzFdKTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogVVJMIGhhbmRsaW5nIGhlbHBlcnNcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGdldEZyYWdtZW50OiBnZXRGcmFnbWVudCxcbiAgY2hlY2tDdXJyZW50OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHQgPSBnZXRGcmFnbWVudCgndCcpO1xuICAgIHJldHVybiB0Yy5wYXJzZSh0KTtcbiAgfVxufTtcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJvTWZwQW5cIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi91cmwuanNcIixcIi9cIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICogcmV0dXJuIG5ldyB2YWx1ZSBpbiBib3VuZHMgb2YgbWluIGFuZCBtYXhcbiAqIEBwYXJhbSB7bnVtYmVyfSB2YWwgYW55IG51bWJlclxuICogQHBhcmFtIHtudW1iZXJ9IG1pbiBsb3dlciBib3VuZGFyeSBmb3IgdmFsXG4gKiBAcGFyYW0ge251bWJlcn0gbWF4IHVwcGVyIGJvdW5kYXJ5IGZvciB2YWxcbiAqIEByZXR1cm5zIHtudW1iZXJ9IHJlc3VsdGluZyB2YWx1ZVxuICovXG5mdW5jdGlvbiBjYXAodmFsLCBtaW4sIG1heCkge1xuICAvLyBjYXAgeCB2YWx1ZXNcbiAgdmFsID0gTWF0aC5tYXgodmFsLCBtaW4pO1xuICB2YWwgPSBNYXRoLm1pbih2YWwsIG1heCk7XG4gIHJldHVybiB2YWw7XG59XG5cbi8qKlxuICogcmV0dXJuIG51bWJlciBhcyBzdHJpbmcgbGVmdGhhbmQgZmlsbGVkIHdpdGggemVyb3NcbiAqIEBwYXJhbSB7bnVtYmVyfSBudW1iZXIgKGludGVnZXIpIHZhbHVlIHRvIGJlIHBhZGRlZFxuICogQHBhcmFtIHtudW1iZXJ9IHdpZHRoIGxlbmd0aCBvZiB0aGUgc3RyaW5nIHRoYXQgaXMgcmV0dXJuZWRcbiAqIEByZXR1cm5zIHtzdHJpbmd9IHBhZGRlZCBudW1iZXJcbiAqL1xuZnVuY3Rpb24gemVyb0ZpbGwgKG51bWJlciwgd2lkdGgpIHtcbiAgdmFyIHMgPSBudW1iZXIudG9TdHJpbmcoKTtcbiAgd2hpbGUgKHMubGVuZ3RoIDwgd2lkdGgpIHtcbiAgICBzID0gJzAnICsgcztcbiAgfVxuICByZXR1cm4gcztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGNhcDogY2FwLFxuICB6ZXJvRmlsbDogemVyb0ZpbGxcbn07XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwib01mcEFuXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvdXRpbC5qc1wiLFwiL1wiKSJdfQ==
