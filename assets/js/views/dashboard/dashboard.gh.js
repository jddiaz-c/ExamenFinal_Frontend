import { getEmpleados as apiEmpleados } from '../../api/empleados.api.js';
import { getIncapacidades } from '../../api/incapacidades.api.js';
import { getSeguimientos } from '../../api/seguimiento.api.js';
import { setEmpleados } from '../../store.js';
import { formatFechaCorta, tiempoRelativo } from '../../utils/fecha.js';
import { badgeEstado, colorEstado, LABELS_TIPO_INCAPACIDAD } from '../../utils/format.js';
import { renderLoader, renderEmpty } from '../../utils/dom.js';
import { navigate } from '../../router.js';
import { renderCalendario } from './calendario.js';
import { getNavigationToken } from '../../router.js';


export async function renderDashboardGH(container, token) {
    container.innerHTML = renderLoader();

    try {
        const [empleados, incapacidades, seguimientos] = await Promise.all([
            apiEmpleados(),
            getIncapacidades(),
            getSeguimientos()
        ]);

        if (token !== getNavigationToken()) return;

        setEmpleados(empleados);

        const registradas  = incapacidades.filter(i => i.estado === 'registrada');
        const enRevision   = incapacidades.filter(i => i.estado === 'en_revision');
        const aprobadas    = incapacidades.filter(i => i.estado === 'aprobada');
        const mesActual    = new Date().getMonth();
        const aprobMes     = incapacidades.filter(i => {
            return i.estado === 'aprobada' && new Date(i.fecha_inicio).getMonth() === mesActual;
        }).length;

        const actividadReciente = [...seguimientos]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 8);

        const nomEmp = (id) => {
            const emp = empleados.find(e => e.id == id);
            return emp ? `${emp.nombres} ${emp.apellidos}` : `Empleado #${id}`;
        };

        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card clickable" data-nav="#/incapacidades">
                    <span class="stat-label">Nuevas solicitudes</span>
                    <span class="stat-value">${registradas.length}</span>
                    <span class="stat-sub">sin revisar</span>
                </div>
                <div class="stat-card clickable" data-nav="#/incapacidades">
                    <span class="stat-label">En revisión</span>
                    <span class="stat-value">${enRevision.length}</span>
                    <span class="stat-sub">en proceso</span>
                </div>
                <div class="stat-card clickable" data-nav="#/incapacidades">
                    <span class="stat-label">Aprobadas este mes</span>
                    <span class="stat-value">${aprobMes}</span>
                    <span class="stat-sub">en el mes actual</span>
                </div>
                <div class="stat-card clickable" data-nav="#/empleados">
                    <span class="stat-label">Empleados activos</span>
                    <span class="stat-value">${empleados.filter(e => e.estado === 'activo').length}</span>
                    <span class="stat-sub">de ${empleados.length} totales</span>
                </div>
            </div>

            <div class="dashboard-grid-3">
                <div>
                    <div class="card" class="card-mb">
                        <div class="card-header">
                            <span class="card-title">Solicitudes pendientes de revisión</span>
                            <button class="btn btn-sm btn-ghost" data-nav="#/incapacidades">Ver todas</button>
                        </div>
                        <div>
                            ${registradas.length === 0
                                ? renderEmpty('Sin solicitudes nuevas', 'Todas las solicitudes han sido atendidas.')
                                : registradas.map(inc => `
                                    <div class="activity-item-clickable" data-inc-id="${inc.id}">
                                        <span class="activity-dot activity-dot-top dot-${inc.estado}"></span>
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
                            ${actividadReciente.length === 0
                                ? renderEmpty('Sin actividad', 'No hay registros recientes.')
                                : actividadReciente.map(seg => `
                                    <div class="activity-item">
                                        <span class="activity-dot activity-dot-top dot-${seg.estado}"></span>
                                        <div class="activity-text activity-body">
                                            <strong>${seg.usuario_responsable}</strong> — ${seg.comentario}
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
                            <button class="quick-action-btn" data-nav="#/incapacidades">
                                <span class="qa-dot qa-dot-warning"></span>
                                Ver en revisión
                            </button>
                            <button class="quick-action-btn" data-nav="#/empleados">
                                <span class="qa-dot qa-dot-success"></span>
                                Ver empleados
                            </button>
                            <button class="quick-action-btn" data-nav="#/seguimiento">
                                <span class="qa-dot qa-dot-info"></span>
                                Ver seguimientos
                            </button>
                        </div>
                    </div>

                    <div id="calendario-widget"></div>
                </div>
            </div>
        `;

        renderCalendario(document.getElementById('calendario-widget'), incapacidades, empleados);

        container.querySelectorAll('[data-nav]').forEach(el => {
            el.addEventListener('click', () => {
                navigate(el.dataset.nav);
                if (el.dataset.action) {
                    setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('quick-action', { detail: el.dataset.action }));
                    }, 300);
                }
            });
        });

    } catch (err) {
        if (token !== getNavigationToken()) return;
        container.innerHTML = `<div class="alert alert-error">Error al cargar el panel: ${err.message}</div>`;
    }
}
