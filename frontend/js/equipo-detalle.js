// ============================================
// ARCHIVO: equipo-detalle.js
// Muestra información detallada de un equipo
// ============================================

const usuario = JSON.parse(localStorage.getItem('usuario'));

// Verificar sesión
if (!usuario) {
    window.location.href = 'iniciar_sesion.html';
}

// Obtener ID del equipo de la URL
const urlParams = new URLSearchParams(window.location.search);
const equipoId = urlParams.get('id');

if (!equipoId) {
    window.location.href = 'mis_equipos.html';
}

// ============================================
// CARGAR DATOS DEL EQUIPO
// ============================================
async function cargarEquipo() {
    const container = document.getElementById('equipoContent');
    
    try {
        const respuesta = await fetch(`/api/equipos/detalle/${equipoId}`);
        const resultado = await respuesta.json();
        
        if (resultado.exito) {
            mostrarEquipo(resultado.equipo);
        } else {
            container.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error al cargar el equipo</h3>
                    <p>${resultado.mensaje || 'Intenta de nuevo más tarde'}</p>
                    <a href="mis_equipos.html" class="btn btn-primary" style="margin-top: 1rem;">
                        <i class="fas fa-arrow-left"></i> Volver a mis equipos
                    </a>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = `
            <div class="error-state">
                <i class="fas fa-wifi"></i>
                <h3>Error de conexión</h3>
                <p>No se pudo conectar con el servidor</p>
                <a href="mis_equipos.html" class="btn btn-primary" style="margin-top: 1rem;">
                    <i class="fas fa-arrow-left"></i> Volver a mis equipos
                </a>
            </div>
        `;
    }
}

// ============================================
// MOSTRAR EQUIPO EN PANTALLA
// ============================================
function mostrarEquipo(equipo) {
    const container = document.getElementById('equipoContent');
    const esLider = usuario._id === equipo.lider_id;
    
    // Obtener inicial del nombre para el avatar
    const getInitial = (nombre) => {
        return nombre ? nombre.charAt(0).toUpperCase() : '?';
    };
    
    container.innerHTML = `
        <!-- Info del equipo -->
        <div class="info-equipo">
            <div class="nombre-equipo">
                <i class="fas fa-users"></i>
                ${escapeHtml(equipo.nombre)}
            </div>
            <div class="descripcion-equipo">
                ${escapeHtml(equipo.descripcion || 'Sin descripción')}
            </div>
            <div class="meta-equipo">
                <div class="meta-item">
                    <i class="fas fa-users"></i>
                    <strong>${equipo.total_miembros}</strong> miembros
                </div>
                <div class="meta-item">
                    <i class="fas fa-crown"></i>
                    Líder: <strong>${escapeHtml(equipo.lider_nombre || 'Tú')}</strong>
                </div>
                <div class="meta-item">
                    <i class="fas fa-calendar-alt"></i>
                    Creado: <strong>${formatearFecha(equipo.fecha_creacion)}</strong>
                </div>
            </div>
        </div>
        
        <!-- Lista de miembros -->
        <div class="miembros-section">
            <div class="miembros-header">
                <h3>
                    <i class="fas fa-user-friends"></i>
                    Miembros del equipo
                    <span class="miembros-count">${equipo.miembros.length}</span>
                </h3>
            </div>
            <div class="miembros-grid">
                ${equipo.miembros.map(miembro => {
                    const esLiderMiembro = equipo.lider_id === miembro.id;
                    const badgeClass = esLiderMiembro ? 'badge-lider' : 'badge-miembro';
                    const badgeText = esLiderMiembro ? '👑 Líder' : '👤 Miembro';
                    
                    return `
                        <div class="miembro-item">
                            <div class="miembro-info">
                                <div class="miembro-avatar">${getInitial(miembro.nombre)}</div>
                                <div>
                                    <div class="miembro-nombre">${escapeHtml(miembro.nombre)}</div>
                                    <div class="miembro-email"><i class="fas fa-envelope"></i> ${escapeHtml(miembro.email)}</div>
                                </div>
                            </div>
                            <span class="miembro-badge ${badgeClass}">${badgeText}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
        
        <!-- Acciones del equipo -->
        <div class="acciones-equipo">
            <button class="btn btn-primary" onclick="abrirChat()">
                <i class="fas fa-comments"></i> Chat del equipo
            </button>
            ${esLider ? `
                <button class="btn btn-primary" onclick="abrirModalAgregar()">
                    <i class="fas fa-user-plus"></i> Invitar miembros
                </button>
                <button class="btn btn-danger" onclick="confirmarEliminarEquipoDetalle('${equipo.id}', '${escapeHtml(equipo.nombre)}')">
                    <i class="fas fa-trash-alt"></i> Eliminar equipo
                </button>
            ` : ''}
            ${!esLider && usuario.rol === 'alumno' ? `
                <button class="btn btn-warning" onclick="confirmarSalirEquipoDetalle('${equipo.id}', '${escapeHtml(equipo.nombre)}')">
                    <i class="fas fa-sign-out-alt"></i> Salir del equipo
                </button>
            ` : ''}
        </div>
    `;
    
    // Guardar código del equipo para el modal
    window.equipoIdActual = equipo.id;
}

// ============================================
// ABRIR MODAL CON CÓDIGO DEL EQUIPO
// ============================================
function abrirModalAgregar() {
    const modal = document.getElementById('modalAgregar');
    const codigoSpan = document.getElementById('equipoIdCodigo');
    
    if (codigoSpan) {
        codigoSpan.textContent = window.equipoIdActual;
    }
    
    modal.style.display = 'flex';
}

function cerrarModal() {
    const modal = document.getElementById('modalAgregar');
    modal.style.display = 'none';
}

// ============================================
// UTILIDADES
// ============================================
function escapeHtml(texto) {
    if (!texto) return '';
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}

function formatearFecha(fecha) {
    if (!fecha) return 'Fecha no disponible';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

// ============================================
// CONFIRMAR SALIR DEL EQUIPO (desde detalle)
// ============================================
function confirmarSalirEquipoDetalle(equipoId, equipoNombre) {
    const modal = document.createElement('div');
    modal.className = 'modal-confirmacion';
    modal.innerHTML = `
        <div class="modal-contenido">
            <h3><i class="fas fa-sign-out-alt"></i> Salir del equipo</h3>
            <p>¿Estás seguro de que quieres salir del equipo <strong>"${escapeHtml(equipoNombre)}"</strong>?</p>
            <p style="color: #d97706; font-size: 0.85rem;">
                <i class="fas fa-info-circle"></i> Podrás volver a unirte más tarde con el ID del equipo.
            </p>
            <div class="modal-botones">
                <button class="btn btn-secondary" onclick="cerrarModalConfirmacion()">
                    <i class="fas fa-times"></i> Cancelar
                </button>
                <button class="btn btn-warning" onclick="salirDelEquipoDetalle('${equipoId}')">
                    <i class="fas fa-sign-out-alt"></i> Salir
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// ============================================
// SALIR DEL EQUIPO (desde detalle)
// ============================================
async function salirDelEquipoDetalle(equipoId) {
    try {
        const respuesta = await fetch(`/api/equipos/salir/${equipoId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario_id: usuario._id })
        });
        
        const resultado = await respuesta.json();
        
        if (resultado.exito) {
            cerrarModalConfirmacion();
            mostrarMensaje('success', '✅ Has salido del equipo');
            setTimeout(() => {
                window.location.href = 'mis_equipos.html';
            }, 1500);
        } else {
            cerrarModalConfirmacion();
            mostrarMensaje('error', '❌ ' + resultado.mensaje);
        }
    } catch (error) {
        cerrarModalConfirmacion();
        mostrarMensaje('error', '❌ Error de conexión');
    }
}

// ============================================
// CONFIRMAR ELIMINAR EQUIPO (desde detalle)
// ============================================
function confirmarEliminarEquipoDetalle(equipoId, equipoNombre) {
    const modal = document.createElement('div');
    modal.className = 'modal-confirmacion';
    modal.innerHTML = `
        <div class="modal-contenido">
            <h3><i class="fas fa-exclamation-triangle"></i> Eliminar equipo</h3>
            <p>¿Estás seguro de que quieres eliminar el equipo <strong>"${escapeHtml(equipoNombre)}"</strong>?</p>
            <p class="advertencia"><i class="fas fa-trash-alt"></i> Esta acción no se puede deshacer.</p>
            <div class="modal-botones">
                <button class="btn btn-secondary" onclick="cerrarModalConfirmacion()">
                    <i class="fas fa-times"></i> Cancelar
                </button>
                <button class="btn btn-danger" onclick="eliminarEquipoDetalle('${equipoId}')">
                    <i class="fas fa-trash-alt"></i> Eliminar
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// ============================================
// ELIMINAR EQUIPO (desde detalle)
// ============================================
async function eliminarEquipoDetalle(equipoId) {
    try {
        const respuesta = await fetch(`/api/equipos/eliminar/${equipoId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario_id: usuario._id })
        });
        
        const resultado = await respuesta.json();
        cerrarModalConfirmacion();
        
        if (resultado.exito) {
            mostrarMensaje('success', '✅ Equipo eliminado correctamente');
            setTimeout(() => {
                window.location.href = 'mis_equipos.html';
            }, 1500);
        } else {
            mostrarMensaje('error', '❌ ' + resultado.mensaje);
        }
    } catch (error) {
        cerrarModalConfirmacion();
        mostrarMensaje('error', '❌ Error de conexión');
    }
}

// ============================================
// CERRAR MODAL DE CONFIRMACIÓN
// ============================================
function cerrarModalConfirmacion() {
    const modal = document.querySelector('.modal-confirmacion');
    if (modal) modal.remove();
}

// ============================================
// MOSTRAR MENSAJE
// ============================================
function mostrarMensaje(tipo, texto) {
    const container = document.getElementById('mensaje') || crearContenedorMensaje();
    const icon = container.querySelector('#mensajeIcon');
    const textElement = container.querySelector('#mensajeTexto');
    
    container.className = `message-container ${tipo}`;
    container.style.display = 'block';
    
    if (tipo === 'success') {
        icon.className = 'fas fa-check-circle';
    } else {
        icon.className = 'fas fa-exclamation-circle';
    }
    
    textElement.textContent = texto;
    
    setTimeout(() => {
        container.style.display = 'none';
    }, 4000);
}

function crearContenedorMensaje() {
    const container = document.createElement('div');
    container.id = 'mensaje';
    container.className = 'message-container';
    container.style.display = 'none';
    container.innerHTML = `
        <div class="message-content">
            <i id="mensajeIcon" class="fas fa-check-circle"></i>
            <span id="mensajeTexto"></span>
        </div>
    `;
    document.querySelector('.page-container').prepend(container);
    return container;
}

// ============================================
// ABRIR CHAT
// ============================================
function abrirChat() {
    window.location.href = `chat_equipo.html?equipo_id=${equipoId}`;
}

// ============================================
// CERRAR SESIÓN
// ============================================
function cerrarSesion() {
    localStorage.removeItem('usuario');
    window.location.href = '../iniciar_sesion.html';
}

// ============================================
// INICIALIZAR
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    cargarEquipo();
});