import { login } from '../api/auth.api.js';
import { setToken, setUsuario, persistirUsuario } from '../store.js';
import { $, show, hide } from '../utils/dom.js';

export function initLogin(onSuccess) {
    const form     = $('#login-form');
    const errorEl  = $('#login-error');
    const btnLogin = $('#login-btn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const usuario    = $('#login-usuario').value.trim();
        const contrasena = $('#login-contrasena').value.trim();

        hide(errorEl);

        if (!usuario || !contrasena) {
            errorEl.textContent = 'Ingresa tu usuario y contraseña.';
            show(errorEl);
            return;
        }

        btnLogin.classList.add('btn-loading');
        btnLogin.disabled = true;

        try {
            const payload = {};

            // Detectar si es correo o usuario
            if (usuario.includes('@')) {
                payload.correo = usuario;
            } else {
                payload.usuario = usuario;
            }
            payload.contrasena = contrasena;

            const res = await login(payload);

            setToken(res.token);
            setUsuario(res.usuario);
            persistirUsuario(res.usuario);

            onSuccess(res.usuario);

        } catch (err) {
            errorEl.textContent = err.message || 'Credenciales incorrectas.';
            show(errorEl);
        } finally {
            btnLogin.classList.remove('btn-loading');
            btnLogin.disabled = false;
        }
    });
}
