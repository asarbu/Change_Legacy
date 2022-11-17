const SPENDINGS_STORE_NAME = 'Spendings';
const APP_FOLDER = "Change!";

const gdriveEnabled = true;
var gdrive;

async function initSpending() {
	if (!window.indexedDB) {
		console.error(`Your browser doesn't support IndexedDB`);
		return;
	}

	const editBtnIcon = document.getElementById("EditBtnImg");
	editBtnIcon.src = icons.edit;
	const saveBtnIcon = document.getElementById("SaveBtnImg")
	saveBtnIcon.src = icons.save;

	if(gdriveEnabled) {
		gdrive = await import('/static/modules/gdrive.mjs');
		gdrive.setRedirectUri("https://asarbu.loca.lt/");
	}

	const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
	months.forEach(month => { 
		const monthlySpendings = new Spendings(month);
		monthlySpendings.init();
	});
}

class Spendings {
	constructor(month) {
		this.idb = new Idb("Spendings", 1, this.upgradeSpendingsDb);
		this.pdb = new Idb("Planning", 1, upgradePlanningDatabase);
		this.month = month;
	}

	async init() {
		const now = new Date();
		this.currentMonth = now.toLocaleString("en-US", {month: "short"});
		this.currentYear =  now.toLocaleString("en-US", {year: "numeric"});

		await this.idb.init();
		await this.pdb.init()
			.then(pdb => pdb.fetchTemplateToStore(PLANNING_TEMPLATE_URI, PLANNING_STORE_NAME));
		if(gdriveEnabled) {

			const yearFolder = await this.getSpendingsFileParent();
			const monthFileName = this.month + ".json";
			const monthFileId = await gdrive.find(monthFileName, yearFolder);
			if(monthFileId) {
				const monthFile = gdrive.readFile(monthFileId);
				await this.createTab(this.month, monthFile);

				this.syncSpendingsToNetwork();
			}
			
			const currentMonthSpendings = await this.getAllSpendings(this.month);
			if(currentMonthSpendings.length > 0) {
				await this.processSpendings(currentMonthSpendings);
			}
		}
	}

	//#region DOM generation
	createTab(monthName, monthData, active) {
		const tab = document.createElement("div");
		const section = document.createElement("div");
		const container = document.createElement("div");
		const h1 = document.createElement("h1");
		const row = document.createElement("div");
		const h5 = document.createElement("h5");
		const li = document.createElement("li");
		const a = document.createElement("a");
		const h6 = document.createElement("h6");
	
		tab.id = monthName;
		tab.classList.add("container");
		section.classList.add("section", "no-pad-bot");
		container.classList.add("container");
		h1.classList.add("header", "center", "red-text");
		row.classList.add("row", "center");
		h5.classList.add("header", "col", "s12", "light");
		li.classList.add("tab");
		a.setAttribute("href", "#" + monthName);
		h6.innerText = monthName;
	
		if(active) {
			a.classList.add("active");
		}
	
		h1.innerText = monthName;
		h5.innerText = "Monthly expenses";
	
		container.appendChild(h1);
		row.appendChild(h5);
		container.appendChild(row);
		section.appendChild(container);
		tab.appendChild(section);
		a.appendChild(h6);
		li.appendChild(a);
	
		const table = this.createSpendingsTable();
		const summaryModal = this.createSummaryModal();
		const newSpendingModal = this.createNewSpendingModal();
		const fabs = this.createFloatingActionButtons();
		const categoryModal = this.createCategoryModal();

		this.spendingsTable = table;
		this.summaryModal = summaryModal;
		this.categoryModal = categoryModal;
		tab.appendChild(table);
		tab.appendChild(summaryModal);
		tab.appendChild(newSpendingModal);
		tab.appendChild(categoryModal);
		tab.appendChild(fabs);

		const main = document.getElementById("main");
		main.insertBefore(tab, main.firstChild);
		document.getElementById("tabs").appendChild(li);
/*
		const modals = document.querySelectorAll('.modal');
		M.Modal.init(modals, options);
		const fab = document.querySelectorAll('.fixed-action-btn');
    	M.FloatingActionButton.init(fab, options);
		*/
		M.AutoInit();
  
	}
	
	createSpendingsTable() {
		const table = document.createElement("table");
		const thead = document.createElement("thead");
		const tr = document.createElement("tr");
		const thMonthName = document.createElement("th");
		const thDate = document.createElement("th");
		const thCategory = document.createElement("th");
		const thAmount = document.createElement("th");
		const thEdit = document.createElement("th");
		const tBody = document.createElement("tbody");

		table.id = this.month;
		table.classList.add("striped", "row", "table-content");
		thMonthName.innerText = this.month;
		thDate.innerText = "Date";
		thCategory.innerText = "Category";
		thAmount.innerText = "Amount";
		thEdit.innerText = "Edit";

		thEdit.setAttribute("hideable", true);
		thEdit.style.display = "none";

		tr.appendChild(thMonthName);
		tr.appendChild(thDate);
		tr.appendChild(thCategory);
		tr.appendChild(thAmount);
		tr.appendChild(thEdit);
		thead.appendChild(tr);
		table.appendChild(thead);
		table.appendChild(tBody);
	
		return table;
	}

	createSummaryModal() {
		const modal = document.createElement("div");
		const modalContent = document.createElement("div");
		const modalFooter = document.createElement("div");
		const h4 = document.createElement("h4");
		const table = document.createElement("table");
		const tHead = document.createElement("thead");
		const tr = document.createElement("tr");
		const thCategory = document.createElement("th");
		const thSpending = document.createElement("th");
		const thBudget = document.createElement("th");
		const thPercentage = document.createElement("th");
		const tBody = document.createElement("tbody");
		const a = document.createElement("a");

		modal.id = "summary-modal-" + this.month;
		modal.classList.add("modal", "bottom-sheet");
		modalContent.classList.add("modal-content");
		table.classList.add("striped", "row", "table-content");
		modalFooter.classList.add("modal-footer");
		a.classList.add("modal-close", "waves-effect", "waves-green", "btn-flat");
		table.id = "summary-table-" + this.month;
		a.setAttribute("href", "#!");
		a.innerText = "Close";
		h4.innerText = "Expenses vs. planning summary";
		thCategory.innerText = "Category";
		thBudget.innerText = "Budget";
		thSpending.innerText = "Spending";
		thPercentage.innerText = "Percentage";

		tr.appendChild(thCategory);
		tr.appendChild(thSpending);
		tr.appendChild(thBudget);
		tr.appendChild(thPercentage);
		tHead.appendChild(tr);
		table.appendChild(tHead);
		table.appendChild(tBody);
		modalContent.appendChild(h4);
		modalContent.appendChild(table);
		modalFooter.appendChild(a);
		modal.appendChild(modalContent);
		modal.appendChild(modalFooter);

		this.summaryTable = table;

		return modal;
	}

	createFloatingActionButtons() {
		const fabs = document.createElement("div");
		const leftAddDiv = document.createElement("div");
		const rightAddDiv = document.createElement("div");
		const summaryDiv = document.createElement("div");

		leftAddDiv.classList.add("fixed-action-btn-left");
		const leftAddBtn = createImageButton("Add Spending", "#new-spending-modal-" + this.month,
			["btn-floating", "btn-large", "waves-effect", "waves-light", "red", "modal-trigger"], 
			icons.add);
		
		rightAddDiv.classList.add("fixed-action-btn");
		const rightAddBtn = createImageButton("Add Spending", "#new-spending-modal-" + this.month,
			["btn-floating", "btn-large", "waves-effect", "waves-light", "red", "modal-trigger"], 
			icons.add);
	
		summaryDiv.classList.add("fixed-action-btn-center");
		const summaryBtn = createImageButton("Add Spending", "#summary-modal-" + this.month,
			["btn-floating", "btn-large", "waves-effect", "waves-light", "red", "modal-trigger"], 
			icons.summary);

		leftAddDiv.appendChild(leftAddBtn);
		rightAddDiv.appendChild(rightAddBtn);
		summaryDiv.appendChild(summaryBtn);

		fabs.appendChild(leftAddDiv);
		fabs.appendChild(summaryDiv);
		fabs.appendChild(rightAddDiv);


		var elems = [leftAddDiv, rightAddDiv, summaryDiv];
		M.FloatingActionButton.init(elems, {});

		return fabs;
	}

	createNewSpendingModal() {
		const modal = create("div", {id: "new-spending-modal-" + this.month, classes: ["modal", "bottom-sheet"]});
		const modalContent = create("div", {classes: ["modal-content"]});
		const h4 = create("h4", {innerText: "New Spending"});
		const card = create("div", {classes: ["card"]});
		const cardContent = create("div", {classes: ["card-content", "container"]});
		const modalFooter = create("div", {classes: ["modal-footer"]});
		const saveButton = create("button", {classes: ["modal-close", "waves-effect", "waves-green", "btn-flat", "save-modal"]});
		saveButton.innerText = "Save";
		saveButton.addEventListener("click", this.onClickModalSave.bind(this), false);

		const boughtInputField = create("div", {classes: ["input-field"]});
		const boughtInput = create("input", {id: "bought_date" + this.month, type: "text", classes:["datepicker", "valid"]});
		const boughtLabel = create("label", {innerText: "Bought date:", classes:["active"]});
		var options = { year: 'numeric', month: 'short', day: 'numeric' };
		var today = new Date();
		boughtInput.value = today.toLocaleDateString("en-US", options);
		boughtLabel.setAttribute("for", "bought_date" + this.month);

		const descriptionInputField = create("div", {classes: ["input-field"]});
		const descriptionInput = create("input", {id: "description" + this.month, type: "text", classes:["validate"]});
		const descriptionLabel = create("label", {innerText: "Description:"});
		descriptionLabel.setAttribute("for", "description" + this.month);

		const categoryInputField = create("div", {classes: ["input-field", "modal-trigger"]});
		const categoryInput = create("input", {id: "category"+ this.month, type: "text", classes:["validate"]});
		const expenseTypeInput = create("input", {id: "expense_type"+ this.month, type: "hidden"});
		const categoryLabel = create("label", {innerText: "Category:"});
		categoryInputField.setAttribute("href", "#category-modal-" + this.month);
		categoryLabel.setAttribute("for",  "category"+ this.month);

		const priceInputField = create("div", {classes: ["input-field"]});
		const priceInput = create("input", {id: "price"+ this.month, type: "number", step: "0.01", classes:["validate"]});
		const priceLabel = create("label", {innerText: "Price:"});
		priceLabel.setAttribute("for", "price"+ this.month);

		boughtInputField.appendChild(boughtInput);
		boughtInputField.appendChild(boughtLabel);
		descriptionInputField.appendChild(descriptionInput);
		descriptionInputField.appendChild(descriptionLabel);
		categoryInputField.appendChild(categoryInput);
		categoryInputField.appendChild(expenseTypeInput);
		categoryInputField.appendChild(categoryLabel);
		priceInputField.appendChild(priceInput);
		priceInputField.appendChild(priceLabel);
		cardContent.appendChild(boughtInputField);
		cardContent.appendChild(descriptionInputField);
		cardContent.appendChild(categoryInputField);
		cardContent.appendChild(priceInputField);
		card.appendChild(cardContent);
		modalContent.appendChild(h4);
		modalContent.appendChild(card);
		modalFooter.appendChild(saveButton);
		modal.appendChild(modalContent);
		modal.appendChild(modalFooter);

		this.expenseTypeInput = expenseTypeInput;
		this.boughtInput = boughtInput;
		this.descriptionInput = descriptionInput;
		this.priceInput = priceInput;
		this.categoryInput = categoryInput;
		
		return modal;
	}

	createCategoryModal() {
		const categoryModal = create("div", { id: "category-modal-" + this.month, classes: ["modal", "bottom-sheet"]});
		const modalContent = create("div", { classes: ["modal-content"]});
		const modalFooter = create("div", { classes: ["modal-footer"]});
		const a = create("a", {id: "categoryModalClose", innerText: "Close", href: "#!", classes: ["modal-close", "waves-effect", "waves-green", "btn-flat"]});
		const categoryList = create("ul", {id: "categoryList", classes: ["collapsible", "popout"]});

		modalFooter.appendChild(a);
		modalContent.appendChild(categoryList);
		categoryModal.appendChild(modalContent);
		categoryModal.appendChild(modalFooter);

		this.categoryList = categoryList;
		this.drawCategoryList();
		return categoryModal;
	}
	//#endregion

	async syncSpendingsToNetwork() {
		await this.mergeLocalSpendingsToNetwork(true);
	}

	async mergeLocalSpendingsToNetwork(overwrite = false) {
		const spendingFileName = await this.getSpendingsFileKey();
		let networkFileId = localStorage.getItem(spendingFileName);
		if(networkFileId === null) {
			//No spending file found, write current data to network, but do not overwrite
			const cursorData = await this.idb.openCursor(SPENDINGS_STORE_NAME);
			networkFileId = await this.persistSpendingToNetwork(cursorData, overwrite);
			
			if(networkFileId === null) {
				console.error("Could not retrieve planning file from newtork");
			}
			
			return;
		}

		const networkSpendings = await gdrive.readFile(networkFileId);		
		const localSpendings = await this.idb.openCursor(SPENDINGS_STORE_NAME);

		for(const [networkKey, networkSpending] of networkSpendings) {
			const localSpending = localSpendings.get(networkKey);
			if(localSpending === undefined) {
				//Somebody else created a spending. Store locally
				spendings.idb.put(SPENDINGS_STORE_NAME, networkSpending, networkKey);
			}
			
			if(!this.areEqual(localSpending, networkSpending)) {
				if(localSpending.added) {
					//Conflict of keys. Add the network spending at the end of our idb
					spendings.idb.put(SPENDINGS_STORE_NAME, networkSpending);
				} else  if (localSpending.edited) {
					//We made changes, no need to edit anything
				} else {
					//Found a spending modified by somebody else, network is more reliable
					spendings.idb.put(SPENDINGS_STORE_NAME, networkSpending, networkKey);
				}
			}
		}

		for(const [localKey, localSpending] of localSpendings.entries()) {
			if(localSpending.deleted) {
				localSpendings.delete(localKey);
			}
		}

		const fileId = this.persistSpendingToNetwork(localSpendings, true);
		if(fileId) {
			const localSpendings = await this.idb.openCursor(SPENDINGS_STORE_NAME);
			for(const [key, spending] of localSpendings) {
				if(spending.edited) {
					delete spending.edited;
					this.idb.put(SPENDINGS_STORE_NAME, spending, key);
				}
				if(spending.added) {
					delete spending.added;
					this.idb.put(SPENDINGS_STORE_NAME, spending, key);
				}
			}
			//Refresh GUI
		} else {
			//revert
		}
		return localSpendings;

	}
	
	areEqual(thisSpending, thatSpending) {
		return thisSpending.bought_date === thatSpending.bought_date &&
			thisSpending.category === thatSpending.category &&
			thisSpending.description === thatSpending.description &&
			thisSpending.price === thatSpending.price &&
			thisSpending.type === thatSpending.type;
	}

	async persistSpendingToNetwork(spendings, overwrite) {
		const spendingsData = Array.from(spendings.entries());
		const yearFolder = await this.getSpendingsFileParent();
		if(!yearFolder) return;

		const fileName = this.currentMonth + ".json";
		const fileId = await gdrive.writeFile(yearFolder, fileName, spendingsData, overwrite);

		if(fileId) {
			//Store for fast retrieval
			const fileKey = this.getSpendingsFileKey();
			localStorage.setItem(fileKey, fileId);
		}
	}

	async getSpendingsFileParent() {
		if(this.yearFolder) {
			return this.yearFolder;
		}

		var topFolder = await gdrive.findFolder(APP_FOLDER);

		if (!topFolder) {
			topFolder = await gdrive.createFolder(APP_FOLDER);
		}
		if(!topFolder) return;

		var yearFolder = await gdrive.findFolder(this.currentYear, topFolder);
		if(!yearFolder) {
			yearFolder = await gdrive.createFolder(this.currentYear, topFolder);
		}

		this.yearFolder = yearFolder;
		return yearFolder;
	}

	async getSpendingsFileKey() {
		const now = new Date();
		const currentYear = now.toLocaleString("en-US", {year: "numeric"});
		const currentMonth = this.month;
		return currentYear + currentMonth;
	}

	async getAllSpendings(month) {
		const spendings = await this.idb.openCursor(SPENDINGS_STORE_NAME);
		const monthlySpendings = [];
		for (const [key, value] of spendings) {
			if (value.bought_date.includes(month)) {
				monthlySpendings.push([key, value]);
			}
		}
		return monthlySpendings;
		
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
		for (const [id, spending] of this.spendings) {
			if (!this.totals.has(spending.category)) {
				this.totals.set(spending.category, 0);
			}
			this.totals.set(spending.category, this.totals.get(spending.category) + parseFloat(spending.price));
		}
	}

	async extractPlanningBudgets() {
		this.budgets = new Map();
		const spendingTypes = new Set();
	
		for(const [id, spending] of this.spendings) {
			spendingTypes.add(spending.type);
		}

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

	insertSpending(spending) {
		spending.added = true;
		this.idb.put(SPENDINGS_STORE_NAME, spending).then(this.appendToSpendingTable.bind(this));
		this.syncSpendingsToNetwork();
	}

	appendToSpendingTable(spendingResult) {
		const key = spendingResult[0];
		const value = spendingResult[1];
		var row = this.appendRowToTable(this.spendingsTable, 
			[value.description, value.bought_date, value.category, value.price], 
			{ hidden:true, deletable:true, readonly: true });
		row.setAttribute("db_id", key);
	}

	appendRowToTable(table, data, options) {
		var index = -1;
		if (options.index) {
			index = options.index;
		}
		const row = table.tBodies[0].insertRow(index);
		var dataCell;
	
		for (const dataCtn of data) {
			dataCell = row.insertCell(-1);
			dataCell.textContent = dataCtn;
			if (!options.readonly) {
				dataCell.setAttribute("editable", true);
				
			}
			if (options.useBold == true) {
				dataCell.style.fontWeight = "bold";
			}
		}
	
		if (options.color) {
			dataCell.style.color = options.color;
		}
	
		if (options.deletable) {
			const buttonsCell = row.insertCell(-1);
			const btn = document.createElement("button");
			btn.classList.add("waves-effect", "waves-light", "red", "btn-small");
			buttonsCell.appendChild(btn);
			const img = document.createElement("img");
			img.classList.add("white-fill");
			img.innerHTML = "Delete";
			img.alt = "Delete";
			img.src = icons.delete;
			btn.appendChild(img);
			btn.addEventListener("click", onClickDelete, false);
			
			buttonsCell.setAttribute("hideable", "true");
			if (options.hidden) {
				buttonsCell.style.display = 'none';
			}
		}
		return row;
	}

	appendToSummaryTable(data, options) {
		this.appendRowToTable(this.summaryTable, data, options);
	}

	async drawCategoryList() {
		const categories = await this.pdb.openCursor(PLANNING_STORE_NAME);
		for (const [key, value] of categories.entries()) {
			if (value.type == "Expense") {
				const li = document.createElement("li");
				const header = document.createElement("div");
				const body = document.createElement("div");
				const span = document.createElement("span");
				const ul = document.createElement("ul");

				header.classList.add("collapsible-header");
				body.classList.add("collapsible-body");
				ul.classList.add("card", "collection");
				
				header.innerText = key;

				for (const [dataKey, data] of Object.entries(value.data)) {
					const li = document.createElement("li");
					li.classList.add("collection-item", "modal-close");
					li.innerText = data.name;
					li.addEventListener("click", this.onClickCategory.bind(this), false);
					ul.appendChild(li);
				}

				span.appendChild(ul);
				body.appendChild(span);
				li.appendChild(header);
				li.appendChild(body);
				this.categoryList.appendChild(li);
			}
		}
	}

	upgradeSpendingsDb(db, oldVersion) {
		if (oldVersion === 0) {
			let store = db.createObjectStore(SPENDINGS_STORE_NAME, { autoIncrement: true });
			store.createIndex('byCategory', 'category', { unique: false });
		}
	}

	//#region GUI handlers
	onClickCategory(event) {
		this.categoryInput.value = event.target.innerHTML;
		this.categoryInput.classList.add('valid');
		this.expenseTypeInput.value = (event.target.parentNode.parentNode.parentNode.parentNode.firstElementChild.innerHTML);
		M.updateTextFields();
	}

	onClickModalSave(event) {
		var expenseType = this.expenseTypeInput.value;
		var bought_date_var = this.boughtInput.value;
		var category_var = this.categoryInput.value;
		var description_var = this.descriptionInput.value;
		var price_var = this.priceInput.value;

		this.insertSpending({
			type: expenseType,
			bought_date: bought_date_var,
			description: description_var,
			category: category_var,
			price: price_var
		});
	}
	//#endregion
}

//#region GUI event handlers
function onClickDelete(event) {
	const row = event.target.parentNode.parentNode;
	spendings.idb.delete(SPENDINGS_STORE_NAME, parseInt(row.getAttribute("db_id")));
	row.parentNode.removeChild(row);
}

function onClickEdit() {
	const saveBtn = document.getElementById("SaveBtn");
	saveBtn.style.display = "";
	const editBtn = document.getElementById("EditBtn");
	editBtn.style.display = "none";

	const tableDefs = document.querySelectorAll('td[editable="true"]')
	for (var i = 0; i < tableDefs.length; ++i) {
		tableDefs[i].contentEditable = "true";
	}

	const ths = document.querySelectorAll('th[hideable="true"]')
	for (var i = 0; i < ths.length; ++i) {
		ths[i].style.display = '';
	}

	const trs = document.querySelectorAll('td[hideable="true"]')
	for (var i = 0; i < trs.length; ++i) {
		trs[i].style.display = '';
	}
}

function onClickSave() {
	const editBtn = document.getElementById("EditBtn");
	editBtn.style.display = "";
	const saveBtn = document.getElementById("SaveBtn");
	saveBtn.style.display = "none";
	
	const tableDefs = document.querySelectorAll('td[editable="true"]')
	for (var i = 0; i < tableDefs.length; ++i) {
		tableDefs[i].contentEditable = "false";
	}

	const ths = document.querySelectorAll('th[hideable="true"]')
	for (var i = 0; i < ths.length; ++i) {
		ths[i].style.display = 'none';
	}

	const trs = document.querySelectorAll('td[hideable="true"]')
	for (var i = 0; i < trs.length; ++i) {
		trs[i].style.display = 'none';
	}
	spendings.mergeLocalSpendingsToNetwork(true);
}

//#endregion


document.addEventListener("DOMContentLoaded", initSpending);
document.getElementById("EditBtn").addEventListener("click", onClickEdit);
document.getElementById("SaveBtn").addEventListener("click", onClickSave);