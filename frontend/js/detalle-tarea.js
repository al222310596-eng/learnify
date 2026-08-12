// ============================================
// ARCHIVO: detalle-tarea.js
// Muestra información completa de una tarea (MongoDB)
// ============================================

const usuario = JSON.parse(localStorage.getItem('usuario'));

// Verificar sesión
if (!usuario) {
    window.location.href = '../iniciar_sesion.html';
}

// Obtener ID de la tarea de la URL
const urlParams = new URLSearchParams(window.location.search);
const tareaId = urlParams.get('id');
const equipoId = urlParams.get('equipo_id');

if (!tareaId) {
    window.location.href = 'mis_equipos.html';
}

// ============================================
// CACHÉ PARA ENTREGAS (usado en el modal)
// ============================================
let entregasCache = null;

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
    if (!fecha) return 'Sin fecha';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-MX');
}

function formatearFechaCompleta(fecha) {
    if (!fecha) return 'Sin fecha';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-MX') + ' ' + d.toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'});
}

// ============================================
// CARGAR DETALLE DE LA TAREA
// ============================================
async function cargarDetalle() {
    const container = document.getElementById('tareaContent');
    
    try {
        const respuesta = await fetch(`/api/tareas/detalle/${tareaId}`);
        const resultado = await respuesta.json();
        
        if (resultado.exito) {
            mostrarDetalle(resultado.tarea);
        } else {
            container.innerHTML = `<div class="sin-entregas"><i class="fas fa-exclamation-triangle"></i> Error: ${resultado.mensaje}</div>`;
        }
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = '<div class="sin-entregas"><i class="fas fa-wifi"></i> Error de conexión</div>';
    }
}

// ============================================
// MOSTRAR DETALLE
// ============================================
function mostrarDetalle(tarea) {
    const container = document.getElementById('tareaContent');
    
    const esLider = tarea.lider_id === usuario._id;
    const esMiembro = usuario.rol === 'alumno' && !esLider;
    
    entregasCache = tarea.entregas || [];
    const miEntrega = esMiembro ? entregasCache.find(e => e.alumno_id === usuario._id) : null;
    
    // ============================================
    // SECCIÓN: MI ENTREGA (solo para miembros)
    // ============================================
    let miEntregaHtml = '';
    if (esMiembro) {
        if (miEntrega) {
            const archivoUrl = miEntrega.archivo_id ? `/api/archivos/${miEntrega.archivo_id}` : null;
            
            miEntregaHtml = `
                <div class="mi-entrega">
                    <div class="mi-entrega-header">
                        <h3><i class="fas fa-upload"></i> Mi entrega</h3>
                    </div>
                    <div class="mi-entrega-body">
                        <div class="entrega-info">
                            <p><strong><i class="fas fa-calendar-check"></i> Entregado:</strong> ${formatearFechaCompleta(miEntrega.fecha_entrega)}</p>
                            ${miEntrega.comentario ? `
                                <div class="entrega-comentario-texto">
                                    <strong><i class="fas fa-comment"></i> Comentario:</strong><br>
                                    ${escapeHtml(miEntrega.comentario)}
                                </div>
                            ` : ''}
                            ${archivoUrl ? `
                                <div class="entrega-archivo">
                                    <i class="fas fa-paperclip"></i> <a href="${archivoUrl}" target="_blank">Ver archivo adjunto: ${escapeHtml(miEntrega.nombre_archivo || 'archivo')}</a>
                                </div>
                            ` : '<div class="entrega-archivo"><i class="fas fa-ban"></i> Sin archivo adjunto</div>'}
                            ${miEntrega.calificacion !== null ? `
                                <div class="entrega-calificacion-mostrada">
                                    <i class="fas fa-star"></i> Calificación: ${miEntrega.calificacion}/100
                                </div>
                            ` : `
                                <div class="entrega-calificacion-mostrada pendiente">
                                    <i class="fas fa-hourglass-half"></i> Pendiente de calificar
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            `;
        } else {
            miEntregaHtml = `
                <div class="mi-entrega">
                    <div class="mi-entrega-header">
                        <h3><i class="fas fa-upload"></i> Mi entrega</h3>
                    </div>
                    <div class="mi-entrega-body">
                        <div class="sin-entrega">
                            <i class="fas fa-inbox"></i>
                            <p>Aún no has entregado esta tarea.</p>
                        </div>
                        <div class="acciones-tarea">
                            <button onclick="entregarTarea()" class="btn btn-entregar-ahora">
                                <i class="fas fa-paper-plane"></i> Entregar ahora
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
    }
    
    // ============================================
    // SECCIÓN: ENTREGAS DE ALUMNOS (solo para líder)
    // ============================================
    let entregasHtml = '';
    if (esLider && entregasCache.length > 0) {
        entregasHtml = `
            <div class="entregas-lista-detalle">
                <h3><i class="fas fa-users"></i> Entregas de alumnos (${entregasCache.length})</h3>
                ${entregasCache.map(entrega => `
                    <div class="entrega-item-detalle">
                        <div class="entrega-alumno-info">
                            <span class="entrega-alumno-nombre"><i class="fas fa-user-graduate"></i> Alumno: ${escapeHtml(entrega.alumno_nombre)}</span>
                            ${entrega.calificacion !== null ? 
                                `<span class="entrega-status entregado"><i class="fas fa-check-circle"></i> Calificación: ${entrega.calificacion}/100</span>` : 
                                `<span class="entrega-status no-entregado"><i class="fas fa-clock"></i> Sin calificar</span>`
                            }
                        </div>
                        <button onclick="verEntrega('${entrega._id}')" class="btn-ver-entrega">
                            <i class="fas fa-eye"></i> Ver entrega
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    } else if (esLider) {
        entregasHtml = `
            <div class="entregas-lista-detalle">
                <h3><i class="fas fa-users"></i> Entregas de alumnos</h3>
                <div class="sin-entregas"><i class="fas fa-info-circle"></i> Aún no hay entregas para esta tarea.</div>
            </div>
        `;
    }
    
    // ============================================
    // CONTENIDO PRINCIPAL
    // ============================================
    container.innerHTML = `
        <div class="tarea-info-principal">
            <div class="tarea-titulo-grande"><i class="fas fa-tasks"></i> Título: ${escapeHtml(tarea.titulo)}</div>
            <div class="tarea-descripcion-completa"><i class="fas fa-align-left"></i> ${escapeHtml(tarea.descripcion || 'Sin descripción')}</div>
            <div class="tarea-metadatos">
                <div class="metadato"><i class="fas fa-user"></i> Creada por: ${escapeHtml(tarea.creador_nombre)}</div>
                <div class="metadato"><i class="fas fa-users"></i> Equipo: ${escapeHtml(tarea.equipo_nombre)}</div>
                <div class="metadato"><i class="fas fa-calendar-alt"></i> Fecha límite: ${tarea.fecha_limite || 'Sin fecha límite'}</div>
            </div>
        </div>
        
        ${miEntregaHtml}
        
        ${entregasHtml}
        
        ${esLider ? `
            <div class="acciones-tarea" style="margin-top: 2rem;">
                <button onclick="verTodasEntregas()" class="btn btn-primary">
                    <i class="fas fa-list-alt"></i> Ver todas las entregas
                </button>
            </div>
        ` : ''}
    `;
}

// ============================================
// ENTREGAR TAREA
// ============================================
function entregarTarea() {
    window.location.href = `entregar_tarea.html?tarea_id=${tareaId}&equipo_id=${equipoId || ''}`;
}

// ============================================
// VER ENTREGA (mostrar modal)
// ============================================
function verEntrega(entregaId) {
    if (!entregasCache) return;
    
    const entrega = entregasCache.find(e => e._id === entregaId);
    if (!entrega) return;
    
    const modal = document.getElementById('modalVerEntrega');
    const content = document.getElementById('modalEntregaContent');
    
    const archivoUrl = entrega.archivo_id ? `/api/archivos/${entrega.archivo_id}` : null;
    
    content.innerHTML = `
        <p><i class="fas fa-user-graduate"></i> <strong>Alumno:</strong> ${escapeHtml(entrega.alumno_nombre)}</p>
        <p><i class="fas fa-calendar-check"></i> <strong>Entregado:</strong> ${formatearFechaCompleta(entrega.fecha_entrega)}</p>
        <p><i class="fas fa-comment"></i> <strong>Comentario:</strong><br>${escapeHtml(entrega.comentario || 'Sin comentario')}</p>
        ${archivoUrl ? 
            `<p><i class="fas fa-paperclip"></i> <a href="${archivoUrl}" target="_blank">Ver archivo adjunto</a></p>` : 
            '<p><i class="fas fa-ban"></i> Sin archivo adjunto</p>'}
        ${entrega.calificacion !== null ? 
            `<p><i class="fas fa-star"></i> <strong>Calificación:</strong> ${entrega.calificacion}/100</p>` : 
            '<p><i class="fas fa-hourglass-half"></i> Pendiente de calificar</p>'}
    `;
    
    modal.style.display = 'flex';
}

// ============================================
// CERRAR MODAL
// ============================================
function cerrarModalEntrega() {
    const modal = document.getElementById('modalVerEntrega');
    if (modal) modal.style.display = 'none';
}

// ============================================
// VER TODAS LAS ENTREGAS
// ============================================
function verTodasEntregas() {
    window.location.href = `entregas_tarea.html?tarea_id=${tareaId}`;
}

// ============================================
// INICIALIZAR
// ============================================
cargarDetalle();