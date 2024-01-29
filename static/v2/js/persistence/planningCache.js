class PlanningCache {
	static DATABASE_NAME = 'Planning';
	static PLANNING_TEMPLATE_URI = 'static/js/planning.json';
	static DATABASE_VERSION = 2024;
	
	/**
	 * Returns all planning caches in the database, initialized
	 * @returns {Map<String, PlanningCache>}
	 */
	static async getAll() {
		//const currentYear =  new Date().toLocaleString("en-US", {year: "numeric"});
		const idb = new Idb(PlanningCache.DATABASE_NAME, PlanningCache.DATABASE_VERSION, PlanningCache.upgradePlanningDatabase);
		await idb.init();
		
		const objectStores = idb.getObjectStores();
		const planningCaches = new Map();
		for (let index = 0; index < objectStores.length; index++) {
			const storeName = objectStores[index];
			const planningCache = new PlanningCache(storeName, idb);
			await planningCache.init();
			planningCaches.set(storeName, planningCache);	
		}
		return planningCaches;
	}

	static upgradePlanningDatabase(db, oldVersion, newVersion) {
		if(!newVersion) {
			console.error("No new version provided to create object store", db, newVersion);
		}

		let store = db.createObjectStore(newVersion, { autoIncrement: true });
		store.createIndex('byType', 'type', { unique: false });
		//store.createIndex('byGroup', 'groups.name', { unique: false, multiEntry: true });

		return;
	}

	constructor(storeName, idb) {
		this.idb = idb;
		this.storeName = storeName;
	}

	async init() {
		await this.idb.init();

		const storeCount = await this.idb.count(this.storeName);
		if (storeCount == 0) {
			await fetch(PlanningCache.PLANNING_TEMPLATE_URI)
				.then(response => {
					return response.json();
				})
				.then(planningFile => 
					this.idb.putAll(this.storeName, Object.entries(planningFile))
				);
		}
	}

	async readAll() {
		const planningCollections = await this.idb.openCursor(this.storeName);
		const plannings = {};
		for (const [key, value] of planningCollections) {
			plannings[key] = value;
		}
		return plannings;
	}

	async updateAll(planningCollections) {
		await this.idb.clear(this.storeName);
		await this.idb.putAll(this.storeName, planningCollections);
	}

	async getExpenses() {
		const keyRange = IDBKeyRange.only("Expense");
		return await this.idb.getAllByIndex(this.storeName, 'byType', keyRange);
	}

	async getCategories() {
		return await this.idb.openCursor(this.storeName)
	}

	async get(key) {
		return await this.idb.get(this.storeName, key);
	}
	
	async update(key, value) {
		await this.idb.put(this.storeName, value, key);
	}
}