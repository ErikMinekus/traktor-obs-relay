const API_ROOT = "http://"+window.location.hostname+":8080/";
const NOW_PLAYING_API = "nowPlaying";
const ART_API = "artwork/";
const SUB_API = "subtitles/";
const VID_API = "video/";
const FILENAME_API = "filename/";
const CHECK_INTERVAL = 2000;

function query() {
    return new Promise((resolve, reject) => {
        let xhr = new XMLHttpRequest();
        xhr.open("GET", API_ROOT+NOW_PLAYING_API);
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(JSON.parse(xhr.response));
            } else {
                reject(xhr.statusText);
            }
        };
        xhr.onerror = () => reject(xhr.statusText);
        xhr.send();
    });
}

function getArtUrl(meta) {
    if(meta.deck) {
        return API_ROOT+ART_API+meta.deck+"?nocache="+Date.now();
    }
    return "";
}

function getSubtitleUrl(meta) {
    if(meta.deck) {
        return API_ROOT+SUB_API+meta.deck+"?nocache="+Date.now();
    }
    return "";
}

function getVideoUrl(meta) {
    if(meta.deck) {
        return API_ROOT+VID_API+meta.deck+"?nocache="+Date.now();
    }
    return "";
}

function getFilename(meta) {
    if(meta.deck) {
        return API_ROOT+FILENAME_API+meta.deck+"?nocache="+Date.now();
    }
    return "";
}

var tracks = {};
var decks = {};
var oldBpm = 0;
function processUpdates(info) {
    if(!info) return;
    if(info.songsOnAir) {
        let newTracks = Object.fromEntries( info.songsOnAir.filter(x => x.isPlaying == true).map(x => [x.filePath, x]) );
        let newDecks = Object.fromEntries( info.songsOnAir.map(x => [x.deck, x]) );

        let newPaths = Object.keys(newTracks);
        let oldPaths = Object.keys(tracks);

        let newDecksId = Object.keys(newDecks);
        let oldDecksId = Object.keys(decks);

        if(typeof popTrack == "function") {
            let goneTracks = oldPaths.filter(path => newPaths.indexOf(path) == -1).map(x => tracks[x]);
            goneTracks.forEach(element => popTrack(element));
        }

        if(typeof popDeck == "function") {
            let goneDecks = oldDecksId.filter(deck => newDecksId.indexOf(deck) == -1).map(x => decks[x]);
            goneDecks.forEach(element => popDeck(element));
        }

        if(typeof pushTrack == "function") {
            let addedTracks = newPaths.filter(path => oldPaths.indexOf(path) == -1).map(x => newTracks[x]);
            addedTracks.forEach(element => pushTrack(element));
        }

        if(typeof pushDeck == "function") {
            let addedDecks = newPaths.filter(deck => oldDecksId.indexOf(deck) == -1).map(x => newDecks[x]);
            addedDecks.forEach(element => pushDeck(element));
        }

        if(typeof trackTick == "function" && info.tickedDeck) {
            let progressedTrack = info.songsOnAir.find(x => x.deck == info.tickedDeck);
            if(progressedTrack) {
                trackTick(progressedTrack);
            }
        }

        if(typeof trackPaused == "function") {
            let pausedTracks = info.songsOnAir.filter(x => x.isPlaying == false);
            pausedTracks.forEach(element => trackPaused(element));
        }

        tracks = newTracks;
        decks = newDecks;
    }

    if(info.bpm && info.bpm != oldBpm) {
        if(typeof onBpmChanged == "function") {
            onBpmChanged(info.bpm);
        }
        oldBpm = info.bpm;
    }
}

function watchLoop() {
    query()
        .then((info) => {
            processUpdates(info);
        })
        .finally(() => {
            if(!window.hasWsPush) {
                setTimeout(watchLoop, CHECK_INTERVAL);
            }
            else {
                console.log("Websocket enabled, not rescheduling timer");
            }
        })
}

window.onload = watchLoop;