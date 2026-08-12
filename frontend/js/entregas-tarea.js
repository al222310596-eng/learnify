// ============================================
// ARCHIVO: entregas-tarea.js
// Lógica para ver y calificar entregas (MongoDB)
// ============================================

const usuario = JSON.parse(localStorage.getItem('usuario'));

// Verificar sesión
if (!usuario) {
    window.location.href = '../iniciar_sesion.html';
}

// Obtener ID de la tarea de la URL
const urlParams = new URLSearchParams(window.location.search);
const tareaId = urlParams.get('tarea_id');

if (!tareaId) {
    window.location.href = 'mis_equipos.html';
}

let equipoIdActual = null;

// ============================================
// MOSTRAR MENSAJE
// ============================================
function mostrarMensaje(tipo, texto) {
    const mensajeDiv = document.getElementById('mensaje');
    mensajeDiv.className = `mensaje ${tipo}`;
    mensajeDiv.textContent = tipo === 'exito' ? `✅ ${texto}` : `❌ ${texto}`;
    mensajeDiv.style.display = 'block';
    setTimeout(() => {
        mensajeDiv.style.display = 'none';
    }, 3000);
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
// FORMATEAR FECHA
// ============================================
function formatearFecha(fecha) {
    if (!fecha) return 'Fecha no disponible';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-MX') + ' ' + d.toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'});
}

// ============================================
// CARGAR INFORMACIÓN DE LA TAREA Y ENTREGAS
// ============================================
async function cargarDatos() {
    const infoContainer = document.getElementById('infoTarea');
    const entregasContainer = document.getElementById('entregasContainer');
    
    try {
        const respuesta = await fetch(`/api/tareas/detalle/${tareaId}`);
        const resultado = await respuesta.json();
        
        if (resultado.exito) {
            const tarea = resultado.tarea;
            equipoIdActual = tarea.equipo_id;
            
            // Mostrar información de la tarea
            infoContainer.innerHTML = `
                <h3><i class="fas fa-tasks"></i> Título: ${escapeHtml(tarea.titulo)}</h3>
                <div class="tarea-desc"><i class="fas fa-align-left"></i> ${escapeHtml(tarea.descripcion || 'Sin descripción')}</div>
                <div class="tarea-meta">
                    <span><i class="fas fa-user"></i> Creada por: ${escapeHtml(tarea.creador_nombre)}</span>
                    <span><i class="fas fa-users"></i> Equipo: ${escapeHtml(tarea.equipo_nombre)}</span>
                    <span><i class="fas fa-calendar-alt"></i> Fecha límite: ${tarea.fecha_limite || 'Sin fecha'}</span>
                </div>
            `;
            
            // Mostrar entregas
            const entregas = tarea.entregas || [];
            
            if (entregas.length === 0) {
                entregasContainer.innerHTML = '<div class="sin-entregas"><i class="fas fa-inbox"></i> Aún no hay entregas para esta tarea.</div>';
            } else {
                entregasContainer.innerHTML = entregas.map(entrega => {
                    const archivoUrl = entrega.archivo_id ? `/api/archivos/${entrega.archivo_id}` : null;
                    
                    return `
                        <div class="entrega-card" id="entrega-${entrega._id}">
                            <div class="entrega-header">
                                <div class="entrega-alumno">
                                    <i class="fas fa-user-graduate"></i> Alumno: <strong>${escapeHtml(entrega.alumno_nombre)}</strong>
                                </div>
                                <div class="entrega-fecha">
                                    <i class="fas fa-calendar-check"></i> Entregado: ${formatearFecha(entrega.fecha_entrega)}
                                </div>
                            </div>
                            <div class="entrega-body">
                                <div class="entrega-comentario">
                                    <i class="fas fa-comment"></i> <strong>Comentario:</strong><br>
                                    ${escapeHtml(entrega.comentario || 'Sin comentario')}
                                </div>
                                <div class="entrega-archivo">
                                    ${archivoUrl ? 
                                        `<i class="fas fa-paperclip"></i> <a href="${archivoUrl}" target="_blank">Ver archivo adjunto: ${escapeHtml(entrega.nombre_archivo || 'archivo')}</a>` : 
                                        '<i class="fas fa-ban"></i> Sin archivo adjunto'}
                                </div>
                                <div class="entrega-calificacion">
                                    ${entrega.calificacion !== null ? `
                                        <span class="calificacion-actual"><i class="fas fa-star"></i> Calificación actual: ${entrega.calificacion}/100</span>
                                        <label><i class="fas fa-edit"></i> Nueva calificación:</label>
                                        <input type="number" id="calif-${entrega._id}" min="0" max="100" value="${entrega.calificacion}" placeholder="0-100">
                                    ` : `
                                        <label><i class="fas fa-star"></i> Calificación (0-100):</label>
                                        <input type="number" id="calif-${entrega._id}" min="0" max="100" placeholder="Ej: 85">
                                    `}
                                    <button onclick="calificarEntrega('${entrega._id}')" class="btn-calificar-entrega">
                                        <i class="fas fa-save"></i> Guardar calificación
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        } else {
            infoContainer.innerHTML = `<div class="sin-entregas"><i class="fas fa-exclamation-triangle"></i> Error: ${resultado.mensaje}</div>`;
            entregasContainer.innerHTML = '';
        }
    } catch (error) {
        console.error('Error:', error);
        infoContainer.innerHTML = '<div class="sin-entregas"><i class="fas fa-wifi"></i> Error de conexión</div>';
        entregasContainer.innerHTML = '';
    }
}

// ============================================
// CALIFICAR ENTREGA
// ============================================
async function calificarEntrega(entregaId) {
    const input = document.getElementById(`calif-${entregaId}`);
    const calificacion = parseInt(input.value);
    
    if (isNaN(calificacion) || calificacion < 0 || calificacion > 100) {
        mostrarMensaje('error', 'La calificación debe ser un número entre 0 y 100');
        return;
    }
    
    try {
        const respuesta = await fetch('/api/entregas/calificar', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                entrega_id: entregaId,
                calificacion: calificacion
            })
        });
        
        const resultado = await respuesta.json();
        
        if (resultado.exito) {
            mostrarMensaje('exito', 'Calificación guardada correctamente');
            setTimeout(() => {
                cargarDatos();
            }, 500);
        } else {
            mostrarMensaje('error', resultado.mensaje);
        }
    } catch (error) {
        mostrarMensaje('error', 'Error de conexión');
    }
}

// ============================================
// INICIALIZAR
// ============================================
cargarDatos();