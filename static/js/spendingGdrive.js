class SpendingGdrive {
    constructor(year, month, spendingsCache, forceCreate) {
		this.gdrive = new GDrive();
		this.year = year;
		this.month = month;
		this.spendingsCache = spendingsCache;
		this.forceCreate = forceCreate;
    }

    init() {
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

		const networkSpendings = await this.gdrive.readFile(networkFileId);
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
		const yearFolder = await this.getSpendingsFileParent();
		if(!yearFolder) return;

		const fileName = this.month + ".json";
		console.trace();
		console.log(yearFolder, fileName, spendings)
		const fileId = await this.gdrive.writeFile(yearFolder, fileName, spendings, true);

		if(fileId) {
			//Store for fast retrieval
			const fileKey = this.year + this.month;
			console.log("Setting localstorage", fileKey, fileId)
			localStorage.setItem(fileKey, fileId);
		}
	}

	async getSpendingsFile() {
		/*if(this.spendingFile) {
			return this.spendingFile;
		}*/
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