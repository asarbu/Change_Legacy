export default class PlanningCategory {
	/**
	 *
	 * @param {string} id
	 * @param {string} name
	 */
	constructor(id, name) {
		/**
		 * @type{string}
		 */
		this.planningCategoryId = id;
		/**
		 * @type{string}
		 */
		this.planningCategoryName = name;
		/**
		 * @type{Array<PlanningGoal>}
		 */
		this.planningGoals = [];
	}
}