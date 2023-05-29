class PlanningCache {
    static PLANNING_STORE_NAME = 'Planning';
    static PLANNING_TEMPLATE_URI = 'static/js/planning.json';

    constructor() {
		this.pdb = new Idb(PlanningCache.PLANNING_STORE_NAME, 1, this.upgradePlanningDatabase);
    }

    async init() {
        await this.pdb.init();

        const storeCount = await this.pdb.count(PlanningCache.PLANNING_STORE_NAME);
        if (storeCount == 0) {
            await fetch(PlanningCache.PLANNING_TEMPLATE_URI)
                .then(response => {
                    return response.json();
                })
                .then(planningFile => this.pdb.putAll(PlanningCache.PLANNING_STORE_NAME, planningFile));
        }
    }

    async readAll() {
        const planningCollections = await this.pdb.openCursor(PlanningCache.PLANNING_STORE_NAME);
        const plannings = {};
		for (const [key, value] of planningCollections) {
			plannings[key] = value;
		}
		return plannings;
    }

    async updateAll(planningCollections) {
        await this.pdb.clear(PlanningCache.PLANNING_STORE_NAME);
		await this.pdb.putAll(PlanningCache.PLANNING_STORE_NAME, planningCollections);
    }

    async getCategories() {
        return await this.pdb.openCursor(PlanningCache.PLANNING_STORE_NAME)
    }

    async get(key) {
        return await this.pdb.get(PlanningCache.PLANNING_STORE_NAME, key);
    }
    
    async update(key, value) {
        await this.pdb.put(PlanningCache.PLANNING_STORE_NAME, value, key);
    }

    upgradePlanningDatabase(db, oldVersion) {
        if (oldVersion == 0) {
            let store = db.createObjectStore(PlanningCache.PLANNING_STORE_NAME, { autoIncrement: true });
            store.createIndex('byType', 'type', { unique: false });
            //store.createIndex('byGroup', 'groups.name', { unique: false, multiEntry: true });

            return;
        }
    }
}