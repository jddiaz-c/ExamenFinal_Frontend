document.getElementById('btn-login').addEventListener('click', async () => {
    const usuario = document.getElementById('usuario').value.trim();
    const contrasena = document.getElementById('contrasena').value.trim();
    const errorMsg = document.getElementById('error-msg');
    const btn = document.getElementById('btn-login');

    errorMsg.style.display = 'none';

    if (!usuario || !contrasena) {
        errorMsg.textContent = 'Por favor completa todos los campos.';
        errorMsg.style.display = 'block';
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Ingresando...';

    try {
        const data = await authApi.login({ usuario, contrasena });
        Auth.guardarSesion(data.token, data.usuario);
        window.location.href = 'dashboard.html';
    } catch (error) {
        errorMsg.textContent = error.message;
        errorMsg.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Iniciar sesión';
    }
});

document.getElementById('contrasena').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('btn-login').click();
    }
});