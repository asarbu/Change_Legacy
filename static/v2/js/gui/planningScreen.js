import GraphicEffects from './effects.js';
import { create, createImageButton } from './dom.js';
import Statement from '../persistence/planning/model/statement.js';
import Category from '../persistence/planning/model/category.js';

export default class PlanningScreen {
	onClickUpdate = undefined;

	constructor(id, planningContexts) {
		/**
		 * @type { Array<Statement> }
		 */
		this.planningContexts = planningContexts;
		this.id = id;
		// this.name = planningCollection.collectionName;
		this.editMode = false;
	}

	init() {
		this.gfx = new GraphicEffects();
		this.container = this.sketchAsFragment();
	}

	// #region DOM creation

	/**
	 * Creates all necessary objects needed to draw current screen
	 * @returns {DocumentFragment}
	 */
	sketchAsFragment() {
		const container = create('div', { id: this.id, classes: ['container'] });
		const section = create('div', { classes: ['section'] });
		const span = create('span', { innerText: '▲', classes: ['white-50'] });
		this.dropupContent = create('div', { classes: ['dropup-content', 'top-round'] });
		this.dropupContent.style.display = 'none';

		this.slicesButton = create('button', { classes: ['nav-item'], innerText: this.planningContexts[0].name });
		this.slicesButton.addEventListener('click', this.onClickDropup.bind(this), false);

		for (let i = 0; i < this.planningContexts.length; i += 1) {
			const planningContext = this.planningContexts[i];
			const slice = this.createSlice(planningContext);

			const anchor = create('a', { innerText: planningContext.name });
			anchor.setAttribute('data-slice-index', i);
			anchor.addEventListener('click', this.onClickSetSlice.bind(this));
			this.dropupContent.appendChild(anchor);

			section.appendChild(slice);
		}

		this.slicesButton.appendChild(span);
		this.slicesButton.appendChild(this.dropupContent);
		container.appendChild(section);

		return container;
	}

	/**
	 * Creates a DOM slice
	 * @param {Statement} planningContext Planning context representing this slice
	 * @returns {DOMElement} Constructed and decorated DOM element
	 */
	createSlice(planningContext) {
		const slice = create('div', { classes: ['slice'] });
		const h1 = create('h1', { innerText: planningContext.name });

		slice.appendChild(h1);

		const tables = this.createPlanningTables(planningContext.categories);
		slice.appendChild(tables);

		return slice;
	}

	/**
	 * Creates a Document Fragment containing all of the tables constructed from the categories.
	 * @param {Array<Category>} planningCategories Categories to draw inside parent slice
	 * @returns {DocumentFragment} Document fragment with all of the created tables
	 */
	createPlanningTables(planningCategories) {
		const tableFragment = document.createDocumentFragment();
		for (let i = 0; i < planningCategories.length; i += 1) {
			const planningCategory = planningCategories[i];
			const table = create('table', { id: planningCategory.id, classes: ['top-round', 'bot-round'] });
			tableFragment.appendChild(table);
			const thead = create('thead');
			const tbody = create('tbody');

			table.appendChild(thead);
			table.appendChild(tbody);
			table.userData = planningCategory;

			const headingRow = create('tr');
			const nameCol = create('th');
			const daily = create('th');
			const monthly = create('th');
			const yearly = create('th');
			const buttons = create('th');
			const button = createImageButton('Add Row', '', [], undefined);
			button.addEventListener('click', this.onClickAddRow.bind(this), false);

			nameCol.innerText = planningCategory.name;
			daily.innerText = 'Daily';
			monthly.innerText = 'Monthly';
			yearly.innerText = 'Yearly';

			buttons.setAttribute('hideable', 'true');
			buttons.style.display = 'none';

			headingRow.appendChild(nameCol);
			headingRow.appendChild(daily);
			headingRow.appendChild(monthly);
			headingRow.appendChild(yearly);
			headingRow.appendChild(buttons);
			buttons.appendChild(button);
			thead.appendChild(headingRow);

			for (let j = 0; j < planningCategory.goals.length; j += 1) {
				const planningGoal = planningCategory.goals[j];
				this.createRow(
					table,
					planningGoal,
					{
						index: -1,
						hidden: true,
						deletable: true,
						readonly: false,
					},
				);
			}
			this.recomputeTotal(table, true);

			// this.tab.appendChild(tableFragment);
		}
		return tableFragment;
	}

	createRow(table, item, options) {
		// console.log("Creating row", item,options)
		let index = -1;
		if (options?.index) {
			index = options.index;
		}
		const row = table.tBodies[0].insertRow(index);
		row.id = item.id;
		row.userData = item;

		this.createDataCell(row, item.name, options);
		this.createDataCell(row, item.daily, options);
		this.createDataCell(row, item.monthly, options);
		this.createDataCell(row, item.yearly, options);

		if (options?.deletable) {
			const buttonsCell = row.insertCell(-1);
			const btn = createImageButton('Delete', '', [], undefined);
			btn.addEventListener('click', this.onClickDelete.bind(this));
			buttonsCell.appendChild(btn);

			buttonsCell.setAttribute('hideable', 'true');
			if (options.hidden) {
				buttonsCell.style.display = 'none';
			}
		}
		return row;
	}

	createDataCell(row, text, options) {
		// console.log("Create data cell", text, options.readonly)
		const dataCell = row.insertCell(-1);
		dataCell.textContent = text;
		if (!options?.readonly) {
			dataCell.setAttribute('editable', 'true');
			if (this.editMode) {
				dataCell.setAttribute('contenteditable', 'true');
			}
			dataCell.addEventListener('keyup', this.onKeyUpCell.bind(this), false);
		}
		if (options?.useBold === true) {
			dataCell.style.fontWeight = 'bold';
		}

		if (options?.color) {
			dataCell.style.color = options.color;
		}
		return dataCell;
	}

	activate() {
		if (this.slicesButton) {
			const slicesButton = document.getElementById('sliceName');
			slicesButton.parentElement.replaceChild(this.slicesButton, slicesButton);
		} else {
			document.getElementById('sliceId').innerText = this.id;
			document.getElementById('sliceName').innerText = this.name;
		}

		document.getElementById('main').appendChild(this.container);
		this.gfx.init(this.container);
	}
	// #endregion

	// #region DOM manipulation
	update(planningCollection) {
		this.planningCollection = planningCollection;
		const tables = this.container.getElementsByTagName('TABLE');
		for (let i = tables.length - 1; i >= 0; i -= 1) {
			if (tables[i]) {
				tables[i].parentNode.removeChild(tables[i]);
			}
		}
		this.createPlanningTable(this.planningCollection);
	}

	// Recompute from DOM instead of memory/db/network to have real time updates in UI
	recomputeTotal(table, forceCreate = false) {
		// TODO Use planning collection to recompute, instead of parsing.
		let lastRow;
		const total = {
			itemName: 'Total',
			daily: 0,
			monthly: 0,
			yearly: 0,
		};
		if (forceCreate) {
			const options = {
				useBold: true,
				readonly: true,
				index: -1,
				hidden: true,
				deletable: false,
			};
			lastRow = this.createRow(table, 'Total', total, options);
		} else {
			lastRow = table.tBodies[0].rows[table.tBodies[0].rows.length - 1];
		}

		let totalDaily = 0;
		let totalMonthly = 0;
		let totalYearly = 0;

		for (let rowIndex = 0; rowIndex < table.tBodies[0].rows.length - 1; rowIndex += 1) {
			const row = table.tBodies[0].rows[rowIndex];
			totalDaily += parseInt(row.cells[1].innerText, 10);
			totalMonthly += parseInt(row.cells[2].innerText, 10);
			totalYearly += parseInt(row.cells[3].innerText, 10);
		}

		lastRow.cells[1].innerText = totalDaily;
		lastRow.cells[2].innerText = totalMonthly;
		lastRow.cells[3].innerText = totalYearly;
	}

	updateSliceButtonText(text) {
		this.slicesButton.innerText = `${text} `;
	}
	// #endregion

	// #region event handlers
	onClickDelete(event) {
		const btn = event.target;
		const row = btn.parentNode.parentNode;
		const tBody = row.parentNode;
		const itemId = row.id;
		const groupId = row.parentNode.parentNode.id;
		// console.log("OnClickDelete", itemId, groupId);

		delete this.planningCollection.groups[groupId].items[itemId];
		tBody.removeChild(row);
		this.recomputeTotal(tBody.parentNode);
	}

	onClickEdit() {
		this.saveBtn.style.display = '';
		this.editBtn.style.display = 'none';

		const tableDefs = document.querySelectorAll('td[editable="true"]');
		for (let i = 0; i < tableDefs.length; i += 1) {
			tableDefs[i].contentEditable = 'true';
		}

		const ths = document.querySelectorAll('th[hideable="true"]');
		for (let i = 0; i < ths.length; i += 1) {
			ths[i].style.display = '';
		}

		const trs = document.querySelectorAll('td[hideable="true"]');
		for (let i = 0; i < trs.length; i += 1) {
			trs[i].style.display = '';
		}

		this.editMode = true;
	}

	onClickSave() {
		// console.log("onClickSave", this.onUpdate);
		this.editBtn.style.display = '';
		this.saveBtn.style.display = 'none';

		const tableDefs = document.querySelectorAll('td[editable="true"]');
		for (let i = 0; i < tableDefs.length; i += 1) {
			tableDefs[i].contentEditable = 'false';
		}

		const ths = document.querySelectorAll('th[hideable="true"]');
		for (let i = 0; i < ths.length; i += 1) {
			ths[i].style.display = 'none';
		}

		const trs = document.querySelectorAll('td[hideable="true"]');
		for (let i = 0; i < trs.length; i += 1) {
			trs[i].style.display = 'none';
		}

		if (this.onClickUpdate) {
			this.onClickUpdate(this.id, this.planningCollection);
		}

		this.editMode = false;
	}

	onKeyUpCell(event) {
		// TODO update the value in the collection to be saved later
		const cell = event.target;
		const row = cell.parentNode;
		const table = row.parentNode.parentNode;

		const { cellIndex } = event.target;
		const item = row.userData;

		switch (cellIndex) {
		case 0:
			item.itemName = cell.textContent;
			break;
		case 1:
			item.daily = parseInt(cell.textContent, 10);
			item.monthly = item.daily * 30;
			item.yearly = item.daily * 365;
			cell.parentNode.cells[2].textContent = item.monthly;
			cell.parentNode.cells[3].textContent = item.yearly;
			break;
		case 2:
			item.monthly = parseInt(cell.textContent, 10);
			item.daily = Math.floor(item.monthly / 30);
			item.yearly = item.monthly * 12;
			cell.parentNode.cells[1].textContent = item.daily;
			cell.parentNode.cells[3].textContent = item.yearly;
			break;
		case 3:
			item.yearly = parseInt(cell.textContent, 10);
			item.daily = Math.floor(item.yearly / 365);
			item.monthly = Math.floor(item.yearly / 12);
			cell.parentNode.cells[1].textContent = item.daily;
			cell.parentNode.cells[2].textContent = item.monthly;
			break;
		default:
			break;
		}

		this.recomputeTotal(table);
		this.planningCollection.groups[table.id].items[row.id] = item;
	}

	onClickDropup(event) {
		if (this.dropupContent.style.display === 'none') {
			this.dropupContent.style.display = 'block';
			const clickedDropup = event.target.firstElementChild;
			clickedDropup.innerText = '▼';
		} else {
			// No need to set arrow up because it'll be handled by setSliceButtonText
			this.dropupContent.style.display = 'none';
		}
	}

	onClickSetSlice(e) {
		this.gfx.onClickSetSlice(e);
		const sliceName = e.target.innerText;
		this.slicesButton.firstChild.nodeValue = `${sliceName} `;
	}

	onClickAddRow(event) {
		const btn = event.target;
		const item = {
			itemName: 'New Row',
			daily: 0,
			monthly: 0,
			yearly: 0,
		};

		const table = btn.parentNode.parentNode.parentNode.parentNode;
		const index = table.rows.length - 2;

		const options = {
			index: index,
			useBold: false,
			deletable: true,
			hidden: false,
			readonly: false,
		};
		const id = new Date().getTime(); // millisecond precision
		this.createRow(table, id, item, options);

		this.planningCollection.groups[table.id].items[id] = item;
	}

	// #endregion
}
