const AWS = require('aws-sdk');
const { sendResponse } = require('../../response');
const { validateToken } = require('../middleware/auth');
const middy = require('@middy/core');
const db = new AWS.DynamoDB.DocumentClient();


const getNotes = async (event, context) => {

    if (event?.error && event?.error === '401')
        return sendResponse(401, {success: false , message: 'Invalid token' });

    const items = await db.query({
        TableName: 'notes-db',
        KeyConditionExpression: '#id = :username',
        ExpressionAttributeValues: {
            ":username" : event.username
        },
        ExpressionAttributeNames: {
            "#id": "id"
        }
    }).promise();

    return sendResponse(200, {success : true, notes : (items.Items[0]?.notes || [])});
}

const handler = middy(getNotes)
    .use(validateToken)


module.exports = { handler };