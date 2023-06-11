class SpendingGDrive {
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
	async syncGDrive(year, month) {
		//console.log("Syncing to drive", year, month)
		const localSpendings = await this.#spendingsCache.readAll(year, month);

		if(localSpendings.length > 0) {
			return await this.fetchCacheToGDrive(year, month, localSpendings);
		} else {
			return this.fetchGDriveToCache(year, month);
		}
	}

	async fetchCacheToGDrive(year, month, localSpendings) {
		const monthFileId = await this.getMonthFileId(year, month);

		if(!monthFileId) {
			await this.createFile(year, month, localSpendings);
		} else {
			const spendingGDriveData = this.getLocalStorageFileMetaData(year, month);
			const gDriveModifiedTime = await this.getGdriveModifiedTime(monthFileId);

			//File may have beed deleted meanwhile. Put the data from the cache.
			if(!gDriveModifiedTime) {
				const fileId = await this.createFile(year, month, localSpendings);
				await this.setLocalStorageFileMetaData(year, month, fileId);
			}

			if(!spendingGDriveData || !spendingGDriveData.modifiedTime || 
				spendingGDriveData.modifiedTime < gDriveModifiedTime) {
				console.log("Found newer information on drive. Updating local cache")
				const gDriveSpendings = this.#gDrive.readFile(spendingGDriveData.fileId);
				this.#spendingsCache.updateAll(year, month, gDriveSpendings);

				await this.setLocalStorageFileMetaData(year, month, monthFileId, gDriveModifiedTime);
				return true;
			} else if(spendingGDriveData.modifiedTime > gDriveModifiedTime) {
				console.log("Found newer information on local. Updating GDrive");
				await this.#gDrive.update(monthFileId, localSpendings);
				
				await this.setLocalStorageFileMetaData(year, month, monthFileId);
			}
		}
	}

	async fetchGDriveToCache(year, month) {
		const monthFileId = await this.getMonthFileId(year, month);
		if(!monthFileId) {
			await this.createFile(year, month, []);
			return;
		}

		const gDriveSpendings = await this.#gDrive.readFile(monthFileId);
		if(!gDriveSpendings) {
			await this.createFile(year, month, []);
			return;
		}
		
		this.#spendingsCache.updateAll(year, Object.values(gDriveSpendings));
		return true;
	} 
	
	async setLocalStorageFileMetaData(year, month, fileId, modifiedTime) {
		const spendingGDriveData = {fileId: fileId};
		if(modifiedTime)
			spendingGDriveData.modifiedTime = modifiedTime;
		else
			spendingGDriveData.modifiedTime = await this.getGdriveModifiedTime(fileId);

		localStorage.setItem(year + month, JSON.stringify(spendingGDriveData));
	}

	getLocalStorageFileMetaData(year, month) {
		return JSON.parse(localStorage.getItem(year + month));
	}

	async createFile(year, month, localSpendings) {
		const yearFolderId = await this.getYearFolderId(year);
		const fileId = this.#gDrive.writeFile(yearFolderId, month + ".json", localSpendings);
		await this.setLocalStorageFileMetaData(year, month, fileId);
	}

	async getGdriveModifiedTime(fileId) {
		const metadata = await this.#gDrive.readFileMetadata(fileId, GDrive.MODIFIED_TIME_FIELD);
		if(metadata)
			return metadata[GDrive.MODIFIED_TIME_FIELD];
	}

	async readAll(monthFileId) {
		return await this.#gDrive.readFile(monthFileId);
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
		let spendingGDriveData = this.getLocalStorageFileMetaData(year, month);
		
		//Not found in memory, look on drive
		if(!spendingGDriveData || !spendingGDriveData.id) {
			const monthFileName = month + ".json";
			const yearFolderId = await this.getYearFolderId(year);
			const networkFileId = await this.#gDrive.findFile(monthFileName, yearFolderId);
				
			if(!networkFileId) return;
			
			this.setLocalStorageFileMetaData(year, month, networkFileId);
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