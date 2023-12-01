const AWS = require('aws-sdk');
const { sendResponse } = require('../../response');
const { validateToken } = require('../middleware/auth');
const middy = require('@middy/core');
const db = new AWS.DynamoDB.DocumentClient();
const { nanoid } = require("nanoid");

const deleteNote = async (event, context) => {
    if (event?.error && event?.error === '401')
        return sendResponse(401, {success: false , message: 'Invalid token' });

    let id;
    try {
        const input = JSON.parse(event.body);
        id = input.id;
    } catch(error) {
        return sendRepsonse(400, {success: false, message:"wrong input"});
    }

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
            else if(removedNotes.notes?.length < 10) {
                removedNotes.startIndex += 1;
                removedNotes.notes.push(noteToRemove);
            }
            else {
                removedNotes.notes[removedNotes.startIndex] = noteToRemove;
                removedNotes.startIndex = (removedNotes.startIndex + 1) % 10;
                removedNotes.endIndex = (removedNotes.endIndex + 1) % 10;
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

        await db.update({
            TableName: "notes-db",
            Key: {
                id: event.username,
            },
            UpdateExpression: "REMOVE notes[" + noteIndex + "]",
        }).promise();


    return sendResponse(200, {success : true, message: "EXTERMINATE!"});
    } catch(error) {
        return sendResponse(400,{sucess: false, message: "Coulc not remove note. EXTERMINATE"} )
    }
}

const handler = middy(deleteNote)
    .use(validateToken)


module.exports = { handler };