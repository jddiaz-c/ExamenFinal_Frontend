import { getEmpleados as apiEmpleados } from '../../api/empleados.api.js';
import { buscarIncapacidades, createIncapacidad } from '../../api/incapacidades.api.js';
import { getUsuario, setEmpleados } from '../../store.js';
import { formatFecha, formatFechaCorta, hoyISO, calcularDias } from '../../utils/fecha.js';
import { badgeEstado, LABELS_TIPO_INCAPACIDAD } from '../../utils/format.js';
import { renderLoader, renderEmpty } from '../../utils/dom.js';
import { openModal, closeModal } from '../../components/modal.js';
import { openPanel } from '../../components/panel.js';
import { toastExito, toastError } from '../../components/toast.js';
import { iniciales } from '../../utils/format.js';
import { getNavigationToken } from '../../router.js';


export async function renderDashboardEmpleado(container, token) {
    console.log('token recibido:', token, 'token actual:', getNavigationToken());
    container.innerHTML = renderLoader();

    const usuario = getUsuario();

    try {
        const empleados = await apiEmpleados();

        if (token !== getNavigationToken()) return;

        setEmpleados(empleados);
        

        // Buscar el empleado vinculado por correo
        const empleado = empleados.find(e => e.correo === usuario.correo);

        if (!empleado) {
            container.innerHTML = `
                <div class="alert alert-info">
                    Tu usuario no está vinculado a un registro de empleado.
                    Contacta al administrador.
                </div>
            `;
            return;
        }

        const incapacidades = await buscarIncapacidades({ empleado_id: empleado.id });
        const activa = incapacidades.find(i => i.estado === 'aprobada' || i.estado === 'en_revision' || i.estado === 'registrada');

        container.innerHTML = `
            <div class="dashboard-grid dashboard-grid-mb">
                <div class="card">
                    <div class="employee-profile-card">
                        <div class="employee-profile-header">
                            <div class="employee-avatar-large">${iniciales(empleado.nombres + ' ' + empleado.apellidos)}</div>
                            <div>
                                <div class="employee-profile-name">${empleado.nombres} ${empleado.apellidos}</div>
                                <div class="employee-profile-cargo">${empleado.cargo} — ${empleado.area}</div>
                            </div>
                        </div>
                        <div>
                            <div class="detail-row">
                                <span class="detail-key">Documento</span>
                                <span class="detail-val">${empleado.documento}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-key">Correo</span>
                                <span class="detail-val">${empleado.correo}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-key">Teléfono</span>
                                <span class="detail-val">${empleado.telefono}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-key">Fecha de ingreso</span>
                                <span class="detail-val">${formatFecha(empleado.fecha_ingreso)}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-key">Estado</span>
                                <span class="detail-val">${badgeEstado(empleado.estado)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    ${activa ? `
                        <div class="card card-mb-sm card-accent">
                            <div class="card-header">
                                <span class="card-title">Incapacidad activa</span>
                                ${badgeEstado(activa.estado)}
                            </div>
                            <div class="detail-row">
                                <span class="detail-key">Tipo</span>
                                <span class="detail-val">${LABELS_TIPO_INCAPACIDAD[activa.tipo] || activa.tipo}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-key">Período</span>
                                <span class="detail-val">${formatFechaCorta(activa.fecha_inicio)} — ${formatFechaCorta(activa.fecha_fin)}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-key">Días</span>
                                <span class="detail-val">${activa.dias_incapacidad} días</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-key">Entidad médica</span>
                                <span class="detail-val">${activa.entidad_medica}</span>
                            </div>
                        </div>
                    ` : `
                        <div class="card card-mb-sm">
                            <div class="card-empty">
                                No tienes una incapacidad activa en este momento.
                            </div>
                        </div>
                    `}

                    <div class="card">
                        <div class="card-header">
                            <span class="card-title">Acciones</span>
                        </div>
                        <div class="quick-actions">
                            <button class="quick-action-btn" id="btn-nueva-inc">
                                <span class="qa-dot qa-dot-accent"></span>
                                Solicitar incapacidad
                            </button>
                            <button class="quick-action-btn" id="btn-ver-historial">
                                <span class="qa-dot qa-dot-info"></span>
                                Ver mi historial completo
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="section-header">
                <div>
                    <div class="section-title">Mis incapacidades</div>
                    <div class="section-subtitle">Historial de todas tus solicitudes</div>
                </div>
            </div>

            <div id="mis-incapacidades-list">
                ${renderListaIncapacidades(incapacidades)}
            </div>
        `;

        container.querySelector('#btn-nueva-inc').addEventListener('click', () => {
            abrirFormNuevaIncapacidad(empleado, async () => {
                const actualizadas = await buscarIncapacidades({ empleado_id: empleado.id });
                document.getElementById('mis-incapacidades-list').innerHTML = renderListaIncapacidades(actualizadas);
            });
        });

        container.querySelector('#btn-ver-historial').addEventListener('click', () => {
            abrirHistorialPanel(incapacidades);
        });

        container.querySelectorAll('.incapacidad-card[data-id]').forEach(card => {
            card.addEventListener('click', () => {
                const inc = incapacidades.find(i => i.id == card.dataset.id);
                if (inc) abrirDetalleIncapacidad(inc);
            });
        });

    } catch (err) {
        if (token !== getNavigationToken()) return;
        container.innerHTML = `<div class="alert alert-error">Error al cargar el panel: ${err.message}</div>`;
    }
}

function renderListaIncapacidades(lista) {
    if (!lista || lista.length === 0) {
        return renderEmpty('Sin incapacidades', 'Aún no tienes solicitudes registradas.');
    }
    return lista.map(inc => `
        <div class="incapacidad-card" data-id="${inc.id}">
            <div class="incapacidad-card-header">
                <div>
                    <div class="incapacidad-card-title">${LABELS_TIPO_INCAPACIDAD[inc.tipo] || inc.tipo}</div>
                    <div class="incapacidad-card-dates">
                        ${formatFechaCorta(inc.fecha_inicio)} — ${formatFechaCorta(inc.fecha_fin)}
                    </div>
                </div>
                ${badgeEstado(inc.estado)}
            </div>
            <div class="incapacidad-card-meta">
                <span class="incapacidad-meta-item"><strong>Días:</strong> ${inc.dias_incapacidad}</span>
                <span class="incapacidad-meta-item"><strong>Entidad:</strong> ${inc.entidad_medica}</span>
                <span class="incapacidad-meta-item"><strong>Diagnóstico:</strong> ${inc.diagnostico_general}</span>
            </div>
        </div>
    `).join('');
}

function abrirFormNuevaIncapacidad(empleado, onSuccess) {
    const hoy = hoyISO();
    openModal({
        titulo: 'Solicitar incapacidad',
        cuerpo: `
            <div id="form-inc-error" class="alert alert-error hidden"></div>
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
            <div class="form-row">
                <div class="field">
                    <label class="field-label">Fecha inicio</label>
                    <input class="field-input" type="date" id="inc-inicio" value="${hoy}">
                </div>
                <div class="field">
                    <label class="field-label">Fecha fin</label>
                    <input class="field-input" type="date" id="inc-fin" value="${hoy}">
                </div>
            </div>
            <div class="field">
                <label class="field-label">Días calculados</label>
                <input class="field-input" type="text" id="inc-dias" readonly value="1">
            </div>
            <div class="field">
                <label class="field-label">Diagnóstico general</label>
                <input class="field-input" type="text" id="inc-diagnostico" placeholder="Ej: Infección respiratoria">
            </div>
            <div class="field">
                <label class="field-label">Entidad médica</label>
                <input class="field-input" type="text" id="inc-entidad" placeholder="Ej: Clínica Central">
            </div>
            <div class="field">
                <label class="field-label">Observaciones (opcional)</label>
                <textarea class="field-textarea" id="inc-obs" placeholder="Información adicional..."></textarea>
            </div>
        `,
        pie: `
            <button class="btn btn-secondary" data-modal-close>Cancelar</button>
            <button class="btn btn-primary" id="btn-guardar-inc">Enviar solicitud</button>
        `
    });

    // Calcular días automáticamente
    const inputInicio = document.getElementById('inc-inicio');
    const inputFin    = document.getElementById('inc-fin');
    const inputDias   = document.getElementById('inc-dias');

    function actualizarDias() {
        const dias = calcularDias(inputInicio.value, inputFin.value);
        inputDias.value = dias > 0 ? dias : '—';
    }

    inputInicio.addEventListener('change', actualizarDias);
    inputFin.addEventListener('change', actualizarDias);

    document.getElementById('btn-guardar-inc').addEventListener('click', async () => {
        const errorEl = document.getElementById('form-inc-error');
        errorEl.classList.add('hidden');

        const data = {
            empleado_id:       empleado.id,
            tipo:              document.getElementById('inc-tipo').value,
            fecha_inicio:      inputInicio.value,
            fecha_fin:         inputFin.value,
            diagnostico_general: document.getElementById('inc-diagnostico').value.trim(),
            entidad_medica:    document.getElementById('inc-entidad').value.trim(),
            observaciones:     document.getElementById('inc-obs').value.trim()
        };

        if (!data.tipo || !data.fecha_inicio || !data.fecha_fin || !data.diagnostico_general || !data.entidad_medica) {
            errorEl.textContent = 'Completa todos los campos obligatorios.';
            errorEl.classList.remove('hidden');
            return;
        }

        const btn = document.getElementById('btn-guardar-inc');
        btn.classList.add('btn-loading');
        btn.disabled = true;

        try {
            await createIncapacidad(data);
            closeModal();
            toastExito('Solicitud enviada', 'Tu incapacidad fue registrada correctamente.');
            if (onSuccess) await onSuccess();
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.classList.remove('hidden');
            btn.classList.remove('btn-loading');
            btn.disabled = false;
        }
    });
}

function abrirDetalleIncapacidad(inc) {
    openModal({
        titulo: 'Detalle de incapacidad',
        cuerpo: `
            <div class="detail-row"><span class="detail-key">Tipo</span><span class="detail-val">${LABELS_TIPO_INCAPACIDAD[inc.tipo] || inc.tipo}</span></div>
            <div class="detail-row"><span class="detail-key">Estado</span><span class="detail-val">${badgeEstado(inc.estado)}</span></div>
            <div class="detail-row"><span class="detail-key">Fecha inicio</span><span class="detail-val">${formatFecha(inc.fecha_inicio)}</span></div>
            <div class="detail-row"><span class="detail-key">Fecha fin</span><span class="detail-val">${formatFecha(inc.fecha_fin)}</span></div>
            <div class="detail-row"><span class="detail-key">Días</span><span class="detail-val">${inc.dias_incapacidad}</span></div>
            <div class="detail-row"><span class="detail-key">Diagnóstico</span><span class="detail-val">${inc.diagnostico_general}</span></div>
            <div class="detail-row"><span class="detail-key">Entidad médica</span><span class="detail-val">${inc.entidad_medica}</span></div>
            ${inc.observaciones ? `<div class="detail-row"><span class="detail-key">Observaciones</span><span class="detail-val">${inc.observaciones}</span></div>` : ''}
        `,
        pie: `<button class="btn btn-secondary" data-modal-close>Cerrar</button>`
    });
}

function abrirHistorialPanel(lista) {
    openPanel({
        titulo: 'Mi historial de incapacidades',
        cuerpo: lista.length === 0
            ? renderEmpty('Sin registros', 'No tienes incapacidades registradas aún.')
            : lista.map(inc => `
                <div class="inc-item">
                    <div class="inc-item-header">
                        <span class="inc-item-tipo">${LABELS_TIPO_INCAPACIDAD[inc.tipo] || inc.tipo}</span>
                        ${badgeEstado(inc.estado)}
                    </div>
                    <div class="inc-item-periodo">
                        ${formatFechaCorta(inc.fecha_inicio)} — ${formatFechaCorta(inc.fecha_fin)} &middot; ${inc.dias_incapacidad} días
                    </div>
                    <div class="inc-item-entidad">${inc.entidad_medica}</div>
                    <div class="inc-item-divider"></div>
                </div>
            `).join('')
    });
}
