import { getEmpleados, createEmpleado, updateEmpleado, cambiarEstadoEmpleado } from '../api/empleados.api.js';
import { buscarIncapacidades } from '../api/incapacidades.api.js';
import { getRol, setEmpleados as cacheEmpleados } from '../store.js';
import { formatFecha, formatFechaCorta } from '../utils/fecha.js';
import { badgeEstado, iniciales, LABELS_TIPO_INCAPACIDAD } from '../utils/format.js';
import { renderLoader, renderEmpty } from '../utils/dom.js';
import { openModal, closeModal } from '../components/modal.js';
import { openPanel } from '../components/panel.js';
import { toastExito, toastError } from '../components/toast.js';
import { getNavigationToken } from '../router.js';

let todosEmpleados = [];

export async function renderEmpleados(container, token) {
    container.innerHTML = renderLoader();

    try {
        todosEmpleados = await getEmpleados();
        if (token !== getNavigationToken()) return;
        cacheEmpleados(todosEmpleados);
        renderVista(container, todosEmpleados);
    } catch (err) {
        if (token !== getNavigationToken()) return;
        container.innerHTML = `<div class="alert alert-error">Error al cargar empleados: ${err.message}</div>`;
    }

    window.addEventListener('quick-action', (e) => {
        if (e.detail === 'nuevo') abrirFormEmpleado(null, container);
    }, { once: true });
}

function renderVista(container, lista) {
    const rol = getRol();
    const puedeEditar = rol === 'administrador' || rol === 'gestion_humana';

    container.innerHTML = `
        <div class="section-header">
            <div>
                <div class="section-title">Empleados</div>
                <div class="section-subtitle">${lista.length} registros totales</div>
            </div>
            ${puedeEditar ? `<button class="btn btn-primary" id="btn-nuevo-emp">Nuevo empleado</button>` : ''}
        </div>

        <div class="filters-bar">
            <div class="search-input-wrapper">
                <span class="search-icon"></span>
                <input class="search-input" type="text" id="search-emp" placeholder="Buscar por nombre o documento...">
            </div>
            <select class="field-select select-auto-md" id="filter-area">
                <option value="">Todas las áreas</option>
                ${[...new Set(todosEmpleados.map(e => e.area))].map(a =>
                    `<option value="${a}">${a}</option>`
                ).join('')}
            </select>
            <select class="field-select select-auto-sm" id="filter-estado">
                <option value="">Todos los estados</option>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
            </select>
        </div>

        <div class="table-wrapper">
            <table class="data-table" id="tabla-empleados">
                <thead>
                    <tr>
                        <th>Empleado</th>
                        <th>Documento</th>
                        <th>Cargo</th>
                        <th>Área</th>
                        <th>Ingreso</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="tbody-empleados">
                    ${renderFilas(lista, puedeEditar)}
                </tbody>
            </table>
        </div>
    `;

    // Buscar y filtrar
    const search     = container.querySelector('#search-emp');
    const filterArea = container.querySelector('#filter-area');
    const filterEst  = container.querySelector('#filter-estado');

    function aplicarFiltros() {
        const q   = search.value.toLowerCase();
        const area = filterArea.value;
        const est  = filterEst.value;

        const filtrados = todosEmpleados.filter(e => {
            const nombre = `${e.nombres} ${e.apellidos}`.toLowerCase();
            const matchQ   = !q || nombre.includes(q) || e.documento.includes(q);
            const matchArea = !area || e.area === area;
            const matchEst  = !est || e.estado === est;
            return matchQ && matchArea && matchEst;
        });

        document.getElementById('tbody-empleados').innerHTML = renderFilas(filtrados, puedeEditar);
        attachRowEvents(container, puedeEditar);
    }

    search.addEventListener('input', aplicarFiltros);
    filterArea.addEventListener('change', aplicarFiltros);
    filterEst.addEventListener('change', aplicarFiltros);

    if (puedeEditar) {
        container.querySelector('#btn-nuevo-emp')?.addEventListener('click', () => {
            abrirFormEmpleado(null, container);
        });
    }

    attachRowEvents(container, puedeEditar);
}

function renderFilas(lista, puedeEditar) {
    if (lista.length === 0) {
        return `<tr><td colspan="7">${renderEmpty('Sin resultados', 'No se encontraron empleados con esos filtros.')}</td></tr>`;
    }
    return lista.map(emp => `
        <tr>
            <td>
                <div class="user-cell">
                    <span class="user-avatar user-avatar-sm">
                        ${iniciales(emp.nombres + ' ' + emp.apellidos)}
                    </span>
                    <div>
                        <div class="user-cell-name">${emp.nombres} ${emp.apellidos}</div>
                        <div class="user-cell-email">${emp.correo}</div>
                    </div>
                </div>
            </td>
            <td>${emp.documento}</td>
            <td>${emp.cargo}</td>
            <td>${emp.area}</td>
            <td>${formatFechaCorta(emp.fecha_ingreso)}</td>
            <td>${badgeEstado(emp.estado)}</td>
            <td>
                <div class="table-actions">
                    <button class="action-btn action-btn-view" data-action="ver" data-id="${emp.id}">Ver</button>
                    ${puedeEditar ? `
                        <button class="action-btn action-btn-edit" data-action="editar" data-id="${emp.id}">Editar</button>
                        <button class="action-btn ${emp.estado === 'activo' ? 'action-btn-danger' : 'action-btn-success'}"
                            data-action="estado" data-id="${emp.id}" data-estado="${emp.estado}">
                            ${emp.estado === 'activo' ? 'Desactivar' : 'Activar'}
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function attachRowEvents(container, puedeEditar) {
    container.querySelectorAll('[data-action="ver"]').forEach(btn => {
        btn.addEventListener('click', () => verEmpleado(btn.dataset.id));
    });

    if (puedeEditar) {
        container.querySelectorAll('[data-action="editar"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const emp = todosEmpleados.find(e => e.id == btn.dataset.id);
                if (emp) abrirFormEmpleado(emp, container);
            });
        });

        container.querySelectorAll('[data-action="estado"]').forEach(btn => {
            btn.addEventListener('click', () => cambiarEstado(btn.dataset.id, btn.dataset.estado, container));
        });
    }
}

async function verEmpleado(id) {
    const emp = todosEmpleados.find(e => e.id == id);
    if (!emp) return;

    let incHtml = '<div class="loader"><div class="loader-spinner"></div></div>';

    openPanel({
        titulo: `${emp.nombres} ${emp.apellidos}`,
        cuerpo: `
            <div class="detail-section">
                <div class="employee-detail-header">
                    <span class="employee-avatar-large">${iniciales(emp.nombres + ' ' + emp.apellidos)}</span>
                    <div>
                        <div class="employee-detail-name">${emp.nombres} ${emp.apellidos}</div>
                        <div class="employee-detail-role">${emp.cargo} — ${emp.area}</div>
                        <div class="employee-detail-status">${badgeEstado(emp.estado)}</div>
                    </div>
                </div>
                <div class="detail-section-title">Información personal</div>
                <div class="detail-row"><span class="detail-key">Documento</span><span class="detail-val">${emp.documento}</span></div>
                <div class="detail-row"><span class="detail-key">Correo</span><span class="detail-val">${emp.correo}</span></div>
                <div class="detail-row"><span class="detail-key">Teléfono</span><span class="detail-val">${emp.telefono}</span></div>
                <div class="detail-row"><span class="detail-key">Fecha ingreso</span><span class="detail-val">${formatFecha(emp.fecha_ingreso)}</span></div>
            </div>
            <div class="detail-section">
                <div class="detail-section-title">Incapacidades</div>
                <div id="panel-incapacidades">${incHtml}</div>
            </div>
        `
    });

    try {
        const incs = await buscarIncapacidades({ empleado_id: emp.id });
        const panelInc = document.getElementById('panel-incapacidades');
        if (!panelInc) return;

        if (incs.length === 0) {
            panelInc.innerHTML = `<p class="text-empty-panel">Sin incapacidades registradas.</p>`;
        } else {
            panelInc.innerHTML = incs.map(inc => `
                <div class="inc-panel-item">
                    <div class="inc-panel-header">
                        <span class="inc-panel-title">${LABELS_TIPO_INCAPACIDAD[inc.tipo] || inc.tipo}</span>
                        ${badgeEstado(inc.estado)}
                    </div>
                    <div class="inc-panel-dates">
                        ${formatFechaCorta(inc.fecha_inicio)} — ${formatFechaCorta(inc.fecha_fin)} &middot; ${inc.dias_incapacidad} días
                    </div>
                </div>
            `).join('');
        }
    } catch {
        const panelInc = document.getElementById('panel-incapacidades');
        if (panelInc) panelInc.innerHTML = `<p class="text-error-panel">Error al cargar incapacidades.</p>`;
    }
}

function abrirFormEmpleado(emp, container) {
    const esEdicion = !!emp;
    openModal({
        titulo: esEdicion ? 'Editar empleado' : 'Nuevo empleado',
        cuerpo: `
            <div id="form-emp-error" class="alert alert-error hidden"></div>
            <div class="form-row">
                <div class="field">
                    <label class="field-label">Nombres</label>
                    <input class="field-input" id="emp-nombres" type="text" value="${emp?.nombres || ''}">
                </div>
                <div class="field">
                    <label class="field-label">Apellidos</label>
                    <input class="field-input" id="emp-apellidos" type="text" value="${emp?.apellidos || ''}">
                </div>
            </div>
            <div class="form-row">
                <div class="field">
                    <label class="field-label">Documento</label>
                    <input class="field-input" id="emp-documento" type="text" value="${emp?.documento || ''}" ${esEdicion ? 'readonly' : ''}>
                </div>
                <div class="field">
                    <label class="field-label">Teléfono</label>
                    <input class="field-input" id="emp-telefono" type="text" value="${emp?.telefono || ''}">
                </div>
            </div>
            <div class="field">
                <label class="field-label">Correo electrónico</label>
                <input class="field-input" id="emp-correo" type="email" value="${emp?.correo || ''}" ${esEdicion ? 'readonly' : ''}>
            </div>
            <div class="form-row">
                <div class="field">
                    <label class="field-label">Cargo</label>
                    <input class="field-input" id="emp-cargo" type="text" value="${emp?.cargo || ''}">
                </div>
                <div class="field">
                    <label class="field-label">Área</label>
                    <input class="field-input" id="emp-area" type="text" value="${emp?.area || ''}">
                </div>
            </div>
            <div class="field">
                <label class="field-label">Fecha de ingreso</label>
                <input class="field-input" id="emp-ingreso" type="date" value="${emp?.fecha_ingreso || ''}">
            </div>
            ${esEdicion ? `
            <div class="field">
                <label class="field-label">Estado</label>
                <select class="field-select" id="emp-estado">
                    <option value="activo" ${emp.estado === 'activo' ? 'selected' : ''}>Activo</option>
                    <option value="inactivo" ${emp.estado === 'inactivo' ? 'selected' : ''}>Inactivo</option>
                </select>
            </div>
            ` : ''}
        `,
        pie: `
            <button class="btn btn-secondary" data-modal-close>Cancelar</button>
            <button class="btn btn-primary" id="btn-guardar-emp">${esEdicion ? 'Guardar cambios' : 'Crear empleado'}</button>
        `
    });

    document.getElementById('btn-guardar-emp').addEventListener('click', async () => {
        const errorEl = document.getElementById('form-emp-error');
        errorEl.classList.add('hidden');

        const data = {
            nombres:      document.getElementById('emp-nombres').value.trim(),
            apellidos:    document.getElementById('emp-apellidos').value.trim(),
            documento:    document.getElementById('emp-documento').value.trim(),
            correo:       document.getElementById('emp-correo').value.trim(),
            telefono:     document.getElementById('emp-telefono').value.trim(),
            cargo:        document.getElementById('emp-cargo').value.trim(),
            area:         document.getElementById('emp-area').value.trim(),
            fecha_ingreso: document.getElementById('emp-ingreso').value
        };

        if (esEdicion) {
            data.estado = document.getElementById('emp-estado').value;
        }

        const campos = ['nombres', 'apellidos', 'documento', 'correo', 'telefono', 'cargo', 'area', 'fecha_ingreso'];
        if (campos.some(c => !data[c])) {
            errorEl.textContent = 'Completa todos los campos obligatorios.';
            errorEl.classList.remove('hidden');
            return;
        }

        const btn = document.getElementById('btn-guardar-emp');
        btn.classList.add('btn-loading');
        btn.disabled = true;

        try {
            if (esEdicion) {
                await updateEmpleado(emp.id, data);
                toastExito('Empleado actualizado', `${data.nombres} ${data.apellidos} fue actualizado.`);
            } else {
                await createEmpleado(data);
                toastExito('Empleado creado', `${data.nombres} ${data.apellidos} fue registrado.`);
            }
            closeModal();
            todosEmpleados = await getEmpleados();
            cacheEmpleados(todosEmpleados);
            renderVista(container, todosEmpleados);
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.classList.remove('hidden');
            btn.classList.remove('btn-loading');
            btn.disabled = false;
        }
    });
}

async function cambiarEstado(id, estadoActual, container) {
    const nuevoEstado = estadoActual === 'activo' ? 'inactivo' : 'activo';
    const emp = todosEmpleados.find(e => e.id == id);
    const nombre = emp ? `${emp.nombres} ${emp.apellidos}` : 'el empleado';

    openModal({
        titulo: nuevoEstado === 'inactivo' ? 'Desactivar empleado' : 'Activar empleado',
        cuerpo: `<p class="modal-text">
            ¿Confirmas que deseas ${nuevoEstado === 'inactivo' ? 'desactivar' : 'activar'} a <strong>${nombre}</strong>?
        </p>`,
        pie: `
            <button class="btn btn-secondary" data-modal-close>Cancelar</button>
            <button class="btn ${nuevoEstado === 'inactivo' ? 'btn-danger' : 'btn-primary'}" id="btn-confirm-estado">
                ${nuevoEstado === 'inactivo' ? 'Desactivar' : 'Activar'}
            </button>
        `
    });

    document.getElementById('btn-confirm-estado').addEventListener('click', async () => {
        try {
            await cambiarEstadoEmpleado(id, nuevoEstado);
            closeModal();
            toastExito('Estado actualizado', `${nombre} ahora está ${nuevoEstado}.`);
            todosEmpleados = await getEmpleados();
            cacheEmpleados(todosEmpleados);
            renderVista(container, todosEmpleados);
        } catch (err) {
            toastError('Error', err.message);
        }
    });
}
