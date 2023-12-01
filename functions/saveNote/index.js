const AWS = require('aws-sdk');
const { sendResponse } = require('../../response');
const { validateToken } = require('../middleware/auth');
const middy = require('@middy/core');
const db = new AWS.DynamoDB.DocumentClient();
const { nanoid } = require("nanoid");

const saveNote = async (event, context) => {
    if (event?.error && event?.error === '401')
        return sendResponse(401, {success: false , message: 'Invalid token' });
    
    try {
        const {title, text} = JSON.parse(event.body);

        if(!title || title.length > 50) return sendResponse(400, {success: false, message: "TITLE NO GOOD. EXTERMINATE"});
        if(!text || text.length > 300) return endResponse(400, {success: false, message: "TEXT NO GOOD. EXTERMINATE"});


        const createdDate = new Date().toISOString();
        const id = nanoid();

        const note = {
            id: id,
            createdAt: createdDate,
            startIndex: 0,
            endIndex: 0,
            versions: [
                {
                    title: title,
                    text: text,
                    modifiedDate: createdDate
                }
            ]
        };

        //Save note
        await db.update({
            TableName: 'notes-db',
            Key: { id: event.username },
            UpdateExpression: 'SET #notes = list_append(if_not_exists(#notes, :empty_list), :newNote)',
            ExpressionAttributeNames: { '#notes': 'notes' },
            ExpressionAttributeValues: {
                ':newNote': [note],
                ':empty_list': [],
            },
        }).promise();

        return sendResponse(200, {success : true, message: "We did it! EXTERMINATE!"});
    } catch(error) {
        return sendResponse(400, {success: false, message: "Something went wrong. EXTERMINATE"});
    }
}

const handler = middy(saveNote)
    .use(validateToken)


module.exports = { handler };