import fs from 'fs';
import fsp from 'fs/promises'
import path, { dirname } from 'path'
import process from 'process';
import { authenticate } from '@google-cloud/local-auth';
import { GoogleApis } from 'googleapis';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';

const __filename =  fileURLToPath(import.meta.url);
const __dirname =   dirname(__filename)

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const images_dir = path.join(__dirname, 'images');


// create imges directory if it doesn't exist
 if(!fs.existsSync(images_dir)){
      fs.mkdirSync(images_dir)
 }

// Load saved credentials if available
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fsp.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

// Save the user's credentials
async function saveCredentials(client) {
  const content = await fsp.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fsp.writeFile(TOKEN_PATH, payload);
}

// Authenticate and return an authorized OAuth2 client
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) return client;

  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
      redirectUri: 'http://localhost:3000'
  });

  if (client.credentials) {
    await saveCredentials(client);
  }

  return client;
}

// Download attachments from the latest 5 emails that have attachments
async function downloadAttachments(auth) {
  const gmail = google.gmail({ version: 'v1', auth });

  const LAST_ID_PATH = path.join(__dirname, 'last_downloaded.json');
  let lastDownloadedId = null;

  // Read previously downloaded message ID (if it exists)
  try {
    const content = await fsp.readFile(LAST_ID_PATH, 'utf-8');
    lastDownloadedId = JSON.parse(content).messageId;
  } catch (err) {
    // No previous download
  }

  // Step 1: Get the most recent message with attachment
  const res = await gmail.users.messages.list({
    userId: 'me',
    q: 'has:attachment',
    maxResults: 1,
  });

  const messages = res.data.messages || [];
  if (messages.length === 0) {
    console.log('No emails with attachments found.');
    return;
  }

  const latestMessage = messages[0];

  // If it's already downloaded, skip
  if (latestMessage.id === lastDownloadedId) {
    console.log(' Latest attachment already downloaded. Skipping...');
    return;
  }

  // Step 2: Get message details
  const msg = await gmail.users.messages.get({
    userId: 'me',
    id: latestMessage.id,
  });

  const parts = msg.data.payload.parts || [];

  for (const part of parts) {
    if (part.filename && part.body && part.body.attachmentId) {
      const attachRes = await gmail.users.messages.attachments.get({
        userId: 'me',
        messageId: latestMessage.id,
        id: part.body.attachmentId,
      });

      // Decode and save
      const data = attachRes.data.data.replace(/-/g, '+').replace(/_/g, '/');
      const buffer = Buffer.from(data, 'base64');
      const filePath = path.join(images_dir, part.filename);

      fs.writeFileSync(filePath, buffer);
      console.log(`Saved: ${part.filename}`);
    }
  }

  // Save the latest message ID to avoid future re-downloads
  await fsp.writeFile(LAST_ID_PATH, JSON.stringify({ messageId: latestMessage.id }), 'utf-8');
}


  authorize().then(downloadAttachments).catch(console.error);