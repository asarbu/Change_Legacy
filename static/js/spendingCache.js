class SpendingCache {
	static SPENDINGS_DATABASE_NAME = 'Spendings';
	/**
	 * @type {Idb}
	 */
	#idb = undefined;
    constructor() {
		this.idb = new Idb(SpendingCache.SPENDINGS_DATABASE_NAME, new Date().getFullYear(), this.upgradeSpendingsDb);
    }

    async init() {
		await this.idb.init();
    }

	async readAll(year, month) {
		const keyRange = IDBKeyRange.only(month);
		return await this.idb.getAllByIndex(year, "byMonth", keyRange);
	}

	async insert(spending) {
		const year = spending.boughtDate.substring(spending.boughtDate.length-4, spending.boughtDate.length);
		await this.idb.put(year, spending, new Date().toISOString());
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

	upgradeSpendingsDb(db, oldVersion, newVersion) {
		console.log("Upgrading to version", new Date().getFullYear());

		if (oldVersion < newVersion) {
			let store = db.createObjectStore(newVersion + "", { autoIncrement: true });
			store.createIndex('byCategory', 'category', { unique: false });
			store.createIndex('byMonth', 'month', { unique: false });
			store.createIndex('byMonthAndCategory', ['month', 'category'], { unique: false });
		}
	}
}