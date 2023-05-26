async function initSpending() {
	if (!window.indexedDB) {
		console.error(`Your browser doesn't support IndexedDB`);
		return;
	}

	if(gdriveSync) { 
		gdrive = await import('./gDrive.js');
	}
	const spending = new Spending();
	spending.init();
/*
	const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
	const now = new Date();
	const currentYear =  now.toLocaleString("en-US", {year: "numeric"});
	const currentMonth = now.toLocaleString("en-US", {month: "short"});
	let monthIndex = months.indexOf(currentMonth);
	let monthCount = 0;
	while (monthIndex > 0 && monthCount < 3){
		const month = months[monthIndex];
		//console.log("Initializing " + month);
		const forceCreate = (currentYear === currentYear && month === currentMonth);
		const monthlySpendings = new Spending(currentYear, month, forceCreate);
		await monthlySpendings.init();
		monthCount++;
		monthIndex--;
	}
	*/
}

class Spending {
	#spendingCache = undefined;
	constructor(year, month, forceCreate) {
		this.month = month;
		this.year = year;
		this.forceCreate = forceCreate;
	}

	async init() {
		//console.log("Init spending for month" + this.month);
		
		this.spendingCache = new SpendingCache();
		this.planningCache = new PlanningCache();
		await this.spendingCache.init();
		await this.planningCache.init();
		
		/*
		const hasSpendings = await this.spendingCache.hasSpendings();
		if(!hasSpendings && !this.forceCreate) {
			if(gdriveSync) {
				const existsOnGDrive = await this.spendingsGdrive.getSpendingsFile();
				if(!existsOnGDrive) {
					return;
				}
			} else {
				return;
			}
		}
*/
		if(gdriveSync) {
			this.spendingsGdrive = new SpendingGdrive(this.year, this.month, this.spendingCache, this.forceCreate);
		}

		this.tab = new SpendingTab(this.year, this.month, this.forceCreate);
		this.tab.init();
		this.tab.onClickCreate = this.onClickCreate().bind(this);

		if(gdriveSync) {
			
		}
	}

	onClickCreate(spending) {
		this.spendingCache.insert(year, month, spending);
	}
}

document.addEventListener("DOMContentLoaded", initSpending);