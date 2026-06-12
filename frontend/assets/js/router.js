import { puedeAcceder, getRol } from './store.js';
import { toastError } from './components/toast.js';

const routes = {};
let currentView = null;

let navigationToken = 0;

export function getNavigationToken() {
    return navigationToken;
}

// Registrar una ruta
export function registerRoute(hash, handler, rolesPermitidos = []) {
    routes[hash] = { handler, rolesPermitidos };
}

// Navegar a una ruta
export function navigate(hash) {
    window.location.hash = hash;
}

// Resolver la ruta actual
function resolveRoute() {
    const hash = window.location.hash || '#/dashboard';
    const key = hash.startsWith('#/') ? hash : '#/dashboard';

    const route = routes[key] || routes['#/dashboard'];

    if (!route) return;

    if (route.rolesPermitidos.length > 0 && !puedeAcceder(route.rolesPermitidos)) {
        toastError('Sin acceso', 'No tienes permiso para ver esta sección.');
        navigate('#/dashboard');
        return;
    }

    navigationToken++;
    const tokenActual = navigationToken;

    currentView = key;
    updateActiveNav(key);
    updateTopbarTitle(key);

    const container = document.getElementById('view-container');
    container.innerHTML = '';
    route.handler(container, tokenActual);
}

function updateActiveNav(hash) {
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
        item.classList.remove('active');
        const view = '#/' + item.dataset.view;
        if (view === hash) item.classList.add('active');
    });
}

const TITULOS = {
    '#/dashboard':     'Panel principal',
    '#/empleados':     'Empleados',
    '#/incapacidades': 'Incapacidades',
    '#/seguimiento':   'Seguimiento',
    '#/usuarios':      'Usuarios',
    '#/configuracion': 'Configuración'
};

function updateTopbarTitle(hash) {
    const titleEl = document.getElementById('topbar-title');
    if (titleEl) titleEl.textContent = TITULOS[hash] || 'Panel principal';
}

export function initRouter() {
    window.addEventListener('hashchange', resolveRoute);
    resolveRoute();
}

export function getCurrentView() {
    return currentView;
}
