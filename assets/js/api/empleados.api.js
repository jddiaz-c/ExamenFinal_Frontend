import { API, apiFetch } from './config.js';

export async function getEmpleados() {
    return apiFetch(API.EMPLEADOS, '/empleados');
}

export async function getEmpleado(id) {
    return apiFetch(API.EMPLEADOS, `/empleados/${id}`);
}

export async function buscarEmpleados(params) {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(API.EMPLEADOS, `/empleados/buscar?${qs}`);
}

export async function createEmpleado(data) {
    return apiFetch(API.EMPLEADOS, '/empleados', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

export async function updateEmpleado(id, data) {
    return apiFetch(API.EMPLEADOS, `/empleados/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

export async function cambiarEstadoEmpleado(id, estado) {
    return apiFetch(API.EMPLEADOS, `/empleados/${id}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ estado })
    });
}
