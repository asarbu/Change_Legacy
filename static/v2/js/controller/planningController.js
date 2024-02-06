import PlanningCache from '../persistence/planning/planningCache.js';
import PlanningScreen from '../gui/planningScreen.js';

export default class PlanningController {
	/**
	 * Used for fast retrieval of GUI tabs by name
	 * @type {Map<string, PlanningScreen>}
	 * @private
	 */
	#tabs = undefined;

	/**
	 * Planning year => planning statement => planning screen
	 * @type {Map<numeric, <Map<String, PlanningScreen>>}}
	 */
	#slices = undefined;

	/**
	 * Used for fast retreival of local caches.
	 * @type {Array<PlanningCache>}
	 * @private
	 */
	#caches = undefined;

	constructor() {
		/* if(gdriveSync) {
			this.planningGDrive = new PlanningGDrive(this.planningCache);
		} */
		this.#tabs = new Map();
	}

	async init() {
		const currentYear = new Date().toLocaleString('en-US', {year: 'numeric'});
		this.#caches = await PlanningCache.getAll();
		// const planningCaches = this.#caches.values();

		for (let i = 0; i < this.#caches.length; i += 1) {
			const planningCache = this.#caches[i];
			const localCollections = await planningCache.readAll();
			const planningScreen = new PlanningScreen(planningCache.storeName, localCollections);
			planningScreen.onClickUpdate = this.onClickUpdate.bind(this);
			// planningTab.init();
			this.#tabs.set(planningCache.storeName, planningScreen);
		}

		this.#tabs.get(currentYear).init();
		this.#tabs.get(currentYear).activate();

		/* if(gdriveSync) {
			this.initGDrive();
		} */
	}

	/*
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
	} */

	async onClickUpdate(id, planningCollection) {
		await this.planningCache.update(id, planningCollection);

		/*
		if(gdriveSync) {
			localStorage.setItem(GDrive.MODIFIED_TIME_FIELD, new Date().toISOString());
			const needsUpdate = await this.planningGDrive.syncGDrive();
			if(needsUpdate) {
				this.#tabs.get(id).update(planningCollection);
				M.toast({html: 'Updated from GDrive', classes: 'rounded'});
			}
		} */
	}
}
