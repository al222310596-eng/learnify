// ============================================
// ARCHIVO: dashboard.js
// Lógica del dashboard principal
// ============================================

// ============================================
// CONFIGURACIÓN DE SOCKET.IO PARA DASHBOARD
// ============================================
const socket = io({
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 3
});

socket.on('connect', () => {
    console.log('🔌 Conectado al servidor de videollamadas');
});

socket.on('disconnect', () => {
    console.log('🔌 Desconectado del servidor de videollamadas');
});

const usuario = JSON.parse(localStorage.getItem('usuario'));

// Verificar sesión
if (!usuario) {
    window.location.href = 'iniciar_sesion.html';
}

// ============================================
// VARIABLES GLOBALES PARA DATOS REALES
// ============================================
let datosTareas = {
    completadas: 0,
    pendientes: 0,
    vencidas: 0,
    total: 0,
    entregas: []
};

// ============================================
// OBTENER USUARIO ACTUAL
// ============================================
function obtenerUsuarioActual() {
    try {
        const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
        return usuario;
    } catch (e) {
        console.error('Error al obtener usuario:', e);
        return {};
    }
}

// ============================================
// REGISTRAR ACTIVIDAD DEL USUARIO
// ============================================
async function registrarActividad(tipo, descripcion = '') {
    try {
        const usuario = JSON.parse(localStorage.getItem('usuario'));
        if (!usuario) return;
        
        await fetch('/api/registrar-actividad', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuario_id: usuario._id,
                tipo: tipo,
                descripcion: descripcion
            })
        });
        console.log(` Actividad registrada: ${tipo}`);
    } catch (error) {
        console.error('Error al registrar actividad:', error);
    }
}

// ============================================
// FORMATEAR FECHA
// ============================================
function formatearFecha(fecha) {
    if (!fecha) return '';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-MX');
}

// ============================================
// MOSTRAR INFORMACIÓN DEL USUARIO
// ============================================
function mostrarInfoUsuario() {
    const nombreElemento = document.getElementById('usuarioNombre');
    const rolElemento = document.getElementById('usuarioRol');
    
    if (nombreElemento) {
        nombreElemento.textContent = usuario.nombre;
    }
    
    if (rolElemento) {
        rolElemento.innerHTML = usuario.rol === 'maestro' 
            ? '<i class="fas fa-chalkboard-teacher"></i> Maestro / Líder de equipo' 
            : '<i class="fas fa-user-graduate"></i> Alumno / Miembro de equipo';
    }
}

// ============================================
// ESCAPAR HTML (seguridad)
// ============================================
function escapeHtml(texto) {
    if (!texto) return '';
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}

// ============================================
// NAVEGACIÓN DESDE EL DASHBOARD
// ============================================
function verDetalleEquipo(equipoId) {
    if (equipoId) {
        window.location.href = `pages/mis_equipos.html?equipo_id=${equipoId}`;
    } else {
        window.location.href = 'pages/mis_equipos.html';
    }
}

function verTodosEquipos() {
    window.location.href = 'pages/mis_equipos.html';
}

function verDetalleTarea(tareaId) {
    if (tareaId) {
        window.location.href = `pages/detalle_tarea.html?id=${tareaId}`;
    }
}

function verTodasTareas() {
    window.location.href = 'pages/tareas.html';
}

// ============================================
// CARGAR EQUIPOS DEL USUARIO
// ============================================
async function cargarEquipos() {
    const container = document.getElementById('equiposLista');
    
    if (!container) return;
    
    try {
        const respuesta = await fetch(`/api/equipos/${usuario._id}`);
        const resultado = await respuesta.json();
        
        if (resultado.exito && resultado.equipos && resultado.equipos.length > 0) {
            const equiposMostrar = resultado.equipos.slice(0, 3);
            container.innerHTML = equiposMostrar.map(equipo => `
                <div class="equipo-item clickeable" onclick="verDetalleEquipo('${equipo._id}')" style="cursor: pointer;">
                    <span class="equipo-nombre"><i class="fas fa-tag"></i> ${escapeHtml(equipo.nombre)}</span>
                    <span class="equipo-rol"><i class="fas fa-users"></i> ${equipo.total_miembros || 0} miembros</span>
                </div>
            `).join('');
            
            if (resultado.equipos.length > 3) {
                container.innerHTML += `<div style="text-align: center; margin-top: 0.5rem; font-size: 0.8rem; color: #94a3b8;"><i class="fas fa-ellipsis-h"></i> +${resultado.equipos.length - 3} más</div>`;
            }
        } else {
            container.innerHTML = `
                <div class="empty-message">
                    <i class="fas fa-info-circle"></i> Aún no tienes equipos.<br>
                    <a href="pages/mis_equipos.html" style="color: #667eea;"><i class="fas fa-plus-circle"></i> Crear o unirse a uno</a>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error al cargar equipos:', error);
        container.innerHTML = '<div class="empty-message"><i class="fas fa-exclamation-triangle"></i> Error al cargar equipos</div>';
    }
}

// ============================================
// CARGAR TAREAS PENDIENTES
// ============================================
async function cargarTareasPendientes() {
    const container = document.getElementById('tareasPendientesLista');
    
    if (!container) return;
    
    if (usuario.rol === 'alumno') {
        try {
            const respuesta = await fetch(`/api/tareas/alumno/${usuario._id}`);
            const resultado = await respuesta.json();
            
            if (resultado.exito && resultado.tareas && resultado.tareas.length > 0) {
                const tareasMostrar = resultado.tareas.slice(0, 5);
                container.innerHTML = tareasMostrar.map(tarea => {
                    const esLiderDeEsteEquipo = tarea.lider_id === usuario._id;
                    
                    return `
                        <div class="tarea-pendiente-item">
                            <div class="tarea-pendiente-info" onclick="verDetalleTarea('${tarea._id}')" style="cursor: pointer; flex: 1;">
                                <div class="tarea-pendiente-titulo"><i class="fas fa-tasks"></i> ${escapeHtml(tarea.titulo)}</div>
                                <div class="tarea-pendiente-equipo"><i class="fas fa-users"></i> ${escapeHtml(tarea.equipo_nombre)}</div>
                                ${tarea.fecha_limite ? `
                                    <div class="tarea-pendiente-fecha">
                                        <i class="fas fa-calendar-alt"></i> ${formatearFecha(tarea.fecha_limite)}
                                    </div>
                                ` : ''}
                            </div>
                            ${!esLiderDeEsteEquipo ? 
                                `<button onclick="event.stopPropagation(); entregarTareaDesdeDashboard('${tarea._id}', '${tarea.equipo_id}')" class="btn btn-entregar-pequeno"><i class="fas fa-upload"></i> Entregar</button>` : 
                                `<button onclick="event.stopPropagation(); verDetalleTareaLider('${tarea._id}', '${tarea.equipo_id}')" class="btn btn-ver-pequeno"><i class="fas fa-star"></i> Calificar</button>`
                            }                        
                        </div>
                    `;
                }).join('');
                
                if (resultado.tareas.length > 5) {
                    container.innerHTML += `<div class="ver-mas"><a href="pages/tareas.html"><i class="fas fa-arrow-right"></i> Ver más tareas</a></div>`;
                }
            } else {
                container.innerHTML = '<div class="empty-message"><i class="fas fa-inbox"></i> No tienes tareas pendientes</div>';
            }
        } catch (error) {
            console.error('Error:', error);
            container.innerHTML = '<div class="empty-message"><i class="fas fa-exclamation-triangle"></i> Error al cargar tareas</div>';
        }
    } else {
        // Para líder/maestro
        try {
            const respuesta = await fetch(`/api/tareas/lider/${usuario._id}`);
            const resultado = await respuesta.json();
            
            if (resultado.exito && resultado.tareas && resultado.tareas.length > 0) {
                const tareasMostrar = resultado.tareas.slice(0, 5);
                container.innerHTML = tareasMostrar.map(tarea => `
                    <div class="tarea-pendiente-item">
                        <div class="tarea-pendiente-info" onclick="verDetalleTarea('${tarea._id}')" style="cursor: pointer; flex: 1;">
                            <div class="tarea-pendiente-titulo"><i class="fas fa-tasks"></i> ${escapeHtml(tarea.titulo)}</div>
                            <div class="tarea-pendiente-equipo"><i class="fas fa-users"></i> ${escapeHtml(tarea.equipo_nombre)}</div>
                            <div class="tarea-pendiente-entregas"><i class="fas fa-paperclip"></i> Entregas: ${tarea.total_entregas || 0}</div>
                        </div>
                        <button onclick="event.stopPropagation(); verDetalleTareaLider('${tarea._id}', '${tarea.equipo_id}')" class="btn btn-ver-pequeno"><i class="fas fa-star"></i> Calificar</button>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<div class="empty-message"><i class="fas fa-inbox"></i> No hay tareas recientes en tus equipos</div>';
            }
        } catch (error) {
            console.error('Error:', error);
            container.innerHTML = '<div class="empty-message"><i class="fas fa-exclamation-triangle"></i> Error al cargar tareas</div>';
        }
    }
}

// ============================================
// ENTREGAR TAREA DESDE DASHBOARD
// ============================================
function entregarTareaDesdeDashboard(tareaId, equipoId) {
    window.location.href = `pages/entregar_tarea.html?tarea_id=${tareaId}&equipo_id=${equipoId}`;
}

// ============================================
// VER DETALLE TAREA (para líder)
// ============================================
function verDetalleTareaLider(tareaId, equipoId) {
    window.location.href = `pages/detalle_tarea.html?id=${tareaId}&equipo_id=${equipoId}`;
}

// ============================================
// CERRAR SESIÓN
// ============================================
function cerrarSesion() {
    localStorage.removeItem('usuario');
    window.location.href = 'bienvenida.html';
}

// ============================================
// CARGAR ESTADÍSTICAS REALES
// ============================================
async function cargarEstadisticasReales() {
    try {
        let respuesta;
        if (usuario.rol === 'alumno') {
            respuesta = await fetch(`/api/tareas/alumno/${usuario._id}`);
        } else {
            respuesta = await fetch(`/api/tareas/lider/${usuario._id}`);
        }
        
        const resultado = await respuesta.json();
        
        if (resultado.exito && resultado.tareas) {
            const tareas = resultado.tareas || [];
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            
            let completadas = 0;
            let pendientes = 0;
            let vencidas = 0;
            let entregas = [];
            
            tareas.forEach(tarea => {
                const estaCompletada = tarea.total_entregas > 0 || tarea.entregada === true;
                
                let estaVencida = false;
                if (tarea.fecha_limite) {
                    const fechaLimite = new Date(tarea.fecha_limite);
                    fechaLimite.setHours(0, 0, 0, 0);
                    estaVencida = fechaLimite < hoy && !estaCompletada;
                }
                
                if (estaCompletada) {
                    completadas++;
                } else if (estaVencida) {
                    vencidas++;
                } else {
                    pendientes++;
                }
                
                entregas.push({
                    titulo: tarea.titulo,
                    estado: estaCompletada ? 'completada' : (estaVencida ? 'vencida' : 'pendiente'),
                    fecha_limite: tarea.fecha_limite,
                    equipo: tarea.equipo_nombre || 'Sin equipo'
                });
            });
            
            datosTareas = {
                completadas,
                pendientes,
                vencidas,
                total: tareas.length,
                entregas
            };
            
            actualizarEstadisticasUI();
            cargarActividadReciente();
        } else {
            datosTareas = {
                completadas: 0,
                pendientes: 0,
                vencidas: 0,
                total: 0,
                entregas: []
            };
            actualizarEstadisticasUI();
            cargarActividadReciente();
        }
    } catch (error) {
        console.error('Error al cargar estadísticas reales:', error);
        document.getElementById('tareasCompletadas').innerHTML = '<i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i> Error';
        document.getElementById('tareasPendientesEstadisticas').innerHTML = '<i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i> Error';
        document.getElementById('tareasVencidas').innerHTML = '<i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i> Error';
        document.getElementById('totalTareas').textContent = '0';
    }
}

// ============================================
// ACTUALIZAR UI DE ESTADÍSTICAS
// ============================================
function actualizarEstadisticasUI() {
    const { completadas, pendientes, vencidas, total } = datosTareas;
    
    document.getElementById('tareasCompletadas').innerHTML = `<i class="fas fa-check-circle" style="color: #10b981;"></i> ${completadas}`;
    document.getElementById('tareasPendientesEstadisticas').innerHTML = `<i class="fas fa-hourglass-half" style="color: #f59e0b;"></i> ${pendientes}`;
    document.getElementById('tareasVencidas').innerHTML = `<i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i> ${vencidas}`;
    document.getElementById('totalTareas').textContent = total;
    
    const porcentajeCompletadas = total > 0 ? (completadas / total) * 100 : 0;
    const porcentajePendientes = total > 0 ? (pendientes / total) * 100 : 0;
    const porcentajeVencidas = total > 0 ? (vencidas / total) * 100 : 0;
    
    document.getElementById('progresoCompletadas').style.width = `${porcentajeCompletadas}%`;
    document.getElementById('progresoPendientes').style.width = `${porcentajePendientes}%`;
    document.getElementById('progresoVencidas').style.width = `${porcentajeVencidas}%`;
}

// ============================================
// CARGAR ACTIVIDAD RECIENTE
// ============================================
function cargarActividadReciente() {
    const container = document.getElementById('actividadLista');
    
    if (!container) return;
    
    const { entregas } = datosTareas;
    
    if (!entregas || entregas.length === 0) {
        container.innerHTML = `
            <div class="actividad-vacia">
                <i class="fas fa-info-circle"></i> No hay actividad reciente
            </div>
        `;
        return;
    }
    
    const ultimasActividades = entregas.slice(0, 5);
    
    const actividadesHTML = ultimasActividades.map((item, index) => {
        const icono = item.estado === 'completada' 
            ? '<i class="fas fa-check-circle" style="color: #10b981;"></i>' 
            : (item.estado === 'vencida' 
                ? '<i class="fas fa-exclamation-circle" style="color: #ef4444;"></i>' 
                : '<i class="fas fa-clock" style="color: #f59e0b;"></i>');
        
        const texto = item.estado === 'completada'
            ? `Completaste la tarea "${item.titulo}"`
            : (item.estado === 'vencida'
                ? `Tarea "${item.titulo}" está vencida`
                : `Tarea pendiente: "${item.titulo}"`);
        
        const fecha = item.fecha_limite 
            ? `Límite: ${formatearFecha(item.fecha_limite)}` 
            : 'Sin fecha límite';
        
        return `
            <div class="actividad-item">
                <div class="actividad-icono">${icono}</div>
                <div class="actividad-texto">${texto}</div>
                <div class="actividad-fecha"><i class="fas fa-calendar-alt"></i> ${fecha}</div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = actividadesHTML;
}

// ============================================
// GRÁFICA DE TAREAS (Chart.js)
// ============================================
let graficaTareas = null;

function inicializarGrafica() {
    const ctx = document.getElementById('graficaTareas').getContext('2d');
    
    graficaTareas = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Completadas', 'Pendientes', 'Vencidas'],
            datasets: [{
                label: 'Estado de Tareas',
                data: [
                    datosTareas.completadas || 0,
                    datosTareas.pendientes || 0,
                    datosTareas.vencidas || 0
                ],
                backgroundColor: [
                    'rgba(16, 185, 129, 0.7)',
                    'rgba(245, 158, 11, 0.7)',
                    'rgba(239, 68, 68, 0.7)'
                ],
                borderColor: [
                    'rgba(16, 185, 129, 1)',
                    'rgba(245, 158, 11, 1)',
                    'rgba(239, 68, 68, 1)'
                ],
                borderWidth: 1,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { 
                    position: 'top',
                    labels: {
                        color: '#1e293b'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.raw} tareas`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Número de tareas' },
                    ticks: {
                        stepSize: 1,
                        color: '#64748b'
                    }
                },
                x: {
                    title: { display: true, text: 'Estado' },
                    ticks: {
                        color: '#64748b'
                    }
                }
            }
        }
    });
}

function actualizarGrafica() {
    if (graficaTareas) {
        graficaTareas.data.datasets[0].data = [
            datosTareas.completadas || 0,
            datosTareas.pendientes || 0,
            datosTareas.vencidas || 0
        ];
        graficaTareas.update();
    }
}

// ============================================
// EXPORTAR GRÁFICA COMO PNG
// ============================================
function exportarGrafica() {
    const canvas = document.getElementById('graficaTareas');
    const link = document.createElement('a');
    link.download = 'grafica_tareas.png';
    link.href = canvas.toDataURL();
    link.click();
}

// ============================================
// GENERAR REPORTE
// ============================================
function generarReporte() {
    const { completadas, pendientes, vencidas, total, entregas } = datosTareas;
    
    let detalleTareas = '';
    if (entregas && entregas.length > 0) {
        detalleTareas = entregas.map((t, i) => {
            const estado = t.estado === 'completada' ? '✅ Completada' : 
                          (t.estado === 'vencida' ? '❌ Vencida' : '⏳ Pendiente');
            return `- ${t.titulo}: ${estado} (${t.equipo})`;
        }).join('\n');
    } else {
        detalleTareas = 'No hay tareas registradas';
    }
    
    const reporte = `
REPORTE DE TAREAS - ${new Date().toLocaleDateString('es-MX')}
========================================

[RESUMEN DE TAREAS]
- Tareas completadas: ${completadas}
- Tareas pendientes: ${pendientes}
- Tareas vencidas: ${vencidas}
- Total de tareas: ${total}

[DETALLE DE TAREAS]
${detalleTareas}

[PROMEDIO GENERAL]
Tasa de completación: ${total > 0 ? Math.round((completadas / total) * 100) : 0}%

Generado: ${new Date().toLocaleString('es-MX')}
    `;
    
    const blob = new Blob([reporte], { type: 'text/plain' });
    const link = document.createElement('a');
    link.download = `reporte_tareas_${new Date().toISOString().slice(0,10)}.txt`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
    
    alert('📄 Reporte generado y descargado');
}

// ============================================
// VIDEOLLAMADA (Jitsi Meet)
// ============================================
function configurarSeccionesVideo() {
    const usuario = obtenerUsuarioActual();
    const rol = usuario?.rol || 'alumno';
    console.log('🔍 Configurando secciones para rol:', rol);

    const maestroSection = document.getElementById('maestroVideoSection');
    const alumnoSection = document.getElementById('alumnoVideoSection');

    if (rol === 'maestro') {
        if (maestroSection) {
            maestroSection.style.display = 'block';
            console.log('✅ Mostrando sección maestro');
        }
        if (alumnoSection) {
            alumnoSection.style.display = 'none';
        }
    } else {
        if (maestroSection) {
            maestroSection.style.display = 'none';
        }
        if (alumnoSection) {
            alumnoSection.style.display = 'block';
            console.log('✅ Mostrando sección alumno');
        }
    }
}

let ventanaJitsi = null;
let intervaloJitsi = null;
let salaActualJitsi = null;

function abrirJitsiYMonitorear(link) {
    salaActualJitsi = link;
    ventanaJitsi = window.open(link, '_blank');
    
    if (!ventanaJitsi) {
        alert('⚠️ Por favor, permite las ventanas emergentes para abrir la videollamada');
        return;
    }
    
    const btnUnirse = document.getElementById('btnUnirseSala');
    if (btnUnirse) {
        btnUnirse.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Videollamada abierta';
        btnUnirse.style.background = '#10b981';
        btnUnirse.disabled = true;
    }
    
    if (intervaloJitsi) {
        clearInterval(intervaloJitsi);
    }
    
    intervaloJitsi = setInterval(function() {
        if (ventanaJitsi && ventanaJitsi.closed) {
            console.log('🔴 Ventana de Jitsi cerrada');
            limpiarSalaJitsi();
        }
    }, 2000);
    
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            if (ventanaJitsi && ventanaJitsi.closed) {
                console.log('🔴 Ventana de Jitsi cerrada (detectado al volver)');
                limpiarSalaJitsi();
            }
        }
    });
}

function limpiarSalaJitsi() {
    if (intervaloJitsi) {
        clearInterval(intervaloJitsi);
        intervaloJitsi = null;
    }
    
    ventanaJitsi = null;
    
    const container = document.getElementById('salaLinkContainer');
    if (container) {
        container.style.display = 'none';
    }
    
    const linkInput = document.getElementById('salaLink');
    if (linkInput) {
        linkInput.value = '';
    }
    
    localStorage.removeItem('sala_activa_jitsi');
    localStorage.removeItem('sala_activa');
    
    const btnUnirse = document.getElementById('btnUnirseSala');
    if (btnUnirse) {
        btnUnirse.innerHTML = '<i class="fas fa-door-open"></i> Unirse';
        btnUnirse.style.background = '#2b7a4b';
        btnUnirse.disabled = false;
    }
    
    const btnCrear = document.getElementById('btnCrearSalaJitsi');
    if (btnCrear) {
        btnCrear.innerHTML = '<i class="fas fa-video"></i> Crear sala con Jitsi (Gratis)';
        btnCrear.disabled = false;
    }
    
    if (salaActualJitsi) {
        const match = salaActualJitsi.match(/room=([^&]+)/);
        if (match && match[1]) {
            fetch(`/api/jitsi/eliminar-sala/${match[1]}`, {
                method: 'DELETE'
            }).catch(e => console.error('Error al eliminar sala:', e));
        }
        salaActualJitsi = null;
    }
    
    const usuario = obtenerUsuarioActual();
    if (usuario && usuario._id) {
        registrarActividad('jitsi_cerrar_sala', 'Cerró la videollamada de Jitsi');
    }
    
    console.log('🧹 Sala de Jitsi limpiada');
}

document.getElementById('btnCrearSalaJitsi')?.addEventListener('click', function() {
    const usuario = obtenerUsuarioActual();

    if (!usuario || !usuario._id) {
        alert('❌ Debes iniciar sesión primero');
        return;
    }

    this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando sala...';
    this.disabled = true;

    fetch('/api/jitsi/crear-sala', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            usuario_id: usuario._id,
            usuario_nombre: usuario.nombre
        })
    })
    .then(res => res.json())
    .then(data => {
        console.log('📥 Respuesta Jitsi:', data);
        
        if (data.exito) {
            const baseUrl = window.location.origin;
            const linkConParametros = `${baseUrl}/jitsi.html?room=${encodeURIComponent(data.sala_id)}&name=${encodeURIComponent(usuario.nombre)}&usuario_id=${encodeURIComponent(usuario._id)}`;
            
            document.getElementById('salaLink').value = linkConParametros;
            document.getElementById('salaLinkContainer').style.display = 'block';
            
            const salaActiva = {
                sala_id: data.sala_id,
                sala_url: data.sala_url,
                sala_name: data.sala_name,
                link: linkConParametros,
                creador_id: usuario._id,
                creador_nombre: usuario.nombre,
                timestamp: Date.now()
            };
            localStorage.setItem('sala_activa_jitsi', JSON.stringify(salaActiva));
            
            setTimeout(() => {
                abrirJitsiYMonitorear(linkConParametros);
            }, 500);
            
            this.innerHTML = '<i class="fas fa-check"></i> ¡Sala creada!';
            setTimeout(() => {
                this.innerHTML = '<i class="fas fa-video"></i> Crear sala con Jitsi (Gratis)';
                this.disabled = false;
            }, 3000);
        } else {
            alert('❌ Error al crear sala: ' + data.mensaje);
            this.innerHTML = '<i class="fas fa-video"></i> Crear sala con Jitsi (Gratis)';
            this.disabled = false;
        }
    })
    .catch(error => {
        console.error('❌ Error:', error);
        alert('❌ Error al crear la sala. Revisa la consola para más detalles.');
        this.innerHTML = '<i class="fas fa-video"></i> Crear sala con Jitsi (Gratis)';
        this.disabled = false;
    });
});

document.getElementById('btnCopiarLink')?.addEventListener('click', function() {
    const linkInput = document.getElementById('salaLink');
    linkInput.select();
    document.execCommand('copy');

    const textoOriginal = this.innerHTML;
    this.innerHTML = '<i class="fas fa-check"></i> ¡Copiado!';
    this.classList.add('btn-copiar-exito');
    setTimeout(() => {
        this.innerHTML = textoOriginal;
        this.classList.remove('btn-copiar-exito');
    }, 2000);
});

document.getElementById('btnUnirseSala')?.addEventListener('click', function() {
    const link = document.getElementById('salaLink').value;
    if (link) {
        abrirJitsiYMonitorear(link);
    }
});

document.getElementById('btnUnirseLink')?.addEventListener('click', function() {
    const link = document.getElementById('inputLinkSala').value.trim();

    if (!link) {
        alert('❌ Por favor, ingresa un link válido');
        return;
    }

    abrirJitsiYMonitorear(link);
});

document.getElementById('inputLinkSala')?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        document.getElementById('btnUnirseLink').click();
    }
});

function cargarSalaActivaJitsi() {
    try {
        const salaGuardada = localStorage.getItem('sala_activa_jitsi');
        if (salaGuardada) {
            const data = JSON.parse(salaGuardada);
            if (Date.now() - (data.timestamp || 0) < 86400000) {
                document.getElementById('salaLink').value = data.link;
                document.getElementById('salaLinkContainer').style.display = 'block';
                setTimeout(() => {
                    abrirJitsiYMonitorear(data.link);
                }, 500);
            } else {
                localStorage.removeItem('sala_activa_jitsi');
            }
        }
    } catch (e) {
        console.error('Error al cargar sala guardada de Jitsi:', e);
    }
}

// ============================================
// INICIALIZAR DASHBOARD
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando Dashboard');
    console.log('👤 Usuario:', obtenerUsuarioActual());
    
    registrarActividad('dashboard', 'Entró al dashboard');
    mostrarInfoUsuario();
    cargarEquipos();
    cargarTareasPendientes();
    
    cargarEstadisticasReales().then(() => {
        inicializarGrafica();
        actualizarGrafica();
    });
    
    configurarSeccionesVideo();
    cargarSalaActivaJitsi();
});