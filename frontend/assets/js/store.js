// Estado global de la aplicación
// No usa clases ni proxies para mantenerlo simple y legible

const state = {
    usuario: null,   // { id, nombre, correo, rol }
    token: null,
    empleados: [],   // cache para evitar llamadas repetidas
    notificaciones: []
};

// Usuario
export function setUsuario(usuario) {
    state.usuario = usuario;
}

export function getUsuario() {
    return state.usuario;
}

export function getRol() {
    return state.usuario?.rol ?? null;
}

// Token
export function setToken(token) {
    state.token = token;
    localStorage.setItem('token', token);
}

export function getToken() {
    return state.token || localStorage.getItem('token');
}

export function clearSession() {
    state.usuario = null;
    state.token = null;
    state.empleados = [];
    state.notificaciones = [];
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
}

// Cache de empleados (para mostrar nombres en incapacidades/seguimiento)
export function setEmpleados(lista) {
    state.empleados = lista;
}

export function getEmpleados() {
    return state.empleados;
}

export function getNombreEmpleado(id) {
    const emp = state.empleados.find(e => e.id == id);
    if (!emp) return `Empleado #${id}`;
    return `${emp.nombres} ${emp.apellidos}`;
}

// Notificaciones
export function setNotificaciones(lista) {
    state.notificaciones = lista;
}

export function getNotificaciones() {
    return state.notificaciones;
}

// Verificación de permisos
export function puedeAcceder(rolesPermitidos) {
    if (!Array.isArray(rolesPermitidos) || rolesPermitidos.length === 0) return true;
    return rolesPermitidos.includes(getRol());
}

// Guardar usuario en localStorage para restaurar en refresh
export function persistirUsuario(usuario) {
    localStorage.setItem('usuario', JSON.stringify(usuario));
}

export function recuperarUsuario() {
    try {
        const raw = localStorage.getItem('usuario');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}
