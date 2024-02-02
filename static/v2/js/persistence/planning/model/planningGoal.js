export default class PlanningGoal {
	/**
	 * @param {Object} goal - Unit to store in object.
	 * @param {integer} goal.name - The name of the goal.
	 * @param {integer} goal.daily - The name of the goal.
	 * @param {integer} goal.monthly - The name of the goal.
	 * @param {integer} goal.yearly - The name of the goal.
	 */
	constructor({
		name,
		daily,
		monthly,
		yearly,
	}) {
		/**
		 * @type{string}
		 */
		this.name = name;
		/**
		 * @type{integer}
		 */
		this.daily = daily;
		/**
		 * @type{integer}
		 */
		this.monthly = monthly;
		/**
		 * @type{integer}
		 */
		this.yearly = yearly;
	}
}
