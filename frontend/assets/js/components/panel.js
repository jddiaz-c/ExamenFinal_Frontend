import { $, show, hide } from '../utils/dom.js';

const overlay  = () => $('#panel-overlay');
const titleEl  = () => $('#panel-title');
const bodyEl   = () => $('#panel-body');
const closeBtn = () => $('#panel-close');

export function openPanel({ titulo, cuerpo }) {
    titleEl().textContent = titulo;
    bodyEl().innerHTML = cuerpo;
    show(overlay());
}

export function closePanel() {
    hide(overlay());
}

export function getPanelBody() {
    return bodyEl();
}

export function initPanel() {
    closeBtn().addEventListener('click', closePanel);

    overlay().addEventListener('click', (e) => {
        if (e.target === overlay()) closePanel();
    });
}
