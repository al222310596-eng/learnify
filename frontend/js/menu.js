// ============================================
// menu.js - Lógica del menú lateral (reutilizable)
// ============================================

// Aplicar tema inmediatamente
(function() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
})();

// Variable global del usuario actual
let usuarioActual = null;

// ============================================
// CARGAR INFO DEL USUARIO EN EL SIDEBAR
// ============================================

function cargarInfoUsuarioEnMenu() {
    const usuario = JSON.parse(localStorage.getItem('usuario'));

    if (!usuario) {
        console.warn('⚠️ No hay usuario en localStorage');
        return;
    }

    const userInfoSidebar = document.getElementById('userInfoSidebar');
    if (!userInfoSidebar) {
        console.warn('⚠️ No existe #userInfoSidebar en el DOM');
        return;
    }

    // Avatar: foto o inicial
    let avatarHtml = '';
    if (usuario.foto_url) {
        avatarHtml = `<div class="user-avatar" id="userAvatar" style="cursor: pointer; background-image: url('${usuario.foto_url}'); background-size: cover; background-position: center;"></div>`;
    } else {
        const inicial = (usuario.nombre || 'U').charAt(0).toUpperCase();
        avatarHtml = `<div class="user-avatar" id="userAvatar" style="cursor: pointer;">${inicial}</div>`;
    }

    userInfoSidebar.innerHTML = `
        ${avatarHtml}
        <div class="user-details" style="cursor: pointer;" id="userDetails">
            <span class="user-name">${escapeHtml(usuario.nombre || 'Usuario')}</span>
            <span class="user-role">${usuario.rol === 'maestro' ? '<i class="fas fa-chalkboard-teacher"></i> Maestro' : '<i class="fas fa-user-graduate"></i> Alumno'}</span>
        </div>
    `;

    // Evento clic → abrir modal
    const userAvatar = document.getElementById('userAvatar');
    const userDetails = document.getElementById('userDetails');

    const abrirModal = () => abrirModalEditarPerfil();

    if (userAvatar) userAvatar.onclick = abrirModal;
    if (userDetails) userDetails.onclick = abrirModal;

    // Botón crear equipo (solo maestros)
    const btnCrearEquipo = document.getElementById('menuCrearEquipo');
    if (btnCrearEquipo && usuario.rol === 'maestro') {
        btnCrearEquipo.style.display = 'flex';
        btnCrearEquipo.href = '../pages/crear_equipo.html';
    }
}

function escapeHtml(texto) {
    if (!texto) return '';
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}

// ============================================
// CARGAR MODAL DESDE ARCHIVO EXTERNO
// ============================================

let modalCargado = false;

function asegurarModalCargado() {
    return new Promise((resolve) => {
        if (document.getElementById('modalEditarPerfil')) {
            if (!modalCargado) {
                configurarEventosModal();
                modalCargado = true;
            }
            resolve();
            return;
        }

        fetch('/modal_editar_perfil.html')
            .then(response => response.text())
            .then(html => {
                document.body.insertAdjacentHTML('beforeend', html);
                modalCargado = true;
                setTimeout(() => {
                    configurarEventosModal();
                    resolve();
                }, 100);
            })
            .catch(error => {
                console.error('❌ Error al cargar modal:', error);
                resolve();
            });
    });
}

// ============================================
// EVENTOS DEL MODAL (SUBIR FOTO, QUITAR FOTO)
// ============================================

function configurarEventosModal() {
    setTimeout(() => {
        const btnSubirFoto = document.getElementById('btnSubirFoto');
        const inputFoto = document.getElementById('inputFoto');
        const btnQuitarFoto = document.getElementById('btnQuitarFoto');

        if (btnSubirFoto && inputFoto) {
            const nuevoBtn = btnSubirFoto.cloneNode(true);
            const nuevoInput = inputFoto.cloneNode(true);
            btnSubirFoto.parentNode.replaceChild(nuevoBtn, btnSubirFoto);
            inputFoto.parentNode.replaceChild(nuevoInput, inputFoto);

            const btnFinal = document.getElementById('btnSubirFoto');
            const inputFinal = document.getElementById('inputFoto');

            btnFinal.onclick = (e) => {
                e.preventDefault();
                inputFinal.click();
            };

            inputFinal.onchange = async function(e) {
                const archivo = e.target.files[0];
                if (!archivo) return;

                const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];
                if (!tiposPermitidos.includes(archivo.type)) {
                    mostrarMensaje('error', 'Formato no válido. Usa JPG, PNG o WEBP');
                    inputFinal.value = '';
                    return;
                }

                if (archivo.size > 2 * 1024 * 1024) {
                    mostrarMensaje('error', 'La imagen no debe superar 2 MB');
                    inputFinal.value = '';
                    return;
                }

                const usuario = JSON.parse(localStorage.getItem('usuario'));
                if (!usuario) return;

                const formData = new FormData();
                formData.append('foto', archivo);
                formData.append('usuario_id', usuario._id);

                const avatarPreview = document.getElementById('avatarPreview');
                const originalContent = avatarPreview ? avatarPreview.innerHTML : '';
                if (avatarPreview) {
                    avatarPreview.innerHTML = '<i class="fas fa-spinner fa-pulse"></i>';
                }

                try {
                    const respuesta = await fetch('/api/usuarios/subir-foto', {
                        method: 'POST',
                        body: formData
                    });
                    const resultado = await respuesta.json();

                    if (resultado.exito) {
                        if (avatarPreview) {
                            avatarPreview.style.backgroundImage = `url(${resultado.foto_url}?t=${Date.now()})`;
                            avatarPreview.style.backgroundSize = 'cover';
                            avatarPreview.style.backgroundPosition = 'center';
                            avatarPreview.innerHTML = '';
                        }

                        const btnQuitar = document.getElementById('btnQuitarFoto');
                        if (btnQuitar) btnQuitar.style.display = 'inline-flex';

                        const userAvatar = document.querySelector('#userInfoSidebar .user-avatar');
                        if (userAvatar) {
                            userAvatar.style.backgroundImage = `url(${resultado.foto_url}?t=${Date.now()})`;
                            userAvatar.style.backgroundSize = 'cover';
                            userAvatar.style.backgroundPosition = 'center';
                            userAvatar.innerHTML = '';
                        }

                        usuario.foto_url = resultado.foto_url;
                        localStorage.setItem('usuario', JSON.stringify(usuario));

                        mostrarMensaje('exito', 'Foto actualizada correctamente');
                    } else {
                        mostrarMensaje('error', resultado.mensaje || 'Error al subir foto');
                        if (avatarPreview) avatarPreview.innerHTML = originalContent;
                    }
                } catch (error) {
                    console.error(' Error:', error);
                    mostrarMensaje('error', 'Error de conexión al servidor');
                    if (avatarPreview) avatarPreview.innerHTML = originalContent;
                }
            };
        }

        if (btnQuitarFoto) {
            btnQuitarFoto.onclick = async () => {
                const usuario = JSON.parse(localStorage.getItem('usuario'));
                if (!usuario || !usuario.foto_url) return;

                if (!confirm('¿Quitar la foto de perfil?')) return;

                btnQuitarFoto.disabled = true;
                const textoOriginal = btnQuitarFoto.innerHTML;
                btnQuitarFoto.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Quitando...';

                try {
                    const respuesta = await fetch('/api/usuarios/eliminar-foto', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ usuario_id: usuario._id })
                    });

                    const resultado = await respuesta.json();

                    if (resultado.exito) {
                        usuario.foto_url = null;
                        localStorage.setItem('usuario', JSON.stringify(usuario));

                        const avatarPreview = document.getElementById('avatarPreview');
                        if (avatarPreview) {
                            avatarPreview.style.backgroundImage = 'none';
                            avatarPreview.innerHTML = '<i class="fas fa-user"></i>';
                        }

                        const userAvatar = document.querySelector('#userInfoSidebar .user-avatar');
                        if (userAvatar) {
                            userAvatar.style.backgroundImage = 'none';
                            userAvatar.innerHTML = usuario.nombre.charAt(0).toUpperCase();
                        }

                        btnQuitarFoto.style.display = 'none';
                        mostrarMensaje('exito', 'Foto eliminada correctamente');
                    } else {
                        mostrarMensaje('error', resultado.mensaje || 'Error al eliminar la foto');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    mostrarMensaje('error', 'Error de conexión al eliminar la foto');
                } finally {
                    btnQuitarFoto.disabled = false;
                    btnQuitarFoto.innerHTML = textoOriginal;
                }
            };
        }
    }, 100);  
}              
// ABRIR / CERRAR MODAL
// ============================================

async function abrirModalEditarPerfil() {
    const usuario = JSON.parse(localStorage.getItem('usuario'));
    if (!usuario) return;

    usuarioActual = usuario;

    await asegurarModalCargado();

    const esperarElementos = () => {
        const editNombre = document.getElementById('editNombre');
        const modal = document.getElementById('modalEditarPerfil');

        if (!editNombre || !modal) {
            setTimeout(esperarElementos, 50);
            return;
        }

        editNombre.value = usuario.nombre || '';
        document.getElementById('editEmail').value = usuario.email || '';

        const editTelefono = document.getElementById('editTelefono');
        if (editTelefono) editTelefono.value = usuario.telefono || '';

        document.getElementById('editPassword').value = '';
        document.getElementById('confirmPassword').value = '';

        limpiarErroresFormulario();

        const avatarPreview = document.getElementById('avatarPreview');
        const btnQuitarFoto = document.getElementById('btnQuitarFoto');

        if (avatarPreview) {
            if (usuario.foto_url) {
                avatarPreview.style.backgroundImage = `url(${usuario.foto_url})`;
                avatarPreview.style.backgroundSize = 'cover';
                avatarPreview.style.backgroundPosition = 'center';
                avatarPreview.innerHTML = '';
                if (btnQuitarFoto) btnQuitarFoto.style.display = 'inline-flex';
            } else {
                avatarPreview.style.backgroundImage = 'none';
                avatarPreview.innerHTML = '<i class="fas fa-user"></i>';
                if (btnQuitarFoto) btnQuitarFoto.style.display = 'none';
            }
        }

        modal.style.display = 'flex';
    };

    esperarElementos();
}

function cerrarModalPerfil() {
    const modal = document.getElementById('modalEditarPerfil');
    if (modal) modal.style.display = 'none';
}

// ============================================
// VALIDACIONES
// ============================================

function mostrarError(campo, mensaje) {
    const input = document.getElementById(campo);
    const errorId = 'error' + campo.replace('edit', '').replace('confirm', 'Confirm');
    const errorDiv = document.getElementById(errorId);

    if (input) input.classList.add('input-error');
    if (errorDiv) {
        errorDiv.textContent = mensaje;
        errorDiv.classList.add('visible');
    }
}

function limpiarErroresFormulario() {
    document.querySelectorAll('.form-grupo input').forEach(input => {
        input.classList.remove('input-error', 'input-success');
    });
    document.querySelectorAll('.form-error').forEach(el => {
        el.classList.remove('visible');
        el.textContent = '';
    });
}

function validarNombre(valor) {
    const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]{3,60}$/;
    if (!valor) return 'El nombre es obligatorio';
    if (!regex.test(valor)) return 'Solo letras y espacios, mínimo 3 caracteres';
    return null;
}

function validarEmail(valor) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!valor) return 'El correo es obligatorio';
    if (!regex.test(valor)) return 'Correo no válido';
    return null;
}

function validarTelefono(valor) {
    if (!valor) return null;
    const regex = /^\d{10}$/;
    if (!regex.test(valor)) return 'Debe tener exactamente 10 dígitos';
    return null;
}

// ============================================
// GUARDAR CAMBIOS DEL PERFIL
// ============================================

async function guardarCambiosPerfil() {
    limpiarErroresFormulario();

    const nuevoNombre = document.getElementById('editNombre').value.trim();
    const nuevoEmail = document.getElementById('editEmail').value.trim();
    const editTelefono = document.getElementById('editTelefono');
    const nuevoTelefono = editTelefono ? editTelefono.value.trim() : '';
    const nuevaPassword = document.getElementById('editPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    let hayErrores = false;

    const errNombre = validarNombre(nuevoNombre);
    if (errNombre) { mostrarError('editNombre', errNombre); hayErrores = true; }

    const errEmail = validarEmail(nuevoEmail);
    if (errEmail) { mostrarError('editEmail', errEmail); hayErrores = true; }

    const errTel = validarTelefono(nuevoTelefono);
    if (errTel) { mostrarError('editTelefono', errTel); hayErrores = true; }

    if (nuevaPassword || confirmPassword) {
        if (nuevaPassword.length < 6) {
            mostrarError('editPassword', 'Mínimo 6 caracteres');
            hayErrores = true;
        }
        if (nuevaPassword !== confirmPassword) {
            mostrarError('confirmPassword', 'Las contraseñas no coinciden');
            hayErrores = true;
        }
    }

    if (hayErrores) {
        mostrarMensaje('error', 'Revisa los campos marcados en rojo');
        return;
    }

    if (!confirm('¿Guardar los cambios en tu perfil?')) return;

    const btnGuardar = document.getElementById('btnGuardarPerfil');
    const textoOriginal = btnGuardar ? btnGuardar.innerHTML : '';
    if (btnGuardar) {
        btnGuardar.disabled = true;
        btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    }

    const datosActualizar = {
        usuario_id: usuarioActual._id,
        nombre: nuevoNombre,
        email: nuevoEmail,
        telefono: nuevoTelefono || null
    };

    if (nuevaPassword) datosActualizar.password = nuevaPassword;

    try {
        const respuesta = await fetch('/api/usuarios/actualizar', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosActualizar)
        });

        const resultado = await respuesta.json();

        if (resultado.exito) {
            const usuarioActualizado = { ...usuarioActual, ...resultado.usuario };
            localStorage.setItem('usuario', JSON.stringify(usuarioActualizado));

            mostrarMensaje('exito', 'Perfil actualizado correctamente');
            cerrarModalPerfil();
            cargarInfoUsuarioEnMenu();

            const usuarioNombreEl = document.getElementById('usuarioNombre');
            if (usuarioNombreEl) usuarioNombreEl.textContent = usuarioActualizado.nombre;

            setTimeout(() => location.reload(), 1500);
        } else {
            mostrarMensaje('error', resultado.mensaje || 'Error al actualizar');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('error', 'Error de conexión');
    } finally {
        if (btnGuardar) {
            btnGuardar.disabled = false;
            btnGuardar.innerHTML = textoOriginal;
        }
    }
}

// ============================================
// MENSAJES
// ============================================

function mostrarMensaje(tipo, texto) {
    const mensajeDiv = document.getElementById('mensaje');
    if (mensajeDiv) {
        const icono = tipo === 'exito' ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-exclamation-triangle"></i>';
        mensajeDiv.className = `mensaje ${tipo}`;
        mensajeDiv.innerHTML = `${icono} ${texto}`;
        mensajeDiv.style.display = 'block';
        setTimeout(() => mensajeDiv.style.display = 'none', 3000);
    } else {
        alert(texto);
    }
}

// ============================================
// TOGGLE DE TEMA
// ============================================

function toggleTheme() {
    const body = document.body;
    const isDarkMode = body.classList.contains('dark-mode');

    if (isDarkMode) {
        body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
    } else {
        body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
    }
    actualizarIconoTema();
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    actualizarIconoTema();
}

function actualizarIconoTema() {
    const btnTheme = document.getElementById('btnThemeToggle');
    if (btnTheme) {
        const isDarkMode = document.body.classList.contains('dark-mode');
        btnTheme.innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }
}

function agregarBotonTema() {
    const sidebarFooter = document.querySelector('.sidebar-footer');
    if (sidebarFooter && !document.getElementById('btnThemeToggle')) {
        const btnTheme = document.createElement('button');
        btnTheme.id = 'btnThemeToggle';
        btnTheme.className = 'btn-theme-toggle';
        btnTheme.innerHTML = '<i class="fas fa-moon"></i>';
        btnTheme.onclick = toggleTheme;

        const btnCerrar = sidebarFooter.querySelector('.btn-cerrar-sesion');
        if (btnCerrar) {
            sidebarFooter.insertBefore(btnTheme, btnCerrar);
        } else {
            sidebarFooter.appendChild(btnTheme);
        }
        actualizarIconoTema();
    }
}

function cerrarSesion() {
    localStorage.removeItem('usuario');
    window.location.href = '/bienvenida.html';
}

// ============================================
// INICIALIZAR
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    cargarInfoUsuarioEnMenu();
    loadTheme();
    agregarBotonTema();
});

// Exponer globalmente
window.loadTheme = loadTheme;
window.toggleTheme = toggleTheme;
window.cargarInfoUsuarioEnMenu = cargarInfoUsuarioEnMenu;
window.cerrarSesion = cerrarSesion;
window.abrirModalEditarPerfil = abrirModalEditarPerfil;
window.cerrarModalPerfil = cerrarModalPerfil;
window.guardarCambiosPerfil = guardarCambiosPerfil;