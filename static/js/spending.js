const SPENDINGS_STORE_NAME = 'Spendings';

async function initSpending() {
	if (!window.indexedDB) {
		console.error(`Your browser doesn't support IndexedDB`);
		return;
	}

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
	
	M.AutoInit();
}

class Spending {
	constructor(year, month, forceCreate) {
		this.month = month;
		this.year = year;
		this.forceCreate = forceCreate;
	}

	async init() {
		//console.log("Init " + this.month);
		
		this.tab = new SpendingTab(this.year, this.month, this.forceCreate);
		await this.tab.init();
	}
}

document.addEventListener("DOMContentLoaded", initSpending);