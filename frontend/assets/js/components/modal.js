import { $, show, hide } from '../utils/dom.js';

const overlay  = () => $('#modal-overlay');
const box      = () => $('#modal-box');
const titleEl  = () => $('#modal-title');
const bodyEl   = () => $('#modal-body');
const footerEl = () => $('#modal-footer');
const closeBtn = () => $('#modal-close');

let onCloseCallback = null;

export function openModal({ titulo, cuerpo, pie = '', onClose = null, ancho = '' }) {
    titleEl().textContent = titulo;
    bodyEl().innerHTML = cuerpo;
    footerEl().innerHTML = pie;

    if (ancho) box().style.maxWidth = ancho;
    else box().style.maxWidth = '';

    onCloseCallback = onClose;
    show(overlay());

    // Escuchar botones del footer por id
    footerEl().querySelectorAll('[data-modal-close]').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });
}

export function closeModal() {
    hide(overlay());
    if (typeof onCloseCallback === 'function') onCloseCallback();
    onCloseCallback = null;
}

export function getModalBody() {
    return bodyEl();
}

// Inicializar listeners
export function initModal() {
    closeBtn().addEventListener('click', closeModal);

    overlay().addEventListener('click', (e) => {
        if (e.target === overlay()) closeModal();
    });
}
