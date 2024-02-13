/**
 * Creates and decorates a new DOM Element
 * @param {string} element Type of element to be created
 * @param {Array} properties.classes Classes to be added to the DOM classlist
 * @param {DOMElement} parent Parent to bind the newly created element to
 * @returns {DOMElement}
 */
export function create(element, properties, parent) {
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

	if (parent) {
		parent.appendChild(elmt);
	}

	return elmt;
}

/**
 * 
 * @param {string} text Text to display in button. TODO remove if notused
 * @param {string} href URL to where the button redirects. TODO remove if not used
 * @param {Array<string>} classList Array of classes to decorate button. TODO remove if not used
 * @param {string} src String that represents the icon inside the button
 * @param {HTMLElement} parent Parent to append this button to.
 * @returns 
 */
export function createImageButton(text, href, classList, src, parent) {
	//TODO Add event listener for on click in params
	const btn = create('button');
	btn.classList.add(...classList);
	btn.setAttribute('href', href);
	const img = create('img');
	img.classList.add('white-fill');
	img.textContent = text;
	img.alt = text;
	img.src = src;
	btn.appendChild(img);
	if (parent) {
		parent.appendChild(btn);
	}
	return btn;
}
