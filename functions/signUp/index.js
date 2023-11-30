const {sendResponse} = require("../../response/index");
const { nanoid } = require("nanoid");
const bcrypt = require('bcryptjs');
const AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient();

async function createAccount(username, hashedPassword, firstname, lastname) {
  try {
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
  //Check if username alread exists
  //If true return { success: false, message: 'Username already exists'}
  
  const hashedPassword = await bcrypt.hash(password, 10);
  
  return await createAccount(username, hashedPassword, firstname, lastname);
}

exports.handler = async (event) => {
  const {username, password, firstname, lastname} = JSON.parse(event.body);

  // signup
  const result = await signup(username, password, firstname, lastname);

  if(result.success) {
   return sendResponse(200, result) 
  } else {
    return sendResponse(400, result)
  }
}
