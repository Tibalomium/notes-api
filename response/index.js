function sendResponse(code, response){
    return{
        statusCode: code,
        headers: {
            "Content-Type": "applicaiton/json"
        },
        body: JSON.stringify(response),

    };
}

module.exports = {sendResponse}
