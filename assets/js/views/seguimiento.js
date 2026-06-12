import { getSeguimientos, createSeguimiento } from '../api/seguimiento.api.js';
import { getIncapacidades, cambiarEstadoIncapacidad } from '../api/incapacidades.api.js';
import { getEmpleados as apiEmpleados } from '../api/empleados.api.js';
import { getUsuario, getEmpleados as cacheEmp, setEmpleados } from '../store.js';
import { formatFecha, formatFechaCorta, hoyISO } from '../utils/fecha.js';
import { badgeEstado, LABELS_TIPO_INCAPACIDAD, LABELS_ESTADO_INCAPACIDAD, estadosSiguientes } from '../utils/format.js';
import { renderLoader, renderEmpty } from '../utils/dom.js';
import { openModal, closeModal } from '../components/modal.js';
import { openPanel } from '../components/panel.js';
import { toastExito, toastError } from '../components/toast.js';
import { getNavigationToken } from '../router.js';

let todosSegs = [];
let todasInc  = [];
let empleados = [];

export async function renderSeguimiento(container, token) {
    container.innerHTML = renderLoader();

    try {
        [todosSegs, todasInc, empleados] = await Promise.all([
            getSeguimientos(),
            getIncapacidades(),
            cacheEmp().length > 0 ? Promise.resolve(cacheEmp()) : apiEmpleados()
        ]);
        if (token !== getNavigationToken()) return;
        setEmpleados(empleados);
        renderVista(container);
    } catch (err) {
        if (token !== getNavigationToken()) return;
        container.innerHTML = `<div class="alert alert-error">Error al cargar seguimientos: ${err.message}</div>`;
    }
}

function nomEmp(id) {
    const emp = empleados.find(e => e.id == id);
    return emp ? `${emp.nombres} ${emp.apellidos}` : `#${id}`;
}

function renderVista(container) {
    container.innerHTML = `
        <div class="section-header">
            <div>
                <div class="section-title">Seguimiento</div>
                <div class="section-subtitle">Historial de cambios y trazabilidad de incapacidades</div>
            </div>
        </div>

        <div class="dashboard-grid-3 g-20">
            <div>
                <div class="filters-bar mb-16">
                    <div class="search-input-wrapper">
                        <span class="search-icon"></span>
                        <input class="search-input" type="text" id="search-seg" placeholder="Buscar por empleado o responsable...">
                    </div>
                    <select class="field-select w-auto-min-150" id="filter-estado-seg">
                        <option value="">Todos los estados</option>
                        <option value="registrada">Registrada</option>
                        <option value="en_revision">En revisión</option>
                        <option value="aprobada">Aprobada</option>
                        <option value="rechazada">Rechazada</option>
                        <option value="finalizada">Finalizada</option>
                    </select>
                </div>

                <div class="card p-0">
                    <div id="lista-seguimientos" class="max-h-65-scroll">
                        ${renderListaIncapacidades(todasInc)}
                    </div>
                </div>
            </div>

            <div>
                <div class="card">
                    <div class="card-header">
                        <span class="card-title">Actividad reciente</span>
                    </div>
                    <div class="timeline" id="timeline-reciente">
                        ${renderTimelineReciente()}
                    </div>
                </div>
            </div>
        </div>
    `;

    const search    = container.querySelector('#search-seg');
    const filterEst = container.querySelector('#filter-estado-seg');

    function filtrar() {
        const q   = search.value.toLowerCase();
        const est = filterEst.value;

        const filtradas = todasInc.filter(inc => {
            const nombre = nomEmp(inc.empleado_id).toLowerCase();
            return (!q || nombre.includes(q))
                && (!est || inc.estado === est);
        });

        document.getElementById('lista-seguimientos').innerHTML = renderListaIncapacidades(filtradas);
        attachIncEvents(container);
    }

    search.addEventListener('input', filtrar);
    filterEst.addEventListener('change', filtrar);

    attachIncEvents(container);
}

function renderListaIncapacidades(lista) {
    if (lista.length === 0) {
        return renderEmpty('Sin resultados', 'No hay incapacidades que coincidan.');
    }

    return lista.map(inc => `
        <div class="activity-item p-14-20-cur-border" data-action="ver-inc" data-id="${inc.id}">
            <div class="flex-1">
                <div class="flex-between-center-mb4">
                    <span class="fw600-fs0875">${nomEmp(inc.empleado_id)}</span>
                    ${badgeEstado(inc.estado)}
                </div>
                <div class="fs078-sec">
                    ${LABELS_TIPO_INCAPACIDAD[inc.tipo] || inc.tipo}
                    &middot; ${formatFechaCorta(inc.fecha_inicio)} — ${formatFechaCorta(inc.fecha_fin)}
                    &middot; ${inc.dias_incapacidad} días
                </div>
            </div>
        </div>
    `).join('');
}

function renderTimelineReciente() {
    const recientes = [...todosSegs]
        .sort((a, b) => new Date(b.created_at || b.fecha) - new Date(a.created_at || a.fecha))
        .slice(0, 10);

    if (recientes.length === 0) {
        return renderEmpty('Sin actividad', 'No hay seguimientos registrados.');
    }

    return recientes.map(seg => {
        const inc = todasInc.find(i => i.id == seg.incapacidad_id);
        const nombreEmp = inc ? nomEmp(inc.empleado_id) : 'Empleado desconocido';
        
        return `
            <div class="timeline-item">
                <span class="timeline-dot timeline-dot-${seg.estado}"></span>
                <div class="timeline-date">${formatFechaCorta(seg.fecha)}</div>
                <div class="timeline-content">
                    <div class="timeline-header">${badgeEstado(seg.estado)}</div>
                    <div class="timeline-comment"><strong>${nombreEmp}</strong> — ${seg.comentario}</div>
                    <div class="timeline-user">Por: ${seg.usuario_responsable}</div>
                </div>
            </div>
        `;
    }).join('');
}

function attachIncEvents(container) {
    container.querySelectorAll('[data-action="ver-inc"]').forEach(el => {
        el.addEventListener('click', () => verTimelineIncapacidad(el.dataset.id));
    });
}

async function verTimelineIncapacidad(incId) {
    const inc = todasInc.find(i => i.id == incId);
    if (!inc) return;

    const usuario = getUsuario();
    const siguientes = estadosSiguientes(inc.estado);

    openPanel({
        titulo: `Seguimiento — ${nomEmp(inc.empleado_id)}`,
        cuerpo: `
            <div class="mb-20-p14-surface-radius-border">
                <div class="flex-between-center-mb8">
                    <span class="fw-600">${LABELS_TIPO_INCAPACIDAD[inc.tipo] || inc.tipo}</span>
                    ${badgeEstado(inc.estado)}
                </div>
                <div class="fs078-sec">
                    ${formatFechaCorta(inc.fecha_inicio)} — ${formatFechaCorta(inc.fecha_fin)} &middot; ${inc.dias_incapacidad} días
                </div>
                <div class="fs078-ter-mt4">${inc.entidad_medica}</div>
            </div>

            ${siguientes.length > 0 ? `
            <div class="mb-24-p16-accent-radius-border">
                <div class="fs08-fw600-accent-mb12">
                    Registrar seguimiento
                </div>
                <div class="field mb-10">
                    <label class="field-label">Nuevo estado</label>
                    <select class="field-select" id="panel-nuevo-estado">
                        ${siguientes.map(s => `<option value="${s}">${LABELS_ESTADO_INCAPACIDAD[s] || s}</option>`).join('')}
                    </select>
                </div>
                <div class="field mb-10">
                    <label class="field-label">Comentario</label>
                    <textarea class="field-textarea" id="panel-comentario" placeholder="Describe el avance o decisión..."></textarea>
                </div>
                <button class="btn btn-primary btn-sm" id="btn-panel-guardar">Registrar</button>
                <div id="panel-error" class="alert alert-error hidden mt-10"></div>
            </div>
            ` : ''}

            <div class="fs072-fw600-ter-up-ls-mb16">
                Historial de cambios
            </div>
            <div id="timeline-panel">
                <div class="loader"><div class="loader-spinner"></div></div>
            </div>
        `
    });

    // Cargar seguimientos
    const cargarTimeline = async () => {
        const el = document.getElementById('timeline-panel');
        if (!el) return;

        try {
            const { buscarSeguimientos } = await import('../api/seguimiento.api.js');
            const segs = await buscarSeguimientos({ incapacidad_id: inc.id });

            if (segs.length === 0) {
                el.innerHTML = `<p class="text-empty-panel">Sin seguimientos aún.</p>`;
            } else {
                el.innerHTML = `
                    <div class="timeline">
                        ${[...segs].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).map(seg => `
                            <div class="timeline-item">
                                <span class="timeline-dot timeline-dot-${seg.estado}"></span>
                                <div class="timeline-date">${formatFecha(seg.fecha)}</div>
                                <div class="timeline-content">
                                    <div class="timeline-header">${badgeEstado(seg.estado)}</div>
                                    <div class="timeline-comment">${seg.comentario}</div>
                                    <div class="timeline-user">Por: ${seg.usuario_responsable}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        } catch {
            const el2 = document.getElementById('timeline-panel');
            if (el2) el2.innerHTML = `<p class="text-error-panel">Error al cargar seguimientos.</p>`;
        }
    };

    cargarTimeline();

    // Guardar nuevo seguimiento desde el panel
    document.getElementById('btn-panel-guardar')?.addEventListener('click', async () => {
        const errorEl    = document.getElementById('panel-error');
        const nuevoEst   = document.getElementById('panel-nuevo-estado').value;
        const comentario = document.getElementById('panel-comentario').value.trim();

        if (!comentario) {
            errorEl.textContent = 'El comentario es obligatorio.';
            errorEl.classList.remove('hidden');
            return;
        }

        const btn = document.getElementById('btn-panel-guardar');
        btn.classList.add('btn-loading');
        btn.disabled = true;

        try {
            await cambiarEstadoIncapacidad(inc.id, nuevoEst);
            await createSeguimiento({
                incapacidad_id:      inc.id,
                fecha:               hoyISO(),
                comentario,
                estado:              nuevoEst,
                usuario_responsable: usuario.usuario || usuario.nombre
            });

            toastExito('Seguimiento registrado', `Estado actualizado a "${LABELS_ESTADO_INCAPACIDAD[nuevoEst]}".`);

            // Recargar datos
            todosSegs = await getSeguimientos();
            todasInc  = await getIncapacidades();
            inc.estado = nuevoEst;

            document.getElementById('timeline-reciente').innerHTML = renderTimelineReciente();
            await cargarTimeline();

            document.getElementById('panel-comentario').value = '';
            errorEl.classList.add('hidden');

        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.classList.remove('hidden');
        } finally {
            btn.classList.remove('btn-loading');
            btn.disabled = false;
        }
    });
}