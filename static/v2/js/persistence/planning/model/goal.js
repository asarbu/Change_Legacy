export default class Goal {
	/**
	 * @param {Object} goal - Unit to store in object.
	 * @param {string} goal.name - The name of the goal.
	 * @param {integer} goal.daily - Daily amount to put aside for the goal
	 * @param {integer} goal.monthly - Monthly amount to put aside for the goal
	 * @param {integer} goal.yearly - Yearly amount to put aside for the goal
	 */
	constructor(
		name,
		daily,
		monthly,
		yearly,
	) {
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
