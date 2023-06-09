class SpendingCache {
	static SPENDINGS_DATABASE_NAME = 'Spendings';
	/**
	 * @type {Idb}
	 */
	idb = undefined;
    constructor() {
		this.idb = new Idb(SpendingCache.SPENDINGS_DATABASE_NAME, new Date().getFullYear(), this.upgradeSpendingsDb);
    }

    async init() {
		await this.idb.init();
    }

	async readAll(year, month) {
		/*const keyRange = IDBKeyRange.only(month);
		return await this.idb.getAllByIndex(year, "byMonth", keyRange);*/
		
		//Hack from https://stackoverflow.com/questions/9791219/indexeddb-search-using-wildcards
		const keyRange = IDBKeyRange.bound(month, month + '\uffff');
		return await this.idb.getAllByIndex(year, 'byBoughtDate', keyRange)
	}

	async insert(year, creationDateTime, spending) {
		await this.idb.put(year, spending, creationDateTime);
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
			store.createIndex('byBoughtDate', 'boughtDate', { unique: false });
			store.createIndex('byCategory', 'category', { unique: false });
			store.createIndex('byMonth', 'month', { unique: false });
			store.createIndex('byMonthAndCategory', ['month', 'category'], { unique: false });
		}
	}
}