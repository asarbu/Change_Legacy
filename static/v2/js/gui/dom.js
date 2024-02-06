/**
 * Creates and decorates a new DOM Element
 * @param {string} element Type of element to be created
 * @param {Array} properties.classes Classes to be added to the DOM classlist 
 * @returns {DOMElement}
 */
export function create(element, properties) {
	const elmt = document.createElement(element);

	if (properties) {
		Object.entries(properties).forEach(([key, value]) => {
			if (key === 'classes') {
				elmt.classList.add(...value);
			} else {
				elmt[key] = value;
			}
		});
	}

	return elmt;
}

export function createImageButton(text, href, classList, src) {
	const btn = create('button');
	btn.classList.add(...classList);
	btn.setAttribute('href', href);
	const img = create('img');
	img.classList.add('white-fill');
	img.textContent = text;
	img.alt = text;
	img.src = src;
	btn.appendChild(img);
	return btn;
}