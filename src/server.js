const http = require('http');
const clientHandler = require('./clientResponses.js');
const apiHandler = require('./apiResponses.js');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

const urlStruct = {
    '/': clientHandler.getIndex,
    '/style.css': clientHandler.getStyle,
    '/getUsers': apiHandler.getUsers,
    '/addUser': apiHandler.addUser,
    'notFound': apiHandler.notFound
};


const onRequest = (request, response) => {
    console.log(request.url);

    // URL parsing
    const protocol = request.connection.encrypted ? 'https' : 'http';
    const parsedUrl = new URL(request.url, `${protocol}://${request.headers.host}`);

    request.acceptedTypes = request.headers.accept.split(',');

    // store query parameters
    request.query = Object.fromEntries(parsedUrl.searchParams);

    let body = [];
    request.on('data', (chunk) => {
        body.push(chunk);
    });

    request.on('end', () => {

        // Update request.body only if body data was recieved
        if (body.length !== 0) {

            const bodyString = Buffer.concat(body).toString();
            console.log(bodyString);
            request.body = JSON.parse(bodyString);
        }

        if (urlStruct[parsedUrl.pathname]) {
            urlStruct[parsedUrl.pathname](request, response);
        } else {
            urlStruct.notFound(request, response);
        }
    })
}

http.createServer(onRequest).listen(port, () => {
    console.log(`Listening on 127.0.0.1:${port}`);
});

