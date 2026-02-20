const users = {}

// Common function for sending a response
const respond = (request, response, status, object) => {
    console.log(object);
    const jsonString = JSON.stringify(object);

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

const getUsers = (request, response) => {
    const usersJSON = JSON.stringify(users);

    return respond(request, response, 200, usersJSON);
}

const addUser = (request, response) => {
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
    getUsers,
    addUser,
    notFound
}