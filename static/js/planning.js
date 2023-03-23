var planning;
var gdrive;
const APP_FOLDER = "Change!";
const PLANNING_FILE_NAME = "planning.json";

async function initPlanning() {	
	if(gdriveSync) { 
		gdrive = await import('./gDrive.js');
	}
	var sideNavs = document.querySelectorAll('.sidenav');
	M.Sidenav.init(sideNavs, {});

	planning = new Planning();
	await planning.init();
}

class Planning {
	constructor() {
		this.pdb = new Idb("Planning", 1, upgradePlanningDatabase);
	}

	async init() {
		await this.pdb.init()
			.then(pdb => pdb.fetchTemplateToStore(PLANNING_TEMPLATE_URI, PLANNING_STORE_NAME));
		if(gdriveSync)
			await this.syncToNetwork();
		
		const plannings = await this.pdb.openCursor(PLANNING_STORE_NAME);
		this.createPlanningTable(plannings);
		
		var el = document.querySelector('.tabs')
		var instance = M.Tabs.init(el, {})
	}

	//#region Network operations
	async syncToNetwork() {
		await this.mergeLocalPlanningToNetwork(false);
	}

	async mergeLocalPlanningToNetwork(overwrite = false) {
		//console.log("Merging local planning to network...")
		var needsMerge = false;
		let networkFileId = localStorage.getItem(PLANNING_FILE_NAME);
		//console.log(networkFileId)
		if(!networkFileId) {
			//No planning file found, write current data to network, but do not overwrite
			const cursorData = await planning.pdb.openCursor(PLANNING_STORE_NAME);
			networkFileId = await this.persistPlanningToNetwork(cursorData, overwrite);
			
			if(!networkFileId) {
				console.error("Could not retrieve planning file from newtork");
			}

			return;
		}

		const networkPlannings = await gdrive.readFile(networkFileId);		
		const localPlannings = await planning.pdb.openCursor(PLANNING_STORE_NAME);
		
		//console.log("Network planning:", networkPlanning);
		for(const [networkKey, networkPlanning] of networkPlannings) {
			const localPlanning = localPlannings.get(networkKey);

			//console.log("Comparing local with network:", localPlanning, networkPlanning);
			if(!localPlanning) {
				this.pdb.put(PLANNING_STORE_NAME, networkPlanning, networkKey);
				continue;
			}

			const localPlanningData = localPlanning.data;
			const networkPlanningData = networkPlanning.data;

			//console.log("Iterating through local and network data:", localPlanningData, networkPlanningData);
			for (let index = 0; index < networkPlanningData.length; index++) {
				const networkPlanningEntry = networkPlanningData[index];
				const localPlanningEntry = localPlanningData[index];
				
				//console.log("Comparing network with local:", localPlanningEntry, networkPlanningEntry);
				if(!this.areEqual(networkPlanningEntry, localPlanningEntry)) {
					needsMerge = true;
					if(localPlanningEntry.edited) {
						delete localPlanningEntry.edited;
					} else {
						//found edits from the network
						//console.log("Overwriting local with network:", localPlanningEntry, networkPlanningEntry);
						localPlanningData[index] = networkPlanningEntry;
					}
				} else {
					if(localPlanningEntry.added) {
						delete localPlanningEntry.added;
						networkPlanningData.push(localPlanningEntry);
						needsMerge = true;
					}
					if(localPlanningEntry.deleted) {
						localPlanning.splice(index, 1);
						networkPlanningData.splice(index, 1);
						index--;
						needsMerge = true;
					}
				}
			}

			for (let index = 0; index < localPlanningData.length; index++) {
				const localPlanningEntry = localPlanningData[index];
				if(localPlanningEntry.deleted) {
					localPlanning.splice(index, 1);
					networkPlanningData.splice(index, 1);
					index--;
					needsMerge = true;
				}
				if(localPlanningEntry.added) {
					delete localPlanningEntry.added;
					needsMerge = true;
				}
				if(localPlanningEntry.edited) {
					delete localPlanningEntry.edited;
					needsMerge = true;
				}
			}

			if(needsMerge) {
				//console.log("Needs merge", localPlannings);
				this.pdb.put(PLANNING_STORE_NAME, localPlanning, networkKey);
			}
		}

		if(needsMerge) {
			const fileId = this.persistPlanningToNetwork(localPlannings, true);
			if(fileId === null) {
				console.error("Could not write planning file to newtork");
			}
		}
		return localPlannings;
	}

	areEqual(networkEntry, localEntry) {
		if(networkEntry === undefined || localEntry === undefined) 
			return false;
		return 	networkEntry.name === localEntry.name && 
				networkEntry.daily === localEntry.daily &&
				networkEntry.monthly === localEntry.monthly &&
				networkEntry.yearly === localEntry.yearly;
	}
	
	async persistPlanningToNetwork(planningItem, overwrite) {
		var topFolder = await gdrive.findFolder(APP_FOLDER);

		if (!topFolder) {
			topFolder = await gdrive.createFolder(APP_FOLDER);
		}
		if(!topFolder) return;

		const planningData = Array.from(planningItem.entries());
		const fileId = await gdrive.writeFile(topFolder, PLANNING_FILE_NAME, planningData, overwrite);
		
		if(fileId !== undefined) {
			//Store file id for fast retrieval
			localStorage.setItem(PLANNING_FILE_NAME, fileId);
			return true;
		}

		return false;
	}
	//#endregion

	//#region GUI handlers
	onClickEdit() {
		this.saveBtn.style.display = "";
		this.editBtn.style.display = "none";

		let tableDefs = document.querySelectorAll('td[editable="true"]')
		for (var i = 0; i < tableDefs.length; ++i) {
			tableDefs[i].contentEditable = "true";
		}

		let ths = document.querySelectorAll('th[hideable="true"]')
		for (var i = 0; i < ths.length; ++i) {
			ths[i].style.display = '';
		}

		let trs = document.querySelectorAll('td[hideable="true"]')
		for (var i = 0; i < trs.length; ++i) {
			trs[i].style.display = '';
		}
	}

	async onClickSave() {
		var editedRows = document.querySelectorAll('tr[edited="true"]');

		for (var i = 0; i < editedRows.length; i++) {
			const row = editedRows[i];
			const key = row.parentNode.parentNode.id;
			const planningItem = await planning.pdb.get(PLANNING_STORE_NAME, key);

			row.removeAttribute("edited");

			const dataIndex = row.rowIndex - 1;
			const planningItemsData = planningItem.data[dataIndex];
			planningItemsData.name = row.cells[0].innerHTML;
			planningItemsData.daily = parseInt(row.cells[1].innerHTML);
			planningItemsData.monthly = parseInt(row.cells[2].innerHTML);
			planningItemsData.yearly = parseInt(row.cells[3].innerHTML);
			if(!planningItemsData.added && !planningItem.deleted) {
				planningItemsData.edited = true;
			}

			planning.pdb.put(PLANNING_STORE_NAME, planningItem, key);
		}

		planning.mergeLocalPlanningToNetwork(true);

		this.editBtn.style.display = "";
		this.saveBtn.style.display = "none";

		let tableDefs = document.querySelectorAll('td[editable="true"]')
		for (var i = 0; i < tableDefs.length; ++i) {
			tableDefs[i].contentEditable = "false";
		}

		let ths = document.querySelectorAll('th[hideable="true"]')
		for (var i = 0; i < ths.length; ++i) {
			ths[i].style.display = 'none';
		}

		let trs = document.querySelectorAll('td[hideable="true"]')
		for (var i = 0; i < trs.length; ++i) {
			trs[i].style.display = 'none';
		}
	}
	
	createPlanningTable(planningItems) {
		for (const [id, planningItem] of planningItems) {
			var tab = document.getElementById(planningItem.tab);
			if(planningItem.deleted)
				continue;

			const table = create('table', {id: id,classes: ["striped", "table-content", "row"]});
			const thead = create('thead');
			const tbody = create('tbody');

			table.appendChild(thead);
			table.appendChild(tbody);

			const headingRow = create('tr');
			const nameCol = create('th');
			const daily = create('th');
			const monthly = create('th');
			const yearly = create('th');
			const buttons = create('th');
			const button = createImageButton('Add Row', "", ["waves-effect", "waves-light", "btn", "red"], icons.add_row);
			button.addEventListener("click", onClickAddRow, false);

			nameCol.innerHTML = planningItem.name;
			daily.innerHTML = "Daily";
			monthly.innerHTML = "Monthly";
			yearly.innerHTML = "Yearly";

			buttons.setAttribute("hideable", "true");
			buttons.style.display = "none";

			headingRow.appendChild(nameCol);
			headingRow.appendChild(daily);
			headingRow.appendChild(monthly);
			headingRow.appendChild(yearly);
			headingRow.appendChild(buttons);
			buttons.appendChild(button);
			thead.appendChild(headingRow);

			const data = planningItem.data;
			for (let i = 0; i < data.length; i++) {
				const element = data[i];
				if(element.deleted)
					continue;
				createRow(table, element, { index: -1, hidden: true, deletable: true, readonly: false });
			}
			recomputeTotal(table, true);

			tab.appendChild(table);
		}

		const tabs = document.getElementById("main").children;
		//for(var tabIndex = 0; tabIndex < tabs.length; tabIndex++) {
			//const tab = tabs[tabIndex];
			const buttonRow = create("div", {classes:["row", "center"]});
			const editBtn = createImageButton("EditBtn", "", ["waves-effect", "red", "waves-light", "btn"],	icons.edit);
			const saveBtn = createImageButton("SaveBtn", "", ["waves-effect", "red", "waves-light", "btn"],	icons.save);

			editBtn.addEventListener("click", this.onClickEdit.bind(this));
			saveBtn.addEventListener("click", this.onClickSave.bind(this));
			saveBtn.style.display = "none";
			
			this.editBtn = editBtn;
			this.saveBtn = saveBtn;

			buttonRow.appendChild(editBtn);
			buttonRow.appendChild(saveBtn);
			document.getElementById("main").appendChild(buttonRow);
		//}
	}
	//#endregion
}

//#region DOM manipulation

//Recompute from DOM instead of memory/db/network to have real time updates in UI
function recomputeTotal(table, create = false) {
	let lastRow;
	const total = {
		name: "Total",
		daily: 0,
		monthly: 0,
		yearly: 0
	}
	if(create) {
		const options = { useBold: true, readonly: true, index: -1, hidden: true, deletable: false };
		lastRow = createRow(table, total, options);
	}
	else {
		lastRow = table.tBodies[0].rows[table.tBodies[0].rows.length - 1];
	}

	let totalDaily = 0;
	let totalMonthly = 0;
	let totalYearly = 0;

	for (let rowIndex = 0; rowIndex < table.tBodies[0].rows.length - 1; rowIndex++) {
		const row = table.tBodies[0].rows[rowIndex];
		totalDaily += parseInt(row.cells[1].innerHTML);
		totalMonthly += parseInt(row.cells[2].innerHTML);
		totalYearly += parseInt(row.cells[3].innerHTML);
	}

	lastRow.cells[1].innerHTML = totalDaily;
	lastRow.cells[2].innerHTML = totalMonthly;
	lastRow.cells[3].innerHTML = totalYearly;
}

function createRow(table, planningItem, options) {
	var index = -1;
	if (options.index) {
		index = options.index;
	}
	const row = table.tBodies[0].insertRow(index);

	createDataCell(row, planningItem.name, options);
	createDataCell(row, planningItem.daily, options);
	createDataCell(row, planningItem.monthly, options);
	createDataCell(row, planningItem.yearly, options);

	if (options.deletable) {	
		const buttonsCell = row.insertCell(-1);
		const btn = createImageButton("Delete", "", ["waves-effect", "waves-light", "red", "btn-small"], icons.delete);
		btn.addEventListener("click", onClickDelete);
		buttonsCell.appendChild(btn);
		
		buttonsCell.setAttribute("hideable", "true");
		if (options.hidden) {
			buttonsCell.style.display = 'none';
		}
	}
	return row;
}

function createDataCell(row, text, options) {
	const dataCell = row.insertCell(-1);
	dataCell.textContent = text;
	if (!options.readonly) {
		dataCell.setAttribute('editable', 'true');
		dataCell.addEventListener('keyup', onKeyUpCell, false);
	}
	if (options.useBold == true) {
		dataCell.style.fontWeight = "bold";
	}

	if (options.color) {
		dataCell.style.color = options.color;
	}
	return dataCell;
}

async function readRow(row) {
	const key = row.parentNode.parentNode.id;
	const planningItem = await planning.pdb.get(PLANNING_STORE_NAME, key);
	return planningItem;
}
//#endregion

//#region event handlers
async function onClickDelete(event) {
	const btn = event.target;
	const row = btn.parentNode.parentNode;
	const key = row.parentNode.parentNode.id;
	const dataIndex = row.rowIndex - 1;
	const planningItem = await readRow(row);
	delete planningItem.data[dataIndex].added;
	delete planningItem.data[dataIndex].edited;
	planningItem.data[dataIndex].deleted = true;

	planning.pdb.put(PLANNING_STORE_NAME, planningItem, key);
	row.parentNode.removeChild(row);
}

async function onClickAddRow(event) {
	const btn = event.target;
	const planningItemRow = {
		name: "New Row",
		daily: 0,
		monthly: 0,
		yearly: 0
	}

	var table = btn.parentNode.parentNode.parentNode.parentNode;
	var index = table.rows.length - 2;

	const options = { index: index, useBold: false, deletable: true, hidden: false, readonly: false };
	const row = createRow(table, planningItemRow, options);

	planningItemRow.added = true;

	planningItem = await readRow(row);
	planningItem.data.push(planningItemRow);
	planning.pdb.put(PLANNING_STORE_NAME, planningItem, planningItem.id);
}

async function onKeyUpCell(event) {
	const cell = event.target;
	const row = cell.parentNode;	
	row.setAttribute("edited", true);

	const cellContent = parseInt(cell.textContent);
	const cellIndex = event.target.cellIndex;
	switch (cellIndex) {
		case 1:
			cell.parentNode.cells[2].textContent = (cellContent * 30);
			cell.parentNode.cells[3].textContent = (cellContent * 365);
			break;
		case 2:
			cell.parentNode.cells[1].textContent = parseInt(cellContent / 30);
			cell.parentNode.cells[3].textContent = (cellContent * 12);
			break;
		case 3:
			cell.parentNode.cells[1].textContent = parseInt(cellContent / 365);
			cell.parentNode.cells[2].textContent = parseInt(cellContent / 12);
			break;
	}

	const table = row.parentNode.parentNode;
	recomputeTotal(table);
}


//#endregion
document.addEventListener("DOMContentLoaded", initPlanning);
document.body.addEventListener("mouseover", onMouseOver, false);
document.body.addEventListener("mouseout", onMouseOut, false);