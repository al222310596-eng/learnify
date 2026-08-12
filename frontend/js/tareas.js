// ============================================
// ARCHIVO: tareas.js
// Lógica para gestionar tareas del equipo
// ============================================

const usuario = JSON.parse(localStorage.getItem('usuario'));

// Verificar sesión
if (!usuario) {
    window.location.href = '../iniciar_sesion.html';
}

// Obtener ID del equipo de la URL
const urlParams = new URLSearchParams(window.location.search);
const equipoId = urlParams.get('equipo_id');

if (!equipoId) {
    window.location.href = 'mis_equipos.html';
}

// ============================================
// REGISTRAR ACTIVIDAD DEL USUARIO
// ============================================
async function registrarActividad(tipo, descripcion = '') {
    try {
        await fetch('/api/registrar-actividad', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuario_id: usuario._id,
                tipo: tipo,
                descripcion: descripcion
            })
        });
    } catch (error) {
        console.error('Error al registrar actividad:', error);
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
// VERIFICAR SI EL USUARIO ES LÍDER DEL EQUIPO
// ============================================
async function verificarLider() {
    try {
        const respuesta = await fetch(`/api/equipos/detalle/${equipoId}`);
        const resultado = await respuesta.json();
        
        if (resultado.exito) {
            const equipo = resultado.equipo;
            const esLider = (equipo.lider_id === usuario._id);
            
            // Actualizar título de la página
            const titulo = document.getElementById('tituloEquipo');
            if (titulo) {
                titulo.innerHTML = `<i class="fas fa-tasks"></i> Tareas de ${escapeHtml(equipo.nombre)}`;
            }
            
            const btnCrear = document.getElementById('btnCrearTarea');
            if (btnCrear) {
                if (esLider) {
                    btnCrear.style.display = 'flex';
                    btnCrear.onclick = crearTarea;
                } else {
                    btnCrear.style.display = 'none';
                }
            }
            return esLider;
        }
        return false;
    } catch (error) {
        console.error('Error al verificar líder:', error);
        return false;
    }
}

// ============================================
// CARGAR TAREAS DEL EQUIPO
// ============================================
async function cargarTareas() {
    registrarActividad('ver_tareas', `Viendo tareas del equipo ${equipoId}`);
    
    const container = document.getElementById('tareasContainer');
    container.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-pulse"></i>
            <p>Cargando tareas...</p>
        </div>
    `;
    
    try {
        await verificarLider();
        
        const respuesta = await fetch(`/api/tareas/equipo/${equipoId}`);
        const resultado = await respuesta.json();
        
        if (resultado.exito) {
            mostrarTareas(resultado.tareas);
        } else {
            container.innerHTML = `
                <div class="sin-tareas">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error: ${resultado.mensaje || 'No se pudieron cargar las tareas'}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = `
            <div class="sin-tareas">
                <i class="fas fa-wifi"></i>
                <p>Error de conexión. Verifica tu internet.</p>
            </div>
        `;
    }
}

// ============================================
// MOSTRAR TAREAS
// ============================================
function mostrarTareas(tareas) {
    const container = document.getElementById('tareasContainer');
    
    if (tareas.length === 0) {
        container.innerHTML = `
            <div class="sin-tareas">
                <i class="fas fa-inbox"></i>
                <p>No hay tareas en este equipo.</p>
                <p style="font-size: 0.85rem; margin-top: 0.5rem;">${usuario.rol === 'maestro' ? 'Crea una tarea para empezar.' : 'Espera a que el líder cree tareas.'}</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = tareas.map(tarea => {
        const fechaLimite = tarea.fecha_limite ? new Date(tarea.fecha_limite) : null;
        const hoy = new Date();
        const estaVencida = fechaLimite && fechaLimite < hoy;
        const esLider = tarea.lider_id === usuario._id;
        const esAlumno = !esLider && usuario.rol === 'alumno';
        
        // Determinar estado
        let estadoClase = 'estado-pendiente';
        let estadoTexto = 'Pendiente';
        if (tarea.total_entregas > 0) {
            estadoClase = 'estado-entregada';
            estadoTexto = 'Entregada';
        }
        if (tarea.calificada) {
            estadoClase = 'estado-calificada';
            estadoTexto = 'Calificada';
        }
        
        return `
            <div class="tarea-card">
                <div class="tarea-titulo">
                    <i class="fas fa-tasks"></i>
                    ${escapeHtml(tarea.titulo)}
                    <span class="${estadoClase}" style="margin-left: auto; font-size: 0.65rem;">${estadoTexto}</span>
                </div>
                <div class="tarea-descripcion">
                    ${escapeHtml(tarea.descripcion || 'Sin descripción')}
                </div>
                <div class="tarea-meta">
                    <div class="tarea-fecha ${estaVencida ? 'vencida' : ''}">
                        <i class="fas fa-calendar-alt"></i>
                        ${tarea.fecha_limite ? formatearFecha(tarea.fecha_limite) : 'Sin fecha límite'}
                        ${estaVencida ? ' (Vencida)' : ''}
                    </div>
                    <div class="tarea-creador">
                        <i class="fas fa-user"></i> ${escapeHtml(tarea.creador_nombre)}
                    </div>
                    <div class="entregas-badge">
                        <i class="fas fa-paperclip"></i> ${tarea.total_entregas || 0} entregas
                    </div>
                </div>
                <div class="tarea-acciones">
                    <button onclick="verDetalleTarea('${tarea._id}')" class="btn btn-ver-tarea">
                        <i class="fas fa-eye"></i> Ver detalles
                    </button>
                    
                    ${esAlumno ? `
                        <button onclick="entregarTarea('${tarea._id}')" class="btn btn-entregar">
                            <i class="fas fa-upload"></i> Entregar
                        </button>
                    ` : ''}
                    
                    ${esLider ? `
                        <button onclick="verEntregas('${tarea._id}')" class="btn btn-calificar">
                            <i class="fas fa-star"></i> Calificar
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// VER DETALLE DE TAREA
// ============================================
function verDetalleTarea(tareaId) {
    window.location.href = `detalle_tarea.html?id=${tareaId}&equipo_id=${equipoId}`;
}

// ============================================
// ENTREGAR TAREA (alumno)
// ============================================
function entregarTarea(tareaId) {
    window.location.href = `entregar_tarea.html?tarea_id=${tareaId}&equipo_id=${equipoId}`;
}

// ============================================
// VER ENTREGAS (líder)
// ============================================
function verEntregas(tareaId) {
    window.location.href = `entregas_tarea.html?tarea_id=${tareaId}`;
}

// ============================================
// CREAR TAREA
// ============================================
function crearTarea() {
    window.location.href = `crear_tarea.html?equipo_id=${equipoId}`;
}

// ============================================
// CERRAR SESIÓN
// ============================================
function cerrarSesion() {
    localStorage.removeItem('usuario');
    window.location.href = '../iniciar_sesion.html';
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
    if (!fecha) return 'Sin fecha';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

// ============================================
// CARGAR TEMA GUARDADO
// ============================================
(function() {
    const savedTheme = localStorage.getItem('learnify-theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
})();

// ============================================
// INICIALIZAR
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Tareas del equipo inicializado');
    console.log('📋 equipoId:', equipoId);
    console.log('👤 usuario:', usuario._id);
    cargarTareas();
});