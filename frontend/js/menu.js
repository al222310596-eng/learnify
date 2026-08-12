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

function cargarInfoUsuarioEnMenu() {
    const usuario = JSON.parse(localStorage.getItem('usuario'));
    
    if (!usuario) {
        window.location.href = '../iniciar_sesion.html';
        return;
    }
    
    // Mostrar información en el menú
    const userInfoSidebar = document.getElementById('userInfoSidebar');
    if (userInfoSidebar) {
        // Determinar el avatar (foto o inicial)
        let avatarHtml = '';
        if (usuario.foto_url) {
            avatarHtml = `<div class="user-avatar" id="userAvatar" style="cursor: pointer; background-image: url('${usuario.foto_url}'); background-size: cover; background-position: center;"></div>`;
        } else {
            avatarHtml = `<div class="user-avatar" id="userAvatar" style="cursor: pointer;">${usuario.nombre.charAt(0).toUpperCase()}</div>`;
        }
        
        userInfoSidebar.innerHTML = `
            ${avatarHtml}
            <div class="user-details" style="cursor: pointer;" id="userDetails">
                <span class="user-name">${escapeHtml(usuario.nombre)}</span>
                <span class="user-role">${usuario.rol === 'maestro' ? '<i class="fas fa-chalkboard-teacher"></i> Maestro' : '<i class="fas fa-user-graduate"></i> Alumno'}</span>
            </div>
        `;
        
        // Agregar evento de clic
        const userAvatar = document.getElementById('userAvatar');
        const userDetails = document.getElementById('userDetails');
        
        const abrirModal = () => {
            abrirModalEditarPerfil();
        };
        
        if (userAvatar) userAvatar.onclick = abrirModal;
        if (userDetails) userDetails.onclick = abrirModal;
    }
    
    // Mostrar botón "Crear Equipo" solo para maestros
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
// CARGAR MODAL DE PERFIL (desde archivo externo)
// ============================================

let modalCargado = false;

function asegurarModalCargado() {
    return new Promise((resolve) => {
        // Si ya existe el modal en el DOM
        if (document.getElementById('modalEditarPerfil')) {
            console.log('✅ Modal ya existe en DOM');
            // Asegurar que los eventos estén configurados
            if (!modalCargado) {
                configurarEventosModal();
                modalCargado = true;
            }
            resolve();
            return;
        }
        
        console.log('📥 Cargando modal desde archivo...');
        fetch('/modal_editar_perfil.html')
            .then(response => response.text())
            .then(html => {
                document.body.insertAdjacentHTML('beforeend', html);
                console.log('✅ Modal insertado en DOM');
                modalCargado = true;
                // Esperar un poco a que el DOM se actualice
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

function configurarEventosModal() {
    console.log('🔧 Configurando eventos del modal...');
    
    // Pequeño retraso para asegurar que los elementos existen
    setTimeout(() => {
        const btnSubirFoto = document.getElementById('btnSubirFoto');
        const inputFoto = document.getElementById('inputFoto');
        
        console.log('🔍 btnSubirFoto:', btnSubirFoto ? '✅ encontrado' : '❌ no encontrado');
        console.log('🔍 inputFoto:', inputFoto ? '✅ encontrado' : '❌ no encontrado');
        
        if (btnSubirFoto && inputFoto) {
            // Remover eventos anteriores clonando (evita duplicados)
            const nuevoBtn = btnSubirFoto.cloneNode(true);
            const nuevoInput = inputFoto.cloneNode(true);
            btnSubirFoto.parentNode.replaceChild(nuevoBtn, btnSubirFoto);
            inputFoto.parentNode.replaceChild(nuevoInput, inputFoto);
            
            const btnFinal = document.getElementById('btnSubirFoto');
            const inputFinal = document.getElementById('inputFoto');
            
            btnFinal.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🖱️ Click en botón subir foto - abriendo selector');
                inputFinal.click();
            };
            
            inputFinal.onchange = async function(e) {
                const archivo = e.target.files[0];
                console.log('📁 Archivo seleccionado:', archivo ? archivo.name : 'ninguno');
                if (!archivo) return;
                
                const usuario = JSON.parse(localStorage.getItem('usuario'));
                if (!usuario) {
                    console.log('❌ Usuario no encontrado en localStorage');
                    return;
                }
                
                const formData = new FormData();
                formData.append('foto', archivo);
                formData.append('usuario_id', usuario._id);
                
                const userAvatar = document.querySelector('#userInfoSidebar .user-avatar');
                const originalContent = userAvatar ? userAvatar.innerHTML : '';
                if (userAvatar) {
                    userAvatar.innerHTML = '<i class="fas fa-spinner fa-pulse"></i>';
                }
                
                try {
                    const respuesta = await fetch('/api/usuarios/subir-foto', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const resultado = await respuesta.json();
                    console.log('📡 Respuesta del servidor:', resultado);
                    
                    if (resultado.exito) {
                        const avatarPreview = document.getElementById('avatarPreview');
                        if (avatarPreview) {
                            avatarPreview.style.backgroundImage = `url(${resultado.foto_url}?t=${Date.now()})`;
                            avatarPreview.style.backgroundSize = 'cover';
                            avatarPreview.style.backgroundPosition = 'center';
                            avatarPreview.innerHTML = '';
                        }
                        
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
                        mostrarMensaje('error', resultado.mensaje);
                        if (userAvatar) {
                            userAvatar.innerHTML = originalContent;
                        }
                    }
                } catch (error) {
                    console.error('❌ Error en fetch:', error);
                    mostrarMensaje('error', 'Error de conexión al servidor');
                    if (userAvatar) {
                        userAvatar.innerHTML = originalContent;
                    }
                }
            };
            
            console.log('✅ Eventos configurados correctamente');
        } else {
            console.error('❌ No se encontraron btnSubirFoto o inputFoto');
        }
    }, 50);
}

// ============================================
// EDITAR PERFIL
// ============================================

let usuarioActual = null;

async function abrirModalEditarPerfil() {
    const usuario = JSON.parse(localStorage.getItem('usuario'));
    if (!usuario) return;
    
    usuarioActual = usuario;
    
    // Asegurar que el modal está cargado antes de mostrarlo
    await asegurarModalCargado();
    
    // Esperar a que los elementos existan
    const esperarElementos = () => {
        const editNombre = document.getElementById('editNombre');
        const modal = document.getElementById('modalEditarPerfil');
        
        if (!editNombre || !modal) {
            setTimeout(esperarElementos, 50);
            return;
        }
        
        // Cargar datos actuales
        editNombre.value = usuario.nombre;
        document.getElementById('editEmail').value = usuario.email;
        document.getElementById('editPassword').value = '';
        document.getElementById('confirmPassword').value = '';
        
        // Cargar foto
        const avatarPreview = document.getElementById('avatarPreview');
        if (avatarPreview) {
            if (usuario.foto_url) {
                avatarPreview.style.backgroundImage = `url(${usuario.foto_url})`;
                avatarPreview.style.backgroundSize = 'cover';
                avatarPreview.style.backgroundPosition = 'center';
                avatarPreview.innerHTML = '';
            } else {
                avatarPreview.style.backgroundImage = 'none';
                avatarPreview.innerHTML = '<i class="fas fa-user"></i>';
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

async function guardarCambiosPerfil() {
    const nuevoNombre = document.getElementById('editNombre').value.trim();
    const nuevoEmail = document.getElementById('editEmail').value.trim();
    const nuevaPassword = document.getElementById('editPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!nuevoNombre || !nuevoEmail) {
        mostrarMensaje('error', 'Nombre y correo son obligatorios');
        return;
    }
    
    if (nuevaPassword !== confirmPassword) {
        mostrarMensaje('error', 'Las contraseñas no coinciden');
        return;
    }
    
    const datosActualizar = {
        usuario_id: usuarioActual._id,
        nombre: nuevoNombre,
        email: nuevoEmail
    };
    
    if (nuevaPassword) {
        if (nuevaPassword.length < 6) {
            mostrarMensaje('error', 'La contraseña debe tener al menos 6 caracteres');
            return;
        }
        datosActualizar.password = nuevaPassword;
    }
    
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
            
            setTimeout(() => location.reload(), 1500);
        } else {
            mostrarMensaje('error', resultado.mensaje);
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('error', 'Error de conexión');
    }
}

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
// TOGGLE DE TEMA (CLARO/OSCURO)
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
        
        // Insertar antes del botón de cerrar sesión
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

// Ejecutar al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    cargarInfoUsuarioEnMenu();
    loadTheme();
    agregarBotonTema();
});

// ============================================
// EXPONER FUNCIONES GLOBALMENTE
// ============================================

// Asegurar que loadTheme esté disponible globalmente
window.loadTheme = loadTheme;
window.toggleTheme = toggleTheme;
window.cargarInfoUsuarioEnMenu = cargarInfoUsuarioEnMenu;