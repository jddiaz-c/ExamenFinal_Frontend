import { API, apiFetch } from './config.js';

export async function getIncapacidades() {
    return apiFetch(API.INCAPACIDADES, '/incapacidades');
}

export async function getIncapacidad(id) {
    return apiFetch(API.INCAPACIDADES, `/incapacidades/${id}`);
}

export async function buscarIncapacidades(params) {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(API.INCAPACIDADES, `/incapacidades/buscar?${qs}`);
}

export async function createIncapacidad(data) {
    return apiFetch(API.INCAPACIDADES, '/incapacidades', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

export async function updateIncapacidad(id, data) {
    return apiFetch(API.INCAPACIDADES, `/incapacidades/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

export async function cambiarEstadoIncapacidad(id, estado) {
    return apiFetch(API.INCAPACIDADES, `/incapacidades/${id}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ estado })
    });
}

export async function finalizarIncapacidad(id) {
    return apiFetch(API.INCAPACIDADES, `/incapacidades/${id}/finalizar`, {
        method: 'PATCH'
    });
}
