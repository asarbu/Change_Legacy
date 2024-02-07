import GraphicEffects from './effects.js';
import { create, createImageButton } from './dom.js';
import Statement from '../persistence/planning/model/statement.js';
import Category from '../persistence/planning/model/category.js';
import icons from './icons.js';

export default class PlanningScreen {
	onClickUpdate = undefined;

	constructor(id, statements) {
		/**
		 * @type { Array<Statement> }
		 */
		this.statements = statements;
		this.id = id;
		// this.name = planningCollection.collectionName;
		this.editMode = false;
	}

	init() {
		this.gfx = new GraphicEffects();
		this.container = this.sketchAsFragment();
		this.navbar = this.createNavBar();
	}

	// #region DOM creation

	/**
	 * Creates all necessary objects needed to draw current screen
	 * @returns {DocumentFragment}
	 */
	sketchAsFragment() {
		const container = create('div', { id: this.id, classes: ['container'] });
		const section = create('div', { classes: ['section'] });
		this.dropupContent = create('div', { classes: ['dropup-content', 'top-round'] });
		this.dropupContent.style.display = 'none';

		// TODO Merge this with navbar creation, since we are iterating through same array.
		for (let i = 0; i < this.statements.length; i += 1) {
			const statement = this.statements[i];
			const slice = this.createSlice(statement);

			section.appendChild(slice);
		}

		container.appendChild(section);

		return container;
	}

	/**
	 * Creates a DOM slice
	 * @param {Statement} statement Statement representing this slice
	 * @returns {DOMElement} Constructed and decorated DOM element
	 */
	createSlice(statement) {
		const slice = create('div', { classes: ['slice'] });
		const h1 = create('h1', { innerText: statement.name });

		slice.appendChild(h1);

		const tables = this.createPlanningTables(statement.categories);
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
			const button = createImageButton('Add Row', '', ['nav-item', 'large-text'], icons.add_row);
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

		const buttonsCell = row.insertCell(-1);

		if (options?.deletable) {
			const btn = createImageButton('Delete', '', ['nav-item', 'large-text'], icons.delete);
			btn.addEventListener('click', this.onClickDelete.bind(this));
			buttonsCell.appendChild(btn);
		}

		buttonsCell.setAttribute('hideable', 'true');
		if (options.hidden) {
			buttonsCell.style.display = 'none';
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
		/* if (this.slicesButton) {
			const slicesButton = document.getElementById('sliceName');
			slicesButton.parentElement.replaceChild(this.slicesButton, slicesButton);
		} else {
			document.getElementById('sliceId').innerText = this.id;
			document.getElementById('sliceName').innerText = this.name;
		}
*/
		const mainElement = document.getElementById('main');
		mainElement.appendChild(this.container);
		mainElement.appendChild(this.navbar);
		this.gfx.init(this.container);
	}

	createNavBar() {
		const navbar = create('nav');
		const navHeader = create('div', {classes: ['nav-header']}, navbar);
		const leftAddButton = createImageButton('Add', '#', ['nav-item', 'large-text'], icons.plus, navHeader);
		this.editButton = createImageButton('Edit', '#', ['nav-item', 'large-text'], icons.edit, navHeader);
		this.saveButton = createImageButton('Save', '#', ['nav-item', 'large-text'], icons.save);
		const rightAddButton = createImageButton('Add', '#', ['nav-item', 'large-text'], icons.plus, navHeader);

		const navFooter = create('div', {classes: ['nav-footer']}, navbar);
		const leftMenuButton = createImageButton('Menu', '#', ['nav-item', 'nav-trigger'], icons.menu, navFooter);
		leftMenuButton.setAttribute('data-side', 'left');
		const yearDropup = create('button', { innerText: `${this.id} `, classes: ['dropup', 'nav-item'] }, navFooter);

		const span = create('span', { innerText: '▲', classes: ['white-50'] });
		const statementDropup = create('button', { classes: ['nav-item'], innerText: `${this.statements[0].name} ` }, navFooter);
		statementDropup.addEventListener('click', this.onClickDropup.bind(this), false);

		for (let i = 0; i < this.statements.length; i += 1) {
			const statement = this.statements[i];
			const anchor = create('a', { innerText: statement.name });
			anchor.setAttribute('data-slice-index', i);
			anchor.addEventListener('click', this.onClickSetSlice.bind(this));
			this.dropupContent.appendChild(anchor);
		}

		statementDropup.appendChild(span);
		statementDropup.appendChild(this.dropupContent);
		const rightMenuButton = createImageButton('Menu', '#', ['nav-item', 'nav-trigger'], icons.menu, navFooter);
		rightMenuButton.setAttribute('data-side', 'right');

		this.editButton.addEventListener('click', this.onClickEdit.bind(this));
		this.saveButton.addEventListener('click', this.onClickSave.bind(this));
		return navbar;
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
			name: 'Total',
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
			lastRow = this.createRow(table, total, options);
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
		const row = btn.parentNode.parentNode.parentNode;
		const tBody = row.parentNode;
		const itemId = row.id;
		const groupId = row.parentNode.parentNode.id;
		// console.log("OnClickDelete", itemId, groupId);

		//delete this.planningCollection.groups[groupId].items[itemId];
		tBody.removeChild(row);
		this.recomputeTotal(tBody.parentNode);
	}

	onClickEdit() {
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
		this.editButton.parentNode.replaceChild(this.saveButton, this.editButton);
	}

	onClickSave() {
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
		this.saveButton.parentNode.replaceChild(this.editButton, this.saveButton);
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
			name: 'New Row',
			daily: 0,
			monthly: 0,
			yearly: 0,
		};

		const table = btn.parentNode.parentNode.parentNode.parentNode.parentNode;
		const index = table.rows.length - 2;

		const options = {
			index: index,
			useBold: false,
			deletable: true,
			hidden: false,
			readonly: false,
		};
		const id = new Date().getTime(); // millisecond precision
		this.createRow(table, item, options);

		//this.planningCollection.groups[table.id].items[id] = item;
	}

	// #endregion
}
