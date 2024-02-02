import Idb from '../idb';

export default class PlanningCache {
	static DATABASE_NAME = 'Planning';

	static PLANNING_TEMPLATE_URI = 'static/js/planning.json';

	// TODO: Lower this to 1 at release
	static DATABASE_VERSION = 2024;

	/**
	 * Returns all planning caches in the database, initialized
	 * @constructs PlanningCache
	 * @returns {Promise<Array<PlanningCache>>}
	 */
	static async getAll() {
		const idb = new Idb(
			PlanningCache.DATABASE_NAME,
			PlanningCache.DATABASE_VERSION,
			PlanningCache.upgradePlanningDatabase,
		);
		await idb.init();

		const objectStores = idb.getObjectStores();
		const planningsArray = new Array(objectStores.length);
		for (let i = 0; i < objectStores.length; i += 1) {
			const storeName = objectStores[i];
			const planningCache = new PlanningCache(storeName, idb);
			await planningCache.init();
			planningsArray.push(planningCache);
		}
		return planningsArray;
	}

	/**
	 * Callback function to update a planning database
	 * @param {IndexedDb} db Database to upgrade
	 * @param {number} oldVersion Version from which to update
	 * @param {number} newVersion Version to which to update
	 * @returns {undefined}
	 */
	static upgradePlanningDatabase(db, oldVersion, newVersion) {
		if (!newVersion) {
			return;
		}

		const store = db.createObjectStore(newVersion, { autoIncrement: true });
		store.createIndex('byType', 'type', { unique: false });
	}

	/**
	 * @param {string} storeName Object store name associated with this object
	 * @param {Idb} idb Idb instance
	 */
	constructor(storeName, idb) {
		this.idb = idb;
		this.storeName = storeName;
	}

	/**
	 * Initialize current instance of PlanningCache
	 * @async
	 */
	async init() {
		await this.idb.init();

		const storeCount = await this.idb.count(this.storeName);
		if (storeCount === 0) {
			await fetch(PlanningCache.PLANNING_TEMPLATE_URI)
				.then((response) => response.json())
				.then((planningFile) => this.idb.putAll(this.storeName, Object.entries(planningFile)));
		}
	}

	/**
	 * Read all planning contexts from the cache
	 * @returns {Promise<Array<PlanningContext>>}
	 */
	async readAll() {
		return this.idb.openCursor(this.storeName);
	}

	/**
	 * Updates all of the contexts from the current object store
	 * @async
	 * @param {Array<PlanningContext>} planningContexts Contexts to be updated in dabatase
	 */
	async updateAll(planningContexts) {
		await this.idb.clear(this.storeName);
		await this.idb.putAll(this.storeName, planningContexts);
	}

	/**
	 * Fetch only the contexts that of type "Expense"
	 * @async
	 * @returns {Array<PlanningContext>}
	 */
	async readExpenses() {
		const keyRange = IDBKeyRange.only('Expense');
		return this.idb.getAllByIndex(this.storeName, 'byType', keyRange);
	}

	/**
	 * Fetch only the planning categories from the current object store
	 * @async
	 * @returns {Array<PlanningCategory>}
	 */
	async readCategories() {
		return this.idb.openCursor(this.storeName);
	}

	/**
	 * Fetch only the planning context corresponding to the key
	 * @async
	 * @param {string} key Key to lookup in the datastore
	 * @returns {PlanningContext}
	 */
	async read(key) {
		return this.idb.get(this.storeName, key);
	}

	/**
	 * Update a single Planning context in the database
	 * @async
	 * @param {string} key Key to lookup in the datastore
	 * @param {PlanningContext} value Value to update
	 * @returns {PlanningContext} Updated value
	 */
	async update(key, value) {
		await this.idb.insert(this.storeName, value, key);
	}

	/**
	 * Delete a single Planning context in the database
	 * @async
	 * @param {string} key Key to lookup in the datastore
	 * @returns {PlanningContext} Deleted value
	 */
	async delete(key) {
		await this.idb.delete(this.storeName, key);
	}
}
