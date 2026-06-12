import { updateUsuario } from '../api/auth.api.js';
import { getUsuario, setUsuario, persistirUsuario } from '../store.js';
import { badgeRol, LABELS_ROL } from '../utils/format.js';
import { toastExito, toastError } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';
import { getNavigationToken } from '../router.js';

export function renderConfiguracion(container, token) {
    const usuario = getUsuario();

    if (token !== getNavigationToken()) return;
    container.innerHTML = `
        <div class="section-header">
            <div>
                <div class="section-title">Configuración</div>
                <div class="section-subtitle">Ajusta tu cuenta y preferencias</div>
            </div>
        </div>

        <div class="config-layout">
            <div class="config-section">
                <div class="config-section-header">
                    <div class="config-section-title">Mi cuenta</div>
                    <div class="config-section-desc">Información básica de tu perfil</div>
                </div>
                <div class="config-section-body">
                    <div class="config-info-row">
                        <span class="config-info-key">Nombre</span>
                        <span class="config-info-val">${usuario.nombre}</span>
                    </div>
                    <div class="config-info-row">
                        <span class="config-info-key">Correo</span>
                        <span class="config-info-val">${usuario.correo}</span>
                    </div>
                    <div class="config-info-row">
                        <span class="config-info-key">Rol</span>
                        <span class="config-info-val">${badgeRol(usuario.rol)}</span>
                    </div>
                    <div class="text-meta">
                        El correo y el rol no pueden modificarse desde aquí.
                    </div>
                </div>
            </div>

            <div class="config-section">
                <div class="config-section-header">
                    <div class="config-section-title">Cambiar nombre de usuario</div>
                    <div class="config-section-desc">Tu nombre de usuario aparece en los registros del sistema</div>
                </div>
                <div class="config-section-body">
                    <div class="field">
                        <label class="field-label">Nuevo nombre de usuario</label>
                        <input class="field-input" type="text" id="cfg-usuario" placeholder="Ingresa el nuevo usuario">
                    </div>
                    <div id="cfg-usr-error" class="alert alert-error hidden"></div>
                    <button class="btn btn-primary btn-sm" id="btn-cambiar-usuario">Guardar usuario</button>
                </div>
            </div>

            <div class="config-section">
                <div class="config-section-header">
                    <div class="config-section-title">Cambiar contraseña</div>
                    <div class="config-section-desc">Elige una contraseña segura que no uses en otros servicios</div>
                </div>
                <div class="config-section-body">
                    <div class="field">
                        <label class="field-label">Nueva contraseña</label>
                        <input class="field-input" type="password" id="cfg-pass1" placeholder="Nueva contraseña">
                    </div>
                    <div class="field">
                        <label class="field-label">Confirmar contraseña</label>
                        <input class="field-input" type="password" id="cfg-pass2" placeholder="Repite la contraseña">
                    </div>
                    <div id="cfg-pass-error" class="alert alert-error hidden"></div>
                    <button class="btn btn-primary btn-sm" id="btn-cambiar-pass">Cambiar contraseña</button>
                </div>
            </div>

            <div class="config-section">
                <div class="config-section-header">
                    <div class="config-section-title">Apariencia</div>
                    <div class="config-section-desc">Cambia entre modo claro y oscuro</div>
                </div>
                <div class="config-section-body">
                    <div class="config-row">
                        <div>
                            <div class="config-label">Modo oscuro</div>
                            <div class="config-sublabel">Cambia el tema de la interfaz</div>
                        </div>
                        <button class="btn btn-secondary btn-sm" id="btn-toggle-tema">
                            ${document.documentElement.getAttribute('data-theme') === 'dark' ? 'Cambiar a claro' : 'Cambiar a oscuro'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Cambiar usuario
    container.querySelector('#btn-cambiar-usuario').addEventListener('click', async () => {
        const errorEl = container.querySelector('#cfg-usr-error');
        errorEl.classList.add('hidden');

        const nuevoUsuario = container.querySelector('#cfg-usuario').value.trim();
        if (!nuevoUsuario) {
            errorEl.textContent = 'Ingresa el nuevo nombre de usuario.';
            errorEl.classList.remove('hidden');
            return;
        }

        const btn = container.querySelector('#btn-cambiar-usuario');
        btn.classList.add('btn-loading');
        btn.disabled = true;

        try {
            await updateUsuario(usuario.id, { usuario: nuevoUsuario });
            const actualizado = { ...usuario, usuario: nuevoUsuario };
            setUsuario(actualizado);
            persistirUsuario(actualizado);
            toastExito('Usuario actualizado', `Tu nombre de usuario es ahora "${nuevoUsuario}".`);
            container.querySelector('#cfg-usuario').value = '';
        } catch (err) {
            if (token !== getNavigationToken()) return;
            errorEl.textContent = err.message;
            errorEl.classList.remove('hidden');
        } finally {
            btn.classList.remove('btn-loading');
            btn.disabled = false;
        }
    });

    // Cambiar contraseña
    container.querySelector('#btn-cambiar-pass').addEventListener('click', async () => {
        const errorEl = container.querySelector('#cfg-pass-error');
        errorEl.classList.add('hidden');

        const pass1 = container.querySelector('#cfg-pass1').value.trim();
        const pass2 = container.querySelector('#cfg-pass2').value.trim();

        if (!pass1 || !pass2) {
            errorEl.textContent = 'Completa ambos campos.';
            errorEl.classList.remove('hidden');
            return;
        }
        if (pass1 !== pass2) {
            errorEl.textContent = 'Las contraseñas no coinciden.';
            errorEl.classList.remove('hidden');
            return;
        }
        if (pass1.length < 4) {
            errorEl.textContent = 'La contraseña debe tener al menos 4 caracteres.';
            errorEl.classList.remove('hidden');
            return;
        }

        const btn = container.querySelector('#btn-cambiar-pass');
        btn.classList.add('btn-loading');
        btn.disabled = true;

        try {
            await updateUsuario(usuario.id, { contrasena: pass1 });
            toastExito('Contraseña actualizada', 'Tu contraseña fue cambiada correctamente.');
            container.querySelector('#cfg-pass1').value = '';
            container.querySelector('#cfg-pass2').value = '';
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.classList.remove('hidden');
        } finally {
            btn.classList.remove('btn-loading');
            btn.disabled = false;
        }
    });

    // Toggle tema
    container.querySelector('#btn-toggle-tema').addEventListener('click', () => {
        const html = document.documentElement;
        const esOscuro = html.getAttribute('data-theme') === 'dark';
        html.setAttribute('data-theme', esOscuro ? 'light' : 'dark');
        localStorage.setItem('tema', esOscuro ? 'light' : 'dark');
        container.querySelector('#btn-toggle-tema').textContent = esOscuro ? 'Cambiar a oscuro' : 'Cambiar a claro';
    });
}
