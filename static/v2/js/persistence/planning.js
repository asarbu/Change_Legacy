/**
 * @class
 */
class Planning {
	/**
	 * @constructs Planning
	 * @param {integer} year 
	 */
	constructor(year) {
		this.year = year;
		/**
		 * @type{Array<PlanningContexts>}
		 */
		this.plannningContexts = [];
	}
}

/**
 * @class
 */
class PlanningContext {
	/**
	 * 
	 * @param {string} name 
	 */
	constructor(name) {
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

/**
 * @class
 */
class PlanningCategory {
	/**
	 * 
	 * @param {string} name 
	 */
	constructor(name) {
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

/**
 * @class
 */
class PlanningGoal {
	/**
	 * @param {Object} goal - Unit to store in object.
	 * @param {integer} goal.name - The name of the goal.
	 * @param {integer} goal.daily - The name of the goal.
	 * @param {integer} goal.monthly - The name of the goal.
	 * @param {integer} goal.yearly - The name of the goal.
	 */
	constructor({ name, daily, monthly, yearly }) {
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