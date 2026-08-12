// ============================================
// ARCHIVO: reporte-detalle.js
// Reporte detallado de un alumno (con datos REALES)
// ============================================

console.log('🚀 Iniciando reporte-detalle.js');

const usuario = JSON.parse(localStorage.getItem('usuario'));

if (!usuario) {
    window.location.href = '../../iniciar_sesion.html';
}

// Solo maestros pueden ver reportes
if (usuario.rol !== 'maestro') {
    alert('Solo los maestros tienen acceso a esta sección');
    window.location.href = '../../dashboard.html';
}

// Obtener ID del alumno de la URL
const urlParams = new URLSearchParams(window.location.search);
const alumnoId = urlParams.get('alumno_id');

console.log('📌 alumnoId:', alumnoId);

if (!alumnoId) {
    window.location.href = 'analisis_alumnos.html';
}

let graficaCalificaciones = null;

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
    if (!fecha) return '-';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-MX');
}

// ============================================
// MOSTRAR MENSAJE
// ============================================
function mostrarMensaje(tipo, texto) {
    // Simple alert por ahora
    console.log(`${tipo}: ${texto}`);
}

// ============================================
// CARGAR REPORTE DEL ALUMNO
// ============================================
async function cargarReporte() {
    const loadingState = document.getElementById('loadingState');
    const reporteContent = document.getElementById('reporteContent');
    
    try {
        console.log(`📡 Haciendo fetch a: /api/analisis/alumno/${alumnoId}`);
        const respuesta = await fetch(`/api/analisis/alumno/${alumnoId}`);
        const resultado = await respuesta.json();
        
        console.log('📦 Respuesta del servidor:', resultado);
        
        if (resultado.exito && resultado.alumno) {
            // Ocultar loading, mostrar contenido
            loadingState.style.display = 'none';
            reporteContent.style.display = 'block';
            
            mostrarPerfil(resultado.alumno);
            mostrarEquipos(resultado.alumno.equipos || []);
            mostrarRendimiento(resultado.alumno.rendimiento_equipos || []);
            mostrarTareas(resultado.alumno.tareas || []);
            actualizarGrafica(resultado.alumno.tareas || []);
        } else {
            loadingState.innerHTML = `
                <i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i>
                <p>Error al cargar los datos del alumno</p>
                <p style="font-size: 0.8rem; color: #94a3b8;">${resultado.mensaje || 'Intenta nuevamente'}</p>
                <a href="analisis_alumnos.html" class="btn btn-outline" style="margin-top: 1rem;">
                    <i class="fas fa-arrow-left"></i> Volver
                </a>
            `;
        }
    } catch (error) {
        console.error('❌ Error:', error);
        loadingState.innerHTML = `
            <i class="fas fa-wifi" style="color: #f59e0b;"></i>
            <p>Error de conexión</p>
            <p style="font-size: 0.8rem; color: #94a3b8;">Verifica tu conexión a internet</p>
            <button onclick="cargarReporte()" class="btn btn-primary" style="margin-top: 1rem;">
                <i class="fas fa-sync"></i> Reintentar
            </button>
        `;
    }
}

// ============================================
// MOSTRAR PERFIL DEL ALUMNO
// ============================================
function mostrarPerfil(alumno) {
    document.getElementById('alumnoNombre').textContent = escapeHtml(alumno.nombre);
    document.getElementById('alumnoEmail').textContent = escapeHtml(alumno.email || 'Sin correo registrado');
    document.getElementById('alumnoRol').textContent = 'Alumno';
    
    // Estado (activo/inactivo según últimas entregas)
    const estado = alumno.estado || 'Activo';
    document.getElementById('alumnoEstado').textContent = estado;
    document.getElementById('alumnoEstado').className = `badge badge-estado ${estado === 'Activo' ? '' : 'inactivo'}`;
    
    // Avatar con inicial
    const avatar = document.getElementById('alumnoAvatar');
    if (alumno.foto_url) {
        avatar.innerHTML = `<img src="${alumno.foto_url}" alt="Avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    } else {
        avatar.innerHTML = `<i class="fas fa-user-graduate"></i>`;
    }
    
    // Estadísticas rápidas
    document.getElementById('promedioGeneralAlumno').textContent = alumno.promedio_general?.toFixed(1) || '0';
    document.getElementById('totalTareasAlumno').textContent = alumno.total_tareas || 0;
    document.getElementById('entregasTardiasAlumno').textContent = alumno.entregas_tardias || 0;
}

// ============================================
// MOSTRAR EQUIPOS DEL ALUMNO
// ============================================
function mostrarEquipos(equipos) {
    const grid = document.getElementById('equiposGrid');
    
    if (!equipos || equipos.length === 0) {
        grid.innerHTML = '<div class="sin-datos"><i class="fas fa-users"></i> No participa en ningún equipo</div>';
        return;
    }
    
    grid.innerHTML = equipos.map(equipo => `
        <div class="equipo-card">
            <i class="fas fa-users"></i>
            <div class="equipo-nombre">${escapeHtml(equipo.nombre)}</div>
            <span class="equipo-rol">${escapeHtml(equipo.rol || 'Miembro')}</span>
        </div>
    `).join('');
}

// ============================================
// MOSTRAR RENDIMIENTO POR EQUIPO
// ============================================
function mostrarRendimiento(rendimientos) {
    const grid = document.getElementById('rendimientoGrid');
    
    if (!rendimientos || rendimientos.length === 0) {
        grid.innerHTML = '<div class="sin-datos"><i class="fas fa-chart-line"></i> No hay datos de rendimiento</div>';
        return;
    }
    
    grid.innerHTML = rendimientos.map(rend => `
        <div class="rendimiento-card">
            <div class="equipo-nombre">
                <i class="fas fa-users"></i> ${escapeHtml(rend.equipo_nombre)}
            </div>
            <div class="rendimiento-detalle">
                <span class="label">Promedio</span>
                <span class="value">${rend.promedio?.toFixed(1) || '0'}%</span>
            </div>
            <div class="rendimiento-detalle">
                <span class="label">Tareas completadas</span>
                <span class="value">${rend.tareas_completadas || 0}/${rend.tareas_totales || 0}</span>
            </div>
            <div class="rendimiento-detalle">
                <span class="label">Entregas tardías</span>
                <span class="value">${rend.entregas_tardias || 0}</span>
            </div>
        </div>
    `).join('');
}

// ============================================
// MOSTRAR TAREAS DEL ALUMNO
// ============================================
function mostrarTareas(tareas) {
    const tbody = document.getElementById('tareasTableBody');
    
    if (!tareas || tareas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No hay tareas asignadas</td></tr>';
        return;
    }
    
    tbody.innerHTML = tareas.map(tarea => {
        const estadoClass = tarea.estado === 'completada' ? 'estado-completada' :
                           tarea.estado === 'vencida' ? 'estado-vencida' : 'estado-pendiente';
        const estadoIcon = tarea.estado === 'completada' ? '✅' :
                          tarea.estado === 'vencida' ? '❌' : '⏳';
        
        let calificacionHtml = '-';
        let calificacionClass = '';
        if (tarea.calificacion !== null && tarea.calificacion !== undefined) {
            const calif = tarea.calificacion;
            calificacionHtml = `${calif}%`;
            calificacionClass = calif >= 80 ? 'calificacion-buena' :
                              calif >= 60 ? 'calificacion-regular' : 'calificacion-mala';
        }
        
        return `
            <tr>
                <td>${escapeHtml(tarea.equipo_nombre || '-')}</td>
                <td>${escapeHtml(tarea.titulo)}</td>
                <td><span class="${estadoClass}">${estadoIcon} ${escapeHtml(tarea.estado)}</span></td>
                <td class="${calificacionClass}">${calificacionHtml}</td>
                <td>${tarea.fecha_entrega ? formatearFecha(tarea.fecha_entrega) : '-'}</td>
                <td>
                    <button class="btn-ver-tarea" onclick="verTarea('${tarea._id}')">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// ============================================
// ACTUALIZAR GRÁFICA DE CALIFICACIONES
// ============================================
function actualizarGrafica(tareas) {
    const ctx = document.getElementById('graficaCalificaciones')?.getContext('2d');
    if (!ctx) return;
    
    // Filtrar solo tareas con calificación
    const tareasConCalif = tareas.filter(t => t.calificacion !== null && t.calificacion !== undefined);
    
    if (tareasConCalif.length === 0) {
        // Mostrar mensaje en la gráfica
        if (graficaCalificaciones) graficaCalificaciones.destroy();
        graficaCalificaciones = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Sin calificaciones'],
                datasets: [{
                    label: 'Calificación',
                    data: [0],
                    backgroundColor: 'rgba(148, 163, 184, 0.3)',
                    borderColor: 'rgba(148, 163, 184, 0.5)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: () => 'Sin calificaciones' } }
                },
                scales: {
                    y: { beginAtZero: true, max: 100, title: { display: true, text: 'Calificación (%)' } }
                }
            }
        });
        return;
    }
    
    const labels = tareasConCalif.map(t => t.titulo.length > 20 ? t.titulo.substring(0, 20) + '...' : t.titulo);
    const data = tareasConCalif.map(t => t.calificacion);
    const colors = data.map(val => val >= 80 ? 'rgba(16, 185, 129, 0.7)' :
                                 val >= 60 ? 'rgba(245, 158, 11, 0.7)' : 'rgba(239, 68, 68, 0.7)');
    const borderColors = data.map(val => val >= 80 ? 'rgba(16, 185, 129, 1)' :
                                   val >= 60 ? 'rgba(245, 158, 11, 1)' : 'rgba(239, 68, 68, 1)');
    
    if (graficaCalificaciones) graficaCalificaciones.destroy();
    
    graficaCalificaciones = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Calificación',
                data: data,
                backgroundColor: colors,
                borderColor: borderColors,
                borderWidth: 1,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: { 
                    beginAtZero: true, 
                    max: 100, 
                    title: { display: true, text: 'Calificación (%)' } 
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Calificación: ${context.raw}%`;
                        }
                    }
                }
            }
        }
    });
}

// ============================================
// VER TAREA
// ============================================
function verTarea(tareaId) {
    if (tareaId) {
        window.location.href = `../detalle_tarea.html?id=${tareaId}`;
    }
}

// ============================================
// INICIALIZAR
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Cargar tema
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
    
    cargarReporte();
});

console.log('🚀 Script de reporte-detalle.js cargado correctamente');