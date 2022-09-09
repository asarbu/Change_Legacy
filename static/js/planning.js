// ----------------------- ORM Operations ----------------------- //
var planning;
async function initPlanning() {
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
		console.log("adding listener")
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
	}

	readPlanningDb() {
		this.pdb.openCursor(PLANNING_STORE_NAME).then(this.createPlanningTable.bind(this));
	}

	createPlanningTable(planningItems) {
		for (const [name, planningItem] of planningItems) {
			var tbl = `<table id="` + planningItem.id + `" class="striped table-content row">
					<thead>
					<tr>
						<th>` + name + `</th>
						<th>Daily</th>
						<th>Monthly</th>
						<th>Yearly</th>
						<th hideable="true" style="display: none">
							<button onclick=addRow(this) class="waves-effect waves-light btn"><img class="vertical-center" src="static/icons/table-row-plus-after.svg" alt="AddRow"/>Add row</button>
						</th>
					</tr>
				</thead>
				<tbody>
				</tbody>
				</table>`;
			var tab = document.getElementById(planningItem.tab);
			tab.innerHTML += tbl;
			this.fillPlanningTable(document.getElementById(planningItem.id), planningItem.data);
		}
	}

	fillPlanningTable(table, data) {
		var totalDaily = 0;
		var totalMonthly = 0;
		var totalYearly = 0;
		for (let i = 0; i < data.length; i++) {
			const element = data[i];
			totalDaily += parseInt(element.daily);
			totalMonthly += parseInt(element.monthly);
			totalYearly += parseInt(element.yearly);
			appendRowToTable(table, [element.name, element.daily, element.monthly, element.yearly], { index: -1, hidden: true, deletable: true, readonly: false });
		}
		var row = appendRowToTable(table,
			["Total", totalDaily, totalMonthly, totalYearly],
			{ useBold: true, readonly: true, index: -1, hidden: true, deletable: true });
	}

	recomputeTotal(table) {
		//const key = lastRow.parentNode.parentNode.tHead.rows[0].cells[0].innerHTML;

		const key = table.tHead.rows[0].cells[0].innerHTML;
		const lastRow = table.tBodies[0].rows[table.tBodies[0].rows.length - 1];

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

function deleteRow(btn) {
	var row = btn.parentNode.parentNode;
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

	for (var i = 0; i < editedRows.length; i++) {
		const row = editedRows[i];
		const table = row.parentNode.parentNode;
		const key = table.tHead.rows[0].cells[0].innerHTML;
		const planningItem = await planning.pdb.get(PLANNING_STORE_NAME, key);

		row.removeAttribute("edited");

		const planningItemName = row.cells[0].innerHTML;
		console.log(planningItemName)
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
