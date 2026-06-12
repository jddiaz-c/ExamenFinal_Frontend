// Puertos de cada microservicio según el README del backend
export const API = {
    AUTH:          'http://localhost:8001',
    EMPLEADOS:     'http://localhost:8002',
    INCAPACIDADES: 'http://localhost:8003',
    SEGUIMIENTO:   'http://localhost:8004'
};

// Helper base para fetch autenticado
export async function apiFetch(baseUrl, path, options = {}) {
    const token = localStorage.getItem('token');

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': token } : {}),
        ...(options.headers || {})
    };

    const res = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}`);
    }

    return data;
}
