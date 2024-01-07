class PlanningGDrive {
	/**
	 * #planningCache used during sync process
	 * @type {PlanningCache}
	 * @public
	 */
	#planningCache = undefined;

	/**
	 * 
	 * @param {PlanningCache} planningCache - Cache to use during sync process
	 */
    constructor(planningCache) {
		this.#planningCache = planningCache;
		this.gdrive = new GDrive();
    }

    async init() {
        await this.gdrive.init();
    }
	//#region Network operations
	async syncToNetwork() {
		await this.mergeLocalPlanningToNetwork(false);
	}


	areEqual(networkEntry, localEntry) {
		if(networkEntry === undefined || localEntry === undefined) 
			return false;
		return 	networkEntry.name === localEntry.name && 
				networkEntry.daily === localEntry.daily &&
				networkEntry.monthly === localEntry.monthly &&
				networkEntry.yearly === localEntry.yearly;
	}


	//#endregion
	
	//#region CRUD operations
	async write(planningCollections) {
		await this.gdrive.writeFile(APP_FOLDER, PLANNING_FILE_NAME, planningCollections, true);
	}

	async readAll() {
		let	networkFileId = await this.getGdriveFileId();
		if(!networkFileId)
			return;

		return await this.gdrive.readFile(networkFileId);		
	}

	async updateAll(planningCollections) {
		await this.write(planningCollections);
	}

	/**
	 * Synchronizes the local planning cache to GDrive
	 * @returns {bool} Needs GUI refresh
	 */
	async syncGDrive() {
		console.log("Syncing GDrive");
		const networkCollections = await this.readAll();
		//console.log("Network collections", networkCollections)
		if(!networkCollections) {
			//We don't know if the collections are not present because the file is empty or because it does not exist
			const localCollections = await this.#planningCache.readAll();
			await this.write(localCollections);
		} else {
			const cacheModifiedTime = localStorage.getItem(GDrive.MODIFIED_TIME_FIELD);
			const gDriveModifiedTime = await this.getGdriveModifiedTime();
			//console.log(cacheModifiedTime, gDriveModifiedTime)

			if(!cacheModifiedTime || cacheModifiedTime < gDriveModifiedTime) {
				console.log("Updating local with data from GDrive")
				await this.#planningCache.updateAll(Object.entries(networkCollections));
				localStorage.setItem(GDrive.MODIFIED_TIME_FIELD, gDriveModifiedTime);
				return true;
			} else if(cacheModifiedTime > gDriveModifiedTime) {
				console.log("Updating GDrive with data from local")
				const localCollections = await this.#planningCache.readAll();
				await this.updateAll(localCollections);
				//console.log("Updated gdrive with", localCollections);
				localStorage.setItem(GDrive.MODIFIED_TIME_FIELD, await this.getGdriveModifiedTime());
			}
		}
		return false;
	}

	async getGdriveModifiedTime() {
		const networkFileId = await this.getGdriveFileId();
		const metadata = await this.gdrive.readFileMetadata(networkFileId, GDrive.MODIFIED_TIME_FIELD);
		return metadata[GDrive.MODIFIED_TIME_FIELD];
	}

	//#endregion

	async getGdriveFileId() {
		const networkFileId = localStorage.getItem(PLANNING_FILE_NAME);
		if(networkFileId) 
			return networkFileId;

		var topFolder = await this.gdrive.findFolder(APP_FOLDER);
		if (!topFolder) {
			topFolder = await this.gdrive.createFolder(APP_FOLDER);
			if(!topFolder) return;
		}

		let fileId = await this.gdrive.findFile(PLANNING_FILE_NAME, topFolder);
		if(!fileId) {
			fileId = await this.gdrive.writeFile(topFolder, PLANNING_FILE_NAME, '', true);
			if(!fileId)	return;
		}

		//Store file id for fast retrieval
		localStorage.setItem(PLANNING_FILE_NAME, fileId);
		return fileId;
	}
/*
	async mergeLocalPlanningToNetwork(overwrite = false) {
		//console.log("Merging local planning to network...")
		var needsMerge = false;
		let networkFileId = localStorage.getItem(PLANNING_FILE_NAME);
		//console.log(networkFileId)
		if(!networkFileId) {
			//No planning file found, write current data to network, but do not overwrite
			const cursorData = await planning.pdb.openCursor(PLANNING_STORE_NAME);
			networkFileId = await this.persistPlanningToNetwork(cursorData, overwrite);
			
			if(!networkFileId) {
				console.error("Could not retrieve planning file from newtork");
			}

			return;
		}

		const networkPlannings = await gdrive.readFile(networkFileId);		
		const localPlannings = await planning.pdb.openCursor(PLANNING_STORE_NAME);
		
		//console.log("Network planning:", networkPlanning);
		for(const [networkKey, networkPlanning] of networkPlannings) {
			const localPlanning = localPlannings.get(networkKey);

			//console.log("Comparing local with network:", localPlanning, networkPlanning);
			if(!localPlanning) {
				this.pdb.put(PLANNING_STORE_NAME, networkPlanning, networkKey);
				continue;
			}

			const localPlanningData = localPlanning.data;
			const networkPlanningData = networkPlanning.data;

			//console.log("Iterating through local and network data:", localPlanningData, networkPlanningData);
			for (let index = 0; index < networkPlanningData.length; index++) {
				const networkPlanningEntry = networkPlanningData[index];
				const localPlanningEntry = localPlanningData[index];
				
				//console.log("Comparing network with local:", localPlanningEntry, networkPlanningEntry);
				if(!this.areEqual(networkPlanningEntry, localPlanningEntry)) {
					needsMerge = true;
					if(localPlanningEntry.edited) {
						delete localPlanningEntry.edited;
					} else {
						//found edits from the network
						//console.log("Overwriting local with network:", localPlanningEntry, networkPlanningEntry);
						localPlanningData[index] = networkPlanningEntry;
					}
				} else {
					if(localPlanningEntry.added) {
						delete localPlanningEntry.added;
						networkPlanningData.push(localPlanningEntry);
						needsMerge = true;
					}
					if(localPlanningEntry.deleted) {
						localPlanning.splice(index, 1);
						networkPlanningData.splice(index, 1);
						index--;
						needsMerge = true;
					}
				}
			}

			for (let index = 0; index < localPlanningData.length; index++) {
				const localPlanningEntry = localPlanningData[index];
				if(localPlanningEntry.deleted) {
					localPlanning.splice(index, 1);
					networkPlanningData.splice(index, 1);
					index--;
					needsMerge = true;
				}
				if(localPlanningEntry.added) {
					delete localPlanningEntry.added;
					needsMerge = true;
				}
				if(localPlanningEntry.edited) {
					delete localPlanningEntry.edited;
					needsMerge = true;
				}
			}

			if(needsMerge) {
				//console.log("Needs merge", localPlannings);
				this.pdb.put(PLANNING_STORE_NAME, localPlanning, networkKey);
			}
		}

		if(needsMerge) {
			const fileId = this.persistPlanningToNetwork(localPlannings, true);
			if(fileId === null) {
				console.error("Could not write planning file to newtork");
			}
		}
		return localPlannings;
	}

    async persist(planningItem, overwrite) {
		var topFolder = await gdrive.findFolder(APP_FOLDER);

		if (!topFolder) {
			topFolder = await gdrive.createFolder(APP_FOLDER);
		}
		if(!topFolder) return;

		const planningData = Array.from(planningItem.entries());
		const fileId = await gdrive.writeFile(topFolder, PLANNING_FILE_NAME, planningData, overwrite);
		
		if(fileId !== undefined) {
			//Store file id for fast retrieval
			localStorage.setItem(PLANNING_FILE_NAME, fileId);
			return true;
		}

		return false;
	}
	*/
}