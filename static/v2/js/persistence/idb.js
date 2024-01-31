/**
 * @class
 */
class Idb {
	static #READ_ONLY = "readonly";
	static #READ_WRITE = "readwrite"
	constructor(dbName, dbVersion, upgradeCallback) {
		this.dbName = dbName;
		this.dbVersion = dbVersion;
		this.upgradeCallback = upgradeCallback;
	}

	/**
	 * Initializes this object of IDB. Mandatory to be called before use.
	 * @returns An instance of this
	 */
	async init() {
		console.log("Init", this.dbName)
		this.db = await this.open(this.dbName, this.dbVersion, this.upgradeCallback);
		return this;
	}

	/**
	 * @typedef {function(db:db, number, number)} upgradeCallback
	 * @callback upgradeDbCallback
	 * @param {db} db Database to be upgraded. 
	 * @param {number} oldVersion Version from which to upgrade
	 * @param {number} newVersion Version to which to upgrade. 
	 */

	/**
	 * Opens an IndexedDb Database
	 * @param {string} dbName Database name
	 * @param {number} version Version to upgrade this database
	 * @param {upgradeDbCallback} upgradeCallback called in case the database needs upgrage 
	 * @returns {Promise<IndexedDb>} 
	 */
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
					upgradeCallback(db, event.oldVersion, event.newVersion);
				} else {
					console.error(dbName + " upgrade callback not provided");
				}
			};
		});
	}

	/**
	 * @param {string} storeName Database object store name
	 * @returns {Promise<Array<PlanningContext>>}
	 */
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

	/**
	 * Insert in an object store a value. The key is optional, so leave it last
	 * @param {string} storeName Object store to create the object in
	 * @param {Object} value Value to store
	 * @param {(string|number)} [key] Optional. Key at which to store the object.
	 * @returns {Promise<Array<Object>>} A pair of [key, value] objects.
	 */
	insert(storeName, value, key) {
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

	/**
	 * Reads an object from the database given its' key
	 * @param {string} storeName Object store from where to read the object
	 * @param {(string|number)} key The identifier of the object
	 * @returns {Promise<Object>}
	 */
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

	/**
	 * 
	 * @param {string} storeName Object store to look up
	 * @param {string} indexName Index Name from IndexedDb
	 * @param {IDBKeyRange} iDbKey Criteria to filter results
	 * @returns {Promise<Array<Object>>}
	 */
	getAllByIndex(storeName, indexName, iDbKey) {
		return new Promise((resolve, reject) => {
			const st = this.getStoreTransaction(storeName, Idb.#READ_ONLY);
			const store = st[0];
			const txn = st[1];

			//console.log("Getting all by index", storeName, index, key)
			var values = [];
			store.index(indexName).openCursor(iDbKey).onsuccess = (event) => {
				let cursor = event.target.result;
				if (cursor) {
					values.push({key: cursor.primaryKey, value: cursor.value});
					cursor.continue();
				}
			};

			txn.oncomplete = function () {
				resolve(values);
			};
		});
	}

	/**
	 * Count number of objects in store
	 * @param {string} storeName Object store to look up
	 * @returns {Promise<number>}
	 */
	count(storeName) {
		return new Promise((resolve, reject) => {
			const store = this.getStoreTransaction(storeName, Idb.#READ_ONLY)[0];

			let query = store.count();
			query.onsuccess = (event) => {
				resolve(query.result);
			};
		});
	}

	/**
	 * TODO clarify return. It is not consistent with below functions
	 * Deletes all of the objects in the store 
	 * @param {string} storeName Object store to look up
	 * @returns {Promise<Boolean|number>} True if success. Error code if failure
	 */
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

	/**
	 * TODO: Return deleted object in resolve.
	 * Delete object from store by id. 
	 * @param {string} storeName Object store to look up
	 * @param {(string|number)} key The identifier of the object
	 * @returns {Promise<undefined>}
	 */
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

	/**
	 * TODO clarify what return value actually means. What is the result?
	 * Puts all of the properties of the object in the store.
	 * Function is using the property name as store key and property value as store value
	 * @param {string} storeName Object store to look up
	 * @param {Array<String, any>} data enumerator returned by Object.entries(...)
	 * @returns {Promise<number>} Result
	 */
	async putAll(storeName, data) {
		console.log("IDB put all:", storeName, data);
		return new Promise((resolve, reject) => {
			const [store, transaction] = this.getStoreTransaction(storeName, Idb.#READ_WRITE);
			
			for (const [key, value] of data) {
				var query;
				if (key) {
					query = store.put(value, key);
				} else {
					query = store.put(value);
				}
			}
			
			transaction.oncomplete = function (event) {
				resolve([event.target.result]);
			};
		});
	}

	/**
	 * //TODO clarify what the data input type is  (Array, map?)
	 * Update all of the values in the object store.
	 * @param {string} storeName Object store to look up
	 * @param {Array<Object>} data Items to update in store.
	 * @returns 
	 */
	async updateAll(storeName, data) {
		//console.log("IDB put all:", storeName, data);
		return new Promise((resolve, reject) => {
			const [store, transaction] = this.getStoreTransaction(storeName, Idb.#READ_WRITE);
			for (const item of data) {
				store.put(item.value, item.key);
			}
			
			transaction.oncomplete = function (event) {
				resolve([event.target.result]);
			};
		});
	}

	/**
	 * Check if object store exists in the current database instance
	 * @param {string} storeName Object store to look up
	 * @returns {Boolean}
	 */
	hasObjectStore(storeName) {
		if (this.db.objectStoreNames.contains(storeName)) {
			return true;
		}
	}

	/**
	 * Get an array with the names of all object stores
	 * @returns {Array<string>}
	 */
	getObjectStores() {
		return this.db.objectStoreNames;
	}

	/**
	 * 
	 * @param {string} storeName Object store to look up
	 * @param {string} mode #READ_ONLY or #READ_WRITE
	 * @returns {Array<Object>}
	 */
	getStoreTransaction(storeName, mode) {
		if (!this.db.objectStoreNames.contains(storeName)) {
			console.log("Error at getting store with name", storeName)
			console.trace();
			//this.db.createObjectStore(storeName, { autoIncrement: true });
		}
		const txn = this.db.transaction(storeName, mode);
		const store = txn.objectStore(storeName);

		return [store, txn];
	}
}