// Helpers para manipulación del DOM

export function $(selector, context = document) {
    return context.querySelector(selector);
}

export function $$(selector, context = document) {
    return [...context.querySelectorAll(selector)];
}

export function show(el) {
    if (el) el.classList.remove('hidden');
}

export function hide(el) {
    if (el) el.classList.add('hidden');
}

export function toggle(el) {
    if (el) el.classList.toggle('hidden');
}

export function setHtml(selector, html, context = document) {
    const el = typeof selector === 'string' ? $(selector, context) : selector;
    if (el) el.innerHTML = html;
}

export function setText(selector, text, context = document) {
    const el = typeof selector === 'string' ? $(selector, context) : selector;
    if (el) el.textContent = text;
}

// Crea un elemento con atributos y contenido
export function el(tag, attrs = {}, innerHTML = '') {
    const element = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
        if (k === 'class') element.className = v;
        else if (k === 'data') {
            Object.entries(v).forEach(([dk, dv]) => {
                element.dataset[dk] = dv;
            });
        } else {
            element.setAttribute(k, v);
        }
    });
    if (innerHTML) element.innerHTML = innerHTML;
    return element;
}

// Loader
export function renderLoader() {
    return `<div class="loader"><div class="loader-spinner"></div></div>`;
}

// Estado vacío
export function renderEmpty(titulo, descripcion, accionHtml = '') {
    return `
        <div class="empty-state">
            <div class="empty-state-title">${titulo}</div>
            <div class="empty-state-desc">${descripcion}</div>
            ${accionHtml}
        </div>
    `;
}
