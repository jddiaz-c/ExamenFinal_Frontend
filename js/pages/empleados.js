Auth.verificarSesion();
Auth.mostrarUsuario();
Auth.ocultarSiNoEsAdmin();

let empleadoEditandoId = null;
let todosLosEmpleados = [];

document.getElementById('btn-logout').addEventListener('click', async () => {
    try { await authApi.logout(); } catch (e) {}
    finally { Auth.cerrarSesion(); }
});

// CARGAR
async function cargarEmpleados() {
    const tbody = document.getElementById('tabla-empleados');
    tbody.innerHTML = '<tr><td colspan="7" class="center-text">Cargando...</td></tr>';

    try {
        todosLosEmpleados = await empleadosApi.getAll();
        renderizarEmpleados(todosLosEmpleados);
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" class="center-text">Error: ${e.message}</td></tr>`;
    }
}

// FILTRAR
function filtrarEmpleados() {
    const input = document.getElementById('buscar-input').value.trim().toLowerCase();
    const estado = document.getElementById('filtro-estado').value;

    let resultado = todosLosEmpleados;

    if (estado) {
        resultado = resultado.filter(e => e.estado === estado);
    }

    if (input) {
        resultado = resultado.filter(e =>
            e.documento.includes(input) ||
            e.area.toLowerCase().includes(input) ||
            e.nombres.toLowerCase().includes(input) ||
            e.apellidos.toLowerCase().includes(input)
        );
    }

    renderizarEmpleados(resultado);
}

// RENDERIZAR
function renderizarEmpleados(empleados) {
    const tbody = document.getElementById('tabla-empleados');

    if (empleados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="center-text">Sin resultados</td></tr>';
        return;
    }

    tbody.innerHTML = empleados.map(e => `
        <tr>
            <td>${e.nombres} ${e.apellidos}</td>
            <td>${e.documento}</td>
            <td>${e.cargo}</td>
            <td>${e.area}</td>
            <td>${e.fecha_ingreso}</td>
            <td><span class="badge badge-${e.estado}">${e.estado}</span></td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick='abrirEditar(${JSON.stringify(e)})'>
                    <i class="ti ti-edit" aria-hidden="true"></i>
                </button>
                <button class="btn btn-secondary btn-sm" onclick="abrirCambiarEstado(${e.id}, '${e.estado}')">
                    <i class="ti ti-refresh" aria-hidden="true"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

document.getElementById('buscar-input').addEventListener('input', filtrarEmpleados);
document.getElementById('filtro-estado').addEventListener('change', filtrarEmpleados);

// MODAL CREAR/EDITAR
function abrirModal(titulo) {
    document.getElementById('modal-titulo').textContent = titulo;
    document.getElementById('modal-empleado').classList.add('active');
    document.getElementById('modal-error').style.display = 'none';
}

function cerrarModal() {
    document.getElementById('modal-empleado').classList.remove('active');
    limpiarFormulario();
    empleadoEditandoId = null;
}

function limpiarFormulario() {
    ['nombres', 'apellidos', 'documento', 'correo', 'telefono', 'cargo', 'area', 'fecha_ingreso']
        .forEach(id => document.getElementById(id).value = '');
}

document.getElementById('btn-nuevo').addEventListener('click', () => {
    empleadoEditandoId = null;
    limpiarFormulario();
    abrirModal('Nuevo empleado');
});

document.getElementById('btn-cerrar-modal').addEventListener('click', cerrarModal);
document.getElementById('btn-cancelar').addEventListener('click', cerrarModal);

function abrirEditar(empleado) {
    empleadoEditandoId = empleado.id;
    document.getElementById('nombres').value = empleado.nombres;
    document.getElementById('apellidos').value = empleado.apellidos;
    document.getElementById('documento').value = empleado.documento;
    document.getElementById('correo').value = empleado.correo;
    document.getElementById('telefono').value = empleado.telefono;
    document.getElementById('cargo').value = empleado.cargo;
    document.getElementById('area').value = empleado.area;
    document.getElementById('fecha_ingreso').value = empleado.fecha_ingreso;
    abrirModal('Editar empleado');
}

// GUARDAR
document.getElementById('btn-guardar').addEventListener('click', async () => {
    const errorEl = document.getElementById('modal-error');
    errorEl.style.display = 'none';

    const data = {
        nombres: document.getElementById('nombres').value.trim(),
        apellidos: document.getElementById('apellidos').value.trim(),
        documento: document.getElementById('documento').value.trim(),
        correo: document.getElementById('correo').value.trim(),
        telefono: document.getElementById('telefono').value.trim(),
        cargo: document.getElementById('cargo').value.trim(),
        area: document.getElementById('area').value.trim(),
        fecha_ingreso: document.getElementById('fecha_ingreso').value
    };

    try {
        if (empleadoEditandoId) {
            await empleadosApi.update(empleadoEditandoId, data);
        } else {
            await empleadosApi.create(data);
        }
        cerrarModal();
        await cargarEmpleados();
    } catch (e) {
        errorEl.textContent = e.message;
        errorEl.style.display = 'block';
    }
});

// CAMBIAR ESTADO
let estadoEmpleadoId = null;

function abrirCambiarEstado(id, estadoActual) {
    estadoEmpleadoId = id;
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
        await empleadosApi.cambiarEstado(estadoEmpleadoId, { estado });
        document.getElementById('modal-estado').classList.remove('active');
        await cargarEmpleados();
    } catch (e) {
        alert(e.message);
    }
});

cargarEmpleados();