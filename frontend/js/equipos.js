// ============================================
// ARCHIVO: equipos.js
// Lógica para la gestión de equipos
// ============================================

const usuario = JSON.parse(localStorage.getItem('usuario'));

// Verificar sesión
if (!usuario) {
    window.location.href = 'iniciar_sesion.html';
}

// ============================================
// CARGAR EQUIPOS
// ============================================
async function cargarEquipos() {
    const container = document.getElementById('equiposContainer');
    container.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-pulse"></i>
            <p>Cargando equipos...</p>
        </div>
    `;
    
    try {
        const respuesta = await fetch(`/api/equipos/${usuario._id}`);
        const resultado = await respuesta.json();
        
        if (resultado.exito) {
            mostrarEquipos(resultado.equipos);
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error al cargar equipos</h3>
                    <p>${resultado.mensaje || 'Intenta de nuevo más tarde'}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-wifi"></i>
                <h3>Error de conexión</h3>
                <p>No se pudo conectar con el servidor</p>
            </div>
        `;
    }
}

// ============================================
// MOSTRAR EQUIPOS
// ============================================
function mostrarEquipos(equipos) {
    const container = document.getElementById('equiposContainer');
    
    if (equipos.length === 0) {
        let mensaje = usuario.rol === 'maestro' 
            ? 'Aún no has creado ningún equipo. Haz click en "Crear equipo" para empezar.'
            : 'Aún no perteneces a ningún equipo. Pídele a un maestro el ID del equipo para unirte.';
        
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <h3>No tienes equipos</h3>
                <p>${mensaje}</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = equipos.map(equipo => {
        const esLider = equipo.lider_id === usuario._id;
        const esMiembro = !esLider && usuario.rol === 'alumno';
        const badgeClass = esLider ? 'badge-lider' : 'badge-miembro';
        const badgeText = esLider ? '👑 Líder' : '👤 Miembro';
        
        return `
            <div class="equipo-card">
                <div class="equipo-card-header">
                    <div class="equipo-nombre">
                        <i class="fas fa-users"></i>
                        ${escapeHtml(equipo.nombre)}
                    </div>
                    <span class="equipo-badge ${badgeClass}">${badgeText}</span>
                </div>
                
                <div class="equipo-descripcion">
                    ${escapeHtml(equipo.descripcion || 'Sin descripción')}
                </div>
                
                <div class="equipo-meta">
                    <span class="equipo-meta-item">
                        <i class="fas fa-users"></i>
                        <span class="miembro-count">${equipo.total_miembros || 0}</span> miembros
                    </span>
                    ${equipo.lider_nombre ? `
                        <span class="equipo-meta-item">
                            <i class="fas fa-crown"></i>
                            ${escapeHtml(equipo.lider_nombre)}
                        </span>
                    ` : ''}
                </div>
                
                <div class="equipo-acciones">
                    <button onclick="verDetalleEquipo('${equipo._id}')" class="btn btn-primary btn-sm">
                        <i class="fas fa-eye"></i> Detalles
                    </button>
                    <button onclick="abrirChatEquipo('${equipo._id}')" class="btn btn-outline btn-sm">
                        <i class="fas fa-comments"></i> Chat
                    </button>
                    <button onclick="verTareasEquipo('${equipo._id}')" class="btn btn-outline btn-sm">
                        <i class="fas fa-tasks"></i> Tareas
                    </button>
                    ${esLider ? `
                        <button onclick="confirmarEliminarEquipo('${equipo._id}', '${escapeHtml(equipo.nombre)}')" class="btn btn-danger btn-sm">
                            <i class="fas fa-trash-alt"></i> Eliminar
                        </button>
                    ` : ''}
                    ${esMiembro ? `
                        <button onclick="confirmarSalirEquipo('${equipo._id}', '${escapeHtml(equipo.nombre)}')" class="btn btn-warning btn-sm">
                            <i class="fas fa-sign-out-alt"></i> Salir
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// ESCAPAR HTML
// ============================================
function escapeHtml(texto) {
    if (!texto) return '';
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}

// ============================================
// VER DETALLE
// ============================================
function verDetalleEquipo(equipoId) {
    window.location.href = `equipo_detalle.html?id=${equipoId}`;
}

// ============================================
// UNIRSE A EQUIPO
// ============================================
async function confirmarUnirse() {
    const equipoId = document.getElementById('codigoEquipo').value.trim();
    
    if (!equipoId) {
        mostrarMensaje('error', 'Ingresa el ID del equipo');
        return;
    }
    
    try {
        const respuesta = await fetch('/api/equipos/unirse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                equipo_id: equipoId,
                usuario_id: usuario._id
            })
        });
        
        const resultado = await respuesta.json();
        mostrarMensaje(resultado.exito ? 'success' : 'error', resultado.mensaje);
        
        if (resultado.exito) {
            document.getElementById('codigoEquipo').value = '';
            toggleFormUnirse();
            cargarEquipos();
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('error', 'Error de conexión');
    }
}

// ============================================
// MOSTRAR MENSAJE
// ============================================
function mostrarMensaje(tipo, texto) {
    const container = document.getElementById('mensaje');
    const icon = document.getElementById('mensajeIcon');
    const textElement = document.getElementById('mensajeTexto');
    
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

// ============================================
// MOSTRAR/OCULTAR FORMULARIO
// ============================================
function toggleFormUnirse() {
    const form = document.getElementById('formUnirse');
    form.classList.toggle('visible');
    
    if (form.classList.contains('visible')) {
        document.getElementById('codigoEquipo').focus();
    }
}

// ============================================
// CONFIRMAR ELIMINAR EQUIPO
// ============================================
function confirmarEliminarEquipo(equipoId, equipoNombre) {
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
                <button class="btn btn-danger" onclick="eliminarEquipo('${equipoId}')">
                    <i class="fas fa-trash-alt"></i> Eliminar
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// ============================================
// CERRAR MODAL
// ============================================
function cerrarModalConfirmacion() {
    const modal = document.querySelector('.modal-confirmacion');
    if (modal) modal.remove();
}

// ============================================
// ELIMINAR EQUIPO
// ============================================
async function eliminarEquipo(equipoId) {
    try {
        const respuesta = await fetch(`/api/equipos/eliminar/${equipoId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario_id: usuario._id })
        });
        
        const resultado = await respuesta.json();
        cerrarModalConfirmacion();
        mostrarMensaje(resultado.exito ? 'success' : 'error', resultado.mensaje);
        
        if (resultado.exito) cargarEquipos();
    } catch (error) {
        cerrarModalConfirmacion();
        mostrarMensaje('error', 'Error de conexión');
    }
}

// ============================================
// CONFIRMAR SALIR DEL EQUIPO
// ============================================
function confirmarSalirEquipo(equipoId, equipoNombre) {
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
                <button class="btn btn-warning" onclick="salirDelEquipo('${equipoId}')">
                    <i class="fas fa-sign-out-alt"></i> Salir
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// ============================================
// SALIR DEL EQUIPO
// ============================================
async function salirDelEquipo(equipoId) {
    try {
        const respuesta = await fetch(`/api/equipos/salir/${equipoId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario_id: usuario._id })
        });
        
        const resultado = await respuesta.json();
        cerrarModalConfirmacion();
        mostrarMensaje(resultado.exito ? 'success' : 'error', resultado.mensaje);
        
        if (resultado.exito) cargarEquipos();
    } catch (error) {
        cerrarModalConfirmacion();
        mostrarMensaje('error', 'Error de conexión');
    }
}

// ============================================
// VER TAREAS DEL EQUIPO
// ============================================
function verTareasEquipo(equipoId) {
    window.location.href = `tareas_equipo.html?equipo_id=${equipoId}`;
}

// ============================================
// ABRIR EL CHAT
// ============================================
function abrirChatEquipo(equipoId) {
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
// EVENTOS Y CARGA INICIAL
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    cargarEquipos();
    
    // Crear equipo
    document.getElementById('btnCrearEquipo').addEventListener('click', function() {
        window.location.href = 'crear_equipo.html';
    });
    
    // Mostrar formulario de unirse (solo para alumnos)
    const btnMostrarUnirse = document.getElementById('btnMostrarUnirse');
    if (usuario.rol === 'alumno') {
        btnMostrarUnirse.style.display = 'inline-flex';
        btnMostrarUnirse.addEventListener('click', toggleFormUnirse);
    } else {
        btnMostrarUnirse.style.display = 'none';
    }
    
    // Confirmar unirse
    document.getElementById('btnConfirmarUnirse').addEventListener('click', confirmarUnirse);
    
    // Cancelar unirse
    document.getElementById('btnCancelarUnirse').addEventListener('click', toggleFormUnirse);
    
    // Enter en el input de código
    document.getElementById('codigoEquipo').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            confirmarUnirse();
        }
    });
});