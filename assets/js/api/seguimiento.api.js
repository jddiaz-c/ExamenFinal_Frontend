import { API, apiFetch } from './config.js';

export async function getSeguimientos() {
    return apiFetch(API.SEGUIMIENTO, '/seguimientos');
}

export async function getSeguimiento(id) {
    return apiFetch(API.SEGUIMIENTO, `/seguimientos/${id}`);
}

export async function buscarSeguimientos(params) {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(API.SEGUIMIENTO, `/seguimientos/buscar?${qs}`);
}

export async function createSeguimiento(data) {
    return apiFetch(API.SEGUIMIENTO, '/seguimientos', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}
