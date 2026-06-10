const Auth = {
  getToken() {
    return localStorage.getItem("token");
  },

  getUsuario() {
    const usuario = localStorage.getItem("usuario");
    return usuario ? JSON.parse(usuario) : null;
  },

  guardarSesion(token, usuario) {
    localStorage.setItem("token", token);
    localStorage.setItem("usuario", JSON.stringify(usuario));
  },

  cerrarSesion() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    window.location.href = "index.html";
  },

  verificarSesion() {
    if (!this.getToken()) {
      window.location.href = "index.html";
    }
  },

  mostrarUsuario() {
    const usuario = this.getUsuario();
    if (!usuario) return;

    const iniciales = usuario.nombre
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    const avatarEl = document.getElementById("user-avatar");
    const nombreEl = document.getElementById("user-nombre");
    const rolEl = document.getElementById("user-rol");

    if (avatarEl) avatarEl.textContent = iniciales;
    if (nombreEl) nombreEl.textContent = usuario.nombre;
    if (rolEl) rolEl.textContent = usuario.rol;
  },
  verificarAdmin() {
    const usuario = this.getUsuario();
    if (!usuario || usuario.rol !== "administrador") {
      window.location.href = "dashboard.html";
    }
  },

  ocultarSiNoEsAdmin() {
    const usuario = this.getUsuario();
    const navUsuarios = document.getElementById("nav-usuarios");
    if (navUsuarios && usuario?.rol !== "administrador") {
      navUsuarios.style.display = "none";
    }
  },
};
