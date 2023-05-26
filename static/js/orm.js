class Idb {
	static #READ_ONLY = "readonly";
	static #READ_WRITE = "readwrite"
	constructor(dbName, dbVersion, upgradeCallback) {
		this.dbName = dbName;
		this.dbVersion = dbVersion;
		this.upgradeCallback = upgradeCallback;
	}

	async init() {
		this.db = await this.open(this.dbName, this.dbVersion, this.upgradeCallback);
		return this;
	}

	open(dbName, version, upgradeCallback) {
		return new Promise((resolve, reject) => {
			if (!window.indexedDB) {
				console.error(`Your browser doesn't support IndexedDB`);
				return;
			}
			const request = indexedDB.open(dbName, version);

			request.onsuccess = (event) => {
				const db = event.target.result;
				resolve(db);
			}

			request.onerror = (event) => {
				reject(`Database error: ${event.target.errorCode}`);
			};

			request.onupgradeneeded = (event) => {
				const db = event.target.result;
				if (upgradeCallback) {
					upgradeCallback(db, event.oldVersion);
				} else {
					console.error(dbName + " upgrade callback not provided");
				}
			};
		});
	}

	openCursor(storeName) {
		return new Promise((resolve, reject) => {
			const st = this.getStoreTransaction(storeName, Idb.#READ_ONLY);
			const store = st[0];
			const txn = st[1];

			var values = new Map();
			store.openCursor().onsuccess = (event) => {
				let cursor = event.target.result;
				if (cursor) {
					values.set(cursor.key, cursor.value);
					cursor.continue();
				}
			};

			txn.oncomplete = function () {
				resolve(values);
			};
		});
	}

	put(storeName, value, key) {
		console.log("IDB put:", storeName, value, key);
		return new Promise((resolve, reject) => {
			const store = this.getStoreTransaction(storeName, Idb.#READ_WRITE)[0];

			var query;
			if (key) {
				query = store.put(value, key);
			} else {
				query = store.put(value);
			}

			query.onsuccess = function (event) {
				resolve([event.target.result, value]);
			};

			query.onerror = function (event) {
				reject(event.target.errorCode);
			}
		});
	}

	get(storeName, key) {
		return new Promise((resolve, reject) => {
			const store = this.getStoreTransaction(storeName, Idb.#READ_ONLY)[0];
			let query = store.get(key);

			query.onsuccess = (event) => {
				if (!event.target.result) {
					reject(`The value with key ${key} not found`);
				} else {
					const value = event.target.result;
					resolve(value);
				}
			};
		});
	}

	getAllByIndex(storeName, index, key) {
		return new Promise((resolve, reject) => {
			const store = this.getStoreTransaction(storeName, Idb.#READ_ONLY)[0];
			
			var query;
			if(key) {
				query = objectStore.index(index).get(key);
			}
			else {
				query = objectStore.index(index).getAll();
			}
			query.onsuccess = function (event) {
				console.log(event)
				resolve([event.target.result, value]);
			};

			query.onerror = function (event) {
				reject(event.target.errorCode);
			}
		});
	}

	count(storeName) {
		return new Promise((resolve, reject) => {
			const store = this.getStoreTransaction(storeName, Idb.#READ_ONLY)[0];

			let query = store.count();
			query.onsuccess = (event) => {
				resolve(query.result);
			};
		});
	}

	clear(storeName) {
		return new Promise((resolve, reject) => {
			const store = this.getStoreTransaction(storeName, Idb.#READ_WRITE)[0];

			let query = store.clear();
			query.onsuccess = (event) => {
				resolve(true);
			};
			query.onerror = (event) => {
				reject(event.target.errorCode);
			}
		});
	}

	delete(storeName, key) {
		return new Promise((resolve, reject) => {
			const store = this.getStoreTransaction(storeName, Idb.#READ_WRITE)[0];
			let query = store.delete(key);

			query.onsuccess = function (event) {
				console.log("Deleted ", key);
				//console.trace();
				resolve();
			};

			// handle the error case
			query.onerror = function (event) {
				reject(event);
			}
		});
	}

	async populateStore(storeName, data) {
		//console.log("Adding to store", storeName, data)
		for (const [key, value] of Object.entries(data)) {
			//console.log("put", key, value)
			await this.put(storeName, value, key);
		}
	}

	objectStoreExists(storeName) {
		if (this.db.objectStoreNames.contains(storeName)) {
			return true;
		}
	}

	getStoreTransaction(storeName, mode) {
		/*if (!this.db.objectStoreNames.contains(storeName)) {
			this.db.createObjectStore(storeName, { autoIncrement: true });
		}*/
		const txn = this.db.transaction(storeName, mode);
		const store = txn.objectStore(storeName);

		return [store, txn];
	}
}