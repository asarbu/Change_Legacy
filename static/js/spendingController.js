async function initSpending() {
	if (!window.indexedDB) {
		console.error(`Your browser doesn't support IndexedDB`);
		return;
	}

	if(gdriveSync) { 
		gdrive = await import('./gDrive.js');
	}
	const spending = new SpendingController();
	await spending.init();
}

class SpendingController {
	#MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
	#spendingCache = undefined;
	/**
	 * Used to quickly access already created tabs
	 * @type {Map<string, SpendingTab>}
	 */
	#tabs = undefined;

	/**
	 * Used to quickly access already created tabs
	 * @type {PlanningCache}
	 */
	#planningCache = undefined;
	constructor() {
		this.year = '2023';
		this.spendingCache = new SpendingCache();
		this.#planningCache = new PlanningCache();
		
		if(gdriveSync) {
			this.spendingGdrive = new SpendingGdrive(this.spendingCache);
			this.planningGdrive = new SpendingGdrive(this.#planningCache);
		}

		this.#tabs = new Map();
	}

	async init() {
		//console.log("Init spending");
		await this.spendingCache.init();
		await this.#planningCache.init();
		
		if(gdriveSync) {
			await this.spendingGdrive.init();
			await this.planningGdrive.init();
		}

		const planningCollections = await this.#planningCache.getExpenses();
		const expenseBudgets = new Map();
		const categories = new Map();
		for(const [_, planningCollection] of planningCollections.entries()) {
				for(const [groupName, group] of Object.entries(planningCollection.value.groups)) {
					const categoryArray = [];
					for(const [_, item] of Object.entries(group.items)) {
						expenseBudgets.set(item.itemName, item.monthly);
						categoryArray.push(item.itemName);
					}
					categories.set(groupName, categoryArray);
				
			}
		}
		
		// TODO Separate craetion of current month from rest
		const now = new Date();
		this.year =  now.toLocaleString("en-US", {year: "numeric"});
		const currentMonth = now.toLocaleString("en-US", {month: "short"});
		let monthIndex = this.#MONTHS.indexOf(currentMonth);
		let monthCount = 0;
		while (monthIndex >= 0 && monthCount < 4){
			const month = this.#MONTHS[monthIndex];
			//Create even if empty. We need at least one tab
			const spendings = await this.spendingCache.readAll(this.year, month);

			if(spendings.length > 0 || month === currentMonth) {
				const tab = new SpendingTab(month, spendings, expenseBudgets, categories);
				tab.init();
				tab.onClickCreateSpending = this.onClickCreateSpending.bind(this);
				this.#tabs.set(month, tab);
				monthCount++;
			}

			if(gdriveSync) {
				await this.spendingGdrive.init();
				this.spendingGdrive.syncGDrive(this.year, month).then(needsRefresh => {
					if(this.#tabs.has(month)) {
						this.refreshTab(month);
					}
				});
			}
			
			monthIndex--;
		}
	}

	async onClickCreateSpending(spending, creationDateTime) {
		const boughtDate = spending.boughtDate;
		const month = boughtDate.substring(0, 3);
		const year = boughtDate.substring(boughtDate.length-4, boughtDate.length);
		this.spendingCache.insert(spending, creationDateTime);
		if(this.year === year)
			this.refreshTab(spending.month);

		if(gdriveSync) {
			//localStorage.setItem(GDrive.MODIFIED_TIME_FIELD, new Date().toISOString());
			const needsUpdate = await this.spendingGdrive.syncGDrive(year, spending.month);
			if(needsUpdate) {
				this.refreshTab(month);
				M.toast({html: 'Updated from GDrive', classes: 'rounded'});
			}
		}
	}

	async refreshTab(month) {
		const spendings = await this.spendingCache.readAll(this.year, month);
		if(this.#tabs.get(month)) {
			this.#tabs.get(month).refresh(spendings);
		} else {
			//TODO this might trigger a reload before gdrive updated
			//window.location.reload();
			console.log("Trigger reload for ", month)
		}
	}
}

document.addEventListener("DOMContentLoaded", initSpending);