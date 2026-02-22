const fs = require('fs');

let trackData = {};

fs.readFile(`${__dirname}/trackData.json`, (err, data) => {

    if (err) {
        console.log("Couldn't load json!");
        throw err;
    }

    trackData = JSON.parse(data);
});

const users = {};

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

    for (let i = 0; i < trackData.tracks.length; i++) {

        responseJSON.tracks.push(buildTrackOBJ(trackData.tracks[i]));
    }

    return respond(request, response, 200, responseJSON);
}

const getAllArtists = (request, response) => {
    const responseJSON = {
        id: "allArtists", // Each response type gets its own ID
        artists: []
    };

    for (let i = 0; i < trackData.artists.length; i++) {
        responseJSON.artists.push({
            artistName: trackData.artists[i].name
        })
    }

    return respond(request, response, 200, responseJSON);
}

const getAllAlbums = (request, response) => {
    const responseJSON = {
        id: "allAlbums",
        albums: []
    };

    for (let i = 0; i < trackData.albums.length; i++) {
        responseJSON.albums.push({
            albumName: trackData.albums[i].name,
            albumArt: trackData.albums[i].children.artworks[0].url,
            tracks: trackData.albums[i].children.trackSections[0].relationships.tracks
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

    let requestedTrack = request.query.trackName;

    let thisTrackData = trackData.tracks.find(n => n.name === requestedTrack);

    // Send error if track not found
    if (!thisTrackData){
        responseJSON.message = 'Track not found';
        responseJSON.errorId = 'trackNotFound';

        return respond(request, response, 404, responseJSON);
    }

        responseJSON.track = buildTrackOBJ(thisTrackData);

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
    for (let i = 0; i < trackData.tracks.length; i++) {
        if (name === trackData.tracks[i].name) {
            trackData.tracks[i].rating = rating;
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

const notFound = (request, response) => {
    const notFoundJSON = {
        message: 'The page you are looking for was not found.',
        id: 'notFound'
    }

    return respond(request, response, 404, notFoundJSON);
}

// Builds a json object for a single track
const buildTrackOBJ = (thisTrackData) => {
     // Get data for this track
    let name = thisTrackData.name;

        // Get all artists
        const artistsOBJ = [];

        for (let j = 0; j < thisTrackData.relationships.artists.length; j++) {
            let artistDirName = thisTrackData.relationships.artists[j].who;

            // Find artist directory
            let artistData = trackData.artists.find(a => a.directory === artistDirName);

            artistsOBJ.push({
                artistName: artistData.name
            })
        }

        // Get album
        let albumDirName = thisTrackData.relationships.album;
        let albumData = trackData.albums.find(a => a.directory === albumDirName);
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

        let trackOBJ = {
            name: name,
            artists: artistsOBJ,
            album: album,
            trackArt: trackArt
        }

        // Check for rating and add if applicable
        if (thisTrackData.rating){
            trackOBJ.rating = thisTrackData.rating;
        }

        return trackOBJ;
}

module.exports = {
    getAllTracks,
    getAllArtists,
    getAllAlbums,
    getTrack,
    rateTrack,
    notFound
}