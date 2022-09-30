// We are not worried about exposing the keys, as the only domain from this can be called is ours.
// Wreckless users who leave devices unattended and give access to their accounts are not good actors.
const CLIENT_ID = '48008571695-vjj7lrnm4dv8i49ioi3a4tq3pbl1j67h.apps.googleusercontent.com';
const REDIRECT_URI = 'https://asarbu.loca.lt/auth.html';
const CLIENT_SECRET = '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';
const FILES_API = "https://www.googleapis.com/drive/v3/files";
const ROOT = "root";

const oauth2 = {
	name : "oauth2",
	token : "oauth2_token",
	access_token : "access_token",
	refresh_token : "oauth2_refresh_token",
	code : "oauth2_code"
}

function getCode() {

}

function getRefreshToken() {
	console.log("Getting refresh token")
	var params = JSON.parse(localStorage.getItem(oauth2.code));
	var data = {
		"code": params.code,
		"client_id": CLIENT_ID,
		"client_secret" : CLIENT_SECRET,
		"redirect_uri": YOUR_REDIRECT_URI,
		"grant_type" : 'authorization_code',
	};
	console.log("Data:" , data)
	const url = new URL('https://oauth2.googleapis.com/token');
	const json = await fetch(url, {
		method: "POST",
		body: JSON.stringify(data),
	})
	.then(response => response.json()) 
	.then(json => json)
	.catch(err => console.err(err));
	console.log("Received token", json)
	if(json.refresh_token) {
		localStorage.setItem('oauth2-refresh-token', json.refresh_token);
		delete json.refresh_token;
	}
	json.refreshed_at = new Date().getTime();
	json.expires_at = json.refreshed_at + json.expires_in * 1000;
	localStorage.setItem('oauth2-token', JSON.stringify(json));
}

async function getAccessToken() {
	if(await loggedIn()) {
		const params = JSON.parse(localStorage.getItem(oauth2.token));
		const access_token = params[oauth2.access_token];
		return access_token;
	}
}

async function loggedIn() {
	console.log("Looking for token in localstorage");
	if(localStorage.getItem(oauth2.token) === null) {
		console.log("No token found. Requesting one from server");
		return await tryRefreshAccessToken();
	} else {
		const token = JSON.parse(localStorage.getItem(oauth2.token));
		const now = new Date();
		console.log("Checking exipration date for token", token.expires_at, " -", now.getTime())
		if(token.expires_at && (token.expires_at < now)) {
			return await tryRefreshAccessToken();
		}
		return true;
	}
	return false;
}

async function tryRefreshAccessToken() {
	console.log("Refreshing access token")

	//If there is no refresh token, we cannot get an access token.
	if(localStorage.getItem(oauth2.refresh_token) === null) {
		console.log("Cannot request from server. No refresh token found")
		return false;
	}
	var refresh_token = localStorage.getItem(oauth2.refresh_token);
	var data = {
		"client_id": YOUR_CLIENT_ID,
		"client_secret" : YOUR_CLIENT_SECRET,
		"refresh_token": refresh_token,
		"grant_type" : 'refresh_token'
	};
	const url = new URL('https://oauth2.googleapis.com/token');
	const headers = new Headers({
				'Accept': 'application/json',
				'Content-Type': 'application/json'
			});
	const json = await fetch(url, {
		method: "POST",
		headers: headers,
		body: JSON.stringify(data),
	})
	.then(response => response.json()) 
	.then(json => json)
	.catch(err => console.err(err));

	if(json) {
		json.refreshed_at = new Date().getTime();
		json.expires_at = json.refreshed_at + json.expires_in * 1000;
	} else {
		console.error("Refreshing token did not succeed", json);
		return false;
	}

	localStorage.setItem(oauth2.token, JSON.stringify(json));
	return true;
}

export async function writeFile(fileName, data) {
	var topFolder = await findFolder("Change!");
	if (!topFolder) {
		topFolder = await createFolder("Change!");
	}
	if(!topFolder) return;

	const currentYear = (new Date().getFullYear());
	var yearFolder = await findFolder(currentYear, topFolder);
	if(!yearFolder) {
		yearFolder = await createFolder(currentYear, topFolder);
	}
	if(!yearFolder) return;

	var monthFile = await findFile(fileName, yearFolder);
	if(!monthFile) {
		monthFile = await write(fileName, yearFolder, data);
	} else {
		monthFile = await update(monthFile, data);
	}
	return monthFile;
}

async function getHeader() {
	const token = await getAccessToken();
    if (token) {
		return new Headers({
			'Authorization': 'Bearer ' + token,
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		});
	}
}


async function find(name, parent, type) {	
    if (loggedIn()) {
		parent = parent || ROOT;
	
		var q = 'name=\'' + name + '\' and trashed=false and \'' + parent + '\' in parents';
		if(type) {
			q +=  ' and mimeType=\'' + type + '\'';
		}
		//console.log(q)

		const header = await getHeader();
		const url = new URL(FILES_API);
		url.searchParams.append("q", q);

		const id = await fetch(url, {
			method: "GET",
			headers: header
		})
		.then(response => response.json()) 
		.then(json => { 
			if(json.files.length > 0) {
				return json.files[0].id;
			} else {
				return;
			}
		})
		.catch(err => console.log(err));

		//console.log("Found ", name, " under ", parent, " with id ", id)
		return id;
	}
}

async function findFolder(name, parent) {
	return await find(name, parent, 'application/vnd.google-apps.folder');
}

async function findFile(name, parent) {
	return await find(name, parent);
}

async function createFolder(name, parent) {
	var metadata = {
		"name": name,
		"mimeType": "application/vnd.google-apps.folder",
		"parents" : [parent || ROOT]
	};
	
	var params = JSON.parse(localStorage.getItem(oauth2.name));
    if (params && params[oauth2.access_token]) {
		const headers = getHeader();
		const url = new URL(FILES_API);

		const id = await fetch(url, {
			method: 'POST',
			headers: headers,
			body: JSON.stringify(metadata),
		}).then(res => {
			return res.json();
		}).then(json => {
			return json.id;
		});

		//console.log("Created folder", name," with id", id)
		return id;
	}
}

async function update(fileId, data) {
	const fileContent = JSON.stringify(data);
	const file = new Blob([fileContent], {type: 'text/plain'});
	const metadata = {
		'mimeType': 'text/plain',
	};

	const params = JSON.parse(localStorage.getItem(oauth2.name));
	const access_token = params[oauth2.access_token];
	
	const url = new URL(`https://www.googleapis.com/upload/drive/v3/files/${fileId}`);
	url.searchParams.append("uploadType", "multipart");
	url.searchParams.append("fields", "id");

	const header = new Headers({ 'Authorization': 'Bearer ' + access_token });

	const form = new FormData();
	form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
	form.append('file', file);
	fetch(url, {
		method: `PATCH`,
		headers: header,
		body: form,
	}).then((res) => {
		return res.json();
	}).then(json => {
		return json.id;
	});

	return fileId;
}

async function write(name, parent, data) {
	const fileContent = JSON.stringify(data);
	const file = new Blob([fileContent], {type: 'text/plain'});
	const metadata = {
		'name': name,
		'mimeType': 'text/plain',
		'parents' : [parent]
	};

	const params = JSON.parse(localStorage.getItem(oauth2.name));
	const access_token = params[oauth2.access_token];
	
	const url = new URL("https://www.googleapis.com/upload/drive/v3/files");
	url.searchParams.append("uploadType", "multipart");
	url.searchParams.append("fields", "id");

	const header = new Headers({ 'Authorization': 'Bearer ' + access_token });

	const form = new FormData();
	form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
	form.append('file', file);
	fetch(url, {
		method: "POST",
		headers: header,
		body: form,
	}).then((res) => {
		return res.json();
	}).then(json => {
		return json.id;
	});
}

export async function readFile(fileId) {
	if (loggedIn()) {
		const header = getHeader();
		const url = new URL(FILES_API + '/' + fileId);
		url.searchParams.append('alt', 'media');
		
		const contents = await fetch(url, {
			method: "GET",
			headers: header
		})
		.then(response => response.json()) 
		.then(json => {
			const map = new Map();
			json.forEach(object => {
				map.set(object[0], object[1]);
			});
			return map;
		})
		.catch(err => console.log(err));

		return contents;
	}
}