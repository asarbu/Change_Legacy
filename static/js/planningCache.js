class PlanningCache {
    constructor() {
        PlanningCache.PLANNING_STORE_NAME = 'Planning';
        PlanningCache.PLANNING_TEMPLATE_URI = 'static/js/planning.json';
		this.pdb = new Idb(PlanningCache.PLANNING_STORE_NAME, 1, upgradePlanningDatabase);
    }

    init() {
        this.pdb.init();
    }
    
    upgradePlanningDatabase(db, oldVersion) {
        if (oldVersion == 0) {
            let store = db.createObjectStore(PlanningCache.PLANNING_STORE_NAME, { autoIncrement: true });
            store.createIndex('byType', 'type', { unique: false });

            return;
        }
    }
}