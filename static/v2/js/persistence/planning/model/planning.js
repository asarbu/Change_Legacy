export default class Planning {
	/**
	 * @constructs Planning
	 * @param {integer} year
	 */
	constructor(year) {
		this.year = year;
		/**
		 * @type{Array<PlanningContext>}
		 */
		this.plannningContexts = [];
	}
}