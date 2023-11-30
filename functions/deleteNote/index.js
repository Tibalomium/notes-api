const AWS = require('aws-sdk');
const { sendResponse } = require('../../response');
const { validateToken } = require('../middleware/auth');
const middy = require('@middy/core');
const db = new AWS.DynamoDB.DocumentClient();
const { nanoid } = require("nanoid");

const deleteNote = async (event, context) => {
    if (event?.error && event?.error === '401')
        return sendResponse(401, {success: false , message: 'Invalid token' });

    const {id} = JSON.parse(event.body);

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

    const notes = items.Items[0]?.notes;
    let removedNotes = items.Items[0]?.removedNotes;
    let noteToRemove = null;
    let noteIndex = null;
    
    notes.forEach((noteToFind, index) => {
        if(noteToFind.id === id) {
            noteIndex = index;
            noteToRemove = items.Items[0]?.notes[noteIndex];
            
            if(!removedNotes) {
                removedNotes = {
                    "startIndex": 0,
                    "endIndex": 0,
                    "notes": [noteToRemove]
                }
            }
            else if(removedNotes.notes?.length < 4) {
                removedNotes.startIndex += 1;
                removedNotes.notes.push(noteToRemove);
            }
            else {
                removedNotes.notes[removedNotes.startIndex] = noteToRemove;
                removedNotes.startIndex = (removedNotes.startIndex + 1) % 4;
                removedNotes.endIndex = (removedNotes.endIndex + 1) % 4;
            }            
        }
    });
    
    //Save removed notes
    //To add maximum of 10(?) notes
    await db.update({
        TableName: 'notes-db',
        Key: { id: event.username },
        UpdateExpression: 'SET #removedNotes = :removedNotes',
        ExpressionAttributeNames: { '#removedNotes': 'removedNotes' },
        ExpressionAttributeValues: {
            ':removedNotes': removedNotes
        },
    }).promise();
    
    //Remove note
    try {
        await db.update({
            TableName: "notes-db",
            Key: {
                id: event.username,
            },
            UpdateExpression: "REMOVE notes[" + noteIndex + "]",
        }).promise();
    } catch(error) {

    }

    return sendResponse(200, {success : true, message: "EXTERMINATE!"});
}

const handler = middy(deleteNote)
    .use(validateToken)


module.exports = { handler };