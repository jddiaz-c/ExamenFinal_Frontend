const container = () => document.getElementById('toast-container');

export function toast(tipo, titulo, mensaje = '', duracion = 4000) {
    const tipos = ['success', 'error', 'info', 'warning'];
    if (!tipos.includes(tipo)) tipo = 'info';

    const div = document.createElement('div');
    div.className = `toast toast-${tipo}`;
    div.innerHTML = `
        <span class="toast-dot"></span>
        <div class="toast-content">
            <div class="toast-title">${titulo}</div>
            ${mensaje ? `<div class="toast-message">${mensaje}</div>` : ''}
        </div>
    `;

    container().appendChild(div);

    setTimeout(() => {
        div.classList.add('removing');
        setTimeout(() => div.remove(), 210);
    }, duracion);
}

export function toastExito(titulo, mensaje) {
    toast('success', titulo, mensaje);
}

export function toastError(titulo, mensaje) {
    toast('error', titulo, mensaje);
}

export function toastInfo(titulo, mensaje) {
    toast('info', titulo, mensaje);
}
