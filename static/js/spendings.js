const SPENDINGS_STORE_NAME = 'Spendings';

var spendings;

async function initSpending() {
	if (!window.indexedDB) {
		console.error(`Your browser doesn't support IndexedDB`);
		return;
	}

	spendings = new Spendings();
	await spendings.init();
	spendings.getAllSpendings();
	spendings.drawPlanningModals();
}

class Spendings {
	constructor() {
		this.idb = new Idb("Spendings", 1, this.upgradeSpendingsDb);
		this.pdb = new Idb("Planning", 1, upgradePlanningDatabase);
	}

	async init() {
		await this.idb.init();
		await this.pdb.init()
			.then(pdb => pdb.fetchTemplateToStore(PLANNING_TEMPLATE_URI, PLANNING_STORE_NAME));
	}

	getAllSpendings() {
		this.idb.openCursor(SPENDINGS_STORE_NAME)
			//We need to bind this in order to preserve the implicit reference to the object
			.then(this.processSpendings.bind(this))
			.catch(console.error);
	}

	async drawSpendings() {
		for (const [id, spending] of this.spendingsMap) {
			this.appendToSpendingTable([id, spending]);
		}
	}

	async processSpendings(spendings) {
		this.spendingsMap = spendings;
		this.spendings = Array.from(spendings.values());
		this.drawSpendings();
		this.categorizeSpendings();
		await this.extractPlanningBudgets();
		this.processSummary();
	}

	categorizeSpendings() {
		this.totals = new Map();
		for (const spending of this.spendings) {
			if (!this.totals.has(spending.category)) {
				this.totals.set(spending.category, 0);
			}
			this.totals.set(spending.category, this.totals.get(spending.category) + parseFloat(spending.price));
		}
	}

	async extractPlanningBudgets() {
		this.budgets = new Map();
		var spendingTypes = Array.from(new Set(this.spendings.map(o => o.type)));
		for (const spendingType of spendingTypes) {
			const planningItem = await this.pdb.get(PLANNING_STORE_NAME, spendingType);
			for (const planningBudget of planningItem.data) {
				this.budgets.set(planningBudget.name, planningBudget.monthly);
			}
		}
	}

	processSummary() {
		for (const [key, value] of this.totals) {
			const planningBudget = this.budgets.get(key)
			const percentage = value / parseFloat(planningBudget);

			this.appendToSummaryTable([key, value, planningBudget, parseInt(percentage * 100)], { readonly: true, color: getColorForPercentage(percentage) });
		}
	}

	upgradeSpendingsDb(db, oldVersion) {
		if (oldVersion === 0) {
			let store = db.createObjectStore(SPENDINGS_STORE_NAME, { autoIncrement: true });
			store.createIndex('byCategory', 'category', { unique: false });
		}
	}

	insertSpending(spending) {
		this.idb.insert(SPENDINGS_STORE_NAME, spending).then(this.appendToSpendingTable);
	}

	appendToSpendingTable(spendingResult) {
		const key = spendingResult[0];
		const value = spendingResult[1];
		var table = document.getElementById("Sep");
		var row = appendRowToTable(table, [value.bought_date, value.description, value.category, value.price], { readonly: true });
		row.setAttribute("db_id", key);
	}

	appendToSummaryTable(data, options) {
		var table = document.getElementById("Summary");
		appendRowToTable(table, data, options);
	}

	drawPlanningModals() {
		var categoryList = document.getElementById("categoryList")

		for (const [key, value] of Object.entries(this.idb)) {
			if (value.type == "Expense")
				categoryList.innerHTML += '<li>\
						<div class="collapsible-header">'
					+ key +
					'</div>\
							<div class="collapsible-body">\
							<span> <ul class="card collection">'
					+ getSubCategories(value.data) +
					'</ul></span>\
							  </div>\
						</li>'
		}
	}
}

//-------------------- GUI HANDLERES---------------------------//
function addRow(btn) {
	//th->tr->thead->table
	var table = btn.parentNode.parentNode.parentNode.parentNode;
	appendRowToTable(table, "New Row", 0, 0, 0, table.rows.length - 1);
}

function deleteRow(btn) {
	var row = btn.parentNode.parentNode;
	spendings.idb.delete(SPENDINGS_STORE_NAME, parseInt(row.getAttribute("db_id")));
	row.parentNode.removeChild(row);
}

function onClickEdit() {
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

function onClickSave() {
	var editBtn = document.getElementById("EditBtn");
	editBtn.style.display = "";
	var saveBtn = document.getElementById("SaveBtn");
	saveBtn.style.display = "none";

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

document.addEventListener("DOMContentLoaded", initSpending);
document.getElementById("EditBtn").addEventListener("click", onClickEdit);
document.getElementById("SaveBtn").addEventListener("click", onClickSave);