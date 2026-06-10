Auth.verificarSesion();
Auth.mostrarUsuario();
Auth.ocultarSiNoEsAdmin();

document.getElementById('btn-logout').addEventListener('click', async () => {
    try {
        await authApi.logout();
    } catch (e) {
        console.error('Error al cerrar sesión:', e);
    } finally {
        Auth.cerrarSesion();
    }
});

async function cargarMetricas() {
    try {
        const empleados = await empleadosApi.getAll();
        const activos = empleados.filter(e => e.estado === 'activo');
        document.getElementById('total-empleados').textContent = activos.length;
    } catch (e) {
        document.getElementById('total-empleados').textContent = '—';
    }

    try {
        const incapacidades = await incapacidadesApi.getAll();
        const activas = incapacidades.filter(i => !['finalizada', 'rechazada'].includes(i.estado));
        const revision = incapacidades.filter(i => i.estado === 'en_revision');
        const aprobadas = incapacidades.filter(i => i.estado === 'aprobada');

        document.getElementById('total-incapacidades').textContent = activas.length;
        document.getElementById('total-revision').textContent = revision.length;
        document.getElementById('total-aprobadas').textContent = aprobadas.length;

        cargarRecientes(incapacidades);
    } catch (e) {
        document.getElementById('total-incapacidades').textContent = '—';
        document.getElementById('total-revision').textContent = '—';
        document.getElementById('total-aprobadas').textContent = '—';
    }
}

async function cargarRecientes(incapacidades) {
    const tbody = document.getElementById('tabla-recientes');
    const recientes = incapacidades.slice(-5).reverse();

    if (recientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="center-text">Sin incapacidades registradas</td></tr>';
        return;
    }

    try {
        const empleados = await empleadosApi.getAll();
        const mapaEmpleados = {};
        empleados.forEach(e => mapaEmpleados[e.id] = `${e.nombres} ${e.apellidos}`);

        tbody.innerHTML = recientes.map(inc => `
            <tr>
                <td>${mapaEmpleados[inc.empleado_id] || 'Desconocido'}</td>
                <td>${inc.tipo.replace('_', ' ')}</td>
                <td>${inc.fecha_inicio}</td>
                <td>${inc.dias_incapacidad}</td>
                <td><span class="badge badge-${inc.estado}">${inc.estado.replace('_', ' ')}</span></td>
            </tr>
        `).join('');
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" class="center-text">Error cargando datos</td></tr>';
    }
}

cargarMetricas();