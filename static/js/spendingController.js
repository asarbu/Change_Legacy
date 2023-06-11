async function initSpending() {
	if (!window.indexedDB) {
		console.error(`Your browser doesn't support IndexedDB`);
		return;
	}
	
	const spending = new SpendingController();
	await spending.init();
}

class SpendingController {
	#MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
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
		this.#spendingCache = new SpendingCache();
		this.#planningCache = new PlanningCache();
		
		if(gdriveSync) {
			this.spendingGDrive = new SpendingGDrive(this.#spendingCache);
			this.planningGDrive = new PlanningGDrive(this.#planningCache);
		}

		this.#tabs = new Map();
		
		const now = new Date();
		this.currentYear =  now.toLocaleString("en-US", {year: "numeric"});
		this.currentMonth = now.toLocaleString("en-US", {month: "short"});
	}

	async init() {
		//console.log("Init spending");
		await this.#spendingCache.init();
		await this.#planningCache.init();
		
		if(gdriveSync) {
			await this.spendingGDrive.init();
			await this.planningGDrive.init();
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
		
		let monthIndex = this.#MONTH_NAMES.indexOf(this.currentMonth);
		let monthCount = 0;
		while (monthIndex >= 0 && monthCount < 4){
			const monthName = this.#MONTH_NAMES[monthIndex];
			const spendings = await this.#spendingCache.readAll(this.currentYear, monthName);
			
			if(spendings.length > 0 || monthName === this.currentMonth) {
				const tab = new SpendingTab(monthName, spendings, expenseBudgets, categories);
				tab.init();
				tab.onClickCreateSpending = this.onClickCreateSpending.bind(this);
				this.#tabs.set(monthName, tab);
				monthCount++;
			}

			if(gdriveSync) {
				await this.spendingGDrive.init();
				this.spendingGDrive.syncGDrive(this.currentYear, monthName).then(needsRefresh => {
					if(this.#tabs.has(monthName)) {
						this.refreshTab(monthName);
					}
				});
			}
			
			monthIndex--;
		}
	}

	async onClickCreateSpending(spending, creationDateTime) {
		console.log("Creating spending", spending);
		//TODO split bought date into month, day, year. Store only month and day in object on caller to avoid processing here
		const boughtDate = spending.boughtDate;
		const month = boughtDate.substring(0, 3);
		const year = boughtDate.substring(boughtDate.length-4, boughtDate.length);
		const day = undefined;
		this.#spendingCache.insert(year, creationDateTime, spending);
		if(this.currentYear === year)
			this.refreshTab(spending.month);

		if(gdriveSync) {
			const needsUpdate = await this.spendingGDrive.syncGDrive(year, spending.month);
			if(needsUpdate) {
				this.refreshTab(month);
				M.toast({html: 'Updated from GDrive', classes: 'rounded'});
			}
		}
	}

	async refreshTab(month) {
		const spendings = await this.#spendingCache.readAll(this.currentYear, month);
		if(this.#tabs.get(month)) {
			this.#tabs.get(month).refresh(spendings);
		} else {
			//TODO this might trigger a reload before gdrive updated
			window.location.reload();
		}
	}
}

document.addEventListener("DOMContentLoaded", initSpending);