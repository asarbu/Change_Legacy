class SpendingGdrive {
	/**
	 * Used for quick access of local data.
	 * @type {SpendingCache}
	 */
	#spendingsCache = undefined;
	/**
	 * @type {GDrive}
	 */
	#gDrive = undefined;
    constructor(spendingsCache) {
		this.#gDrive = new GDrive();
		this.#spendingsCache = spendingsCache;
    }

    async init() {
		await this.#gDrive.init();
    }

	/**
	 * Synchronizes the local planning cache to GDrive
	 * @returns {bool} Needs GUI refresh
	 */
	async syncGDrive(year, month, forceCreate) {
		const localSpendings = await this.#spendingsCache.readAll(year, month);

		if(localSpendings.length > 0) {
			const monthFileId = await this.getMonthFileId(year, month);

			if(!monthFileId) {
				const yearFolderId = await this.getYearFolderId(year);
				this.#gDrive.writeFile(yearFolderId, month + ".json", localSpendings);
			} else {
				const localStorageKey = year + month;
				const spendingGDriveData = JSON.parse(localStorage.getItem(localStorageKey));
				const gDriveModifiedTime = await this.getGdriveModifiedTime(year, month);

				if(!gDriveModifiedTime)
					return;

				//console.log("Spending data", spendingGDriveData)

				if(!spendingGDriveData || !spendingGDriveData.modifiedTime || 
					spendingGDriveData.modifiedTime < gDriveModifiedTime) {
					console.log("Found newer information on drive. updating local")
					//Update local cache
					spendingGDriveData.modifiedTime = gDriveModifiedTime;
					localStorage.setItem(localStorageKey, JSON.stringify(spendingGDriveData));
					return true;
				} else if(spendingGDriveData.modifiedTime > gDriveModifiedTime) {
					console.log("Found newer information on local Udating gdrive")
					const localCollections = await this.planningCache.readAll();
					//await this.updateAll(localCollections);
					spendingGDriveData.modifiedTime = await this.getGdriveModifiedTime();
					localStorage.setItem(localStorageKey, JSON.stringify(spendingGDriveData));
				}
			}
		} else if(forceCreate) {
			this.writeFile(yearFolderId, month + ".json", []);
		}
	}

	async getGdriveModifiedTime(year, month) {
		const networkFileId = await this.getMonthFileId(year, month);
		const metadata = await this.#gDrive.readFileMetadata(networkFileId, GDrive.MODIFIED_TIME_FIELD);
		if(metadata)
			return metadata[GDrive.MODIFIED_TIME_FIELD];
	}

	async readAll(monthFileId) {
		return await this.#gDrive.readFile(monthFileId);
	}

	async mergeLocalSpendingsToNetwork() {
		//console.log("Merging local spendings to network...");
		var needsMerge = false;
		const spendingFileName = this.year + this.month;
		let networkFileId = localStorage.getItem(spendingFileName);
		//Not found in memory, look on drive
		if(!networkFileId) {
			networkFileId = await this.getSpendingsFile();
		}

		const hasSpendings = await this.spendingsCache.hasSpendings();
		//console.log("GDrive Month", this.month, networkFileId, hasSpendings, this.forceCreate)
		if(!networkFileId && !hasSpendings && !this.forceCreate) {
			return false;
		}

		//Not found in drive, write empty
		if(!networkFileId) {
			//No spending file found, write current data to network, but do not overwrite
			networkFileId = await this.persistToNetwork();
			
			if(!networkFileId) {
				console.error("Could not retrieve or create spendings file from newtork: " + spendingFileName);
			}
			
			return false;
		}

		const networkSpendings = await this.#gDrive.readFile(networkFileId);
		const localSpendings = await this.spendingsCache.getAll();

		//console.log("Network spendings:", networkSpendings);
		for(const [networkKey, networkSpending] of networkSpendings) {
			const localSpending = localSpendings.get(networkKey);
			if(!localSpending) {
				//Somebody else created a spending. Store locally
				await this.spendingsCache.insert(networkSpending, networkKey);
				localSpendings[networkKey] = networkSpending;
				continue;
			}
			if(!this.equals(localSpending, networkSpending)) {
				needsMerge = true;
				if(localSpending.added) {
					//Conflict of keys. Add the network spending at the end of our idb
					await this.spendingsCache.insert(networkSpending);
				} else  if (localSpending.edited) {
					//We made changes, no need to edit anything
				} else {
					//Found a spending modified by somebody else, network is more reliable
					await this.spendingsCache.insert(networkSpending, networkKey);
				}
			}
		}

		if(networkSpendings.length > 0) {
			for(const [localKey, localSpending] of localSpendings.entries()) {
				//Delete takes precedence. It does not matter if the entry was edited or added if it's deleted
				if(localSpending.deleted) {
					needsMerge = true;
					localSpendings.delete(localKey);
					this.spendingsCache.delete(localKey);
					continue;
				} else if(localSpending.edited) {
					needsMerge = true;
					delete localSpending.edited;
					this.spendingsCache.insert(localSpending, localKey);
					continue;
				} else if(localSpending.added) {
					needsMerge = true;
					delete localSpending.added;
					this.spendingsCache.insert(localSpending, localKey);
					continue;
				} 
				
				//Deleted from network by someone else
				if(!networkSpendings.get(localKey)) {
					this.spendingsCache.delete(localKey);
				}
			}
		}

		//console.log("No merge needed. Returning...");
		if(!needsMerge) return true;

		await this.persistToNetwork();
		return true;
	}

	async persistToNetwork() {
		//console.log("Persist spending to network:");
		const spendings = await this.spendingsCache.getAll();
		//console.log("Spendings", spendings);
		const yearFolder = await this.getYearFolderId();
		if(!yearFolder) return;

		const fileName = this.month + ".json";
		console.trace();
		console.log(yearFolder, fileName, spendings)
		const fileId = await this.#gDrive.writeFile(yearFolder, fileName, spendings, true);

		if(fileId) {
			//Store for fast retrieval
			const fileKey = this.year + this.month;
			const spendingGDriveData = {id: fileId};
		}
	}

	async getYearFolderId(year) {
		if(localStorage.getItem(year)) {
			return localStorage.getItem(year);
		}

		const APP_FOLDER = "Change!";
		var topFolder = await this.#gDrive.findFolder(APP_FOLDER);

		if (!topFolder) {
			topFolder = await this.#gDrive.createFolder(APP_FOLDER);
		}
		if(!topFolder) return;

		var yearFolder = await this.#gDrive.findFolder(year, topFolder);
		if(!yearFolder) {
			yearFolder = await this.#gDrive.createFolder(year, topFolder);
		}

		localStorage.setItem(year, yearFolder);
		return yearFolder;
	}

	async getMonthFileId(year, month) {
		const localStorageKey = year + month;
		let spendingGDriveData = JSON.parse(localStorage.getItem(localStorageKey));
		
		//Not found in memory, look on drive
		if(!spendingGDriveData || !spendingGDriveData.id) {
			const monthFileName = month + ".json";
			const yearFolderId = await this.getYearFolderId(year);
			const networkFileId = await this.#gDrive.findFile(monthFileName, yearFolderId);
				
			if(!networkFileId) return;
			
			const spendingGDriveData = {id: networkFileId};
			localStorage.setItem(localStorageKey, JSON.stringify(spendingGDriveData));
			return networkFileId;
		}
		return spendingGDriveData.id;
	}
	
	equals(thisSpending, thatSpending) {
		return thisSpending.bought_date === thatSpending.bought_date &&
			thisSpending.category === thatSpending.category &&
			thisSpending.description === thatSpending.description &&
			thisSpending.price === thatSpending.price &&
			thisSpending.type === thatSpending.type;
	}

	async insert(values, key) {
		await this.spendingsCache.insert(values, key);
		await this.mergeLocalSpendingsToNetwork();
	}
}