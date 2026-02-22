const fs = require('fs');

let ostData = {};

fs.readFile(`${__dirname}/ostData.json`, (err, data) => {

    if (err) {
        console.log("Couldn't load json!");
        throw err;
    }

    ostData = JSON.parse(data);
});

// Common function for sending a response
const respond = (request, response, status, object) => {
    var jsonString = JSON.stringify(object);
    console.log(jsonString);
    //const fixedString = jsonString.replace("'", "\"");

    response.writeHead(status, {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(jsonString, 'utf8'),
    });

    // Dont send response body on HEAD requests or 204 codes
    if (request.method !== 'HEAD' && status !== 204) {
        response.write(jsonString);
    }
    response.end();
}

const getAllTracks = (request, response) => {
    const responseJSON = {
        id: "allTracks", // Each response type gets its own ID
        tracks: []
    };

    for (let i = 0; i < ostData.tracks.length; i++) {

        responseJSON.tracks.push(buildTrackOBJ(ostData.tracks[i]));
    }

    return respond(request, response, 200, responseJSON);
}

const getAllArtists = (request, response) => {
    const responseJSON = {
        id: "allArtists", // Each response type gets its own ID
        artists: []
    };

    for (let i = 0; i < ostData.artists.length; i++) {
        const artistOBJ = {
            artistName: ostData.artists[i].name
        };

        // Check for rating
        if (ostData.artists[i].rating) {
            artistOBJ.rating = ostData.artists[i].rating;
        }

        responseJSON.artists.push(artistOBJ);
    }

    return respond(request, response, 200, responseJSON);
}

const getAllAlbums = (request, response) => {
    const responseJSON = {
        id: "allAlbums",
        albums: []
    };

    for (let i = 0; i < ostData.albums.length; i++) {
        responseJSON.albums.push({
            albumName: ostData.albums[i].name,
            albumArt: ostData.albums[i].children.artworks[0].url,
            tracks: ostData.albums[i].children.trackSections[0].relationships.tracks
            // TODO: Currently tracks holds directory names, not the actual track names. Also does not support bonus tracks.
            // Build the track array seperately to use actual names + bonus tracks
        })
    }

    return respond(request, response, 200, responseJSON);
}

const getTrack = (request, response) => {
    let responseJSON = {
        id: 'getTrack'
    }

    let requestedTrack = request.query.searchParam;

    let thisTrackData = ostData.tracks.find(n => n.name === requestedTrack);

    // Send error if track not found
    if (!thisTrackData) {
        responseJSON.message = 'Track not found';
        responseJSON.errorId = 'trackNotFound';

        return respond(request, response, 404, responseJSON);
    }

    responseJSON.track = buildTrackOBJ(thisTrackData);

    return respond(request, response, 200, responseJSON);
}

const getAllByArtist = (request, response) => {
    let responseJSON = {
        id: 'getAllByArtist',
        tracks: []
    }

    let requestedArtist = request.query.searchParam;

    // Find artist directory
    let artistData = ostData.artists.find(n => n.name === requestedArtist);

    // Send error if artist not found
    if (!artistData) {
        responseJSON.message = 'Artist not found';
        responseJSON.errorId = 'artistNotFound';

        return respond(request, response, 404, responseJSON);
    }

    // Get directory name
    let artistDir = artistData.directory;

    // Search through all tracks, adding ones with the correct artist to the response
    for (let i = 0; i < ostData.tracks.length; i++) {
        if (ostData.tracks[i].relationships.artists.find(d => d.who === artistDir)) {
            responseJSON.tracks.push(buildTrackOBJ(ostData.tracks[i]));
        }
    }

    return respond(request, response, 200, responseJSON);
}

const rateTrack = (request, response) => {
    const responseJSON = {
        id: 'rateTrack'
    };

    // get name and body from request
    const { name, rating } = request.body;

    // check for both fields, send appropriate response if missing
    if (!name || !rating) {
        responseJSON.message = 'Name and rating are both required.';
        responseJSON.errorId = 'missingParams';

        return respond(request, response, 400, responseJSON);
    }

    let code = 204;

    let trackFound = false;
    // Find index of track and give it a rating
    for (let i = 0; i < ostData.tracks.length; i++) {
        if (name === ostData.tracks[i].name) {
            ostData.tracks[i].rating = rating;
            trackFound = true;
            break;
        }
    }

    // If track wasnt found, send error
    if (!trackFound) {
        responseJSON.message = 'Track not found';
        responseJSON.errorId = 'trackNotFound';

        return respond(request, response, 404, responseJSON);
    }

    // Send response based on code
    if (code == 201) return respond(request, response, code, responseJSON);
    else return respond(request, response, code, {}); // 204 has no response body
}

const rateArtist = (request, response) => {
    const responseJSON = {
        id: 'rateArtist'
    };

    // get name and body from request
    const { name, rating } = request.body;

    // check for both fields, send appropriate response if missing
    if (!name || !rating) {
        responseJSON.message = 'Name and rating are both required.';
        responseJSON.errorId = 'missingParams';

        return respond(request, response, 400, responseJSON);
    }

    let code = 204;

    let artistFound = false;
    // Find index of track and give it a rating
    for (let i = 0; i < ostData.artists.length; i++) {
        if (name === ostData.artists[i].name) {
            ostData.artists[i].rating = rating;
            artistFound = true;
            break;
        }
    }

    // If track wasnt found, send error
    if (!artistFound) {
        responseJSON.message = 'Artist not found';
        responseJSON.errorId = 'artistNotFound';

        return respond(request, response, 404, responseJSON);
    }

    // Send response based on code
    if (code == 201) return respond(request, response, code, responseJSON);
    else return respond(request, response, code, {}); // 204 has no response body
}

const notFound = (request, response) => {
    const notFoundJSON = {
        message: 'The page you are looking for was not found.',
        id: 'notFound'
    }

    return respond(request, response, 404, notFoundJSON);
}

// Builds a json object for a single track
const buildTrackOBJ = (thisTrackData) => {
    let name = thisTrackData.name;

    // Get all artists
    const artistsOBJ = [];

    for (let j = 0; j < thisTrackData.relationships.artists.length; j++) {
        let artistDirName = thisTrackData.relationships.artists[j].who;

        // Find artist directory
        let artistData = ostData.artists.find(a => a.directory === artistDirName);

        artistsOBJ.push({
            artistName: artistData.name
        })
    }

    // Get album
    let albumDirName = thisTrackData.relationships.album;
    let albumData = ostData.albums.find(a => a.directory === albumDirName);
    let album = albumData.name;

    // Get track art
    // If track doesn't have unique art, use the album art
    let trackArt;
    if (thisTrackData.children.artworks[0]) {
        trackArt = thisTrackData.children.artworks[0].url;
    }
    else {
        trackArt = albumData.children.artworks[0].url;
    }

    // Get URLs for the song
    let urls = thisTrackData.urls;

    let trackOBJ = {
        name: name,
        artists: artistsOBJ,
        album: album,
        trackArt: trackArt,
        urls: urls
    }

    // Check for rating and add if applicable
    if (thisTrackData.rating) {
        trackOBJ.rating = thisTrackData.rating;
    }

    return trackOBJ;
}

module.exports = {
    getAllTracks,
    getAllArtists,
    getAllAlbums,
    getTrack,
    getAllByArtist,
    rateTrack,
    rateArtist,
    notFound
}