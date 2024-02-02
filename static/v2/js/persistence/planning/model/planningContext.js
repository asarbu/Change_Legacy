/**
 * @class
 */
export default class PlanningContext {
	/**
	 *
	 * @param {string} id
	 * @param {string} name
	 */
	constructor(id, name) {
		this.planningContextId = id;
		/**
		 * @type{string}
		 */
		this.planningContextName = name;
		/**
		 * @type{Array<PlanningCategory>}
		 */
		this.planningCategories = [];
	}
}