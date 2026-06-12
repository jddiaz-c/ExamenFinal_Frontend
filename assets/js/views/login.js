import { login } from '../api/auth.api.js';
import { setToken, setUsuario, persistirUsuario } from '../store.js';
import { $, show, hide } from '../utils/dom.js';

export function initLogin(onSuccess) {
    const form     = $('#login-form');
    const errorEl  = $('#login-error');

    // Limpiar listeners anteriores
    const formClone = form.cloneNode(true);
    form.parentNode.replaceChild(formClone, form);

    const btnLogin = formClone.querySelector('#login-btn');

    formClone.addEventListener('submit', async (e) => {
        e.preventDefault();

        const usuario    = formClone.querySelector('#login-usuario').value.trim();
        const contrasena = formClone.querySelector('#login-contrasena').value.trim();

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