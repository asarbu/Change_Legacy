const SPENDINGS_STORE_NAME = 'Spendings';

async function initSpending() {
	if (!window.indexedDB) {
		console.error(`Your browser doesn't support IndexedDB`);
		return;
	}

	var spendingsGdrive;

	if(gdriveSync) {
		spendingsGdrive = new SpendingGdrive();
		spendingsGdrive.init();
	}

	const now = new Date();
	const currentMonth = now.toLocaleString("en-US", {month: "short"});
	const currentYear =  now.toLocaleString("en-US", {year: "numeric"});
	const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
	for(const month of months) {
		const forceCreate = (currentYear === currentYear && month === currentMonth);
		const monthlySpendings = new Spendings(currentYear, month, forceCreate);
		await monthlySpendings.init();
	}
}

class Spendings {
	constructor(year, month, forceCreate) {
		this.month = month;
		this.year = year;
		this.forceCreate = forceCreate;
	}

	async init() {
		console.log("Init " + this.month);
		await this.pdb.init()
			.then(pdb => pdb.fetchTemplateToStore(PLANNING_TEMPLATE_URI, PLANNING_STORE_NAME));
		this.spendingsCache = new SpendingCache();
		this.planningCache = new PlanningCache();
		this.spendingsGdrive = new SpendingGdrive(this.year, this.month, this.spendingsCache);
		await this.spendingsCache.init();
		await this.planningCache.init();
		await this.spendingsGdrive.init();
		//Display local data first, in case we might have a slow or no internet
		if(await this.spendingsCache.hasSpendings() || this.forceCreate) {
			const currentMonthSpendings = await this.spendingsCache.getAllSpendings();
			this.createTab(this.month, this.forceCreate);
			await this.processSpendings(currentMonthSpendings);
		} 

		if(gdriveSync) {
			console.log("Syncing to Google drive")
			await this.spendingsGdrive.syncSpendingsToNetwork();

			const currentMonthSpendings = await this.spendingsCache.getAllSpendings();
			this.createTab(this.month, this.forceCreate);
			await this.processSpendings(currentMonthSpendings);
		}	
	}

	createTab(monthName, active) {
		//console.log("Creating tab for:", monthName);
		if(this.tab) return;

		this.tab = new SpendingTab(monthName, active, this.spendingsCache, this.planningCache);
	}
	
	areEqual(thisSpending, thatSpending) {
		return thisSpending.bought_date === thatSpending.bought_date &&
			thisSpending.category === thatSpending.category &&
			thisSpending.description === thatSpending.description &&
			thisSpending.price === thatSpending.price &&
			thisSpending.type === thatSpending.type;
	}

	async processSpendings(spendings) {
		//console.log("Processing spendings", spendings);
		this.spendingsMap = spendings;
		this.spendings = Array.from(spendings.values());
		this.tab.refresh(this.spendingsMap);
		this.categorizeSpendings();
		await this.extractPlanningBudgets();
		this.processSummary();
	}

	categorizeSpendings() {
		this.totals = new Map();
		for (const [id, spending] of this.spendings) {
			if (!this.totals.has(spending.category)) {
				this.totals.set(spending.category, 0);
			}
			this.totals.set(spending.category, this.totals.get(spending.category) + parseFloat(spending.price));
		}
	}

	async extractPlanningBudgets() {
		this.budgets = new Map();
		const spendingTypes = new Set();
	
		for(const [id, spending] of this.spendings) {
			spendingTypes.add(spending.type);
		}

		for (const spendingType of spendingTypes) {
			const planningItem = await this.pdb.get(PLANNING_STORE_NAME, spendingType);
			for (const planningBudget of planningItem.data) {
				this.budgets.set(planningBudget.name, planningBudget.monthly);
			}
		}
	}

	processSummary() {
		let totalSpent = 0;
		let totalBudget = 0;
		let totalPercent = 0.00;
		let count = 0;
		//TODO replace this with creating a new tbody and replacing old one
		this.summaryTable.tBodies[0].innerHTML = "";
		for (const [key, value] of this.totals) {
			const planningBudget = this.budgets.get(key)
			const percentage = value / parseFloat(planningBudget);
			this.appendToSummaryTable([key, value, planningBudget, parseInt(percentage * 100)], { readonly: true, color: getColorForPercentage(percentage) });
			
			totalBudget = totalBudget + parseInt(planningBudget);
			totalSpent = totalSpent + parseInt(value);
			totalPercent = totalPercent + parseInt(percentage * 100);
			count++;
		}
		const options = { useBold: true, readonly: true, index: -1, color: getColorForPercentage(totalPercent/count)};
		this.appendToSummaryTable(["Total", totalSpent, totalBudget, parseInt(totalPercent/count)], options);
	}
}

document.addEventListener("DOMContentLoaded", initSpending);