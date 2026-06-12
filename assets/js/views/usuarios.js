import { getUsuarios, createUsuario, updateUsuario, cambiarEstadoUsuario, deleteUsuario } from '../api/auth.api.js';
import { badgeEstado, badgeRol, iniciales, LABELS_ROL } from '../utils/format.js';
import { renderLoader, renderEmpty } from '../utils/dom.js';
import { openModal, closeModal } from '../components/modal.js';
import { toastExito, toastError } from '../components/toast.js';
import { getNavigationToken } from '../router.js';

let todosUsuarios = [];

export async function renderUsuarios(container, token) {
    container.innerHTML = renderLoader();

    try {
        todosUsuarios = await getUsuarios();
        if (token !== getNavigationToken()) return;
        renderVista(container);
    } catch (err) {
        if (token !== getNavigationToken()) return;
        container.innerHTML = `<div class="alert alert-error">Error al cargar usuarios: ${err.message}</div>`;
    }

    window.addEventListener('quick-action', (e) => {
        if (e.detail === 'nuevo') abrirFormUsuario(null, container);
    }, { once: true });
}

function renderVista(container) {
    container.innerHTML = `
        <div class="section-header">
            <div>
                <div class="section-title">Usuarios del sistema</div>
                <div class="section-subtitle">${todosUsuarios.length} usuarios registrados</div>
            </div>
            <button class="btn btn-primary" id="btn-nuevo-usr">Nuevo usuario</button>
        </div>

        <div class="filters-bar">
            <div class="search-input-wrapper">
                <span class="search-icon"></span>
                <input class="search-input" type="text" id="search-usr" placeholder="Buscar por nombre o usuario...">
            </div>
            <select class="field-select select-auto" id="filter-rol">
                <option value="">Todos los roles</option>
                <option value="administrador">Administrador</option>
                <option value="gestion_humana">Gestión Humana</option>
                <option value="empleado">Empleado</option>
            </select>
            <select class="field-select select-auto-sm" id="filter-estado-usr">
                <option value="">Todos los estados</option>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
            </select>
        </div>

        <div class="table-wrapper">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Usuario</th>
                        <th>Nombre de usuario</th>
                        <th>Rol</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="tbody-usr">
                    ${renderFilas(todosUsuarios)}
                </tbody>
            </table>
        </div>
    `;

    const search    = container.querySelector('#search-usr');
    const filterRol = container.querySelector('#filter-rol');
    const filterEst = container.querySelector('#filter-estado-usr');

    function filtrar() {
        const q   = search.value.toLowerCase();
        const rol = filterRol.value;
        const est = filterEst.value;

        const filtrados = todosUsuarios.filter(u => {
            return (!q || u.nombre.toLowerCase().includes(q) || u.usuario.toLowerCase().includes(q) || u.correo.toLowerCase().includes(q))
                && (!rol || u.rol === rol)
                && (!est || u.estado === est);
        });

        document.getElementById('tbody-usr').innerHTML = renderFilas(filtrados);
        attachEvents(container);
    }

    search.addEventListener('input', filtrar);
    filterRol.addEventListener('change', filtrar);
    filterEst.addEventListener('change', filtrar);

    container.querySelector('#btn-nuevo-usr').addEventListener('click', () => {
        abrirFormUsuario(null, container);
    });

    attachEvents(container);
}

function renderFilas(lista) {
    if (lista.length === 0) {
        return `<tr><td colspan="5">${renderEmpty('Sin resultados', 'No se encontraron usuarios con esos filtros.')}</td></tr>`;
    }
    return lista.map(u => `
        <tr>
            <td>
                <div class="user-cell">
                    <span class="user-avatar user-avatar-sm">${iniciales(u.nombre)}</span>
                    <div>
                        <div class="user-cell-name">${u.nombre}</div>
                        <div class="user-cell-email">${u.correo}</div>
                    </div>
                </div>
            </td>
            <td class="td-secondary">@${u.usuario}</td>
            <td>${badgeRol(u.rol)}</td>
            <td>${badgeEstado(u.estado)}</td>
            <td>
                <div class="table-actions">
                    <button class="action-btn action-btn-edit" data-action="editar" data-id="${u.id}">Editar</button>
                    <button class="action-btn ${u.estado === 'activo' ? 'action-btn-danger' : 'action-btn-success'}"
                        data-action="estado" data-id="${u.id}" data-estado="${u.estado}">
                        ${u.estado === 'activo' ? 'Desactivar' : 'Activar'}
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function attachEvents(container) {
    container.querySelectorAll('[data-action="editar"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const u = todosUsuarios.find(x => x.id == btn.dataset.id);
            if (u) abrirFormUsuario(u, container);
        });
    });

    container.querySelectorAll('[data-action="estado"]').forEach(btn => {
        btn.addEventListener('click', () => confirmarCambioEstado(btn.dataset.id, btn.dataset.estado, container));
    });
}

function abrirFormUsuario(u, container) {
    const esEdicion = !!u;

    openModal({
        titulo: esEdicion ? 'Editar usuario' : 'Nuevo usuario',
        cuerpo: `
            <div id="form-usr-error" class="alert alert-error hidden"></div>
            <div class="field">
                <label class="field-label">Nombre completo</label>
                <input class="field-input" id="usr-nombre" type="text" value="${u?.nombre || ''}">
            </div>
            <div class="field">
                <label class="field-label">Correo electrónico</label>
                <input class="field-input" id="usr-correo" type="email" value="${u?.correo || ''}">
                ${esEdicion ? `<div class="field-hint">El correo vincula este usuario con un empleado. Modificarlo con precaución.</div>` : ''}
            </div>
            <div class="field">
                <label class="field-label">Nombre de usuario</label>
                <input class="field-input" id="usr-usuario" type="text" value="${u?.usuario || ''}">
            </div>
            <div class="field">
                <label class="field-label">Contraseña</label>
                <input class="field-input" id="usr-contrasena" type="password">
            </div>
            <div class="field">
                <label class="field-label">Rol</label>
                <select class="field-select" id="usr-rol">
                    <option value="administrador" ${u?.rol === 'administrador' ? 'selected' : ''}>Administrador</option>
                    <option value="gestion_humana" ${u?.rol === 'gestion_humana' ? 'selected' : ''}>Gestión Humana</option>
                    <option value="empleado" ${u?.rol === 'empleado' ? 'selected' : ''}>Empleado</option>
                </select>
            </div>
        `,
        pie: `
            <button class="btn btn-secondary" data-modal-close>Cancelar</button>
            <button class="btn btn-primary" id="btn-guardar-usr">${esEdicion ? 'Guardar cambios' : 'Crear usuario'}</button>
        `
    });

    document.getElementById('btn-guardar-usr').addEventListener('click', async () => {
        const errorEl = document.getElementById('form-usr-error');
        errorEl.classList.add('hidden');

        const data = {
            nombre:  document.getElementById('usr-nombre').value.trim(),
            correo:  document.getElementById('usr-correo').value.trim(),
            usuario: document.getElementById('usr-usuario').value.trim(),
            rol:     document.getElementById('usr-rol').value
        };

        const contrasena = document.getElementById('usr-contrasena').value.trim();
        if (contrasena) data.contrasena = contrasena; // ← solo si se llenó

        if (!esEdicion && !contrasena) {
            errorEl.textContent = 'La contraseña es obligatoria al crear un usuario.';
            errorEl.classList.remove('hidden');
            return;
        }       

        if (!data.nombre || !data.correo || !data.usuario || (!esEdicion && !data.contrasena)) {
            errorEl.textContent = 'Completa todos los campos obligatorios.';
            errorEl.classList.remove('hidden');
            return;
        }

        const btn = document.getElementById('btn-guardar-usr');
        btn.classList.add('btn-loading');
        btn.disabled = true;

        try {
            if (esEdicion) {
                await updateUsuario(u.id, data);
                toastExito('Usuario actualizado', `${data.nombre} fue actualizado.`);
            } else {
                await createUsuario(data);
                toastExito('Usuario creado', `${data.nombre} fue registrado.`);
            }
            closeModal();
            todosUsuarios = await getUsuarios();
            renderVista(container);
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.classList.remove('hidden');
            btn.classList.remove('btn-loading');
            btn.disabled = false;
        }
    });
}

async function confirmarCambioEstado(id, estadoActual, container) {
    const nuevoEstado = estadoActual === 'activo' ? 'inactivo' : 'activo';
    const u = todosUsuarios.find(x => x.id == id);

    openModal({
        titulo: nuevoEstado === 'inactivo' ? 'Desactivar usuario' : 'Activar usuario',
        cuerpo: `<p class="modal-text">
            ¿Confirmas que deseas ${nuevoEstado === 'inactivo' ? 'desactivar' : 'activar'} a <strong>${u?.nombre || 'este usuario'}</strong>?
            ${nuevoEstado === 'inactivo' ? 'El usuario no podrá ingresar al sistema.' : ''}
        </p>`,
        pie: `
            <button class="btn btn-secondary" data-modal-close>Cancelar</button>
            <button class="btn ${nuevoEstado === 'inactivo' ? 'btn-danger' : 'btn-primary'}" id="btn-confirm-usr-estado">
                ${nuevoEstado === 'inactivo' ? 'Desactivar' : 'Activar'}
            </button>
        `
    });

    document.getElementById('btn-confirm-usr-estado').addEventListener('click', async () => {
        try {
            await cambiarEstadoUsuario(id, nuevoEstado);
            closeModal();
            toastExito('Estado actualizado', `${u?.nombre} ahora está ${nuevoEstado}.`);
            todosUsuarios = await getUsuarios();
            renderVista(container);
        } catch (err) {
            toastError('Error', err.message);
        }
    });
}
