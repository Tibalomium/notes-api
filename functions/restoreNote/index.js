const AWS = require('aws-sdk');
const { sendResponse } = require('../../response');
const { validateToken } = require('../middleware/auth');
const middy = require('@middy/core');
const db = new AWS.DynamoDB.DocumentClient();


const restoreNote = async (event, context) => {

    if (event?.error && event?.error === '401')
        return sendResponse(401, {success: false , message: 'Invalid token' });
    
    let input = null;

    //try to parse body
    try {
        input = JSON.parse(event.body);
    } catch(error) {

    }

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
    
    let note = null;
    let noteIndex = 0;
    
    let removedNotes = items.Items[0]?.removedNotes;
    
    if(removedNotes && input?.id && removedNotes?.notes.length > 0) { //There are notes and id
        removedNotes.notes.forEach((n, index) => {
            if (n.id === input.id) {
                note = n;
                noteIndex = index;
            }
        });
    } else if(removedNotes && removedNotes.notes?.length > 0) { //No id, notes exist. Return last note
        note = removedNotes.notes[removedNotes.endIndex];
        noteIndex = removedNotes.endIndex;
    }
    
    //If no note exists.
    if(!note) return sendResponse(400, {success: false, message: "No note to return. EXTERMINATE"});
    
    let newRemovedNotes = removedNotes.notes.filter((note, index) => index !== noteIndex);
    
    removedNotes.startIndex = 0;
    removedNotes.endIndex = newRemovedNotes.length > 0 ? newRemovedNotes.length - 1 : 0;
    removedNotes.notes = newRemovedNotes;
    
    console.log("NOTE: " + note);
    console.log("REMOVED NOTES LENGTH: " + removedNotes.notes.length);

    //Update removed notes
    await db.update({
        TableName: 'notes-db',
        Key: { id: event.username },
        UpdateExpression: 'SET #removedNotes = :removedNotes',
        ExpressionAttributeNames: { '#removedNotes': 'removedNotes' },
        ExpressionAttributeValues: {
            ':removedNotes': removedNotes
        },
    }).promise();
    
    //Save note to notes
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
    
    return sendResponse(200, {success : true, note: note});
}

const handler = middy(restoreNote)
    .use(validateToken)


module.exports = { handler };