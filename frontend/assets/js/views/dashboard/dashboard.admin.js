import { getEmpleados as apiEmpleados } from '../../api/empleados.api.js';
import { getIncapacidades } from '../../api/incapacidades.api.js';
import { getSeguimientos } from '../../api/seguimiento.api.js';
import { getUsuarios } from '../../api/auth.api.js';
import { setEmpleados, getUsuario } from '../../store.js';
import { formatFechaCorta, tiempoRelativo } from '../../utils/fecha.js';
import { badgeEstado, colorEstado, LABELS_TIPO_INCAPACIDAD } from '../../utils/format.js';
import { renderLoader, renderEmpty } from '../../utils/dom.js';
import { navigate } from '../../router.js';
import { renderCalendario } from './calendario.js';
import { getNavigationToken } from '../../router.js';


export async function renderDashboardAdmin(container, token) {
    container.innerHTML = renderLoader();

    try {
        const [empleados, incapacidades, seguimientos, usuarios] = await Promise.all([
            apiEmpleados(),
            getIncapacidades(),
            getSeguimientos(),
            getUsuarios()
        ]);

        if (token !== getNavigationToken()) return; 

        setEmpleados(empleados);

        const activos     = empleados.filter(e => e.estado === 'activo').length;
        const pendientes  = incapacidades.filter(i => i.estado === 'registrada').length;
        const enRevision  = incapacidades.filter(i => i.estado === 'en_revision').length;
        const aprobadas   = incapacidades.filter(i => i.estado === 'aprobada').length;

        // Actividad reciente: últimos seguimientos
        const actividad = [...seguimientos]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 8);

        // Incapacidades pendientes de atención
        const urgentes = incapacidades
            .filter(i => i.estado === 'registrada' || i.estado === 'en_revision')
            .slice(0, 5);

        // Función para obtener nombre de empleado
        const nomEmp = (id) => {
            const emp = empleados.find(e => e.id == id);
            return emp ? `${emp.nombres} ${emp.apellidos}` : `Empleado #${id}`;
        };

        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card clickable" data-nav="#/empleados">
                    <span class="stat-label">Empleados activos</span>
                    <span class="stat-value">${activos}</span>
                    <span class="stat-sub">de ${empleados.length} totales</span>
                </div>
                <div class="stat-card clickable" data-nav="#/incapacidades">
                    <span class="stat-label">Solicitudes nuevas</span>
                    <span class="stat-value">${pendientes}</span>
                    <span class="stat-sub">esperando revisión</span>
                </div>
                <div class="stat-card clickable" data-nav="#/incapacidades">
                    <span class="stat-label">En revisión</span>
                    <span class="stat-value">${enRevision}</span>
                    <span class="stat-sub">en proceso</span>
                </div>
                <div class="stat-card clickable" data-nav="#/usuarios">
                    <span class="stat-label">Usuarios del sistema</span>
                    <span class="stat-value">${usuarios.length}</span>
                    <span class="stat-sub">${usuarios.filter(u => u.estado === 'activo').length} activos</span>
                </div>
            </div>

            <div class="dashboard-grid-3">
                <div>
                    <div class="card card-mb">
                        <div class="card-header">
                            <span class="card-title">Pendientes de atención</span>
                            <button class="btn btn-sm btn-ghost" id="btn-ver-todas" data-nav="#/incapacidades">Ver todas</button>
                        </div>
                        <div id="urgentes-list">
                            ${urgentes.length === 0
                                ? renderEmpty('Sin pendientes', 'No hay incapacidades en espera.')
                                : urgentes.map(inc => `
                                <div class="activity-item activity-item-clickable" data-action="ver-inc" data-id="${inc.id}">
                                    <span class="activity-dot activity-dot-top"></span>
                                        <div class="activity-body">
                                            <div class="activity-text">
                                                <strong>${nomEmp(inc.empleado_id)}</strong>
                                                — ${LABELS_TIPO_INCAPACIDAD[inc.tipo] || inc.tipo}
                                            </div>
                                            <div class="activity-time activity-time-top">
                                                ${formatFechaCorta(inc.fecha_inicio)} — ${formatFechaCorta(inc.fecha_fin)}
                                                &nbsp;&nbsp;${badgeEstado(inc.estado)}
                                            </div>
                                        </div>
                                    </div>
                                `).join('')
                            }
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <span class="card-title">Actividad reciente</span>
                        </div>
                        <div class="activity-list">
                            ${actividad.length === 0
                                ? renderEmpty('Sin actividad', 'No hay registros recientes.')
                                : actividad.map(seg => `
                                    <div class="activity-item">
                                        <span class="activity-dot activity-dot-top dot-${seg.estado}"></span>
                                        <div class="activity-text activity-body">
                                            <strong>${seg.usuario_responsable}</strong>
                                            — ${seg.comentario}
                                            &nbsp;${badgeEstado(seg.estado)}
                                        </div>
                                        <span class="activity-time">${tiempoRelativo(seg.fecha)}</span>
                                    </div>
                                `).join('')
                            }
                        </div>
                    </div>
                </div>

                <div>
                    <div class="card card-mb">
                        <div class="card-header">
                            <span class="card-title">Acciones rápidas</span>
                        </div>
                        <div class="quick-actions">
                            <button class="quick-action-btn" data-nav="#/incapacidades" data-action="nueva">
                                <span class="qa-dot qa-dot-accent"></span>
                                Registrar incapacidad
                            </button>
                            <button class="quick-action-btn" data-nav="#/empleados" data-action="nuevo">
                                <span class="qa-dot qa-dot-success"></span>
                                Nuevo empleado
                            </button>
                            <button class="quick-action-btn" data-nav="#/usuarios" data-action="nuevo">
                                <span class="qa-dot qa-dot-info"></span>
                                Nuevo usuario
                            </button>
                            <button class="quick-action-btn" data-nav="#/seguimiento">
                                <span class="qa-dot qa-dot-warning"></span>
                                Ver seguimientos
                            </button>
                        </div>
                    </div>

                    <div id="calendario-widget"></div>
                </div>
            </div>
        `;

        // Calendario
        renderCalendario(document.getElementById('calendario-widget'), incapacidades, empleados);

        // Navegación desde stats cards y acciones rápidas
        container.querySelectorAll('[data-nav]').forEach(el => {
            el.addEventListener('click', () => {
                navigate(el.dataset.nav);
                if (el.dataset.action) {
                    // Pequeño delay para que la vista cargue antes de disparar la acción
                    setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('quick-action', { detail: el.dataset.action }));
                    }, 300);
                }
            });
        });
        container.querySelectorAll('[data-action="ver-inc"]').forEach(el => {
        el.addEventListener('click', () => {
            navigate('#/incapacidades');
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('ver-incapacidad', { detail: el.dataset.id }));
            }, 300);
        });
});

    } catch (err) {
        if (token !== getNavigationToken()) return;
        container.innerHTML = `<div class="alert alert-error">Error al cargar el panel: ${err.message}</div>`;
    }
}
