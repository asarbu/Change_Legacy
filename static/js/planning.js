const APP_FOLDER = "Change!";
const PLANNING_FILE_NAME = "planning.json";

async function initPlanning() {	
	if(gdriveSync) { 
		gdrive = await import('./gDrive.js');
	}
	var sideNavs = document.querySelectorAll('.sidenav');
	M.Sidenav.init(sideNavs, {});

	const planning = new Planning();
	await planning.init();
}

class Planning {
	constructor() {
		this.planningCache = new PlanningCache();
		this.planningGDrive = new PlanningGDrive("Planning");
		this.tabs = new Map();
	}

	async init() {
		await this.planningCache.init();
		await this.planningGDrive.init();
		//if(gdriveSync)
		//	await this.syncToNetwork();
		
		//const plannings = await this.pdb.openCursor(PLANNING_STORE_NAME);
		//this.createPlanningTable(plannings);
		
		const localCollections = await this.planningCache.readAll();
		//console.log(planningCollections)
		for (const [id, planningCollection] of Object.entries(localCollections)) {
			const planningTab = new PlanningTab(id, planningCollection);
			planningTab.onUpdate = this.onUpdate;
			planningTab.init();
			this.tabs.set(planningTab.id, planningTab);
		}

		this.syncGdrive(localCollections);

		var el = document.querySelector('.tabs')
		M.Tabs.init(el, {})
	}

	async syncGdrive(localCollections) {
		if(gdriveSync) {
			const networkCollections = await this.planningGDrive.readAll();
			if(!networkCollections) {
				//We don't know if the collections are not present because the file is empty or because it does not exist
				await this.planningGDrive.write(localCollections);
			} else {
				await this.planningGDrive.updateAll(localCollections);
				await this.planningCache.updateAll(networkCollections);
			}
		}
		console.log("Finished syncing to GDrive")
	}

	async merge(fromCollection, toCollections) {
		let	networkFileId = await this.getGdriveFileId();
		if(!networkFileId)
			return;

		//TODO concat planning.json_ here
		const lastModifiedTime = localStorage.getItem(this.#MODIFIED_TIME);
		const networkPlanningCollections = await this.readAll();

		console.log(networkPlanningCollections, planningCollections)

		const metadata = await this.gdrive.readFileMetadata(networkFileId, this.#MODIFIED_TIME);
		const modifiedTime = metadata[this.#MODIFIED_TIME];

		if(lastModifiedTime === modifiedTime) 
			return;
		
		for (const [collectionId, planningCollection] of Object.entries(localCollections)) {
			if(!planningCollections[collectionId]) {
				planningCollections[collectionId] = planningCollection;
				continue;
			} 

			for (const [groupId, group] of Object.entries(planningCollection.groups)) {
				if(!planningCollection.groups[groupId]) {
					planningCollection.groups[groupId] = group;
					continue;
				} 

				for(const [itemId, item] of Object.entries(group.items)) {
					if(!group.items[itemId]) {
						group.items[itemId] = item;
						continue;
					} 
				}
			}
		}

		localStorage.setItem(this.#MODIFIED_TIME, modifiedTime)
	}

	onUpdate(id, planningCollection) {
		console.log("Updating", id, planningCollection);
	}
}

document.addEventListener("DOMContentLoaded", initPlanning);