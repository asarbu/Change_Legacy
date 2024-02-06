/**
 * @class
 */
export default class Statement {
	static INCOME = 'Income';

	static EXPENSE = 'Expense';

	static SAVING = 'Saving';

	/**
	 *
	 * @param {string} id Unique identifier of the statement
	 * @param {string} name User friendly name of statement
	 * @param {String} type Statically defined statement type
	 */
	constructor(id, name, type) {
		/**
		 * @type{number}
		 */
		this.id = id;
		/**
		 * @type{string}
		 */
		this.name = name;
		/**
		 * @type{string}
		 */
		this.type = type;
		/**
		 * @type{Array<PlanningCategory>}
		 */
		this.categories = [];
	}
}
