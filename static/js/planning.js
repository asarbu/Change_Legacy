// ----------------------- ORM Operations ----------------------- //
var planning;
var gdrive;
const gdriveEnabled = true;
async function initPlanning() {	
	gdrive = await import('/static/modules/gdrive.mjs');
	gdrive.setRedirectUri("https://asarbu.loca.lt/Planning");
	var sideNavs = document.querySelectorAll('.sidenav');
	M.Sidenav.init(sideNavs, {});

	planning = new Planning();
	await planning.init();
	await planning.readPlanningDb();
	
}

function initListeners() {
	var editableElements = document.querySelectorAll('td[editable="true"]');
	console.log(editableElements.length)
	for (var i = 0; i < editableElements.length; i++) {
		editableElements[i].addEventListener('input', cellChanged, false);
	}
}

class Planning {
	constructor() {
		this.pdb = new Idb("Planning", 1, upgradePlanningDatabase);
	}

	async init() {
		await this.pdb.init()
			.then(pdb => pdb.fetchTemplateToStore(PLANNING_TEMPLATE_URI, PLANNING_STORE_NAME));
		/*if(gdriveEnabled)
			await persistPlanningToNetwork();
		*/
	}

	readPlanningDb() {
		this.pdb.openCursor(PLANNING_STORE_NAME).then(this.createPlanningTable.bind(this));
		/*gdrive.readFile(localStorage.getItem(PLANNING_TEMPLATE_URI))
		.then(planningData => this.createPlanningTable(planningData))*/
		
	}

	createPlanningTable(planningItems) {
		for (const [name, planningItem] of planningItems) {
			const table = document.createElement('table');
			const thead = document.createElement('thead');
			const tbody = document.createElement('tbody');

			table.id = planningItem.id;
			table.classList.add("striped", "table-content", "row");
			table.appendChild(thead);
			table.appendChild(tbody);

			const headingRow = document.createElement('tr');
			const nameCol = document.createElement('th');
			const daily = document.createElement('th');
			const monthly = document.createElement('th');
			const yearly = document.createElement('th');
			const buttons = document.createElement('th');

			nameCol.innerHTML = name;
			daily.innerHTML = "Daily";
			monthly.innerHTML = "Monthlhy";
			yearly.innerHTML = "Yearly";
			buttons.innerHTML = '<button onclick=addRow(this) class="waves-effect waves-light btn"><img class="vertical-center" src="static/icons/table-row-plus-after.svg" alt="AddRow"/>Add row</button>';
			buttons.setAttribute("hideable", "true");
			buttons.style.display = "none";

			headingRow.appendChild(nameCol);
			headingRow.appendChild(daily);
			headingRow.appendChild(monthly);
			headingRow.appendChild(yearly);
			headingRow.appendChild(buttons);
			thead.appendChild(headingRow);

			const data = planningItem.data;
			for (let i = 0; i < data.length; i++) {
				const element = data[i];
				appendRowToTable(table, [element.name, element.daily, element.monthly, element.yearly], { index: -1, hidden: true, deletable: true, readonly: false });
			}
			this.recomputeTotal(table, true);

			var tab = document.getElementById(planningItem.tab);
			tab.appendChild(table);
		}
	}

	recomputeTotal(table, create = false) {
		const key = table.tHead.rows[0].cells[0].innerHTML;
		var lastRow;
		if(create) {
			lastRow = appendRowToTable(table,
				["Total", totalDaily, totalMonthly, totalYearly],
				{ useBold: true, readonly: true, index: -1, hidden: true, deletable: true });
		}
		else {
			lastRow = table.tBodies[0].rows[table.tBodies[0].rows.length - 1];
		}

		var totalDaily = 0;
		var totalMonthly = 0;
		var totalYearly = 0;

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
}

async function persistPlanningToNetwork() {
	const currentMonth = (new Date().toLocaleString("en-US", {month: "short"})) + ".json";
	const cursorData = await planning.pdb.openCursor(PLANNING_STORE_NAME);
	const planningData = Array.from(cursorData.entries());
	const fileId = await gdrive.writeFile(currentMonth, planningData);

	localStorage.setItem(PLANNING_TEMPLATE_URI, fileId);
}

function editableCellChanged(event) {
	if (!event.target.hasAttribute('editable'))
		return;

	const cell = event.target;
	const cellContent = parseInt(cell.textContent);
	const cellIndex = event.target.cellIndex;
	const row = cell.parentNode;
	const table = row.parentNode.parentNode;

	row.setAttribute("edited", true);

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
	planning.recomputeTotal(table);
}

function addRow(btn) {
	//th->tr->thead->table
	var table = btn.parentNode.parentNode.parentNode.parentNode;
	var index = table.rows.length - 2;
	appendRowToTable(table, ["New Row", 0, 0, 0], { index: index, useBold: false, deletable: true, hidden: false });
}

async function deleteRow(btn) {
	const row = btn.parentNode.parentNode;
	const key = row.parentNode.parentNode.tHead.rows[0].cells[0].innerHTML;
	const value = row.cells[0].innerHTML;
	const planningItem = await planning.pdb.get(PLANNING_STORE_NAME, key);
	const data = planningItem.data;

	for (var index = data.length - 1; index >= 0; index--) {
		if (data[index].name === value) {
			data.splice(index, 1);
			break;
		}
	}
	planningItem.data = data;
	await planning.pdb.put(PLANNING_STORE_NAME, planningItem, key);

	row.parentNode.removeChild(row);
}

function onClickEdit(btn) {
	var saveBtn = document.getElementById("SaveBtn");
	saveBtn.style.display = "";
	var editBtn = document.getElementById("EditBtn");
	editBtn.style.display = "none";

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

async function onClickSave(btn) {
	var editedRows = document.querySelectorAll('tr[edited="true"]');
	persistPlanningToNetwork();

	for (var i = 0; i < editedRows.length; i++) {
		const row = editedRows[i];
		const table = row.parentNode.parentNode;
		const key = table.tHead.rows[0].cells[0].innerHTML;
		const planningItem = await planning.pdb.get(PLANNING_STORE_NAME, key);

		row.removeAttribute("edited");

		const planningItemName = row.cells[0].innerHTML;
		const planningItemsData = planningItem.data.find(e => e.name == planningItemName);
		planningItemsData.daily = parseInt(row.cells[1].innerHTML);
		planningItemsData.monthly = parseInt(row.cells[2].innerHTML);
		planningItemsData.yearly = parseInt(row.cells[3].innerHTML);

		planning.pdb.insert(PLANNING_STORE_NAME, planningItem, key);
	}

	var editBtn = document.getElementById("EditBtn")
	editBtn.style.display = ""
	var saveBtn = document.getElementById("SaveBtn")
	saveBtn.style.display = "none"

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

var el = document.querySelector('.tabs')
var instance = M.Tabs.init(el, {})
document.addEventListener("DOMContentLoaded", initPlanning);
document.body.addEventListener("mouseover", onMouseOver, false);
document.body.addEventListener("mouseout", onMouseOut, false);
document.body.addEventListener('keyup', editableCellChanged, false);
document.getElementById("EditBtn").addEventListener("click", onClickEdit);
document.getElementById("SaveBtn").addEventListener("click", onClickSave);