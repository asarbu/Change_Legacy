const APP_FOLDER = "Change!";
const PLANNING_FILE_NAME = "planning.json";

async function initPlanning() {	
	if(gdriveSync) { 
		gdrive = await import('./gDrive.js');
	}
	var sideNavs = document.querySelectorAll('.sidenav');
	M.Sidenav.init(sideNavs, {});

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
		if(gdriveSync) {
			this.planningGDrive = new PlanningGDrive(this.planningCache);
		}
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

		if(gdriveSync) {
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
		var el = document.querySelector('.tabs')
		M.Tabs.init(el, {})
	}

	async onClickUpdate(id, planningCollection) {
		await this.planningCache.update(id, planningCollection);
		
		if(gdriveSync) {
			localStorage.setItem(PlanningGDrive.MODIFIED_TIME, new Date().toISOString());
			const needsUpdate = await this.planningGDrive.syncGDrive();
			if(needsUpdate) {
				this.#tabs.get(id).update(planningCollection);
				M.toast({html: 'Updated from GDrive', classes: 'rounded'});
			}
		}
	}
}

document.addEventListener("DOMContentLoaded", initPlanning);