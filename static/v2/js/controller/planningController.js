const APP_FOLDER = "Change!";
const PLANNING_FILE_NAME = "planning.json";

async function initPlanning() {	
	const planning = new PlanningController();
	await planning.init();
}

class PlanningController {
	/**
	 * Used for fast retrieval of GUI tabs by name 
	 * @type {Map<string, PlanningScreen>}
	 * @private
	 */
	#tabs = undefined;
	/**
	 * Planning year => planning collection => planning slice
	 * @type {Map<numeric, <Map<String, PlanningTab>>}}
	 */
	#slices=undefined;
	/**
	 * Used for fast retreival of local caches.
	 * @type {Map<String, PlanningCache>}
	 * @private
	 */
	#caches = undefined;
	constructor() {
		/*if(gdriveSync) {
			this.planningGDrive = new PlanningGDrive(this.planningCache);
		}*/
		this.#tabs = new Map();
	}

	async init() {
		const currentYear =  new Date().toLocaleString("en-US", {year: "numeric"});
		this.#caches = await PlanningCache.getAll();
		//const planningCaches = this.#caches.values();
		
		for (const [storeName, planningCache] of this.#caches.entries()){
			const localCollections = await planningCache.readAll();
			const planningTab = new PlanningScreen(storeName, localCollections);
			planningTab.onClickUpdate = this.onClickUpdate.bind(this);
			planningTab.init();
			this.#tabs.set(storeName, planningTab);
			//console.log(planningCollections)
		}
		
		this.#tabs.get(currentYear).activate();

		/*if(gdriveSync) {
			this.initGDrive();
		}*/
	}

	async initGDrive() {
		await this.planningGDrive.init();
		const needsUpdate = await this.planningGDrive.syncGDrive();
		if(needsUpdate) {
			const localCollections = await this.planningCache.readAll();
			for (const [id, planningCollection] of Object.entries(localCollections)) {
				this.#tabs.get(id).update(planningCollection);
			}
			M.toast({html: 'Updated from GDrive', classes: 'rounded'});
		}
	}

	async onClickUpdate(id, planningCollection) {
		//console.log("OnClickUpdate");
		await this.planningCache.update(id, planningCollection);
		
		if(gdriveSync) {
			localStorage.setItem(GDrive.MODIFIED_TIME_FIELD, new Date().toISOString());
			const needsUpdate = await this.planningGDrive.syncGDrive();
			if(needsUpdate) {
				this.#tabs.get(id).update(planningCollection);
				M.toast({html: 'Updated from GDrive', classes: 'rounded'});
			}
		}
	}
}

document.addEventListener("DOMContentLoaded", initPlanning);