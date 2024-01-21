class GraphicEffects {
	constructor(domElement) {
		//this.sliderContainer = domElement.querySelector('.container');
		this.rootContainer = domElement;
		
		
		this.mouseDown = false;
		this.scrolling = undefined;
		this.currentIndex = 1;
		this.startX = 0;
		this.startY = 0;
	}

	init() {
		this.containerWidth = this.rootContainer.clientWidth;
		this.sliderWrapper = this.rootContainer.querySelector('.section');
		this.lastIndex = this.sliderWrapper.children.length + 1;
		// appened cloneNodes to the parent element.
		const $clonedFirstChild = this.sliderWrapper.firstElementChild.cloneNode(true);
		const $clonedLastChild = this.sliderWrapper.lastElementChild.cloneNode(true);
		//TODO: Do this after the user scrolled to the end, so that we also copy the scroll position
		this.sliderWrapper.insertBefore($clonedLastChild, this.sliderWrapper.firstElementChild);
		this.sliderWrapper.appendChild($clonedFirstChild);

		this.slices = this.rootContainer.querySelectorAll('.slice');
		this.slices.forEach((el, i) => {
			el.setAttribute('data-item-index', i);
		});

		/*
		const $tabLinks = document.querySelectorAll('.tab');
		$tabLinks.forEach((el, i) => {
			el.addEventListener("click", () => {
			document.body.style.backgroundColor = "rgb(0, 0, 0)";
			setSlide(i+1);
			});
		tabs.push(el);
		});*/

		this.currentIndex = 1;

		this.sliderWrapper.style.transition = 'transform 0s linear';
		this.sliderWrapper.style.transform = `translateX(${-this.containerWidth * 1}px)`; 
		
		// * when mousedown or touchstart
		this.sliderWrapper.addEventListener('mousedown', this.startSlider.bind(this));
		this.sliderWrapper.addEventListener('touchmove', this.startSlider.bind(this), { passive: true });

		// * when mouseup or touchend
		// TODO This registers the event listener multiple times
		window.addEventListener('mouseup', this.endSlider.bind(this));
		window.addEventListener('touchend', this.endSlider.bind(this));
		window.addEventListener('resize', this.refresh.bind(this), true);
		this.setSlide(this.currentIndex);
	}

	setSlide(index) {
		this.currentIndex = +index;
		this.currentIndex = Math.min(this.currentIndex, this.lastIndex);
		requestAnimationFrame(() => {
			this.sliderWrapper.style.transition = 'transform 0.25s linear';
			this.sliderWrapper.style.transform = `translateX(${-this.containerWidth * index}px)`;  
		});
		/*
		const $tabs = document.querySelectorAll('.tab');
		
		$tabs.forEach((el, i) => {
		  el.classList.remove('active-tab');
		});
		tabs[index-1].classList.add('active-tab');*/
	}

	startSlider(e) {
		this.mouseDown = true;
	  
		// check desktop or mobile
		this.startX = e.clientX ? e.clientX : e.touches[0].screenX;
		this.startY = e.clientY ? e.clientY : e.touches[0].screenY;
		
		this.sliderWrapper.removeEventListener('touchmove', this.startSlider.bind(this));
		this.rootContainer.addEventListener(e.clientX ? 'mousemove' : 'touchmove',
			this.moveSlider.bind(this), { passive: true	});
	  };
	  
	  moveSlider(e) {
		if (!this.mouseDown) return;
	  
		let currentX = e.clientX || e.touches[0].screenX;
		let currentY = e.clientY || e.touches[0].screenY;
		requestAnimationFrame(() => {
			if(!this.scrolling) {
			  //Check scroll direction
			  if(Math.abs(currentY - this.startY) > 10) { //Vertical
				  //Needed to avoid glitches in horizontal scrolling
				  this.scrolling = "vertical";
				  //Reset horizontal scroll to zero, by resetting the slide index
				  this.setSlide(this.currentIndex);
				  return;
			  } else if(Math.abs(currentX - this.startX) > 10) { //Horizontal
				  this.scrolling = "horizontal";
				  return;
			  }
			}
			
			//Allow horizontal scroll even if no scroll is present.
			//Vertical is allowed by default.
			if(this.scrolling === undefined || this.scrolling === "horizontal") {
				this.sliderWrapper.style.transition = 'transform 0s linear';	  
				this.sliderWrapper.style.transform = `translateX(${
				  currentX - this.startX - this.containerWidth * this.currentIndex
				}px)`;
			}
		});
	  };
	  
	endSlider(e) {
		if (!this.mouseDown || !e) return;
		
		this.mouseDown = false;
		if(this.scrolling === "horizontal") {
			let x = e.clientX;
			//x evaluates to 0 if you drag left to the end of the body)
			if(!x && e.changedTouches) {
				x = e.changedTouches[0].screenX;
			}
			
			const dist = x - this.startX || 0;
	  
			if (dist > 50 && this.currentIndex > 1) this.currentIndex--;
			else if (dist < -50 && this.currentIndex < this.lastIndex -1) this.currentIndex++;
			this.setSlide(this.currentIndex);
		}
		this.sliderWrapper.addEventListener('touchmove', this.startSlider.bind(this), { passive: true });
		this.scrolling = undefined;
	};
	
	refresh() {
		this.containerWidth = this.rootContainer.clientWidth;
		this.setSlide(this.currentIndex);
	};
}

function createImageButton(text, href, classList, src) {
	const btn = create("button");
	btn.classList.add(...classList);
	btn.setAttribute("href",href);
	const img = create("img");
	img.classList.add("white-fill");
	img.textContent = text;
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
		const btn = create("button");
		btn.classList.add("waves-effect", "waves-light", "red", "btn-small");
		buttonsCell.appendChild(btn);
		const img = create("img");
		img.classList.add("white-fill");
		img.innerText = "Delete";
		img.alt = "Delete";
		img.src = icons.delete;
		btn.appendChild(img)
		
		buttonsCell.setAttribute("hideable", "true");
		if (options.hidden) {
			buttonsCell.style.display = 'none';
		}
	}
	//console.log("Created row", row)
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