const APP_FOLDER = "Change!";
const PLANNING_FILE_NAME = "planning.json";

async function initPlanning() {	
	const planning = new PlanningController();
	await planning.init();
}

class PlanningController {
	/**
	 * Used for fast retrieval of GUI tabs by name 
	 * @type {Map<string, PlanningTab>}
	 * @public
	 */
	#tabs = undefined;
	constructor() {
		this.planningCache = new PlanningCache();
		/*if(gdriveSync) {
			this.planningGDrive = new PlanningGDrive(this.planningCache);
		}*/
		this.#tabs = new Map();
	}

	async init() {
		await this.planningCache.init();
		
		const localCollections = await this.planningCache.readAll();
		//console.log(planningCollections)
		for (const [id, planningCollection] of Object.entries(localCollections)) {
			const planningTab = new PlanningTab(id, planningCollection);
			planningTab.onClickUpdate = this.onClickUpdate.bind(this);
			planningTab.init();
			this.#tabs.set(planningTab.id, planningTab);
		}

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