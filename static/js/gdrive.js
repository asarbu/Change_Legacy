// We are not worried about exposing the keys, as the only domain from this can be called is ours.
// Wreckless users who leave devices unattended and give access to their accounts are not good actors.
const CLIENT_ID = '48008571695-vjj7lrnm4dv8i49ioi3a4tq3pbl1j67h.apps.googleusercontent.com';
const API_KEY = 'AIzaSyCqtQs6eT16KFp1i4bhosBDoZ-fOu2txsg';
const FILES_API = "https://www.googleapis.com/drive/v3/files";
const ROOT = "root";

document.getElementById('GDriveLogin').style.display = 'none';
document.getElementById('Signout').style.display = 'none';

async function maybeEnableButtons() {
	document.getElementById('GDriveLogin').style.display = '';
	//document.getElementById('Signout').style.visibility = 'visible';
}

/**
 *  Sign in the user upon button click.
 */
async function onClickGDrive() {
	document.getElementById('Signout').style.display = '';
	document.getElementById('GDriveLogin').style.display = 'none';

	//TDO move this into an initialize function
	var pdb = new Idb("Planning", 1, upgradePlanningDatabase);
	await pdb.init();

	var topFolder = await findFolder("Change!");
	if (!topFolder) {
		topFolder = await createFolder("Change!");
	}
	const currentYear = (new Date().getFullYear());
	var yearFolder = await findFolder(currentYear, topFolder);
	if(!yearFolder) {
		yearFolder = await createFolder(currentYear, topFolder);
	}
	const currentMonth = (new Date().toLocaleString("en-US", {month: "short"})) + ".json";
	var monthFile = await findFile(currentMonth, yearFolder);
	if(!monthFile) {
		const cursorData = await pdb.openCursor(PLANNING_STORE_NAME);
		const planningData = Array.from(cursorData.entries());
		await writeFile(currentMonth, yearFolder, planningData);
	}
}

/**
 *  Sign out the user upon button click.
 */
function onClickSignout() {
	document.getElementById('GDriveLogin').style.display = '';
	document.getElementById('Signout').style.display = 'none';
}

function getHeader() {
	const params = JSON.parse(localStorage.getItem('oauth2-test-params'));
    if (params && params['access_token']) {
		return new Headers({
			'Authorization': 'Bearer ' + params['access_token'],
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		});
	}
}

async function find(name, parent, type) {	
	const params = JSON.parse(localStorage.getItem('oauth2-test-params'));
    if (params && params['access_token']) {
		parent = parent || ROOT;
	
		var q = 'name=\'' + name + '\' and trashed=false and \'' + parent + '\' in parents';
		if(type) {
			q +=  ' and mimeType=\'' + type + '\'';
		}

		const header = getHeader();
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

		console.log("Query " + q + " returned " + id);
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
	
	var params = JSON.parse(localStorage.getItem('oauth2-test-params'));
    if (params && params['access_token']) {
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

		console.log("Created folder: " + id + " under " + parent);
		return id;
	}
}

async function writeFile(name, parent, data) {
	const fileContent = JSON.stringify(data);
	const file = new Blob([fileContent], {type: 'text/plain'});
	const metadata = {
		'name': name,
		'mimeType': 'text/plain',
		'parents' : [parent]
	};

	const params = JSON.parse(localStorage.getItem('oauth2-test-params'));
	const access_token = params['access_token'];
	
	const url = new URL("https://www.googleapis.com/upload/drive/v3/files");
	url.searchParams.append("uploadType", "multipart");
	url.searchParams.append("fields", "id");

	const header = new Headers({ 'Authorization': 'Bearer ' + access_token });
	
	const form = new FormData();
	form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
	form.append('file', file);

	fetch(url, {
		method: 'POST',
		headers: header,
		body: form,
	}).then((res) => {
		return res.json();
	}).then(json => {
		return json.id;
	});
}

document.getElementById("GDriveLogin").addEventListener("click", onClickGDrive);
document.getElementById("GDriveLoginMobile").addEventListener("click", onClickGDrive);
document.getElementById("Signout").addEventListener("click", onClickSignout);