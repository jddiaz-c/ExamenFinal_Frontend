import { validateToken } from './api/auth.api.js';
import { logout } from './api/auth.api.js';
import { getSeguimientos } from './api/seguimiento.api.js';
import { setUsuario, getUsuario, getRol, clearSession, getToken, recuperarUsuario, persistirUsuario, setNotificaciones, getNotificaciones } from './store.js';
import { initLogin } from './views/login.js';
import { renderDashboardAdmin } from './views/dashboard/dashboard.admin.js';
import { renderDashboardGH } from './views/dashboard/dashboard.gh.js';
import { renderDashboardEmpleado } from './views/dashboard/dashboard.empleado.js';
import { renderEmpleados } from './views/empleados.js';
import { renderIncapacidades } from './views/incapacidades.js';
import { renderSeguimiento } from './views/seguimiento.js';
import { renderUsuarios } from './views/usuarios.js';
import { renderConfiguracion } from './views/configuracion.js';
import { registerRoute, initRouter } from './router.js';
import { initModal } from './components/modal.js';
import { initPanel } from './components/panel.js';
import { iniciales } from './utils/format.js';
import { tiempoRelativo, formatFechaCorta } from './utils/fecha.js';
import { badgeEstado } from './utils/format.js';
import { show, hide } from './utils/dom.js';

// ============================================================
// INICIALIZACIÓN
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    // Aplicar tema guardado
    const temaGuardado = localStorage.getItem('tema') || 'light';
    document.documentElement.setAttribute('data-theme', temaGuardado);

    initModal();
    initPanel();

    // Verificar sesión existente
    const token = getToken();
    if (token) {
        try {
            const res = await validateToken();
            setUsuario(res.usuario);
            persistirUsuario(res.usuario);
            iniciarApp();
        } catch {
            clearSession();
            mostrarLogin();
        }
    } else {
        mostrarLogin();
    }
});

// ============================================================
// LOGIN
// ============================================================

function mostrarLogin() {
    hide(document.getElementById('main-layout'));
    show(document.getElementById('login-screen'));
    initLogin((usuario) => {
        hide(document.getElementById('login-screen'));
        iniciarApp();
    });
}

// ============================================================
// APP PRINCIPAL
// ============================================================

async function iniciarApp() {
    // Cerrar y limpiar panel de notificaciones al iniciar
    hide(document.getElementById('notifications-panel'));
    const usuario = getUsuario();
    const rol     = getRol();

    // Mostrar layout
    hide(document.getElementById('login-screen'));
    show(document.getElementById('main-layout'));

    // Actualizar topbar con info del usuario
    const avatarEl   = document.getElementById('user-avatar');
    const nameEl     = document.getElementById('user-name');
    const roleEl     = document.getElementById('user-role');
    const roleLabels = { administrador: 'Administrador', gestion_humana: 'Gestión Humana', empleado: 'Empleado' };

    if (avatarEl) avatarEl.textContent = iniciales(usuario.nombre);
    if (nameEl)   nameEl.textContent   = usuario.nombre;
    if (roleEl)   roleEl.textContent   = roleLabels[rol] || rol;

    // Primero muestra todos
    document.querySelectorAll('.nav-item[data-roles]').forEach(item => {
        show(item);
    });

    // Luego oculta los que no corresponden al rol actual
    document.querySelectorAll('.nav-item[data-roles]').forEach(item => {
        const roles = item.dataset.roles.split(',');
        if (!roles.includes(rol)) {
            hide(item);
        }
    });

    // Ocultar notificaciones para empleados
    if (rol === 'empleado') {
    hide(document.getElementById('notifications-btn'));
    }  else {
        show(document.getElementById('notifications-btn'));
    }

    // Cargar notificaciones
    await cargarNotificaciones();

    // Registrar rutas
    registerRoute('#/dashboard', (container, token) => {
        if (rol === 'administrador')  renderDashboardAdmin(container, token);
        else if (rol === 'gestion_humana') renderDashboardGH(container, token);
        else renderDashboardEmpleado(container, token);
    });

    registerRoute('#/empleados', renderEmpleados, ['administrador', 'gestion_humana']);
    registerRoute('#/incapacidades', renderIncapacidades, ['administrador', 'gestion_humana', 'empleado']);
    registerRoute('#/seguimiento', renderSeguimiento, ['administrador', 'gestion_humana']);
    registerRoute('#/usuarios', renderUsuarios, ['administrador']);
    registerRoute('#/configuracion', renderConfiguracion);

    // Iniciar router
    if (!window.location.hash) window.location.hash = '#/dashboard';
    initRouter();

    // Sidebar toggle
    document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('collapsed');
    });

    // Tema toggle (topbar)
    const themeBtn = document.getElementById('theme-toggle');
    const themeBtnClone = themeBtn.cloneNode(true);
    themeBtn.parentNode.replaceChild(themeBtnClone, themeBtn);

    themeBtnClone.addEventListener('click', () => {
        const html = document.documentElement;
        const esOscuro = html.getAttribute('data-theme') === 'dark';
        html.setAttribute('data-theme', esOscuro ? 'light' : 'dark');
        localStorage.setItem('tema', esOscuro ? 'light' : 'dark');
    });

    // Notificaciones
    const notifBtn = document.getElementById('notifications-btn');
    const notifBtnClone = notifBtn.cloneNode(true);
    notifBtn.parentNode.replaceChild(notifBtnClone, notifBtn);

    notifBtnClone.addEventListener('click', () => {
        const panel = document.getElementById('notifications-panel');
        panel.classList.toggle('hidden');
    });

    document.getElementById('notif-close')?.addEventListener('click', () => {
        hide(document.getElementById('notifications-panel'));
    });

    // Cerrar notificaciones al hacer click fuera
    document.addEventListener('click', (e) => {
        const panel = document.getElementById('notifications-panel');
        const btn   = document.getElementById('notifications-btn');
        if (!panel.classList.contains('hidden') && !panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
            hide(panel);
        }
    });

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        try {
            await logout();
        } catch { }
        clearSession();
        history.replaceState(null, '', ' '); // ← no dispara hashchange
        hide(document.getElementById('main-layout'));
        mostrarLogin();
    });
}

// ============================================================
// NOTIFICACIONES
// ============================================================

async function cargarNotificaciones() {
    const rol = getRol();
    console.log('cargarNotificaciones, rol:', rol);
    const lista  = document.getElementById('notifications-list');
    const badge  = document.getElementById('notif-badge');

    // Limpiar estado anterior
    lista.innerHTML = '';
    hide(badge);
    // Solo admin y GH ven notificaciones de actividad global
    if (rol !== 'administrador' && rol !== 'gestion_humana') return;

    try {
        const segs = await getSeguimientos();
                console.log('seguimientos obtenidos:', segs.length);

        const recientes = [...segs]
            .sort((a, b) => new Date(b.created_at || b.fecha) - new Date(a.created_at || a.fecha))
            .slice(0, 15);

        setNotificaciones(recientes);

        const hoy     = new Date().toISOString().split('T')[0];
        const nuevas  = recientes.filter(s => s.fecha === hoy || (s.created_at && s.created_at.startsWith(hoy)));

        if (nuevas.length > 0) {
            show(badge);
        }

        if (recientes.length === 0) {
            lista.innerHTML = `<div class="notif-empty">Sin actividad reciente</div>`;
            return;
        }

        lista.innerHTML = recientes.map(seg => `
            <div class="notif-item">
                <div class="notif-item-text">
                    <strong>${seg.usuario_responsable}</strong> registró un seguimiento:
                    ${seg.comentario.length > 60 ? seg.comentario.substring(0, 60) + '...' : seg.comentario}
                    &nbsp;${badgeEstado(seg.estado)}
                </div>
                <div class="notif-item-meta">${tiempoRelativo(seg.fecha)} · ${formatFechaCorta(seg.fecha)}</div>
            </div>
        `).join('');

    } catch {
        // Si falla, simplemente no mostramos notificaciones
    }
}
