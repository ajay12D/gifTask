import fs from 'fs';
import fsp from 'fs/promises';
import path, { dirname } from 'path';
import process from 'process';
import { authenticate } from '@google-cloud/local-auth';
import { google } from 'googleapis';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const images_dir = path.join(__dirname, 'images');

if (!fs.existsSync(images_dir)) {
  fs.mkdirSync(images_dir);
}

async function loadSavedCredentialsIfExist() {
  try {
    const content = await fsp.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

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

async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) return client;

  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
    redirectUri: 'http://localhost:3000',
  });

  if (client.credentials) {
    await saveCredentials(client);
  }

  return client;
}

function sanitize(str) {
  return str.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 50); // safe folder names
}

async function downloadAttachments(auth) {
  const gmail = google.gmail({ version: 'v1', auth });

  const res = await gmail.users.messages.list({
    userId: 'me',
    q: 'is:unread has:attachment',
    maxResults: 50,
  });

  const messages = res.data.messages || [];
  if (messages.length === 0) {
    console.log('No new emails with attachments found.');
    return;
  }

  for (const message of messages) {
    const msg = await gmail.users.messages.get({
      userId: 'me',
      id: message.id,
    });

    const headers = msg.data.payload.headers;
    const subjectHeader = headers.find(h => h.name === 'Subject');
    const subject = subjectHeader ? sanitize(subjectHeader.value) : 'No_Subject';

    // Create a unique folder name using subject and message ID
    const folderName = `attachement_${message.id}`;
    const emailFolder = path.join(images_dir, folderName);

    // 🛑 If folder already exists, skip this message
    if (fs.existsSync(emailFolder)) {
      console.log(`Skipping already processed email: ${folderName}`);
      continue;
    }

    fs.mkdirSync(emailFolder);

    const parts = msg.data.payload.parts || [];
    for (const part of parts) {
      if (part.filename && part.body && part.body.attachmentId) {
        const attachRes = await gmail.users.messages.attachments.get({
          userId: 'me',
          messageId: message.id,
          id: part.body.attachmentId,
        });

        const data = attachRes.data.data.replace(/-/g, '+').replace(/_/g, '/');
        const buffer = Buffer.from(data, 'base64');
        const filePath = path.join(emailFolder, part.filename);
        fs.writeFileSync(filePath, buffer);
        console.log(`Saved: ${part.filename} → ${folderName}`);
      }
    }

    // Mark the email as read so it doesn't come up again
    await gmail.users.messages.modify({
      userId: 'me',
      id: message.id,
      requestBody: {
        removeLabelIds: ['UNREAD'],
      },
    });
  }
}

export const  attachment = () => {
  authorize().then(downloadAttachments).catch(console.error);
}

