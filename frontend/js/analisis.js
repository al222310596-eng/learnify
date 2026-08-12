// ============================================
// ARCHIVO: analisis.js
// Lógica del panel de análisis (con datos REALES)
// ============================================

const usuario = JSON.parse(localStorage.getItem('usuario'));

if (!usuario) {
    window.location.href = '../../iniciar_sesion.html';
}

// Solo maestros pueden ver análisis
if (usuario.rol !== 'maestro') {
    alert('Solo los maestros tienen acceso a esta sección');
    window.location.href = '../../dashboard.html';
}

let graficaTareas = null;
let graficaDistribucion = null;
let equiposCache = [];

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
// CARGAR EQUIPOS DEL MAESTRO
// ============================================
async function cargarEquipos() {
    const selector = document.getElementById('selectorEquipo');
    
    try {
        const respuesta = await fetch(`/api/equipos/${usuario._id}`);
        const resultado = await respuesta.json();
        
        if (resultado.exito && resultado.equipos) {
            equiposCache = resultado.equipos;
            selector.innerHTML = '<option value="">Selecciona un equipo...</option>';
            
            equiposCache.forEach(equipo => {
                const option = document.createElement('option');
                option.value = equipo._id;
                option.textContent = `${equipo.nombre} (${equipo.total_miembros || 0} alumnos)`;
                selector.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error al cargar equipos:', error);
        selector.innerHTML = '<option value="">Error al cargar equipos</option>';
    }
}

// ============================================
// CARGAR DATOS DEL EQUIPO SELECCIONADO
// ============================================
async function cargarDatosEquipo(equipoId) {
    // Registrar actividad al ver análisis
    registrarActividad('ver_analisis', `Viendo análisis del equipo ${equipoId}`);
        if (!equipoId) return;
    
    // Mostrar loading
    document.getElementById('totalAlumnos').textContent = '...';
    document.getElementById('promedioGeneral').textContent = '...';
    document.getElementById('alumnosRiesgo').textContent = '...';
    document.getElementById('asistenciaPromedio').textContent = '...';
    
    try {
        // 1. Cargar estadísticas generales
        const statsResp = await fetch(`/api/analisis/equipo/${equipoId}`);
        const statsResult = await statsResp.json();
        
        if (statsResult.exito) {
            const stats = statsResult.estadisticas;
            document.getElementById('totalAlumnos').textContent = stats.total_alumnos || 0;
            document.getElementById('promedioGeneral').textContent = stats.promedio_general?.toFixed(1) || '0';
            document.getElementById('alumnosRiesgo').textContent = stats.alumnos_riesgo || 0;
            // Por ahora la asistencia es un placeholder
            document.getElementById('asistenciaPromedio').textContent = '85%';
        }
        
        // 2. Cargar gráficas
        const graficasResp = await fetch(`/api/analisis/graficas/${equipoId}`);
        const graficasResult = await graficasResp.json();
        
        if (graficasResult.exito) {
            actualizarGraficas(graficasResult);
        }
        
        // 3. Cargar tabla de alumnos en riesgo
        const riesgoResp = await fetch(`/api/analisis/riesgo/${equipoId}`);
        const riesgoResult = await riesgoResp.json();

        if (riesgoResult.exito) {
            actualizarTablaAlumnos(riesgoResult.alumnos);
            actualizarMetricas(riesgoResult.alumnos);  // ← NUEVA LÍNEA
        }

        // 4. Cargar segmentación
        await cargarSegmentacion(equipoId);

        // 5. Cargar detección de abandono
        await cargarAbandono(equipoId);

    } 
    
    catch (error) {
        console.error('Error al cargar datos:', error);
        mostrarMensaje('error', 'Error al cargar datos del equipo');
    }
}

// ============================================
// ACTUALIZAR GRÁFICAS
// ============================================
function actualizarGraficas(data) {
    const ctxTareas = document.getElementById('graficaTareas')?.getContext('2d');
    const ctxDistribucion = document.getElementById('graficaDistribucion')?.getContext('2d');
    
    if (!ctxTareas || !ctxDistribucion) return;
    
    // Gráfica de tareas
    const tareasLabels = data.tareas.map(t => t.titulo.substring(0, 20));
    const tareasData = data.tareas.map(t => t.promedio);
    
    if (graficaTareas) graficaTareas.destroy();
    graficaTareas = new Chart(ctxTareas, {
        type: 'bar',
        data: {
            labels: tareasLabels,
            datasets: [{
                label: 'Calificación promedio',
                data: tareasData,
                backgroundColor: 'rgba(102, 126, 234, 0.7)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 1,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: { beginAtZero: true, max: 100, title: { display: true, text: 'Calificación (%)' } }
            }
        }
    });
    
    // Gráfica de distribución
    const distribucionLabels = Object.keys(data.distribucion);
    const distribucionData = Object.values(data.distribucion);
    
    if (graficaDistribucion) graficaDistribucion.destroy();
    graficaDistribucion = new Chart(ctxDistribucion, {
        type: 'pie',
        data: {
            labels: distribucionLabels,
            datasets: [{
                data: distribucionData,
                backgroundColor: ['#ef4444', '#f59e0b', '#eab308', '#10b981', '#3b82f6'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

// ============================================
// ACTUALIZAR TABLA DE ALUMNOS
// ============================================
function actualizarTablaAlumnos(alumnos) {
    const tbody = document.getElementById('alumnosTableBody');
    
    if (!tbody) return;
    
    if (!alumnos || alumnos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No hay alumnos en este equipo</td></tr>';
        return;
    }
    
    const getRiesgoClass = (nivel) => {
        switch(nivel) {
            case 'Alto': return 'riesgo-alto';
            case 'Medio': return 'riesgo-medio';
            case 'Bajo': return 'riesgo-bajo';
            default: return 'riesgo-sin';
        }
    };
    
    tbody.innerHTML = alumnos.map(alumno => `
        <tr>
            <td><strong>${escapeHtml(alumno.nombre)}</strong></td>
            <td>${alumno.promedio?.toFixed(1) || '0'}%</td>
            <td>${alumno.tareas_completadas || 0}/${alumno.tareas_totales || 0}</td>
            <td>${alumno.entregas_tardias || 0}</td>
            <td><span class="${getRiesgoClass(alumno.nivel_riesgo)}">${alumno.nivel_riesgo}</span></td>
            <td><button class="btn-ver-alumno" onclick="verDetalleAlumno('${alumno._id}')">Ver detalles</button></td>
        </tr>
    `).join('');
}

// ============================================
// ACTUALIZAR MÉTRICAS DE DETECCIÓN
// ============================================
function actualizarMetricas(alumnos) {
    if (!alumnos || alumnos.length === 0) return;
    
    // Calcular métricas basadas en los datos reales de los alumnos
    let totalAlumnos = alumnos.length;
    let bajoRendimiento = 0;
    let pocaParticipacion = 0;
    let entregasTardias = 0;
    let riesgoReprobacion = 0;
    
    alumnos.forEach(alumno => {
        // Bajo rendimiento: promedio < 70
        if (alumno.promedio < 70) bajoRendimiento++;
        
        // Poca participación: menos del 50% de tareas completadas
        let porcentajeCompletadas = alumno.tareas_totales > 0 
            ? (alumno.tareas_completadas / alumno.tareas_totales) * 100 
            : 0;
        if (porcentajeCompletadas < 50) pocaParticipacion++;
        
        // Entregas tardías: más de 2 entregas tardías
        if (alumno.entregas_tardias > 2) entregasTardias++;
        
        // Riesgo reprobación: promedio < 60
        if (alumno.promedio < 60) riesgoReprobacion++;
    });
    
    // Actualizar los valores en el DOM
    const metricasContainer = document.querySelector('.metricas-grid');
    if (metricasContainer) {
        metricasContainer.innerHTML = `
            <div class="metrica-card">
                <i class="fas fa-chart-line"></i>
                <h4>Bajo Rendimiento</h4>
                <p class="metrica-valor">${bajoRendimiento} / ${totalAlumnos} alumnos</p>
                <p class="metrica-umbral">Promedio &lt; 70%</p>
                <div class="metrica-bar">
                    <div class="metrica-progreso" style="width: ${(bajoRendimiento / totalAlumnos) * 100}%; background: #ef4444;"></div>
                </div>
            </div>
            <div class="metrica-card">
                <i class="fas fa-comments"></i>
                <h4>Poca Participación</h4>
                <p class="metrica-valor">${pocaParticipacion} / ${totalAlumnos} alumnos</p>
                <p class="metrica-umbral">&lt; 50% de tareas</p>
                <div class="metrica-bar">
                    <div class="metrica-progreso" style="width: ${(pocaParticipacion / totalAlumnos) * 100}%; background: #f59e0b;"></div>
                </div>
            </div>
            <div class="metrica-card">
                <i class="fas fa-clock"></i>
                <h4>Entregas Tardías</h4>
                <p class="metrica-valor">${entregasTardias} / ${totalAlumnos} alumnos</p>
                <p class="metrica-umbral">&gt; 2 entregas tardías</p>
                <div class="metrica-bar">
                    <div class="metrica-progreso" style="width: ${(entregasTardias / totalAlumnos) * 100}%; background: #f59e0b;"></div>
                </div>
            </div>
            <div class="metrica-card">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>Riesgo Reprobación</h4>
                <p class="metrica-valor">${riesgoReprobacion} / ${totalAlumnos} alumnos</p>
                <p class="metrica-umbral">Promedio &lt; 60%</p>
                <div class="metrica-bar">
                    <div class="metrica-progreso" style="width: ${(riesgoReprobacion / totalAlumnos) * 100}%; background: #dc2626;"></div>
                </div>
            </div>
        `;
    }
}

// ============================================
// MOSTRAR MENSAJE
// ============================================
function mostrarMensaje(tipo, texto) {
    const mensajeDiv = document.getElementById('mensaje');
    if (!mensajeDiv) return;
    
    const icono = tipo === 'exito' ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-exclamation-triangle"></i>';
    mensajeDiv.className = `mensaje ${tipo}`;
    mensajeDiv.innerHTML = `${icono} ${texto}`;
    mensajeDiv.style.display = 'block';
    
    setTimeout(() => {
        mensajeDiv.style.display = 'none';
    }, 3000);
}

// ============================================
// CARGAR SEGMENTACIÓN
// ============================================
async function cargarSegmentacion(equipoId) {
    try {
        const respuesta = await fetch(`/api/analisis/segmentacion/${equipoId}`);
        const resultado = await respuesta.json();
        
        if (resultado.exito) {
            const seg = resultado.segmentacion;
            const totalAlumnos = seg.desempeno.alto_count + seg.desempeno.regular_count + seg.desempeno.bajo_count;
            
            // Desempeño
            actualizarBarra('barraAlto', seg.desempeno.alto_count, totalAlumnos);
            actualizarBarra('barraRegular', seg.desempeno.regular_count, totalAlumnos);
            actualizarBarra('barraBajo', seg.desempeno.bajo_count, totalAlumnos);
            document.getElementById('altoCount').textContent = seg.desempeno.alto_count;
            document.getElementById('regularCount').textContent = seg.desempeno.regular_count;
            document.getElementById('bajoCount').textContent = seg.desempeno.bajo_count;
            
            // Participación
            actualizarBarra('barraPartAlta', seg.participacion.alta_count, totalAlumnos);
            actualizarBarra('barraPartMedia', seg.participacion.media_count, totalAlumnos);
            actualizarBarra('barraPartBaja', seg.participacion.baja_count, totalAlumnos);
            document.getElementById('partAltaCount').textContent = seg.participacion.alta_count;
            document.getElementById('partMediaCount').textContent = seg.participacion.media_count;
            document.getElementById('partBajaCount').textContent = seg.participacion.baja_count;
            
            // Comportamiento
            actualizarBarra('barraCompPositivo', seg.comportamiento.positivo_count, totalAlumnos);
            actualizarBarra('barraCompNeutro', seg.comportamiento.neutro_count, totalAlumnos);
            actualizarBarra('barraCompNegativo', seg.comportamiento.negativo_count, totalAlumnos);
            document.getElementById('compPositivoCount').textContent = seg.comportamiento.positivo_count;
            document.getElementById('compNeutroCount').textContent = seg.comportamiento.neutro_count;
            document.getElementById('compNegativoCount').textContent = seg.comportamiento.negativo_count;
        }
    } catch (error) {
        console.error('Error al cargar segmentación:', error);
    }
}

function actualizarBarra(id, valor, total) {
    const porcentaje = total > 0 ? (valor / total) * 100 : 0;
    const barra = document.getElementById(id);
    if (barra) {
        barra.style.width = `${porcentaje}%`;
    }
}

// ============================================
// CARGAR DETECCIÓN DE ABANDONO
// ============================================
async function cargarAbandono(equipoId) {
    try {
        const respuesta = await fetch(`/api/analisis/abandono/${equipoId}`);
        const resultado = await respuesta.json();
        
        if (resultado.exito) {
            // Actualizar resumen
            document.getElementById('altoRiesgoCount').textContent = resultado.resumen.alto_riesgo;
            document.getElementById('medioRiesgoCount').textContent = resultado.resumen.medio_riesgo;
            document.getElementById('bajoRiesgoCount').textContent = resultado.resumen.bajo_riesgo;
            
            // Actualizar tabla
            const tbody = document.getElementById('abandonoTableBody');
            
            if (!resultado.abandono || resultado.abandono.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6">No hay datos suficientes</td></tr>';
                return;
            }
            
            tbody.innerHTML = resultado.abandono.map(alumno => {
                let riesgoClass = '';
                if (alumno.nivel_riesgo_abandono === 'Alto') riesgoClass = 'riesgo-alto';
                else if (alumno.nivel_riesgo_abandono === 'Medio') riesgoClass = 'riesgo-medio';
                else riesgoClass = 'riesgo-bajo';
                
                const alertasHtml = `
                    <span title="Actividad"><i class="fas fa-calendar-alt ${alumno.alertas.actividad ? 'text-red' : 'text-green'}"></i></span>
                    <span title="Tareas"><i class="fas fa-tasks ${alumno.alertas.tareas ? 'text-red' : 'text-green'}"></i></span>
                    <span title="Chat"><i class="fas fa-comments ${alumno.alertas.chat ? 'text-red' : 'text-green'}"></i></span>
                `;
                
                return `
                    <tr>
                        <td><strong>${escapeHtml(alumno.nombre)}</strong></td>
                        <td>${alumno.dias_inactivo} días</td>
                        <td>${alumno.tareas_pendientes}</td>
                        <td>${alumno.mensajes_recientes}</td>
                        <td><span class="${riesgoClass}">${alumno.nivel_riesgo_abandono}</span></td>
                        <td>${alertasHtml}</td>
                    </tr>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error al cargar abandono:', error);
    }
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

function verDetalleAlumno(alumnoId) {
    window.location.href = `reporte_detalle.html?alumno_id=${alumnoId}`;
}

// ============================================
// EVENTOS
// ============================================
document.getElementById('selectorEquipo')?.addEventListener('change', (e) => {
    const equipoId = e.target.value;
    if (equipoId) {
        cargarDatosEquipo(equipoId);
        // cargarAbandono(equipoId); ← NO es necesario, ya está dentro de cargarDatosEquipo
    }
});


// ============================================
// INICIALIZAR
// ============================================
cargarEquipos();