var MAIN_URL = 'https://play.spotify.com/*';
var ALBUMS_URL = 'https://play.spotify.com/collection/albums';
var APP_PLAYER = 'document.getElementById("app-player").contentDocument';

document.addEventListener('DOMContentLoaded', function() {

	updateTrackInfo();

	// Add events to buttons;
  	document.getElementById('open').addEventListener('click', function() {
  		getCurrentTab(function(tabs) {
  			// Create a spotify tab if one doesn't yet exists.
		    if (tabs.length === 0) {
		      	chrome.tabs.create({url: ALBUMS_URL});
		    }
		    else{
		    	chrome.tabs.update(tabs[0].id, {highlighted: true});
		    }
  		});
  	}, false);

  	document.getElementById('play-pause').addEventListener('click', function() {
  		execute('play-pause');
  	}, false);

  	document.getElementById('previous').addEventListener('click', function() {
  		execute('previous');
  	}, false);

  	document.getElementById('next').addEventListener('click', function() {
  		execute('next');
  	}, false);

}, false);

function filterSpotifyTab(tabs) {
	var spotifyTab = {};

	tabs.forEach(function (tab) {
		if (tab.audible) {
			spotifyTab = tab;

			return;
		}
	});

	return spotifyTab;
}

function execute(action){
	getCurrentTab(function(tabs){

	    // Create a spotify tab if there's any.
	    if (tabs.length === 0) {
	    	chrome.tabs.create({url: ALBUMS_URL});
	    } else {
		    // Apply action on all spotify tabs.
		    // get iframe 'app-player' and then find the right action button;
		    for (var tab of tabs) {
		      chrome.tabs.executeScript(tab.id, {
		      	code: "document.getElementById('app-player').contentDocument.getElementById('" + action + "').click()"
		      });
		    }

		    //Update current trackname;
		    setTimeout(function(){
		    	updateTrackInfo();
		    },2000);
	    }
	});
}

function fetchAlbumArt(tab, callback) {
	chrome.tabs.executeScript(tab, {
		code: APP_PLAYER + '.getElementById("cover-art").querySelector(".sp-image-img").style.backgroundImage;'
	},
	function(response) {
		var albumArt = response[0].replace('url(','').replace(')','');

		callback(albumArt);
	});
}

function fetchTrackName(tab, callback) {
	chrome.tabs.executeScript(tab, {
		code: APP_PLAYER + '.getElementById("track-name").getElementsByTagName("a")[0].innerHTML;'
	}, callback);
}

function fetchTrackArtist(tab, callback) {
	chrome.tabs.executeScript(tab, {
		code: APP_PLAYER + '.getElementById("track-artist").getElementsByTagName("a")[0].innerHTML;'
	}, callback);
}

function fetchClassNamesById(tab, id, callback) {
	chrome.tabs.executeScript(tab, {
		code: APP_PLAYER + '.getElementById("' + id + '").className;'
	}, function (response) {
		var classNamesList = String(response).split(" ");
		var classNamesObject = {};

		classNamesList.forEach(function (className) {
			classNamesObject[className] = true;
		});

		callback(classNamesObject);
	});
}

function fetchControlState(tab, control, callback) {
	fetchClassNamesById(tab, control, function (response) {
		var state = "active";

		if (response.disabled) {
			state = "disabled";
		}

		callback(control, state);
	});
}

function fetchPreviousControlState(tab, callback) {
	fetchClassNamesById(tab, "previous", function (response) {
		var state = "active";

		if (response.disabled) {
			state = "disabled";
		}

		return state;
	});
}

function fetchNextControlState(tab, callback) {
	chrome.tabs.executeScript(tab, {
		code: APP_PLAYER + '.getElementById("next").className;'
	}, callback);
}

function fetchPlayPauseState(tab, callback) {
	fetchClassNamesById(tab, "play-pause", function (classNames) {
		var state = "paused";

		if (classNames.playing) {
			state = "playing";
		} else if (classNames.disabled) {
			state = "disabled"
		}

		callback(state);
	});
}

function renderAlbumArt(albumArtURL) {
	document.querySelector('#album-art').innerHTML = '<img src=' + albumArtURL + ' style="width:200px; height:200px;">';
}

function renderTrackName(name) {
	document.querySelector('#current-track-name').innerHTML = name;
}

function renderTrackArtist(artist) {
	document.querySelector('#current-track-artist').innerHTML = artist;
}

function renderControlState(control, state) {
	var controlClassName = "controller__skip-back";

	if (state === "disabled") {
		controlClassName += " disabled";
	}

	document.getElementById(control).className  = controlClassName;
}

function renderPlayPauseState(state) {
	var playPauseState = '';

	switch (state) {
		case "playing":
			playPauseState = '<span class="glyphicon glyphicon glyphicon-pause"></span>';
			document.getElementById("play-pause").removeAttribute("disabled", true );
			break;
		case "paused":
			playPauseState = '<span class="glyphicon glyphicon glyphicon-play"></span>';
			document.getElementById("play-pause").removeAttribute("disabled", true );
			break;
		case "disabled":
			playPauseState = '<span class="glyphicon glyphicon glyphicon-play"></span>';
			document.getElementById("play-pause").setAttribute("disabled", true );
	}

	document.querySelector('#play-pause').innerHTML = playPauseState;
}
/**
 * Show current trackname if there's one;
 */
function updateTrackInfo(){
	getCurrentTab(function(tabs) {

		if (tabs.length === 0) {
	    document.querySelector('#album-art').innerHTML = "";
	  } else {
			for (var tab of tabs) {
				fetchAlbumArt(tab.id, function (response) {
					renderAlbumArt(response);
				});

				fetchTrackName(tab.id, function (response) {
					if (response) {
						renderTrackName(response);
					}
				});

				fetchTrackArtist(tab.id, function (response) {
					if (response) {
						renderTrackArtist(response);
					}
				});

				fetchControlState(tab.id, "previous", renderControlState);
				fetchControlState(tab.id, "next", renderControlState);

				fetchPlayPauseState(tab.id, renderPlayPauseState);
		  }
		}
	});
}

/**
 * Look for tabs with url like MAIN_URL;
 */
function getCurrentTab(successFunction){
	chrome.tabs.query({url: MAIN_URL}, successFunction);
}
