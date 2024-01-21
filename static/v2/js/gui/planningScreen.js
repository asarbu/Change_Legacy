class PlanningScreen {
	onClickUpdate = undefined;
    constructor(id, planningCollections) {
		this.planningCollections = planningCollections;
		this.id = id;
		//this.name = planningCollection.collectionName;
		this.editMode = false;
    }

    init() {
		const container = this.sketchAsFragment();
		this.gfx = new GraphicEffects(container);
    }
		
	//#region DOM creation

	/**
	 * Creates all necessary objects needed to draw current screen
	 * @returns {DocumentFragment}
	 */
	sketchAsFragment() {
		const container = create("div", {id: this.id, classes: ["container"]});
		const section = create("div", { classes: ["section", "no-pad-bot"]});
		this.dropupContent = create("div", {classes: ["dropup-content", "top-round"]});

		const entries = Object.entries(this.planningCollections);
		const span = create("span", {innerText: "▲", classes: ["white-50"]});
		this.slicesButton = create("button", {classes: ["nav-item"]});
		this.slicesButton.innerText = entries[0][0] + " ";
		this.slicesButton.appendChild(span);
		this.slicesButton.addEventListener("click", this.onClickDropup.bind(this), false);

		for (const [id, planningCollection] of entries) {
			const slice = this.createSlice(id, planningCollection);
			
			const anchor = create("a", {innerText: planningCollection.collectionName});
			this.dropupContent.appendChild(anchor);
		
			section.appendChild(slice);	
		}
		
		container.appendChild(section);
		container.appendChild(this.dropupContent);
		
		this.container = container;
		return container;
	}

	createSlice(id , planningCollection) {
		const slice = create("div", { classes: ["slice"]});
		const h1 = create("h1", { innerText: id });
		
		slice.appendChild(h1);

		const tables = this.createPlanningTables(planningCollection);
		slice.appendChild(tables);

		return slice;
	}

	createPlanningTables(planningCollection) {
		const tableFragment = document.createDocumentFragment();
		for (const [groupId, group] of Object.entries(planningCollection.groups)) {
			const table = create('table', {id: groupId});
			tableFragment.appendChild(table);
			const thead = create('thead');
			const tbody = create('tbody');

			table.appendChild(thead);
			table.appendChild(tbody);			
			table.userData = group;

			const headingRow = create('tr');
			const nameCol = create('th');
			const daily = create('th');
			const monthly = create('th');
			const yearly = create('th');
			const buttons = create('th');
			const button = createImageButton('Add Row', "", [], icons.add_row);
			button.addEventListener("click", this.onClickAddRow.bind(this), false);

			nameCol.innerText = group.groupName;
			daily.innerText = "Daily";
			monthly.innerText = "Monthly";
			yearly.innerText = "Yearly";

			buttons.setAttribute("hideable", "true");
			buttons.style.display = "none";

			headingRow.appendChild(nameCol);
			headingRow.appendChild(daily);
			headingRow.appendChild(monthly);
			headingRow.appendChild(yearly);
			headingRow.appendChild(buttons);
			buttons.appendChild(button);
			thead.appendChild(headingRow);

			const data = group.items;
			for (const [itemId, item] of Object.entries(group.items)) {
				this.createRow(table, itemId, item, { index: -1, hidden: true, deletable: true, readonly: false });
			}
			this.recomputeTotal(table, true);

			//this.tab.appendChild(tableFragment);
		}
		return tableFragment;
	}

	createRow(table, id, item, options) {
		//console.log("Creating row", item,options)
		var index = -1;
		if (options.index) {
			index = options.index;
		}
		const row = table.tBodies[0].insertRow(index);
		row.id = id;
		row.userData = item;

		this.createDataCell(row, item.itemName, options);
		this.createDataCell(row, item.daily, options);
		this.createDataCell(row, item.monthly, options);
		this.createDataCell(row, item.yearly, options);

		if (options.deletable) {	
			const buttonsCell = row.insertCell(-1);
			const btn = createImageButton("Delete", "", ["waves-effect", "waves-light", "red", "btn-small"], icons.delete);
			btn.addEventListener("click", this.onClickDelete.bind(this));
			buttonsCell.appendChild(btn);
			
			buttonsCell.setAttribute("hideable", "true");
			if (options.hidden) {
				buttonsCell.style.display = 'none';
			}
		}
		return row;
	}

	createDataCell(row, text, options) {
		//console.log("Create data cell", text, options.readonly)
		const dataCell = row.insertCell(-1);
		dataCell.textContent = text;
		if (!options.readonly) {
			dataCell.setAttribute('editable', 'true');
			if(this.editMode) {
				dataCell.setAttribute('contenteditable', 'true');
			}
			dataCell.addEventListener('keyup', this.onKeyUpCell.bind(this), false);
		}
		if (options.useBold == true) {
			dataCell.style.fontWeight = "bold";
		}

		if (options.color) {
			dataCell.style.color = options.color;
		}
		return dataCell;
	}
	
	activate() {
		if(this.slicesButton) {
			const slicesButton = document.getElementById("sliceName");
			slicesButton.parentElement.replaceChild(this.slicesButton, slicesButton);
		} else {
			document.getElementById("sliceId").innerText = this.id;
			document.getElementById("sliceName").innerText = this.name;
		}
		
		document.getElementById("main").appendChild(this.container);
		this.gfx.init();
	}
	//#endregion

	//#region DOM manipulation
	
	update(planningCollection) {
		this.planningCollection = planningCollection;
		var tables = this.container.getElementsByTagName("TABLE");
		for (var i=tables.length-1; i>=0;i-=1)
		   if (tables[i]) tables[i].parentNode.removeChild(tables[i]);
		this.createPlanningTable(this.planningCollection);
	}

	//Recompute from DOM instead of memory/db/network to have real time updates in UI
	recomputeTotal(table, create = false) {
		//TODO Use planning collection to recompute, instead of parsing.
		let lastRow;
		const total = {
			itemName: "Total",
			daily: 0,
			monthly: 0,
			yearly: 0
		}
		if(create) {
			const options = { useBold: true, readonly: true, index: -1, hidden: true, deletable: false };
			lastRow = this.createRow(table, "Total", total, options);
		}
		else {
			lastRow = table.tBodies[0].rows[table.tBodies[0].rows.length - 1];
		}

		let totalDaily = 0;
		let totalMonthly = 0;
		let totalYearly = 0;

		for (let rowIndex = 0; rowIndex < table.tBodies[0].rows.length - 1; rowIndex++) {
			const row = table.tBodies[0].rows[rowIndex];
			totalDaily += parseInt(row.cells[1].innerText);
			totalMonthly += parseInt(row.cells[2].innerText);
			totalYearly += parseInt(row.cells[3].innerText);
		}

		lastRow.cells[1].innerText = totalDaily;
		lastRow.cells[2].innerText = totalMonthly;
		lastRow.cells[3].innerText = totalYearly;
	}
	//#endregion

	//#region event handlers
	onClickDelete(event) {
		const btn = event.target;
		const row = btn.parentNode.parentNode;
		const tBody = row.parentNode;
		const itemId = row.id;
		const groupId = row.parentNode.parentNode.id;
		//console.log("OnClickDelete", itemId, groupId);
		
		delete this.planningCollection.groups[groupId].items[itemId];
		tBody.removeChild(row);
		this.recomputeTotal(tBody.parentNode);
	}
    
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

		this.editMode = true;
	}

	onClickSave() {
		//console.log("onClickSave", this.onUpdate);
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
		
		if(this.onClickUpdate) {
			this.onClickUpdate(this.id, this.planningCollection);
		}

		this.editMode = false;
	}

	onKeyUpCell(event) {
		//TODO update the value in the collection to be saved later
		const cell = event.target;
		const row = cell.parentNode;
		const table = row.parentNode.parentNode;

		const cellIndex = event.target.cellIndex;
		let item = row.userData;

		switch (cellIndex) {
			case 0:
				item.itemName = cell.textContent;
				break;
			case 1:
				item.daily = parseInt(cell.textContent);
				item.monthly = item.daily * 30;
				item.yearly = item.daily * 365;
				cell.parentNode.cells[2].textContent = item.monthly;
				cell.parentNode.cells[3].textContent = item.yearly;
				break;
			case 2:
				item.monthly = parseInt(cell.textContent);
				item.daily = Math.floor(item.monthly / 30);
				item.yearly = item.monthly * 12;
				cell.parentNode.cells[1].textContent = item.daily;
				cell.parentNode.cells[3].textContent = item.yearly;
				break;
			case 3:
				item.yearly = parseInt(cell.textContent);
				item.daily = Math.floor(item.yearly / 365);
				item.monthly = Math.floor(item.yearly / 12);
				cell.parentNode.cells[1].textContent = item.daily;
				cell.parentNode.cells[2].textContent = item.monthly;
				break;
		}

		this.recomputeTotal(table);		
		this.planningCollection.groups[table.id].items[row.id] = item;

	}

	onClickDropup(event) {
		if(this.dropupContent.style.display === "none") {
			this.dropupContent.style.display = "block";
		} else {
			this.dropupContent.style.display = "none";
		}
	}

	onClickAddRow(event) {
		const btn = event.target;
		const item = {
			itemName: "New Row",
			daily: 0,
			monthly: 0,
			yearly: 0
		}

		var table = btn.parentNode.parentNode.parentNode.parentNode;
		var index = table.rows.length - 2;

		const options = { index: index, useBold: false, deletable: true, hidden: false, readonly: false };
		const id = new Date().getTime(); //millisecond precision
		this.createRow(table, id, item, options);

		this.planningCollection.groups[table.id].items[id] = item;
	}

	//#endregion

}


document.body.addEventListener("mouseover", onMouseOver, false);
document.body.addEventListener("mouseout", onMouseOut, false);