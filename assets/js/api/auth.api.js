import { API, apiFetch } from './config.js';

export async function login(credenciales) {
    return apiFetch(API.AUTH, '/auth/login', {
        method: 'POST',
        body: JSON.stringify(credenciales)
    });
}

export async function logout() {
    return apiFetch(API.AUTH, '/auth/logout', { method: 'POST' });
}

export async function validateToken() {
    return apiFetch(API.AUTH, '/auth/validate', { method: 'POST' });
}

export async function getUsuarios() {
    return apiFetch(API.AUTH, '/usuarios');
}

export async function getUsuario(id) {
    return apiFetch(API.AUTH, `/usuarios/${id}`);
}

export async function createUsuario(data) {
    return apiFetch(API.AUTH, '/usuarios', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

export async function updateUsuario(id, data) {
    return apiFetch(API.AUTH, `/usuarios/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

export async function cambiarEstadoUsuario(id, estado) {
    return apiFetch(API.AUTH, `/usuarios/${id}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ estado })
    });
}

export async function deleteUsuario(id) {
    return apiFetch(API.AUTH, `/usuarios/${id}`, { method: 'DELETE' });
}
