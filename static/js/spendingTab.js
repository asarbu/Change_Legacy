class SpendingTab {
	constructor(year, month, forceCreate) {
		this.year = year;
		this.month = month;
		this.forceCreate = forceCreate;
	}

	init() {
		console.log("Init spending tab")
		this.createTab();
		
		M.AutoInit();
	}

	createTab() {
		const tab = create("div", {id: this.month, classes: ["container"]});
		this.tab = tab;
		const section = create("div", {clsses: ["section", "no-pad-bot"]});
		const container = create("div", {classes: ["container"]});
		//const h1 = create("h1", {classes: ["header", "center", "red-text"], innerText: monthName});
		const row = create("div", {classes: ["row", "center"]});
		const h5 = create("h5", {classes: ["header", "col", "s12", "light"], innerText: "Monthly spendings"});
		const li = create("li", {classes: ["tab"]});
		const a = create("a");
		const h6 = create("h6", {innerText: this.month});
		const buttonRow = create("div", {classes:["row", "center"]});
		const editBtn = createImageButton("EditBtn", "", ["waves-effect", "red", "waves-light", "btn"],	icons.edit);
		const saveBtn = createImageButton("SaveBtn", "", ["waves-effect", "red", "waves-light", "btn"],	icons.save);

		a.setAttribute("href", "#" + this.month);
	
		if(this.forceCreate) {
			a.classList.add("active");
		}
	
		//container.appendChild(h1);
		row.appendChild(h5);
		container.appendChild(row);
		section.appendChild(container);
		tab.appendChild(section);
		a.appendChild(h6);
		li.appendChild(a);
		buttonRow.appendChild(editBtn);
		buttonRow.appendChild(saveBtn);
	
		const table = this.createSpendingsTable();
		const fabs = this.createFloatingActionButtons();
		/*const summaryModal = this.createSummaryModal();
		const newSpendingModal = this.createNewSpendingModal();
		const categoryModal = this.createCategoryModal();*/

		editBtn.addEventListener("click", this.onClickEdit.bind(this));
		saveBtn.addEventListener("click", this.onClickSave.bind(this));
		saveBtn.style.display = "none";

		this.spendingsTable = table;
		/*this.summaryModal = summaryModal;
		this.categoryModal = categoryModal;*/
		this.editBtn = editBtn;
		this.saveBtn = saveBtn;

		tab.appendChild(table);
		/*tab.appendChild(summaryModal);
		tab.appendChild(newSpendingModal);
		tab.appendChild(categoryModal);*/
		tab.appendChild(fabs);
		tab.appendChild(buttonRow);

		const main = document.getElementById("main");
		main.appendChild(tab);
		document.getElementById("tabs").appendChild(li);
		
		const loadingTab = document.getElementById("loading_tab");
		if(loadingTab) {
			loadingTab.parentNode.removeChild(loadingTab);
		}
	}
	
	createSpendingsTable() {
		const table = create("table", {id: this.month, classes: ["striped", "row", "table-content"]});
		const thead = create("thead");
		const tr = create("tr");
		const thMonthName = create("th", {innerText: this.month});
		const thDate = create("th", {innerText: "Date"});
		const thCategory = create("th", {innerText: "Category"});
		const thAmount = create("th", {innerText: "Amount"});
		const thEdit = create("th", {innerText: "Edit"});
		const tBody = create("tbody");

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
		const modal = create("div", {id: "summary-modal-" + this.month, classes: ["modal", "bottom-sheet"]});
		const modalContent = create("div", {classes: ["modal-content"]});
		const modalFooter = create("div", {classes: ["modal-footer"]});
		const h4 = create("h4", {innerText: "Expenses vs. planning summary"});
		const table = create("table", {id: "summary-table-" + this.month, classes: ["striped", "row", "table-content"]});
		const tHead = create("thead");
		const tr = create("tr");
		const thCategory = create("th", {innerText: "Category"});
		const thSpending = create("th", {innerText: "Spending"});
		const thBudget = create("th", {innerText: "Budget"});
		const thPercentage = create("th", {innerText: "Percent"});
		const tBody = create("tbody");
		const a = create("a", {innerText: "Close", classes: ["modal-close", "waves-effect", "waves-green", "btn-flat"]});

		a.setAttribute("href", "#!");

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
		const fabs = create("div");
		const leftAddDiv = create("div", {classes: ["fixed-action-btn-left"]});
		const rightAddDiv = create("div", {classes: ["fixed-action-btn"]});
		const summaryDiv = create("div", {classes: ["fixed-action-btn-center"]});

		const leftAddBtn = createImageButton("Add Spending", "#new-spending-modal-" + this.month,
			["btn-floating", "btn-large", "waves-effect", "waves-light", "red", "modal-trigger"], 
			icons.add);
		
		const rightAddBtn = createImageButton("Add Spending", "#new-spending-modal-" + this.month,
			["btn-floating", "btn-large", "waves-effect", "waves-light", "red", "modal-trigger"], 
			icons.add);
	
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

	async refresh() {
        //console.log("Refreshing spendings...");
		//TODO replace this with creating a new tbody and replacing old one
		this.spendingsTable.tBodies[0].innerHTML = "";
		
		const spendingsMap = await this.spendingCache.getAll();
		this.spendings = Array.from(spendingsMap.values());

		for (const [id, spending] of this.spendings.entries()) {
			this.appendToSpendingTable([id, spending]);
		}
		
		this.categorizeSpendings();
		await this.extractPlanningBudgets();
		this.processSummary();
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
			const btn = createImageButton("Delete","", ["waves-effect", "waves-light", "red", "btn-small"], icons.delete);
			btn.addEventListener("click", this.onClickDelete.bind(this), false);
			
			buttonsCell.appendChild(btn);
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
		const categories = await this.planningCache.getAll();
		for (const [key, value] of categories.entries()) {
			if (value.type == "Expense") {
				const li = create("li");
				const header = create("div", {innerText: key, classes: ["collapsible-header"]});
				const body = create("div", {classes: ["collapsible-body"]});
				const span = create("span");
				const ul = create("ul", {classes: ["card", "collection"]});

				for (const [dataKey, data] of Object.entries(value.data)) {
					const li = create("li", {innerText: data.name, classes: ["collection-item", "modal-close"]});
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

	categorizeSpendings() {
		this.totals = new Map();
		
		for (const [id, spending] of this.spendings.entries()) {
			if (!this.totals.has(spending.category)) {
				this.totals.set(spending.category, 0);
			}
			this.totals.set(spending.category, this.totals.get(spending.category) + parseFloat(spending.price));
		}
	}

	async extractPlanningBudgets() {
		this.budgets = new Map();
		const spendingTypes = new Set();
	
		for(const [id, spending] of this.spendings.entries()) {
			spendingTypes.add(spending.type);
		}

		for (const spendingType of spendingTypes) {
			const planningItem = await this.planningCache.get(spendingType);
			for (const planningBudget of planningItem.data) {
				this.budgets.set(planningBudget.name, planningBudget.monthly);
			}
		}
	}

	processSummary() {
		let totalSpent = 0;
		let totalBudget = 0;
		let totalPercent = 0.00;
		let count = 0;
		//TODO replace this with creating a new tbody and replacing old one
		this.summaryTable.tBodies[0].innerHTML = "";
		for (const [key, value] of this.totals) {
			const planningBudget = this.budgets.get(key)
			const percentage = value / parseFloat(planningBudget);
			this.appendToSummaryTable([key, value, planningBudget, parseInt(percentage * 100)], { readonly: true, color: getColorForPercentage(percentage) });
			
			totalBudget = totalBudget + parseInt(planningBudget);
			totalSpent = totalSpent + parseInt(value);
			totalPercent = totalPercent + parseInt(percentage * 100);
			count++;
		}
		const options = { useBold: true, readonly: true, index: -1, color: getColorForPercentage(totalPercent/count)};
		this.appendToSummaryTable(["Total", totalSpent, totalBudget, parseInt(totalPercent/count)], options);
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

		this.spendingCache.insert({
			type: expenseType,
			bought_date: bought_date_var,
			description: description_var,
			category: category_var,
			price: price_var
		});
	}

	async onClickDelete(event) {
		const row = event.target.parentNode.parentNode;
		const key = parseInt(row.getAttribute("db_id"));
		const localSpending = await this.idb.get(SPENDINGS_STORE_NAME, key);
		localSpending.deleted = true;
		this.idb.put(SPENDINGS_STORE_NAME, localSpending, key);
		row.parentNode.removeChild(row);
	}

	onClickEdit() {
		this.saveBtn.style.display = "";
		this.editBtn.style.display = "none";

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

	onClickSave() {
		this.editBtn.style.display = "";
		this.saveBtn.style.display = "none";
		
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
		this.mergeLocalSpendingsToNetwork();
	}

	//#endregion
}