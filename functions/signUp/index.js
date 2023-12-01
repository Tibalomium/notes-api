const {sendResponse} = require("../../response/index");
const { nanoid } = require("nanoid");
const bcrypt = require('bcryptjs');
const AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient();
const dynaDB = new AWS.DynamoDB();

async function createAccount(username, hashedPassword, firstname, lastname) {
  try {
    //check if username already exists
    const items = await db.query({
      TableName: 'accounts',
      KeyConditionExpression: '#username = :username',
      ExpressionAttributeValues: {
        ":username" : username
      },
      ExpressionAttributeNames: {
        "#username": "username"
      }
    }).promise();

    if(items.Items.length > 0) {
      return {success: false, message: "Username already exists."};
    }

    //Save user
    await db.put({
      TableName: 'accounts',
      Item: {
        username: username,
        password: hashedPassword,
        firstname: firstname,
        lastname: lastname,
      }
    }).promise();
    
    return {success: true, username};
  } catch(error) {
    console.log(error);
    return {success: false, message: 'Could not create account.'};
  }
}

async function signup(username, password, firstname, lastname) {
  const hashedPassword = await bcrypt.hash(password, 10);
  
  return await createAccount(username, hashedPassword, firstname, lastname);
}

exports.handler = async (event) => {
  let result;

  try {
    const {username, password, firstname, lastname} = JSON.parse(event.body);
    // signup
    result = await signup(username, password, firstname, lastname);
  } catch(error) {
    return sendResponse(400, {success: false, message: "Input not correct. EXTERMINATE"});
  }

  if(result.success) {
   return sendResponse(200, result) 
  } else {
    return sendResponse(400, result)
  }
}
