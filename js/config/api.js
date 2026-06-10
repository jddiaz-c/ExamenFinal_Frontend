const API = {
    auth: 'http://localhost:8001/auth',
    usuarios: 'http://localhost:8001/usuarios',
    empleados: 'http://localhost:8002/empleados',
    incapacidades: 'http://localhost:8003/incapacidades',
    seguimiento: 'http://localhost:8004/seguimientos'
};

async function request(baseUrl, endpoint, method = 'GET', body = null) {
    const token = localStorage.getItem('token');

    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = token;

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${baseUrl}${endpoint}`, options);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Error en la solicitud');
    }

    return data;
}