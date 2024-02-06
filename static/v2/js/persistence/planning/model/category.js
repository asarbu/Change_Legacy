export default class Category {
	/**
	 *
	 * @param {string} id
	 * @param {string} name
	 */
	constructor(id, name) {
		/**
		 * @type{string}
		 */
		this.id = id;
		/**
		 * @type{string}
		 */
		this.name = name;
		/**
		 * @type{Array<Goal>}
		 */
		this.goals = [];
	}
}
