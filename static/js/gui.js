function createImageButton(text, href, classList, src) {
	const btn = document.createElement("button");
	btn.classList.add(...classList);
	btn.setAttribute("href",href);
	const img = document.createElement("img");
	img.classList.add("white-fill");
	img.innerText = text;
	img.alt = text;
	img.src = src;
	btn.appendChild(img);
	return btn;
}

function create(element, properties) {
	var elmt = document.createElement(element);
    for (var prop in properties) {
		if(prop === "classes") {
			elmt.classList.add(...properties[prop]);
			continue;
		}
		//if(elmt[prop])
	        elmt[prop] = properties[prop];
		//else
		//	elmt.setAttribute(prop, properties[prop]);
    }
    return elmt;
}

function createRow(table, data, options) {
	var index = -1;
	if (options.index) {
		index = options.index;
	}
	const row = table.tBodies[0].insertRow(index);
	var dataCell;

	for (const dataCtn of Object.values(data)) {
		dataCell = row.insertCell(-1);
		dataCell.textContent = dataCtn;
		if (!options.readonly) {
			dataCell.setAttribute("editable", true);
		}
		if (options.useBold == true) {
			dataCell.style.fontWeight = "bold";
		}
	}

	if (options.color) {
		dataCell.style.color = options.color;
	}

	if (options.deletable) {	
		const buttonsCell = row.insertCell(-1);
		const btn = document.createElement("button");
		btn.classList.add("waves-effect", "waves-light", "red", "btn-small");
		buttonsCell.appendChild(btn);
		const img = document.createElement("img");
		img.classList.add("white-fill");
		img.innerHTML = "Delete";
		img.alt = "Delete";
		img.src = icons.delete;
		btn.appendChild(img)
		
		buttonsCell.setAttribute("hideable", "true");
		if (options.hidden) {
			buttonsCell.style.display = 'none';
		}
	}
	console.log("Created row", row)
	return row;
}

function ReadRow() {
	//TBD
}

function DeleteRow(table, row) {

}

var percentColors = [
	{ pct: 0.0, color: { r: 0x00, g: 0xdf, b: 0 } },
	{ pct: 0.5, color: { r: 0xdf, g: 0xdf, b: 0 } },
	{ pct: 1.0, color: { r: 0xdf, g: 0x00, b: 0 } }];

function getColorForPercentage(pct) {

	if (pct > 1) {
		pct = 1
	}

	for (var i = 1; i < percentColors.length - 1; i++) {
		if (pct < percentColors[i].pct) {
			break;
		}
	}
	var lower = percentColors[i - 1];
	var upper = percentColors[i];
	var range = upper.pct - lower.pct;
	var rangePct = (pct - lower.pct) / range;
	var pctLower = 1 - rangePct;
	var pctUpper = rangePct;
	var color = {
		r: Math.floor(lower.color.r * pctLower + upper.color.r * pctUpper),
		g: Math.floor(lower.color.g * pctLower + upper.color.g * pctUpper),
		b: Math.floor(lower.color.b * pctLower + upper.color.b * pctUpper)
	};
	return 'rgb(' + [color.r, color.g, color.b].join(',') + ')';
	// or output as hex if preferred
};


function onMouseOver(event) {
	if (!event.target.matches("td"))
		return;
	var row = event.target.parentNode;
	row.classList.add('active-row');
}

function onMouseOut(event) {
	if (!event.target.matches("td"))
		return;
	var row = event.target.parentNode;
	row.classList.remove('active-row');
}