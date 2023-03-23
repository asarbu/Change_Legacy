class SpendingCache {
    constructor() {
		this.idb = new Idb("Spendings", 1, this.upgradeSpendingsDb);
    }

    async init() {
		await this.idb.init();
    }

	async hasSpendings() {
		const spendings = await this.idb.openCursor(SPENDINGS_STORE_NAME);
		for (const [key, value] of spendings) {
			if (value.bought_date.includes(this.month)) {
				return true;
			}
		}
		return false;
	}

    async getAllSpendings() {
		const spendings = await this.idb.openCursor(SPENDINGS_STORE_NAME);
		const monthlySpendings = [];
		for (const [key, value] of spendings) {
			if (value.bought_date.includes(this.month)) {
				monthlySpendings.push([key, value]);
			}
		}
		return monthlySpendings;
	}

	insertSpending(spending) {
		spending.added = true;
		this.idb.put(SPENDINGS_STORE_NAME, spending).then(this.appendToSpendingTable.bind(this));
		this.syncSpendingsToNetwork();
	}

	upgradeSpendingsDb(db, oldVersion) {
		if (oldVersion === 0) {
			let store = db.createObjectStore(SPENDINGS_STORE_NAME, { autoIncrement: true });
			store.createIndex('byCategory', 'category', { unique: false });
		}
	}
}