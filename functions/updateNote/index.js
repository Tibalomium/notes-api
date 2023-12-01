const AWS = require('aws-sdk');
const { sendResponse } = require('../../response');
const { validateToken } = require('../middleware/auth');
const middy = require('@middy/core');
const db = new AWS.DynamoDB.DocumentClient();
const { nanoid } = require("nanoid");

const updateNote = async (event, context) => {
    if (event?.error && event?.error === '401')
        return sendResponse(401, {success: false , message: 'Invalid token' });

    let title, text, id;
    
    try {
        const input = JSON.parse(event.body);
        title = input.title;
        text = input.text;
        id = input.id;
    } catch(error) {
        return sendResponse(400, {success: false, message: "Input no good. EXTERMINATE!"});
    }


    let noteIndex = null;
    let versionIndex = null;
    let updatedNote = null;

    try {
        //Get notes
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

        const updateDate = new Date().toISOString();

        items.Items[0]?.notes?.forEach((noteToFind, index) => {
            if(noteToFind.id === id) {
                noteIndex = index;
                let tempNote = JSON.parse(JSON.stringify(noteToFind));//deep copy, don't know if neccesary

                //Rolling memory. Read the instructions wrong. Delete, not versioning
                if(noteToFind.versions.length < 5 && noteToFind.endIndex <= noteToFind.startIndex) {
                    tempNote.startIndex += 1;
                    tempNote.versions.push({
                        title: title,
                        text: text,
                        modifiedDate: updateDate
                    });
                }
            else {
                tempNote.versions[noteToFind.startIndex] = {
                    title: title,
                    text: text,
                    modifiedDate: updateDate
                };
                tempNote.startIndex = (tempNote.startIndex + 1) % 5;
                tempNote.endIndex = (tempNote.endIndex + 1) % 5;
            }

                updatedNote = tempNote;
            }
        });

        try {
            await db.update({
                TableName: "notes-db",
                Key: {
                    id: event.username,
                },
                UpdateExpression: "SET notes[" + noteIndex + "] = :updatedNote",
                ExpressionAttributeValues: {
                    ':updatedNote': updatedNote,
                },
            }).promise();
        } catch(error) {

        }

        return sendResponse(200, {success : true, message: updatedNote || "EXTERMINATE!"});
    } catch(error) {
        return sendResponse(400, {success: false, message:"Could note update note. EXTERMINATE!"});
    }
}

const handler = middy(updateNote)
    .use(validateToken)


module.exports = { handler };