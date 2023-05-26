class SpendingCache {
	static SPENDINGS_DATABASE_NAME = 'Spendings';
    constructor() {
		this.idb = new Idb(SpendingCache.SPENDINGS_DATABASE_NAME, 1, this.upgradeSpendingsDb);
		this.month = month;
    }

    async init() {
		await this.idb.init();
    }

	async hasSpendings(year, month) {
		if(!year)
			return false;

		const hasYearlySpendings = await this.idb.objectStoreExists(year);
		if(!hasYearlySpendings) { return false; } 
		if(!month) { return true}

		const yearlySpendings = await this.db.openCursor(year);
		if(yearlySpendings[month]) {
			return true;
		}
	}

    async getAll() {
		const spendings = await this.idb.openCursor(SpendingCache.SPENDINGS_STORE_NAME);
		const monthlySpendings = new Map();
		for (const [key, value] of spendings) {
			if (value.bought_date.includes(this.month)) {
				monthlySpendings.set(key, value);
			}
		}
		return monthlySpendings;
	}

	async getAllForYear(year) {
		const spendings = await this.idb.openCursor(SpendingCache.SPENDINGS_STORE_NAME);
		return spendings[year];
	}

	async getAllForMonth(year, month) {
		this.getAllForYear(year)[month];
	}

	async insert(storeName, key, value) {
		
		await this.idb.put(storeName, spending, key);
	}

	async delete(key) {
		await this.idb.delete(SpendingCache.SPENDINGS_STORE_NAME, key);
	}

	/*
	insertSpending(spending) {
		spending.added = true;
		this.idb.put(SpendingCache.SPENDINGS_STORE_NAME, spending).then(this.appendToSpendingTable.bind(this));
		this.syncSpendingsToNetwork();
	}*/

	upgradeSpendingsDb(db, oldVersion) {
		if (oldVersion === 0) {
			let store = db.createObjectStore(SpendingCache.SPENDINGS_STORE_NAME, { autoIncrement: true });
			store.createIndex('byCategory', 'category', { unique: false });
		}
	}
}