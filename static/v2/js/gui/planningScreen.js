import GraphicEffects from './effects.js';
import { create, createImageButton } from './dom.js';
import Statement from '../persistence/planning/model/statement.js';
import Category from '../persistence/planning/model/category.js';
import icons from './icons.js';
import Goal from '../persistence/planning/model/goal.js';

export default class PlanningScreen {
	onClickUpdate = undefined;

	constructor(id, statements) {
		/**
		 * @type { Array<Statement> }
		 */
		this.statements = statements;
		this.id = id;
		this.editMode = false;
	}

	/**
	 * Initialize the current screen
	 */
	init() {
		this.gfx = new GraphicEffects();
		this.container = this.sketchAsFragment();
		this.navbar = this.sketchNavBar();
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
			const htmlStatement = this.sketchStatement(statement);
			htmlStatement.userData = statement;

			section.appendChild(htmlStatement);
		}

		container.appendChild(section);

		return container;
	}

	/**
	 * Creates a DOM slice
	 * @param {Statement} statement Statement representing this slice
	 * @returns {HTMLDivElement} Constructed and decorated DOM element
	 */
	sketchStatement(statement) {
		const slice = create('div', { classes: ['slice'] });
		const h1 = create('h1', { innerText: statement.name });
		const addCategoryButton = createImageButton('', '', ['btn'], icons.add_table);
		addCategoryButton.addEventListener('click', this.onClickAddCategory.bind(this));
		addCategoryButton.setAttribute('hideable', 'true');
		if(!this.editMode)
			addCategoryButton.style.display = 'none';
		
		slice.appendChild(h1);

		const tables = this.sketchCategory(statement.categories);
		slice.appendChild(tables);
		slice.appendChild(addCategoryButton);

		return slice;
	}

	/**
	 * Creates a Document Fragment containing all of the tables constructed from the categories.
	 * @param {Array<Category>} planningCategories Categories to draw inside parent slice
	 * @returns {DocumentFragment} Document fragment with all of the created tables
	 */
	sketchCategory(planningCategories) {
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
			nameCol.setAttribute('editable', 'true');
			if (this.editMode) {
				nameCol.setAttribute('contenteditable', 'true');
			}
			nameCol.addEventListener('keyup', this.onKeyUpCategoryNameCell.bind(this), false);

			//TODO replace this with Add row
			const daily = create('th');
			const monthly = create('th');
			const yearly = create('th');
			const buttons = create('th');
			const button = createImageButton('Add Row', '', ['nav-item'], icons.delete);
			button.addEventListener('click', this.onClickDeleteCategory.bind(this));
			
			nameCol.innerText = planningCategory.name;
			daily.innerText = 'Daily';
			monthly.innerText = 'Monthly';
			yearly.innerText = 'Yearly';

			buttons.setAttribute('hideable', 'true');
			if(!this.editMode)
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
				
				const deleteButton = createImageButton('Delete goal', '#', ['nav-item'], icons.delete);
				deleteButton.addEventListener('click', this.onClickDeleteGoal.bind(this));
				this.sketchRow(
					table,
					planningGoal,
					{
						index: -1,
						hideLastCell: true,
						lastCellContent: deleteButton,
					},
				);
			}
			this.recomputeTotal(table, true);
		}
		return tableFragment;
	}

	/**
	 * Creates a new row in the table, fills the data and decorates it.
	 * @param {DOMElement} table Table where to append row
	 * @param {Goal} item Goal data to fill in the row
	 * @param {Object} options Format options for the row
	 * @param {Number} options.index Position to add the row to. Defaults to -1 (last)
	 * @param {Boolean} options.hideLastCell Hide last cell of the row
	 * @param {Boolean} options.readonly Make the row uneditable
	 * @param {HTMLButtonElement} options.lastCellContent Optional button to add functionality to the table
	 * @returns {HTMLTableRowElement} Row that was created and decorated. Contains Goal in userData
	 */
	sketchRow(table, item, options) {
		let index = -1;
		if (Object.prototype.hasOwnProperty.call(options, 'index')) {
			index = options.index;
		}
		const row = table.tBodies[0].insertRow(index);
		row.id = item.id;
		row.userData = item;

		this.sketchDataCell(row, item.name, options);
		this.sketchDataCell(row, item.daily, options);
		this.sketchDataCell(row, item.monthly, options);
		this.sketchDataCell(row, item.yearly, options);

		const buttonsCell = row.insertCell(-1);

		if (options?.lastCellContent) {
			buttonsCell.appendChild(options.lastCellContent);
		}

		buttonsCell.setAttribute('hideable', 'true');
		if (options?.hideLastCell && !this.editMode) {
			buttonsCell.style.display = 'none';
		}
		return row;
	}

	sketchDataCell(row, text, options) {
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

		if (options?.color) {
			dataCell.style.color = options.color;
		}
		return dataCell;
	}

	activate() {
		const mainElement = document.getElementById('main');
		mainElement.appendChild(this.container);
		mainElement.appendChild(this.navbar);
		this.gfx.init(this.container);
	}

	sketchNavBar() {
		const navbar = create('nav');
		const navHeader = create('div', { classes: ['nav-header'] }, navbar);
		const addStatementButton = createImageButton('Add', '#', ['nav-item', 'large-text'], icons.add_file, navHeader);
		this.editButton = createImageButton('Edit', '#', ['nav-item', 'large-text'], icons.edit, navHeader);
		this.saveButton = createImageButton('Save', '#', ['nav-item', 'large-text'], icons.save);
		const deleteStatement = createImageButton('Add', '#', ['nav-item', 'large-text'], icons.delete_file, navHeader);
		addStatementButton.addEventListener('click', this.onClickAddStatement.bind(this));
		addStatementButton.style.display = 'none';
		addStatementButton.setAttribute('hideable', true);
		deleteStatement.addEventListener('click', this.onClickDeleteStatement.bind(this));
		deleteStatement.style.display = 'none';
		deleteStatement.setAttribute('hideable', true);

		const navFooter = create('div', { classes: ['nav-footer'] }, navbar);
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
	update(statements) {
		this.statements = statements;
		const newContainer = this.sketchAsFragment();
		const mainElement = document.getElementById('main');
		mainElement.replaceChild(newContainer, this.container);
		this.container = newContainer;
	}

	// Recompute from DOM instead of memory/db/network to have real time updates in UI
	recomputeTotal(table, forceCreate = false) {
		// TODO Use planning statements to recompute, instead of parsing.
		let lastRow;
		const total = {
			id: `${table.id}Total`,
			name: 'Total',
			daily: 0,
			monthly: 0,
			yearly: 0,
		};
		if (forceCreate) {
			const addGoalButton = createImageButton('Delete goal', '#', ['nav-item'], icons.add_row);
			addGoalButton.addEventListener('click', this.onClickAddGoal.bind(this));
			const options = {
				useBold: true,
				readonly: true,
				hideLastCell: true,
				lastCellContent: addGoalButton
			};
			lastRow = this.sketchRow(table, total, options);
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
	onClickAddCategory(event) {
		const id = new Date().getTime(); // millisecond precision
		const category = new Category(id, 'New Category');
		/** @type{Statement} */
		const statement = this.statements[this.gfx.selectedIndex()];
		statement.categories.push(category);
		// TODO update only the current statement, not all of them
		this.update(this.statements);
	}

	onClickDeleteGoal(event) {
		const btn = event.currentTarget;
		const row = btn.parentNode.parentNode;
		const tBody = row.parentNode;
		const goal = row.userData;
		const category = row.parentNode.parentNode.userData;

		category.goals.splice(category.goals.indexOf(goal), 1);

		tBody.removeChild(row);
		this.recomputeTotal(tBody.parentNode);
	}

	onClickEdit() {
		const tableDefs = document.querySelectorAll('td[editable="true"]');
		for (let i = 0; i < tableDefs.length; i += 1) {
			tableDefs[i].contentEditable = 'true';
		}

		const tableHeaders = document.querySelectorAll('th[editable="true"]');
		for (let i = 0; i < tableHeaders.length; i += 1) {
			tableHeaders[i].contentEditable = 'true';
		}

		const elements = document.querySelectorAll('[hideable="true"]');
		for (let i = 0; i < elements.length; i += 1) {
			elements[i].style.display = '';
		}

		this.editMode = true;
		this.editButton.parentNode.replaceChild(this.saveButton, this.editButton);
	}

	onClickSave() {
		const tableDefs = document.querySelectorAll('td[editable="true"]');
		for (let i = 0; i < tableDefs.length; i += 1) {
			tableDefs[i].contentEditable = 'false';
		}

		const elements = document.querySelectorAll('[hideable="true"]');
		for (let i = 0; i < elements.length; i += 1) {
			elements[i].style.display = 'none';
		}

		if (this.onClickUpdate) {
			this.onClickUpdate(this.id, this.statements);
		}

		this.editMode = false;
		this.saveButton.parentNode.replaceChild(this.editButton, this.saveButton);
	}

	// eslint-disable-next-line class-methods-use-this
	onKeyUpCategoryNameCell(event) {
		const categoryName = event.target.textContent;
		const table = event.target.parentNode.parentNode.parentNode;
		const statement = table.userData;

		statement.name = categoryName;
	}

	onKeyUpCell(event) {
		const cell = event.target;
		const row = cell.parentNode;
		const table = row.parentNode.parentNode;

		const { cellIndex } = event.target;
		const goal = row.userData;

		switch (cellIndex) {
		case 0:
			goal.itemName = cell.textContent;
			break;
		case 1:
			goal.daily = parseInt(cell.textContent, 10);
			goal.monthly = goal.daily * 30;
			goal.yearly = goal.daily * 365;
			cell.parentNode.cells[2].textContent = goal.monthly;
			cell.parentNode.cells[3].textContent = goal.yearly;
			break;
		case 2:
			goal.monthly = parseInt(cell.textContent, 10);
			goal.daily = Math.ceil(goal.monthly / 30);
			goal.yearly = goal.monthly * 12;
			cell.parentNode.cells[1].textContent = goal.daily;
			cell.parentNode.cells[3].textContent = goal.yearly;
			break;
		case 3:
			goal.yearly = parseInt(cell.textContent, 10);
			goal.daily = Math.ceil(goal.yearly / 365);
			goal.monthly = Math.ceil(goal.yearly / 12);
			cell.parentNode.cells[1].textContent = goal.daily;
			cell.parentNode.cells[2].textContent = goal.monthly;
			break;
		default:
			break;
		}

		this.recomputeTotal(table);
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

	onClickAddGoal(event) {
		const btn = event.currentTarget;
		const id = new Date().getTime(); // millisecond precision
		const goal = {
			id: id,
			name: 'New Goal',
			daily: 0,
			monthly: 0,
			yearly: 0,
		};

		const table = btn.parentNode.parentNode.parentNode.parentNode;
		const tbody = table.tBodies[0];
		// Subtract one for the bottom "Total" row.
		const index = tbody.rows.length - 1;

		const button = createImageButton('Add Row', '', ['nav-item'], icons.delete);
		button.addEventListener('click', this.onClickDeleteGoal.bind(this));
		const options = {
			index: index,
			lastCellContent: button,
		};
		this.sketchRow(table, goal, options);

		table.userData.goals.push(goal);
	}

	onClickDeleteCategory(event) {
		const table = event.target.parentNode.parentNode.parentNode.parentNode.parentNode;
		const category = table.userData;
		const statement = table.parentNode.userData;

		statement.categories.splice(statement.categories.indexOf(category), 1);
		table.parentNode.removeChild(table);
	}

	onClickDeleteStatement(event) {
		this.statements.splice(this.gfx.selectedIndex(), 1);
		this.update(this.statements);
	}

	onClickAddStatement(event) {
		const id = new Date().getTime(); // millisecond precision
		const newStatement = new Statement(id, 'New statement', Statement.EXPENSE);
		//this.statements.push(newStatement);
		this.statements.unshift(newStatement);
		this.update(this.statements);
	}

	// #endregion
}
