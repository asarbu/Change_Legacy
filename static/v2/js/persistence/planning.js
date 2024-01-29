class Planning {
    constructor() {
        this.planningCollections = [];
    }
}

class PlanningEntry {
    constructor() {
        /**
         * @type{string}
         */
        this.planningEntryName = "";
        this.planningCollections = [];
    }
}

class PlanningCollection {
    constructor() {
        /**
         * @type{string}
         */
        this.planningCollectionName = "";
        /**
         * @type{Array<PlanningCategory>}
         */
        this.planningCategories = [];
    }
}

class PlanningCategory {
    constructor() {
        /**
         * @type{string}
         */
        this.planningCategoryName = "";
        this.planningEntries = [];
    }
}

/**
 * @class
 */
class PlanningUnit {
    /**
     * @constructs PlanningUnit
     */
    constructor() {
        /**
         * @type{integer}
         */
        this.daily = 0;
        this.monthly = 0;
        this.yearly = 0;
    }
}