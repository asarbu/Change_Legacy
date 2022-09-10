
// We are not worried about exposing the keys, as the only domain from this can be called is ours.
// Wreckless users who leave devices unattended and give access to their accounts are not good actors.
const CLIENT_ID = '48008571695-vjj7lrnm4dv8i49ioi3a4tq3pbl1j67h.apps.googleusercontent.com';
const API_KEY = 'AIzaSyCqtQs6eT16KFp1i4bhosBDoZ-fOu2txsg';

// Discovery doc URL for APIs used by the quickstart
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
const SCOPES = 'https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/drive.file';

let tokenClient;
let gapiInited = false;
let gisInited = false;

document.getElementById('GDriveLogin').style.display = 'none';
document.getElementById('Signout').style.display = 'none';

/**
 * Callback after api.js is loaded.
 */
function gapiLoaded() {
	gapi.load('client', initializeGapiClient);
}

/**
 * Callback after the API client is loaded. Loads the
 * discovery doc to initialize the API.
 */
async function initializeGapiClient() {
	await gapi.client.init({
		apiKey: API_KEY,
		discoveryDocs: [DISCOVERY_DOC],
	});
	gapiInited = true;
	maybeEnableButtons();
}

/**
 * Callback after Google Identity Services are loaded.
 */
function gisLoaded() {
	tokenClient = google.accounts.oauth2.initTokenClient({
		client_id: CLIENT_ID,
		scope: SCOPES,
		callback: '', // defined later
	});
	gisInited = true;
	maybeEnableButtons();
}

/**
 * Enables user interaction after all libraries are loaded.
 */
function maybeEnableButtons() {
	if (gapiInited && gisInited) {
		document.getElementById('GDriveLogin').style.display = '';
		//document.getElementById('Signout').style.visibility = 'visible';
	}
}

/**
 *  Sign in the user upon button click.
 */
function onClickGDrive() {
	tokenClient.callback = async (resp) => {
		if (resp.error !== undefined) {
			throw (resp);
		}
		document.getElementById('Signout').style.display = '';
		document.getElementById('GDriveLogin').style.display = 'none';
		const foundFolder = await findFolder("Change!");
		alert(foundFolder);
		if (!foundFolder) {
			await createFolder("Change!");
		}
	};

	if (gapi.client.getToken() === null) {
		// Prompt the user to select a Google Account and ask for consent to share their data
		// when establishing a new session.
		tokenClient.requestAccessToken({ prompt: 'consent' });
	} else {
		// Skip display of account chooser and consent dialog for an existing session.
		tokenClient.requestAccessToken({ prompt: '' });
	}
}

/**
 *  Sign out the user upon button click.
 */
function onClickSignout() {
	const token = gapi.client.getToken();
	if (token !== null) {
		google.accounts.oauth2.revoke(token.access_token);
		gapi.client.setToken('');
		document.getElementById('GDriveLogin').style.display = '';
		document.getElementById('Signout').style.display = 'none';
	}
}

/**
 * Print metadata for first 10 files.
 */
async function listFiles() {
	let response;
	try {
		response = await gapi.client.drive.files.list({
			'pageSize': 10,
			'fields': 'files(id, name)',
		});
	} catch (err) {
		document.getElementById('content').innerText = err.message;
		return;
	}
	const files = response.result.files;
	if (!files || files.length == 0) {
		document.getElementById('content').innerText = 'No files found.';
		return;
	}
	// Flatten to string to display
	const output = files.reduce(
		(str, file) => `${str}${file.name} (${file.id}\n`,
		'Files:\n');
	document.getElementById('content').innerText = output;
}

async function findFolder(folderName) {
	let response;
	try {
		response = await gapi.client.drive.files.list({
			'q': 'name=\'' + folderName + '\' and mimeType=\'application/vnd.google-apps.folder\'',
			'pageSize': 10,
			'fields': 'files(id, name)',
			'spaces': 'drive',
		});
	} catch (err) {
		document.getElementById('content').innerText = err.message;
		return;
	}
	const files = response.result.files;
	if (!files || files.length == 0) {
		document.getElementById('content').innerText = 'No files found.';
		return false;
	}
	// Flatten to string to display
	const output = files.reduce(
		(str, file) => `${str}${file.name} (${file.id}\n`,
		'Files:\n');
	//document.getElementById('content').innerText = files.length > 0;
	return true;
}

async function createFolder(folderName) {
	let response;
	try {
		const fileMetadata = {
			name: folderName,
			mimeType: 'application/vnd.google-apps.folder',
		};
		response = await gapi.client.drive.files.create({
			resource: fileMetadata,
			fields: 'id',
		});
	} catch (err) {
		document.getElementById('content').innerText = err.message;
		return;
	}
	document.getElementById('content').innerText = response.result.id;
}


document.getElementById("GDriveLogin").addEventListener("click", onClickGDrive);
document.getElementById("GDriveLoginMobile").addEventListener("click", onClickGDrive);
document.getElementById("Signout").addEventListener("click", onClickSignout);