class SpendingGdrive {
    constructor(year, month, spendingsCache) {
		this.gdrive = new GDrive();
		this.year = year;
		this.month = month;
		this.spendingsCache = spendingsCache;
    }

    init() {
		this.getSpendingsFile()
		const driveMonths = this.gdrive.getChildren();
    }

	async syncSpendingsToNetwork() {
		await this.mergeLocalSpendingsToNetwork();
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
		//Not found in drive, write empty
		if(!networkFileId) {
			//No spending file found, write current data to network, but do not overwrite
			networkFileId = await this.persistToNetwork();
			
			if(!networkFileId) {
				console.error("Could not retrieve or create spendings file from newtork: " + spendingFileName);
			}
			
			return false;
		}

		const networkSpendings = await this.gdrive.readFile(networkFileId);
		console.log(this.month + " " + this.networkFileId + " " + networkSpendings)
		console.log("NetworkSpendings:", networkSpendings);
		const localSpendings = await this.spendingsCache.getAllSpendings();
		console.log("LocalSpendings",localSpendings)

		//console.log("Network spendings:", networkSpendings);
		if(localSpendings.length > 0) {
			for(const [networkKey, networkSpending] of networkSpendings) {
				const localSpending = localSpendings.get(networkKey);
				if(!localSpending) {
					//Somebody else created a spending. Store locally
					this.idb.put(SPENDINGS_STORE_NAME, networkSpending, networkKey);
					localSpendings[networkKey] = networkSpending;
					continue;
				}
				if(!this.areEqual(localSpending, networkSpending)) {
					needsMerge = true;
					if(localSpending.added) {
						//Conflict of keys. Add the network spending at the end of our idb
						this.idb.put(SPENDINGS_STORE_NAME, networkSpending);
					} else  if (localSpending.edited) {
						//We made changes, no need to edit anything
					} else {
						//Found a spending modified by somebody else, network is more reliable
						this.idb.put(SPENDINGS_STORE_NAME, networkSpending, networkKey);
					}
				}
			}
		}

		if(networkSpendings.length > 0) {
			for(const [localKey, localSpending] of localSpendings.entries()) {
				//Delete takes precedence. It does not matter if the entry was edited or added if it's deleted
				if(localSpending.deleted) {
					needsMerge = true;
					localSpendings.delete(localKey);
					this.idb.delete(SPENDINGS_STORE_NAME, localKey);
					continue;
				} else if(localSpending.edited) {
					needsMerge = true;
					delete localSpending.edited;
					this.idb.put(SPENDINGS_STORE_NAME, localSpending, localKey);
					continue;
				} else if(localSpending.added) {
					needsMerge = true;
					delete localSpending.added;
					this.idb.put(SPENDINGS_STORE_NAME, localSpending, localKey);
					continue;
				} 
				
				//Deleted from network by someone else
				if(!networkSpendings.get(localKey)) {
					this.idb.delete(SPENDINGS_STORE_NAME, localKey);
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
		const spendings = await this.spendingsCache.getAllSpendings(this.month);
		//console.log("Spendings", spendings);
		const yearFolder = await this.getSpendingsFileParent();
		if(!yearFolder) return;

		const fileName = this.month + ".json";
		console.trace();
		console.log(yearFolder, fileName, spendings)
		const fileId = await this.gdrive.writeFile(yearFolder, fileName, spendings, true);

		if(fileId) {
			//Store for fast retrieval
			const fileKey = this.year + this.month;
			localStorage.setItem(fileKey, fileId);
		}
	}

	async getSpendingsFile() {
		if(this.spendingFile) {
			return this.spendingFile;
		}
		const monthFile = this.month + ".json";
		const yearFolder = await this.getSpendingsFileParent();
		this.spendingFile =  await this.gdrive.findFile(monthFile, yearFolder);
		
		return this.spendingFile;
	}

	async getSpendingsFileParent() {
		if(localStorage.getItem(this.year)) {
			return localStorage.getItem(this.year);
		}

		const APP_FOLDER = "Change!";
		var topFolder = await this.gdrive.findFolder(APP_FOLDER);

		if (!topFolder) {
			topFolder = await this.gdrive.createFolder(APP_FOLDER);
		}
		if(!topFolder) return;

		var yearFolder = await this.gdrive.findFolder(this.year, topFolder);
		if(!yearFolder) {
			yearFolder = await this.gdrive.createFolder(this.year, topFolder);
		}

		localStorage.setItem(this.year, yearFolder);
		return yearFolder;
	}
}