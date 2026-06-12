Auth.verificarSesion();
Auth.mostrarUsuario();
Auth.ocultarSiNoEsAdmin();

let todasLasIncapacidades = [];
let todosLosEmpleados = [];
let incapacidadEditandoId = null;
let estadoIncapacidadId = null;

document.getElementById('btn-logout').addEventListener('click', async () => {
    try { await authApi.logout(); } catch (e) {}
    finally { Auth.cerrarSesion(); }
});

// CARGAR
async function cargarDatos() {
    try {
        [todasLasIncapacidades, todosLosEmpleados] = await Promise.all([
            incapacidadesApi.getAll(),
            empleadosApi.getAll()
        ]);
        renderizarIncapacidades(todasLasIncapacidades);
        cargarEmpleadosSelect();
    } catch (e) {
        document.getElementById('tabla-incapacidades').innerHTML =
            `<tr><td colspan="7" class="center-text td-error">${e.message}</td></tr>`;
    }
}

function nombreEmpleado(id) {
    const e = todosLosEmpleados.find(e => e.id == id);
    return e ? `${e.nombres} ${e.apellidos}` : 'Desconocido';
}

function cargarEmpleadosSelect() {
    const select = document.getElementById('empleado_id');
    select.innerHTML = todosLosEmpleados
        .filter(e => e.estado === 'activo')
        .map(e => `<option value="${e.id}">${e.nombres} ${e.apellidos}</option>`)
        .join('');
}

// FILTRAR
function filtrarIncapacidades() {
    const input = document.getElementById('buscar-input').value.trim().toLowerCase();
    const estado = document.getElementById('filtro-estado').value;
    const tipo = document.getElementById('filtro-tipo').value;
    const fechaInicio = document.getElementById('filtro-fecha-inicio').value;
    const fechaFin = document.getElementById('filtro-fecha-fin').value;


    let resultado = todasLasIncapacidades;

    if (estado) resultado = resultado.filter(i => i.estado === estado);
    if (tipo) resultado = resultado.filter(i => i.tipo === tipo);
    if (input) {
        resultado = resultado.filter(i =>
            nombreEmpleado(i.empleado_id).toLowerCase().includes(input)
        );
    }
    if (fechaInicio && fechaFin) {
    resultado = resultado.filter(i =>
        i.fecha_inicio <= fechaFin && i.fecha_fin >= fechaInicio
    );
}
    renderizarIncapacidades(resultado);
}

document.getElementById('buscar-input').addEventListener('input', filtrarIncapacidades);
document.getElementById('filtro-estado').addEventListener('change', filtrarIncapacidades);
document.getElementById('filtro-tipo').addEventListener('change', filtrarIncapacidades);

// RENDERIZAR
function renderizarIncapacidades(incapacidades) {
    const tbody = document.getElementById('tabla-incapacidades');

    if (incapacidades.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="center-text td-muted">Sin resultados</td></tr>';
        return;
    }

    tbody.innerHTML = incapacidades.map(i => `
        <tr>
            <td>${nombreEmpleado(i.empleado_id)}</td>
            <td>${i.tipo.replaceAll('_', ' ')}</td>
            <td>${i.fecha_inicio}</td>
            <td>${i.fecha_fin}</td>
            <td>${i.dias_incapacidad}</td>
            <td><span class="badge badge-${i.estado}">${i.estado.replaceAll('_', ' ')}</span></td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick='abrirEditar(${JSON.stringify(i)})'>
                    <i class="ti ti-edit" aria-hidden="true"></i>
                </button>
                <button class="btn btn-secondary btn-sm" onclick="abrirCambiarEstado(${i.id}, '${i.estado}')">
                    <i class="ti ti-refresh" aria-hidden="true"></i>
                </button>
                ${i.estado === 'aprobada' ? `
                <button class="btn btn-secondary btn-sm" onclick="finalizar(${i.id})">
                    <i class="ti ti-check" aria-hidden="true"></i>
                </button>` : ''}
            </td>
        </tr>
    `).join('');
}

// MODAL CREAR/EDITAR
function abrirModal(titulo) {
    document.getElementById('modal-titulo').textContent = titulo;
    document.getElementById('modal-incapacidad').classList.add('active');
    document.getElementById('modal-error').style.display = 'none';
}

function cerrarModal() {
    document.getElementById('modal-incapacidad').classList.remove('active');
    limpiarFormulario();
    incapacidadEditandoId = null;
}

function limpiarFormulario() {
    document.getElementById('fecha_inicio').value = '';
    document.getElementById('fecha_fin').value = '';
    document.getElementById('entidad_medica').value = '';
    document.getElementById('diagnostico_general').value = '';
    document.getElementById('observaciones').value = '';
    document.getElementById('tipo').value = 'enfermedad_general';
}

document.getElementById('btn-nueva').addEventListener('click', () => {
    incapacidadEditandoId = null;
    limpiarFormulario();
    abrirModal('Nueva incapacidad');
});

document.getElementById('btn-cerrar-modal').addEventListener('click', cerrarModal);
document.getElementById('btn-cancelar').addEventListener('click', cerrarModal);

function abrirEditar(incapacidad) {
    incapacidadEditandoId = incapacidad.id;
    document.getElementById('fecha_inicio').value = incapacidad.fecha_inicio;
    document.getElementById('fecha_fin').value = incapacidad.fecha_fin;
    document.getElementById('entidad_medica').value = incapacidad.entidad_medica;
    document.getElementById('diagnostico_general').value = incapacidad.diagnostico_general;
    document.getElementById('observaciones').value = incapacidad.observaciones || '';
    abrirModal('Editar incapacidad');
}

// GUARDAR
document.getElementById('btn-guardar').addEventListener('click', async () => {
    const errorEl = document.getElementById('modal-error');
    errorEl.style.display = 'none';

    const empleadoId = document.getElementById('empleado_id').value;
    const fechaInicio = document.getElementById('fecha_inicio').value;
    const fechaFin = document.getElementById('fecha_fin').value;

    // Validar fecha contra fecha de ingreso del empleado
    if (!incapacidadEditandoId) {
        const empleado = todosLosEmpleados.find(e => e.id == empleadoId);
        if (empleado && fechaInicio < empleado.fecha_ingreso) {
            errorEl.textContent = `La fecha de inicio no puede ser anterior a la fecha de ingreso del empleado (${empleado.fecha_ingreso}).`;
            errorEl.style.display = 'block';
            return;
        }
    }

    const data = incapacidadEditandoId
        ? {
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
            observaciones: document.getElementById('observaciones').value.trim()
        }
        : {
            empleado_id: parseInt(empleadoId),
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
            tipo: document.getElementById('tipo').value,
            diagnostico_general: document.getElementById('diagnostico_general').value.trim(),
            entidad_medica: document.getElementById('entidad_medica').value.trim(),
            observaciones: document.getElementById('observaciones').value.trim()
        };

    try {
        if (incapacidadEditandoId) {
            await incapacidadesApi.update(incapacidadEditandoId, data);
        } else {
            await incapacidadesApi.create(data);
        }
        cerrarModal();
        await cargarDatos();
    } catch (e) {
        errorEl.textContent = e.message;
        errorEl.style.display = 'block';
    }
});

// CAMBIAR ESTADO
function abrirCambiarEstado(id, estadoActual) {
    estadoIncapacidadId = id;
    document.getElementById('nuevo-estado').value = estadoActual;
    document.getElementById('modal-estado').classList.add('active');
}

document.getElementById('btn-cerrar-estado').addEventListener('click', () => {
    document.getElementById('modal-estado').classList.remove('active');
});

document.getElementById('btn-cancelar-estado').addEventListener('click', () => {
    document.getElementById('modal-estado').classList.remove('active');
});

document.getElementById('btn-guardar-estado').addEventListener('click', async () => {
    const estado = document.getElementById('nuevo-estado').value;
    try {
        await incapacidadesApi.cambiarEstado(estadoIncapacidadId, { estado });
        document.getElementById('modal-estado').classList.remove('active');
        await cargarDatos();
    } catch (e) {
        alert(e.message);
    }
});

// FINALIZAR
async function finalizar(id) {
    if (!confirm('¿Estás seguro de que deseas finalizar esta incapacidad?')) return;
    try {
        await incapacidadesApi.finalizar(id);
        await cargarDatos();
    } catch (e) {
        alert(e.message);
    }
}

cargarDatos();