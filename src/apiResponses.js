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
        let name = trackData.tracks[i].name;

        // Get all artists
        const artistsOBJ = [];

        for (let j = 0; j < trackData.tracks[i].relationships.artists.length; j++) {
            let artistDirName = trackData.tracks[i].relationships.artists[j].who;

            // Find artist directory
            let artistData = trackData.artists.find(a => a.directory === artistDirName);

            artistsOBJ.push({
                artistName: artistData.name
            })
        }

        // Get album
        let albumDirName = trackData.tracks[i].relationships.album;
        let albumData = trackData.albums.find(a => a.directory === albumDirName);
        let album = albumData.name;

        // Get track art
        // If track doesn't have unique art, use the album art
        let trackArt;
        if (trackData.tracks[i].children.artworks[0]) {
            trackArt = trackData.tracks[i].children.artworks[0].url;
        }
        else {
            trackArt = albumData.children.artworks[0].url;
        }

        responseJSON.tracks.push({
            name: name,
            artists: artistsOBJ,
            album: album,
            trackArt: trackArt
        });
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

const rateTrack = (request, response) => {
    // Default to success message
    const responseJSON = {
        message: 'Created successfully'
    };

    // get name and body from request
    const { name, age } = request.body;

    // check for both fields, send appropriate response if missing
    if (!name || !age) {
        responseJSON.message = 'Name and age are both required.';
        responseJSON.id = 'missingParams';

        return respond(request, response, 400, responseJSON);
    }

    let code = 204;

    // Check for existing name
    if (!users[name]) {
        // If name doesnt exist, create user and update code
        users[name] = {
            name: name
        }

        code = 201;
    }

    users[name].age = age;

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

module.exports = {
    getAllTracks,
    getAllArtists,
    rateTrack,
    notFound
}