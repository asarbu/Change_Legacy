async function initSpending() {
	if (!window.indexedDB) {
		console.error(`Your browser doesn't support IndexedDB`);
		return;
	}

	if(gdriveSync) { 
		gdrive = await import('./gDrive.js');
	}
	const spending = new SpendingController();
	spending.init();
}

class SpendingController {
	#MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
	#spendingCache = undefined;
	/**
	 * Used to quickly access already created tabs
	 * @type {Map<string, SpendingTab>}
	 */
	#tabs = undefined;
	constructor() {
		this.year = '2023';
		this.spendingCache = new SpendingCache();
		this.planningCache = new PlanningCache();
		
		if(gdriveSync) {
			this.spendingGdrive = new SpendingGdrive(this.spendingCache);
		}

		this.#tabs = new Map();
	}

	async init() {
		//console.log("Init spending");
		await this.spendingCache.init();
		await this.planningCache.init();
		
		if(gdriveSync) {
			this.spendingGdrive.init();	
		}
		
		// TODO Sepparate craetion of current month from rest
		const now = new Date();
		const currentYear =  now.toLocaleString("en-US", {year: "numeric"});
		const currentMonth = now.toLocaleString("en-US", {month: "short"});
		let monthIndex = this.#MONTHS.indexOf(currentMonth);
		let monthCount = 0;
		while (monthIndex >= 0 && monthCount < 4){
			const month = this.#MONTHS[monthIndex];
			console.log("Initializing " + month, monthIndex, monthCount);
			const forceCreate = (currentYear === currentYear && month === currentMonth);
			
			const spendings = await this.spendingCache.readAll(currentYear, month);
			if(spendings.length > 0) {
				monthCount++;
				const tab = new SpendingTab(currentYear, month, forceCreate, spendings);
				tab.init();
				tab.onClickCreateSpending = this.onClickCreateSpending.bind(this);
				this.#tabs.set(month, tab);
			}

			if(gdriveSync) {
				this.spendingGdrive.syncGDrive(currentYear, month).then(needsRefresh => {
					if(needsRefresh) {
						this.refreshTab(currentYear, month);
					}
				});
			}
			
			monthIndex--;
		}
	}

	onClickCreateSpending(spending, year) {
		//TODO implement year in caller functions
		console.log("Creating new spending", spending);
		this.spendingCache.insert(spending);
		this.refreshTab(this.year, spending.month);
	}

	async refreshTab(year, month) {
		const spendings = await this.spendingCache.readAll(year, spending.month);
		if(this.#tabs.get(spending.month)) {
			this.#tabs.get(spending.month).refresh(spendings);
		} else {
			window.location.reload();
		}
	}
}

document.addEventListener("DOMContentLoaded", initSpending);