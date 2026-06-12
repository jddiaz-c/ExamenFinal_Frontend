import { getIncapacidades, createIncapacidad, updateIncapacidad, cambiarEstadoIncapacidad, finalizarIncapacidad } from '../api/incapacidades.api.js';
import { getEmpleados as apiEmpleados } from '../api/empleados.api.js';
import { createSeguimiento } from '../api/seguimiento.api.js';
import { buscarSeguimientos } from '../api/seguimiento.api.js';
import { getRol, getUsuario, getEmpleados as cacheEmp, setEmpleados } from '../store.js';
import { formatFechaCorta, hoyISO, calcularDias } from '../utils/fecha.js';
import { badgeEstado, LABELS_TIPO_INCAPACIDAD, estadosSiguientes, LABELS_ESTADO_INCAPACIDAD, iniciales } from '../utils/format.js';
import { renderLoader, renderEmpty } from '../utils/dom.js';
import { openModal, closeModal } from '../components/modal.js';
import { openPanel, getPanelBody } from '../components/panel.js';
import { toastExito, toastError } from '../components/toast.js';
import { getNavigationToken } from '../router.js';

let todasInc = [];
let empleados = [];

export async function renderIncapacidades(container, token) {
    container.innerHTML = renderLoader();

    try {
        const rol = getRol();
        const usuario = getUsuario();

        [todasInc, empleados] = await Promise.all([
            getIncapacidades(),
            cacheEmp().length > 0 ? Promise.resolve(cacheEmp()) : apiEmpleados()
        ]);
        if (token !== getNavigationToken()) return;
        setEmpleados(empleados);

        if (rol === 'empleado') {
            const empleado = empleados.find(e => e.correo === usuario.correo);
            todasInc = empleado
                ? todasInc.filter(i => i.empleado_id === empleado.id)
                : [];
        }

        renderVista(container);
    } catch (err) {
        if (token !== getNavigationToken()) return;
        container.innerHTML = `<div class="alert alert-error">Error al cargar incapacidades: ${err.message}</div>`;
    }

    window.addEventListener('quick-action', (e) => {
        if (e.detail === 'nueva') abrirFormIncapacidad(null, container);
    }, { once: true });
}

function nomEmp(id) {
    const emp = empleados.find(e => e.id == id);
    return emp ? `${emp.nombres} ${emp.apellidos}` : `#${id}`;
}

function renderVista(container) {
    const rol = getRol();
    const puedeGestionar = rol === 'administrador' || rol === 'gestion_humana';

    container.innerHTML = `
        <div class="section-header">
            <div>
                <div class="section-title">Incapacidades</div>
                <div class="section-subtitle">${todasInc.length} registros totales</div>
            </div>
            ${puedeGestionar ? `<button class="btn btn-primary" id="btn-nueva-inc">Registrar incapacidad</button>` : ''}
        </div>

        <div class="filters-bar">
            <div class="search-input-wrapper">
                <span class="search-icon"></span>
                <input class="search-input" type="text" id="search-inc" placeholder="Buscar por empleado...">
            </div>
            <select class="field-select select-auto-md" id="filter-estado-inc">
                <option value="">Todos los estados</option>
                <option value="registrada">Registrada</option>
                <option value="en_revision">En revisión</option>
                <option value="aprobada">Aprobada</option>
                <option value="rechazada">Rechazada</option>
                <option value="finalizada">Finalizada</option>
            </select>
            <select class="field-select select-auto" id="filter-tipo-inc">
                <option value="">Todos los tipos</option>
                <option value="enfermedad_general">Enfermedad general</option>
                <option value="accidente_laboral">Accidente laboral</option>
                <option value="licencia_medica">Licencia médica</option>
                <option value="incapacidad_temporal">Incapacidad temporal</option>
            </select>
        </div>

        <div class="table-wrapper">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Empleado</th>
                        <th>Tipo</th>
                        <th>Período</th>
                        <th>Días</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="tbody-inc">
                    ${renderFilas(todasInc, puedeGestionar)}
                </tbody>
            </table>
        </div>
    `;

    const search     = container.querySelector('#search-inc');
    const filterEst  = container.querySelector('#filter-estado-inc');
    const filterTipo = container.querySelector('#filter-tipo-inc');

    function filtrar() {
        const q    = search.value.toLowerCase();
        const est  = filterEst.value;
        const tipo = filterTipo.value;

        const filtrados = todasInc.filter(inc => {
            const nombre = nomEmp(inc.empleado_id).toLowerCase();
            return (!q || nombre.includes(q))
                && (!est  || inc.estado === est)
                && (!tipo || inc.tipo   === tipo);
        });

        document.getElementById('tbody-inc').innerHTML = renderFilas(filtrados, puedeGestionar);
        attachEvents(container, puedeGestionar);
    }

    search.addEventListener('input', filtrar);
    filterEst.addEventListener('change', filtrar);
    filterTipo.addEventListener('change', filtrar);

    if (puedeGestionar) {
        container.querySelector('#btn-nueva-inc')?.addEventListener('click', () => {
            abrirFormIncapacidad(null, container);
        });
    }

    attachEvents(container, puedeGestionar);

    window.addEventListener('ver-incapacidad', (e) => {
    verIncapacidad(e.detail);
    }, { once: true });
}

function renderFilas(lista, puedeGestionar) {
    if (lista.length === 0) {
        return `<tr><td colspan="6">${renderEmpty('Sin resultados', 'No se encontraron incapacidades con esos filtros.')}</td></tr>`;
    }
    return lista.map(inc => `
        <tr>
            <td>
                <div class="user-cell">
                    <span class="user-avatar user-avatar-xs">${iniciales(nomEmp(inc.empleado_id))}</span>
                    <span class="user-cell-name">${nomEmp(inc.empleado_id)}</span>
                </div>
            </td>
            <td class="td-sm">${LABELS_TIPO_INCAPACIDAD[inc.tipo] || inc.tipo}</td>
            <td class="td-sm">
                ${formatFechaCorta(inc.fecha_inicio)} — ${formatFechaCorta(inc.fecha_fin)}
            </td>
            <td class="td-bold">${inc.dias_incapacidad}</td>
            <td>${badgeEstado(inc.estado)}</td>
            <td>
                <div class="table-actions">
                    <button class="action-btn action-btn-view" data-action="ver" data-id="${inc.id}">Ver</button>
                    ${puedeGestionar && inc.estado !== 'rechazada' && inc.estado !== 'finalizada' ? `
                        <button class="action-btn action-btn-edit" data-action="editar" data-id="${inc.id}">Editar</button>
                        ${estadosSiguientes(inc.estado).length > 0 ? `
                            <button class="action-btn action-btn-success" data-action="estado" data-id="${inc.id}">Estado</button>
                        ` : ''}
                        ${inc.estado === 'aprobada' ? `
                            <button class="action-btn action-btn-danger" data-action="finalizar" data-id="${inc.id}">Finalizar</button>
                        ` : ''}
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function attachEvents(container, puedeGestionar) {
    container.querySelectorAll('[data-action="ver"]').forEach(btn => {
        btn.addEventListener('click', () => verIncapacidad(btn.dataset.id));
    });

    if (puedeGestionar) {
        container.querySelectorAll('[data-action="editar"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const inc = todasInc.find(i => i.id == btn.dataset.id);
                if (inc) abrirFormIncapacidad(inc, container);
            });
        });

        container.querySelectorAll('[data-action="estado"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const inc = todasInc.find(i => i.id == btn.dataset.id);
                if (inc) abrirCambioEstado(inc, container);
            });
        });

        container.querySelectorAll('[data-action="finalizar"]').forEach(btn => {
            btn.addEventListener('click', () => confirmarFinalizar(btn.dataset.id, container));
        });
    }
}

async function verIncapacidad(id) {
    const inc = todasInc.find(i => i.id == id);
    if (!inc) return;

    openPanel({
        titulo: `Incapacidad — ${nomEmp(inc.empleado_id)}`,
        cuerpo: `
            <div class="detail-section">
                <div class="detail-section-title">Información general</div>
                <div class="detail-row"><span class="detail-key">Empleado</span><span class="detail-val">${nomEmp(inc.empleado_id)}</span></div>
                <div class="detail-row"><span class="detail-key">Tipo</span><span class="detail-val">${LABELS_TIPO_INCAPACIDAD[inc.tipo] || inc.tipo}</span></div>
                <div class="detail-row"><span class="detail-key">Estado</span><span class="detail-val">${badgeEstado(inc.estado)}</span></div>
                <div class="detail-row"><span class="detail-key">Fecha inicio</span><span class="detail-val">${formatFechaCorta(inc.fecha_inicio)}</span></div>
                <div class="detail-row"><span class="detail-key">Fecha fin</span><span class="detail-val">${formatFechaCorta(inc.fecha_fin)}</span></div>
                <div class="detail-row"><span class="detail-key">Días</span><span class="detail-val">${inc.dias_incapacidad}</span></div>
                <div class="detail-row"><span class="detail-key">Diagnóstico</span><span class="detail-val">${inc.diagnostico_general}</span></div>
                <div class="detail-row"><span class="detail-key">Entidad médica</span><span class="detail-val">${inc.entidad_medica}</span></div>
                ${inc.observaciones ? `<div class="detail-row"><span class="detail-key">Observaciones</span><span class="detail-val">${inc.observaciones}</span></div>` : ''}
            </div>
            <div class="detail-section">
                <div class="detail-section-title">Historial de seguimiento</div>
                <div id="panel-seguimientos"><div class="loader"><div class="loader-spinner"></div></div></div>
            </div>
        `
    });

    try {
        const segs = await buscarSeguimientos({ incapacidad_id: inc.id });
        const el = document.getElementById('panel-seguimientos');
        if (!el) return;

        if (segs.length === 0) {
            el.innerHTML = `<p class="text-empty-panel">Sin seguimientos registrados.</p>`;
        } else {
            el.innerHTML = `
                <div class="timeline">
                    ${segs.map(seg => `
                        <div class="timeline-item">
                            <span class="timeline-dot timeline-dot-${seg.estado}"></span>
                            <div class="timeline-date">${formatFechaCorta(seg.fecha)}</div>
                            <div class="timeline-content">
                                <div class="timeline-header">
                                    ${badgeEstado(seg.estado)}
                                </div>
                                <div class="timeline-comment">${seg.comentario}</div>
                                <div class="timeline-user">Por: ${seg.usuario_responsable}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    } catch {
        const el = document.getElementById('panel-seguimientos');
        if (el) el.innerHTML = `<p class="text-error-panel">Error al cargar seguimientos.</p>`;
    }
}

function abrirFormIncapacidad(inc, container) {
    const esEdicion = !!inc;
    const hoy = hoyISO();

    openModal({
        titulo: esEdicion ? 'Editar incapacidad' : 'Registrar incapacidad',
        cuerpo: `
            <div id="form-inc-error" class="alert alert-error hidden"></div>
            <div class="field">
                <label class="field-label">Empleado</label>
                <select class="field-select" id="inc-empleado" ${esEdicion ? 'disabled' : ''}>
                    <option value="">Seleccionar empleado</option>
                    ${empleados.filter(e => e.estado === 'activo').map(e =>
                        `<option value="${e.id}" ${inc?.empleado_id == e.id ? 'selected' : ''}>
                            ${e.nombres} ${e.apellidos}
                        </option>`
                    ).join('')}
                </select>
            </div>
            ${esEdicion ? '' : `
            <div class="field">
                <label class="field-label">Tipo de incapacidad</label>
                <select class="field-select" id="inc-tipo">
                    <option value="">Seleccionar tipo</option>
                    <option value="enfermedad_general">Enfermedad general</option>
                    <option value="accidente_laboral">Accidente laboral</option>
                    <option value="licencia_medica">Licencia médica</option>
                    <option value="incapacidad_temporal">Incapacidad temporal</option>
                </select>
            </div>
            `}
            <div class="form-row">
                <div class="field">
                    <label class="field-label">Fecha inicio</label>
                    <input class="field-input" type="date" id="inc-inicio" value="${inc?.fecha_inicio || hoy}">
                </div>
                <div class="field">
                    <label class="field-label">Fecha fin</label>
                    <input class="field-input" type="date" id="inc-fin" value="${inc?.fecha_fin || hoy}">
                </div>
            </div>
            <div class="field">
                <label class="field-label">Días calculados</label>
                <input class="field-input" type="text" id="inc-dias" readonly
                    value="${inc ? inc.dias_incapacidad : calcularDias(hoy, hoy)}">
            </div>
            ${!esEdicion ? `
            <div class="field">
                <label class="field-label">Diagnóstico general</label>
                <input class="field-input" type="text" id="inc-diagnostico" placeholder="Ej: Infección respiratoria">
            </div>
            <div class="field">
                <label class="field-label">Entidad médica</label>
                <input class="field-input" type="text" id="inc-entidad" placeholder="Ej: Clínica Central">
            </div>
            ` : ''}
            <div class="field">
                <label class="field-label">Observaciones</label>
                <textarea class="field-textarea" id="inc-obs">${inc?.observaciones || ''}</textarea>
            </div>
        `,
        pie: `
            <button class="btn btn-secondary" data-modal-close>Cancelar</button>
            <button class="btn btn-primary" id="btn-guardar-inc">${esEdicion ? 'Guardar cambios' : 'Registrar'}</button>
        `
    });

    const inputInicio = document.getElementById('inc-inicio');
    const inputFin    = document.getElementById('inc-fin');
    const inputDias   = document.getElementById('inc-dias');

    function actualizarDias() {
        const dias = calcularDias(inputInicio.value, inputFin.value);
        inputDias.value = dias > 0 ? dias : '—';
    }

    inputInicio?.addEventListener('change', actualizarDias);
    inputFin?.addEventListener('change', actualizarDias);

    document.getElementById('btn-guardar-inc').addEventListener('click', async () => {
        const errorEl = document.getElementById('form-inc-error');
        errorEl.classList.add('hidden');

        let data;
        if (esEdicion) {
            data = {
                fecha_inicio:  inputInicio.value,
                fecha_fin:     inputFin.value,
                observaciones: document.getElementById('inc-obs').value.trim()
            };
        } else {
            data = {
                empleado_id:       parseInt(document.getElementById('inc-empleado').value),
                tipo:              document.getElementById('inc-tipo').value,
                fecha_inicio:      inputInicio.value,
                fecha_fin:         inputFin.value,
                diagnostico_general: document.getElementById('inc-diagnostico').value.trim(),
                entidad_medica:    document.getElementById('inc-entidad').value.trim(),
                observaciones:     document.getElementById('inc-obs').value.trim()
            };

            if (!data.empleado_id || !data.tipo || !data.diagnostico_general || !data.entidad_medica) {
                errorEl.textContent = 'Completa todos los campos obligatorios.';
                errorEl.classList.remove('hidden');
                return;
            }
        }

        const btn = document.getElementById('btn-guardar-inc');
        btn.classList.add('btn-loading');
        btn.disabled = true;

        try {
            if (esEdicion) {
                await updateIncapacidad(inc.id, data);
                toastExito('Incapacidad actualizada', 'Los cambios fueron guardados.');
            } else {
                await createIncapacidad(data);
                toastExito('Incapacidad registrada', 'La solicitud fue creada correctamente.');
            }
            closeModal();
            todasInc = await getIncapacidades();
            renderVista(container);
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.classList.remove('hidden');
            btn.classList.remove('btn-loading');
            btn.disabled = false;
        }
    });
}

function abrirCambioEstado(inc, container) {
    const usuario = getUsuario();
    const siguientes = estadosSiguientes(inc.estado);

    openModal({
        titulo: 'Cambiar estado',
        cuerpo: `
            <div id="form-estado-error" class="alert alert-error hidden"></div>
            <p class="modal-text-sm">
                Estado actual: ${badgeEstado(inc.estado)}
            </p>
            <div class="field">
                <label class="field-label">Nuevo estado</label>
                <select class="field-select" id="nuevo-estado">
                    ${siguientes.map(s => `<option value="${s}">${LABELS_ESTADO_INCAPACIDAD[s] || s}</option>`).join('')}
                </select>
            </div>
            <div class="field">
                <label class="field-label">Comentario de seguimiento</label>
                <textarea class="field-textarea" id="estado-comentario" placeholder="Describe el motivo del cambio..."></textarea>
            </div>
        `,
        pie: `
            <button class="btn btn-secondary" data-modal-close>Cancelar</button>
            <button class="btn btn-primary" id="btn-guardar-estado">Confirmar cambio</button>
        `
    });

    document.getElementById('btn-guardar-estado').addEventListener('click', async () => {
        const errorEl = document.getElementById('form-estado-error');
        errorEl.classList.add('hidden');

        const nuevoEstado  = document.getElementById('nuevo-estado').value;
        const comentario   = document.getElementById('estado-comentario').value.trim();

        if (!comentario) {
            errorEl.textContent = 'El comentario de seguimiento es obligatorio.';
            errorEl.classList.remove('hidden');
            return;
        }

        const btn = document.getElementById('btn-guardar-estado');
        btn.classList.add('btn-loading');
        btn.disabled = true;

        try {
            await cambiarEstadoIncapacidad(inc.id, nuevoEstado);
            await createSeguimiento({
                incapacidad_id:      inc.id,
                fecha:               hoyISO(),
                comentario,
                estado:              nuevoEstado,
                usuario_responsable: usuario.usuario || usuario.nombre
            });

            closeModal();
            toastExito('Estado actualizado', `La incapacidad pasó a "${LABELS_ESTADO_INCAPACIDAD[nuevoEstado]}".`);
            todasInc = await getIncapacidades();
            renderVista(container);
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.classList.remove('hidden');
            btn.classList.remove('btn-loading');
            btn.disabled = false;
        }
    });
}

async function confirmarFinalizar(id, container) {
    const inc = todasInc.find(i => i.id == id);
    const usuario = getUsuario();

    openModal({
        titulo: 'Finalizar incapacidad',
        cuerpo: `
            <p class="modal-text-sm">
                ¿Confirmas que esta incapacidad ha concluido?
            </p>
            <div class="field">
                <label class="field-label">Comentario de cierre</label>
                <textarea class="field-textarea" id="fin-comentario" placeholder="Ej: Incapacidad finalizada satisfactoriamente."></textarea>
            </div>
        `,
        pie: `
            <button class="btn btn-secondary" data-modal-close>Cancelar</button>
            <button class="btn btn-primary" id="btn-finalizar">Finalizar</button>
        `
    });

    document.getElementById('btn-finalizar').addEventListener('click', async () => {
        const comentario = document.getElementById('fin-comentario').value.trim();
        if (!comentario) {
            toastError('Campo requerido', 'Escribe un comentario de cierre.');
            return;
        }

        const btn = document.getElementById('btn-finalizar');
        btn.classList.add('btn-loading');
        btn.disabled = true;

        try {
            await finalizarIncapacidad(id);
            await createSeguimiento({
                incapacidad_id:      parseInt(id),
                fecha:               hoyISO(),
                comentario,
                estado:              'finalizada',
                usuario_responsable: usuario.usuario || usuario.nombre
            });
            closeModal();
            toastExito('Incapacidad finalizada', 'El registro fue cerrado correctamente.');
            todasInc = await getIncapacidades();
            renderVista(container);
        } catch (err) {
            toastError('Error', err.message);
            btn.classList.remove('btn-loading');
            btn.disabled = false;
        }
    });
}
