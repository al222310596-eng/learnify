// ============================================
// ARCHIVO: vizualizacion.js
// Visualización General - Gráficas Avanzadas
// ============================================
console.log('Iniciando vizualizacion.js');
// ============================================
// VARIABLES GLOBALES
// ============================================
let vizGraficas = {
    barras: null,
    lineas: null,
    dona: null,
    dispersion: null,
    histograma: null,
    area: null,
    agrupadas: null,
    pastel: null
};
let datosViz = null;
// ============================================
// COLORES
// ============================================
const COLOR_ROJO = '#ef4444';
const COLOR_AMARILLO = '#facc15';
const COLOR_VERDE = '#22c55e';
const COLOR_BLANCO = '#ffffff';
const COLOR_TEXTO = '#64748b';
const COLOR_ETIQUETA = '#1e293b';
const COLOR_SIN_DATOS = '#94a3b8';
// ============================================
// FUNCIONES PARA DATOS
// ============================================
function obtenerNombreEquipo() {
    if (datosViz && datosViz.equipo && datosViz.equipo.nombre) {
        return datosViz.equipo.nombre;
    }
    return 'Equipo sin nombre';
}
// ============================================
// OBTENER CALIFICACIONES REALES
// ============================================
function obtenerCalificacionesAlumno(alumno) {
    if (alumno && Array.isArray(alumno.calificaciones)) {
        return alumno.calificaciones
            .filter(valor => valor !== null && valor !== undefined && valor !== '' && Number.isFinite(Number(valor)))
            .map(valor => Number(valor));
    }
    return [];
}
// ============================================
// SABER SI REALMENTE TIENE CALIFICACIONES
// ============================================
function tieneCalificacion(alumno) {
    const calificaciones = obtenerCalificacionesAlumno(alumno);
    if (calificaciones.length > 0) {
        return true;
    }
    if (alumno && alumno.promedio !== null && alumno.promedio !== undefined && alumno.promedio !== '' && Number.isFinite(Number(alumno.promedio)) && Number(alumno.promedio) > 0) {
        return true;
    }
    return false;
}
// ============================================
// OBTENER PROMEDIO
// ============================================
function obtenerPromedioAlumno(alumno) {
    if (!tieneCalificacion(alumno)) {
        return null;
    }
    const promedio = Number(alumno.promedio);
    if (Number.isFinite(promedio)) {
        return promedio;
    }
    const calificaciones = obtenerCalificacionesAlumno(alumno);
    if (calificaciones.length === 0) {
        return null;
    }
    return calificaciones.reduce((a, b) => a + b, 0) / calificaciones.length;
}
// ============================================
// COLOR SEGÚN CALIFICACIÓN
// ============================================
function colorPorCalificacion(valor) {
    if (valor === null || valor === undefined || !Number.isFinite(Number(valor))) {
        return COLOR_SIN_DATOS;
    }
    valor = Number(valor);
    if (valor < 60) {
        return COLOR_ROJO;
    }
    if (valor < 80) {
        return COLOR_AMARILLO;
    }
    return COLOR_VERDE;
}
// ============================================
// COLOR SEGÚN RIESGO
// ============================================
function colorPorRiesgo(riesgo) {
    if (riesgo === 'Alto') {
        return COLOR_ROJO;
    }
    if (riesgo === 'Medio' || riesgo === 'Bajo') {
        return COLOR_AMARILLO;
    }
    return COLOR_VERDE;
}
// ============================================
// ORDEN PARA GRÁFICA DE BARRAS
// ============================================
function categoriaOrdenBarra(alumno) {
    const promedio = obtenerPromedioAlumno(alumno);
    if (promedio === null) {
        return 0;
    }
    if (promedio < 60) {
        return 1;
    }
    if (promedio < 80) {
        return 2;
    }
    return 3;
}
// ============================================
// PLUGIN PARA ETIQUETAS PERMANENTES
// ============================================
const etiquetasPermanentes = {
    id: 'etiquetasPermanentes',
    afterDatasetsDraw(chart) {
        const ctx = chart.ctx;
        if (!ctx) {
            return;
        }
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const tipo = chart.config.type;
        // ====================================
        // ETIQUETAS DE BARRAS
        // ====================================
        if (tipo === 'bar') {
            chart.data.datasets.forEach((dataset, datasetIndex) => {
                const meta = chart.getDatasetMeta(datasetIndex);
                meta.data.forEach((element, index) => {
                    const valor = dataset.data[index];
                    const x = element.x;
                    let y = element.y;
                    // ------------------------
                    // SIN DATOS
                    // ------------------------
                    if (valor === null || valor === undefined || valor === '') {
                        if (chart.scales && chart.scales.y) {
                            y = chart.scales.y.getPixelForValue(0) - 14;
                        }
                        ctx.font = 'bold 9px Arial';
                        ctx.fillStyle = COLOR_SIN_DATOS;
                        ctx.fillText('Sin calificación', x, y);
                        return;
                    }
                    // ------------------------
                    // VALOR
                    // ------------------------
                    let texto = '';
                    if (chart.canvas.id === 'vizGraficaHistograma') {
                        texto = `${Number(valor).toFixed(0)}`;
                    } else {
                        texto = `${Number(valor).toFixed(1)}%`;
                    }
                    ctx.font = 'bold 11px Arial';
                    ctx.fillStyle = COLOR_ETIQUETA;
                    y = element.y - 10;
                    ctx.fillText(texto, x, y);
                });
            });
        }
        // ====================================
        // ETIQUETAS DE LÍNEAS Y ÁREA
        // ====================================
        if (tipo === 'line') {
            chart.data.datasets.forEach((dataset, datasetIndex) => {
                const meta = chart.getDatasetMeta(datasetIndex);
                meta.data.forEach((element, index) => {
                    const valor = dataset.data[index];
                    if (valor === null || valor === undefined || valor === '') {
                        return;
                    }
                    if (typeof valor === 'object') {
                        return;
                    }
                    const x = element.x;
                    const y = element.y;
                    ctx.font = 'bold 10px Arial';
                    const sinCalificacion = dataset._sinCalificaciones && dataset._sinCalificaciones[index];
                    ctx.fillStyle = sinCalificacion ? COLOR_SIN_DATOS : COLOR_ETIQUETA;
                    if (sinCalificacion) {
                        ctx.font = 'bold 9px Arial';
                        ctx.fillText('Sin calificación', x, y - 14);
                    } else {
                        ctx.font = 'bold 10px Arial';
                        ctx.fillText(`${Number(valor).toFixed(1)}%`, x, y - 14);
                    }
                });
            });
        }
        // ====================================
        // ETIQUETAS DE DISPERSIÓN
        // ====================================
        if (tipo === 'scatter') {
            chart.data.datasets.forEach((dataset, datasetIndex) => {
                const meta = chart.getDatasetMeta(datasetIndex);
                meta.data.forEach((element, index) => {
                    const punto = dataset.data[index];
                    if (!punto || punto.y === null || punto.y === undefined) {
                        return;
                    }
                    const x = element.x;
                    const y = element.y;
                    ctx.textAlign = 'left';
                    ctx.font = 'bold 9px Arial';
                    ctx.fillStyle = COLOR_ETIQUETA;
                    const nombre = punto.nombre || 'Estudiante';
                    ctx.fillText(nombre, x + 10, y - 10);
                    ctx.font = '9px Arial';
                    ctx.fillText(`P: ${Number(punto.x).toFixed(1)}%`, x + 10, y + 2);
                    ctx.fillText(`C: ${Number(punto.y).toFixed(1)}%`, x + 10, y + 14);
                    ctx.textAlign = 'center';
                });
            });
        }
        // ====================================
        // ETIQUETAS DE DONA Y PASTEL
        // ====================================
        if (tipo === 'doughnut' || tipo === 'pie') {
            chart.data.datasets.forEach((dataset, datasetIndex) => {
                const meta = chart.getDatasetMeta(datasetIndex);
                const total = dataset.data.reduce((a, b) => a + (Number(b) || 0), 0);
                meta.data.forEach((element, index) => {
                    const valor = Number(dataset.data[index]) || 0;
                    if (valor <= 0 || total <= 0) {
                        return;
                    }
                    let punto;
                    if (typeof element.getCenterPoint === 'function') {
                        punto = element.getCenterPoint();
                    } else {
                        punto = { x: element.x, y: element.y };
                    }
                    const porcentaje = (valor / total) * 100;
                    ctx.font = 'bold 10px Arial';
                    ctx.fillStyle = COLOR_ETIQUETA;
                    ctx.fillText(`${valor} (${porcentaje.toFixed(1)}%)`, punto.x, punto.y);
                });
            });
        }
        // ====================================
        // MENSAJE DE SIN DATOS
        // ====================================
        if (chart.canvas.id === 'vizGraficaBarras') {
            const tieneSinDatos = chart.data.datasets.some(dataset =>
                dataset.data.some(valor => valor === null || valor === undefined)
            );
            if (tieneSinDatos) {
                const area = chart.chartArea;
                ctx.textAlign = 'center';
                ctx.font = 'bold 10px Arial';
                ctx.fillStyle = COLOR_SIN_DATOS;
                ctx.fillText('Sin calificación: significa que el alumno no ha entregado tareas.', (area.left + area.right) / 2, area.bottom + 32);
            }
        }
        ctx.restore();
    }
};
// ============================================
// REGISTRAR PLUGIN
// ============================================
if (typeof Chart !== 'undefined') {
    try {
        Chart.register(etiquetasPermanentes);
    } catch (error) {
        console.warn('El plugin de etiquetas ya estaba registrado.');
    }
}
// ============================================
// ACTUALIZAR TÍTULOS Y SUBTÍTULOS
// ============================================
function actualizarTitulosGraficas() {
    const equipo = obtenerNombreEquipo();
    const titulos = {
        vizGraficaBarras: `Distribución de Calificaciones del equipo "${equipo}", periodo Enero a Diciembre del 2026`,
        vizGraficaLineas: `Tendencia de Rendimiento del equipo "${equipo}", periodo Enero a Diciembre del 2026`,
        vizGraficaDona: `Distribución de Riesgo del equipo "${equipo}", periodo Enero a Diciembre del 2026`,
        vizGraficaDispersion: `Relación entre Participación y Calificación del equipo "${equipo}", periodo Enero a Diciembre del 2026`,
        vizGraficaHistograma: `Distribución de Calificaciones del equipo "${equipo}", periodo Enero a Diciembre del 2026`,
        vizGraficaArea: `Rendimiento Académico del equipo "${equipo}", periodo Enero a Diciembre del 2026`,
        vizGraficaAgrupadas: `Distribución por Nivel de Riesgo del equipo "${equipo}", periodo Enero a Diciembre del 2026`,
        vizGraficaPastel: `Distribución de Calificaciones del equipo "${equipo}", periodo Enero a Diciembre del 2026`
    };
    const subtitulos = {
        vizGraficaBarras: 'Comparación de los promedios académicos de cada estudiante para identificar niveles de rendimiento y posibles situaciones de riesgo.',
        vizGraficaLineas: 'Evolución de las calificaciones obtenidas en las diferentes tareas para observar cambios y tendencias en el desempeño académico.',
        vizGraficaDona: 'Proporción de estudiantes clasificados en alto riesgo, riesgo medio, riesgo bajo y sin riesgo de acuerdo con su rendimiento académico.',
        vizGraficaDispersion: 'Relación entre el porcentaje de participación en las actividades y el promedio académico obtenido por cada estudiante.',
        vizGraficaHistograma: 'Frecuencia de las calificaciones registradas para identificar los rangos donde se concentra el rendimiento académico del equipo.',
        vizGraficaArea: 'Comparación visual del promedio académico de los estudiantes para identificar diferencias y tendencias generales de rendimiento.',
        vizGraficaAgrupadas: 'Cantidad de estudiantes que pertenecen a cada nivel de riesgo académico dentro del equipo.',
        vizGraficaPastel: 'Distribución porcentual de las calificaciones agrupadas por rangos de desempeño académico.'
    };
    Object.keys(titulos).forEach(canvasId => {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            return;
        }
        const card = canvas.closest('.viz-card');
        if (!card) {
            return;
        }
        const titulo = card.querySelector('.viz-card-header h4');
        const subtitulo = card.querySelector('.viz-card-subtitle');
        if (titulo) {
            const icono = titulo.querySelector('i');
            titulo.innerHTML = '';
            if (icono) {
                titulo.appendChild(icono);
            }
            titulo.appendChild(document.createTextNode(` ${titulos[canvasId]}`));
        }
        if (subtitulo) {
            subtitulo.textContent = subtitulos[canvasId];
        }
    });
}
// ============================================
// MOSTRAR CONCLUSIÓN
// ============================================
function mostrarConclusion(elementId, texto, tipo = 'general') {
    const elemento = document.getElementById(elementId);
    if (!elemento) {
        return;
    }
    let color = COLOR_VERDE;
    if (tipo === 'riesgo') {
        color = COLOR_ROJO;
    } else if (tipo === 'medio') {
        color = COLOR_AMARILLO;
    }
    elemento.innerHTML = `
        <div class="viz-conclusion" style="border-left-color: ${color};">
            <div class="viz-conclusion-title">
                <i class="fas fa-lightbulb"></i>
                Conclusión
            </div>
            <div class="viz-conclusion-text">
                ${texto}
            </div>
        </div>
    `;
}
// ============================================
// EXPORTAR GRÁFICA
// ============================================
function exportarGrafica(canvasId, nombre) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        alert('No se encontró la gráfica.');
        return;
    }
    const link = document.createElement('a');
    link.download = `${nombre}_${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
}
// ============================================
// DESTRUIR TODAS LAS GRÁFICAS
// ============================================
function destruirTodasLasGraficas() {
    Object.keys(vizGraficas).forEach(nombre => {
        if (vizGraficas[nombre]) {
            try {
                vizGraficas[nombre].destroy();
            } catch (error) {
                console.warn(`No se pudo destruir la gráfica ${nombre}:`, error);
            }
            vizGraficas[nombre] = null;
        }
    });
}
// ============================================
// LIMPIAR CANVAS
// ============================================
function limpiarCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        return;
    }
    const contexto = canvas.getContext('2d');
    if (!contexto) {
        return;
    }
    contexto.clearRect(0, 0, canvas.width, canvas.height);
}
// ============================================
// CARGAR DATOS
// ============================================
async function cargarDatosVisualizacion(equipoId) {
    try {
        console.log('Cargando datos de visualización...');
        console.log('Equipo solicitado:', equipoId);
        destruirTodasLasGraficas();
        const respuesta = await fetch(`/api/analisis/vizualizacion/${equipoId}`);
        const resultado = await respuesta.json();
        if (resultado.exito) {
            datosViz = resultado;
            console.log('Datos recibidos:', datosViz);
            actualizarTitulosGraficas();
            detectarOutliers(datosViz.alumnos || []);
            actualizarTodasGraficas();
        } else {
            console.error('Error:', resultado.mensaje);
            destruirTodasLasGraficas();
        }
    } catch (error) {
        console.error('Error al cargar visualización:', error);
        destruirTodasLasGraficas();
    }
}
// ============================================
// DETECTAR OUTLIERS
// ============================================
function detectarOutliers(alumnos) {
    const container = document.getElementById('outliersContainer');
    const badge = document.getElementById('outliersBadge');
    if (!alumnos || alumnos.length === 0) {
        if (container) {
            container.innerHTML = `<div class="viz-loading">No hay datos suficientes.</div>`;
        }
        if (badge) {
            badge.textContent = 'Sin datos';
        }
        return;
    }
    const promedios = alumnos.map(a => obtenerPromedioAlumno(a) ?? 0);
    const nombres = alumnos.map(a => a.nombre);
    const sorted = [...promedios].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const limiteInferior = q1 - 1.5 * iqr;
    const limiteSuperior = q3 + 1.5 * iqr;
    const outliers = [];
    promedios.forEach((promedio, index) => {
        if (promedio < limiteInferior || promedio > limiteSuperior) {
            outliers.push({
                nombre: nombres[index],
                promedio: promedio,
                tipo: promedio < limiteInferior ? 'bajo' : 'alto'
            });
        }
    });
    if (!container || !badge) {
        return;
    }
    if (outliers.length === 0) {
        container.innerHTML = `
            <div class="viz-outlier-card" style="border-left-color: ${COLOR_VERDE};">
                <span class="outlier-name" style="color: ${COLOR_VERDE};">
                    <i class="fas fa-check-circle"></i>
                    No se detectaron valores atípicos.
                </span>
            </div>
        `;
        badge.textContent = 'Sin outliers';
        badge.className = 'viz-badge no-outliers';
    } else {
        container.innerHTML = outliers.map(outlier => `
            <div class="viz-outlier-card">
                <span class="outlier-name">${outlier.nombre}</span>
                <span class="outlier-value">${outlier.promedio.toFixed(1)}%</span>
            </div>
        `).join('');
        badge.textContent = `${outliers.length} outlier(s)`;
        badge.className = 'viz-badge has-outliers';
    }
}
// ============================================
// ACTUALIZAR TODAS LAS GRÁFICAS
// ============================================
function actualizarTodasGraficas() {
    if (!datosViz) {
        return;
    }
    console.log('Actualizando gráficas para el equipo:', obtenerNombreEquipo());
    actualizarGraficaBarras();
    actualizarGraficaLineas();
    actualizarGraficaDona();
    actualizarGraficaDispersion();
    actualizarGraficaHistograma();
    actualizarGraficaArea();
    actualizarGraficaAgrupadas();
    actualizarGraficaPastel();
}
// ============================================
// 1. GRÁFICA DE BARRAS
// ============================================
function actualizarGraficaBarras() {
    const ctx = document.getElementById('vizGraficaBarras');
    if (!ctx || !datosViz) {
        return;
    }
    const alumnos = [...(datosViz.alumnos || [])];
    alumnos.sort((a, b) => {
        const categoriaA = categoriaOrdenBarra(a);
        const categoriaB = categoriaOrdenBarra(b);
        if (categoriaA !== categoriaB) {
            return categoriaA - categoriaB;
        }
        const promedioA = obtenerPromedioAlumno(a);
        const promedioB = obtenerPromedioAlumno(b);
        if (promedioA === null && promedioB === null) {
            return 0;
        }
        if (promedioA === null) {
            return -1;
        }
        if (promedioB === null) {
            return 1;
        }
        return promedioA - promedioB;
    });
    const labels = alumnos.map(a => a.nombre);
    const data = alumnos.map(a => obtenerPromedioAlumno(a));
    const colors = data.map(colorPorCalificacion);
    if (vizGraficas.barras) {
        vizGraficas.barras.destroy();
        vizGraficas.barras = null;
    }
    vizGraficas.barras = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Calificación Promedio',
                data: data,
                backgroundColor: colors,
                borderColor: colors,
                borderWidth: 2,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            layout: {
                padding: {
                    top: 35,
                    bottom: 55,
                    left: 10,
                    right: 10
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (context.raw === null || context.raw === undefined) {
                                return 'Sin calificación';
                            }
                            return `Promedio: ${Number(context.raw).toFixed(1)}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    min: 0,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Calificación (%)',
                        color: COLOR_TEXTO
                    },
                    ticks: {
                        color: COLOR_TEXTO,
                        stepSize: 10
                    }
                },
                x: {
                    ticks: {
                        color: COLOR_TEXTO,
                        maxRotation: 45,
                        minRotation: 0
                    }
                }
            }
        }
    });
    // ========================================
    // CONCLUSIÓN
    // ========================================
    const datosConCalificacion = data.filter(valor => valor !== null);
    const promedioGeneral = datosConCalificacion.length > 0
        ? datosConCalificacion.reduce((a, b) => a + b, 0) / datosConCalificacion.length
        : 0;
    const alumnosRiesgo = datosConCalificacion.filter(valor => valor < 70).length;
    const alumnosSinDatos = data.filter(valor => valor === null).length;
    let conclusion;
    if (datosConCalificacion.length === 0) {
        conclusion = `El equipo "${obtenerNombreEquipo()}" no tiene calificaciones registradas. Los estudiantes sin datos no cuentan con tareas calificadas.`;
    } else if (alumnosRiesgo === 0) {
        conclusion = `El equipo "${obtenerNombreEquipo()}" presenta un rendimiento favorable. El promedio general es de ${promedioGeneral.toFixed(1)}% y no se identifican estudiantes con promedio inferior al 70%.`;
    } else {
        conclusion = `El equipo "${obtenerNombreEquipo()}" presenta un promedio general de ${promedioGeneral.toFixed(1)}%. Se identificaron ${alumnosRiesgo} estudiante(s) con promedio inferior al 70%, por lo que requieren mayor seguimiento académico.`;
    }
    if (alumnosSinDatos > 0) {
        conclusion += ` Además, ${alumnosSinDatos} estudiante(s) no tienen calificaciones registradas.`;
    }
    mostrarConclusion('conclusionBarras', conclusion, alumnosRiesgo > 0 ? 'medio' : 'general');
}
// ============================================
// 2. GRÁFICA DE LÍNEAS
// ============================================
function actualizarGraficaLineas() {
    const ctx = document.getElementById('vizGraficaLineas');
    if (!ctx || !datosViz) {
        return;
    }
    if (vizGraficas.lineas) {
        vizGraficas.lineas.destroy();
        vizGraficas.lineas = null;
    }
    const alumnos = datosViz.alumnos || [];
    const tareas = datosViz.tareas || [];
    if (tareas.length === 0 || alumnos.length === 0) {
        limpiarCanvas('vizGraficaLineas');
        mostrarConclusion('conclusionLineas', `El equipo "${obtenerNombreEquipo()}" no cuenta con calificaciones suficientes para mostrar la tendencia.`, 'medio');
        return;
    }
    const maxAlumnos = Math.min(8, alumnos.length);
    const datasets = alumnos.slice(0, maxAlumnos).map((alumno, index) => {
        let calificaciones = [];
        if (datosViz.matriz_calificaciones && datosViz.matriz_calificaciones[index]) {
            calificaciones = datosViz.matriz_calificaciones[index].slice(0, tareas.length);
        }
        if (calificaciones.length === 0 && Array.isArray(alumno.calificaciones)) {
            calificaciones = alumno.calificaciones.slice(0, tareas.length);
        }
        const sinCalificaciones = [];
        const data = tareas.map((_, tareaIndex) => {
            const valor = calificaciones[tareaIndex];
            if (valor === null || valor === undefined || valor === '') {
                sinCalificaciones[tareaIndex] = true;
                return 0;
            }
            const numero = Number(valor);
            if (!Number.isFinite(numero)) {
                sinCalificaciones[tareaIndex] = true;
                return 0;
            }
            sinCalificaciones[tareaIndex] = false;
            return numero;
        });
        const color = colorPorRiesgo(alumno.nivel_riesgo);
        return {
            label: alumno.nombre,
            data: data,
            _sinCalificaciones: sinCalificaciones,
            borderColor: color,
            backgroundColor: color,
            fill: false,
            tension: 0.45,
            cubicInterpolationMode: 'monotone',
            pointRadius: 7,
            pointHoverRadius: 11,
            pointBackgroundColor: color,
            pointBorderColor: COLOR_BLANCO,
            pointBorderWidth: 2,
            borderWidth: 3,
            borderCapStyle: 'round',
            borderJoinStyle: 'round',
            spanGaps: true,
            clip: false
        };
    });
    vizGraficas.lineas = new Chart(ctx, {
        type: 'line',
        data: {
            labels: tareas.map((tarea, index) => tarea.titulo || `Tarea ${index + 1}`),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                mode: 'nearest',
                intersect: true
            },
            layout: {
                padding: {
                    top: 40,
                    bottom: 55,
                    left: 15,
                    right: 30
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: COLOR_TEXTO,
                        font: { size: 10 },
                        usePointStyle: true,
                        pointStyle: 'circle',
                        boxWidth: 12
                    }
                },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function(context) {
                            const dataset = context.dataset;
                            const index = context.dataIndex;
                            const sinCalificacion = dataset._sinCalificaciones && dataset._sinCalificaciones[index];
                            if (sinCalificacion) {
                                return `${dataset.label}: Sin calificación (0% visual)`;
                            }
                            return `${dataset.label}: ${Number(context.raw).toFixed(1)}%`;
                        }
                    }
                }
            },
            elements: {
                line: {
                    tension: 0.45,
                    cubicInterpolationMode: 'monotone',
                    borderWidth: 3,
                    borderCapStyle: 'round',
                    borderJoinStyle: 'round'
                },
                point: {
                    radius: 7,
                    hoverRadius: 11
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    min: 0,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Calificación (%)',
                        color: COLOR_TEXTO
                    },
                    ticks: {
                        color: COLOR_TEXTO,
                        stepSize: 10
                    }
                },
                x: {
                    ticks: {
                        color: COLOR_TEXTO,
                        maxRotation: 30,
                        minRotation: 0
                    }
                }
            }
        }
    });
    const todas = datasets.flatMap(dataset => dataset.data.filter(valor => valor !== null && valor !== undefined));
    const promedio = todas.length > 0 ? todas.reduce((a, b) => a + b, 0) / todas.length : 0;
    const conclusion = `El equipo "${obtenerNombreEquipo()}" presenta un promedio de ${promedio.toFixed(1)}% en las calificaciones registradas. La gráfica permite observar la evolución del rendimiento en las diferentes tareas e identificar variaciones entre evaluaciones. Los puntos sin calificación se muestran en 0% únicamente para mantener la continuidad visual de la gráfica.`;
    mostrarConclusion('conclusionLineas', conclusion, promedio < 70 ? 'medio' : 'general');
}
// ============================================
// 3. GRÁFICA DE DONA
// ============================================
function actualizarGraficaDona() {
    const ctx = document.getElementById('vizGraficaDona');
    if (!ctx || !datosViz) {
        return;
    }
    if (vizGraficas.dona) {
        vizGraficas.dona.destroy();
        vizGraficas.dona = null;
    }
    const alumnos = datosViz.alumnos || [];
    const riesgo = { Alto: 0, Medio: 0, Bajo: 0, 'Sin riesgo': 0 };
    alumnos.forEach(alumno => {
        const nivel = alumno.nivel_riesgo || 'Sin riesgo';
        if (Object.prototype.hasOwnProperty.call(riesgo, nivel)) {
            riesgo[nivel]++;
        }
    });
    const labels = ['Alto Riesgo', 'Medio Riesgo', 'Bajo Riesgo', 'Sin Riesgo'];
    const data = [riesgo.Alto, riesgo.Medio, riesgo.Bajo, riesgo['Sin riesgo']];
    const colors = [COLOR_ROJO, COLOR_AMARILLO, COLOR_AMARILLO, COLOR_VERDE];
    vizGraficas.dona = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderColor: COLOR_BLANCO,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '55%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: COLOR_TEXTO,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: { size: 10 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const porcentaje = total > 0 ? (context.raw / total) * 100 : 0;
                            return `${context.label}: ${context.raw} (${porcentaje.toFixed(1)}%)`;
                        }
                    }
                }
            }
        }
    });
    const alto = riesgo.Alto;
    const medioBajo = riesgo.Medio + riesgo.Bajo;
    const sinRiesgo = riesgo['Sin riesgo'];
    let conclusion;
    if (alto > 0) {
        conclusion = `En el equipo "${obtenerNombreEquipo()}" se identificaron ${alto} estudiante(s) en alto riesgo. Además, ${medioBajo} presentan riesgo medio o bajo y ${sinRiesgo} se encuentran sin riesgo.`;
        mostrarConclusion('conclusionDona', conclusion, 'riesgo');
    } else {
        conclusion = `En el equipo "${obtenerNombreEquipo()}" no se identificaron estudiantes en alto riesgo. ${sinRiesgo} estudiante(s) se encuentran sin riesgo y el resto presenta niveles de riesgo medio o bajo.`;
        mostrarConclusion('conclusionDona', conclusion, 'general');
    }
}
// ============================================
// 4. GRÁFICA DE DISPERSIÓN
// ============================================
function actualizarGraficaDispersion() {
    const ctx = document.getElementById('vizGraficaDispersion');
    if (!ctx || !datosViz) {
        return;
    }
    if (vizGraficas.dispersion) {
        vizGraficas.dispersion.destroy();
        vizGraficas.dispersion = null;
    }
    const alumnos = datosViz.alumnos || [];
    const data = alumnos.filter(alumno => tieneCalificacion(alumno)).map(alumno => ({
        x: Number(alumno.participacion || 0),
        y: Number(obtenerPromedioAlumno(alumno)),
        nombre: alumno.nombre,
        riesgo: alumno.nivel_riesgo || 'Sin riesgo'
    }));
    const colores = data.map(punto => colorPorRiesgo(punto.riesgo));
    let correlacion = 0;
    if (data.length > 1) {
        const n = data.length;
        const sumX = data.reduce((s, d) => s + d.x, 0);
        const sumY = data.reduce((s, d) => s + d.y, 0);
        const sumXY = data.reduce((s, d) => s + d.x * d.y, 0);
        const sumX2 = data.reduce((s, d) => s + d.x * d.x, 0);
        const sumY2 = data.reduce((s, d) => s + d.y * d.y, 0);
        const denominador = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
        if (denominador !== 0) {
            correlacion = (n * sumXY - sumX * sumY) / denominador;
        }
    }
    const correlacionElemento = document.getElementById('correlacionValor');
    if (correlacionElemento) {
        correlacionElemento.textContent = correlacion.toFixed(3);
    }
    vizGraficas.dispersion = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Estudiantes',
                data: data,
                backgroundColor: colores,
                borderColor: colores,
                borderWidth: 2,
                pointRadius: 9,
                pointHoverRadius: 13,
                pointBorderColor: COLOR_BLANCO,
                pointBorderWidth: 2,
                clip: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            layout: {
                padding: {
                    top: 50,
                    bottom: 35,
                    left: 25,
                    right: 70
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const punto = context.raw;
                            return `${punto.nombre}: Participación ${punto.x.toFixed(1)}%, Promedio ${punto.y.toFixed(1)}%`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    min: 0,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Participación (%)',
                        color: COLOR_TEXTO
                    },
                    ticks: {
                        color: COLOR_TEXTO,
                        stepSize: 10
                    }
                },
                y: {
                    beginAtZero: true,
                    min: 0,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Calificación Promedio (%)',
                        color: COLOR_TEXTO
                    },
                    ticks: {
                        color: COLOR_TEXTO,
                        stepSize: 10
                    }
                }
            }
        }
    });
    let interpretacion;
    if (correlacion >= 0.7) {
        interpretacion = 'existe una relación positiva fuerte entre la participación y la calificación';
    } else if (correlacion >= 0.4) {
        interpretacion = 'existe una relación positiva moderada entre la participación y la calificación';
    } else if (correlacion <= -0.4) {
        interpretacion = 'existe una relación negativa entre la participación y la calificación';
    } else {
        interpretacion = 'la relación entre participación y calificación es débil';
    }
    const conclusion = `En el equipo "${obtenerNombreEquipo()}", ${interpretacion}. El coeficiente de correlación obtenido es ${correlacion.toFixed(3)}.`;
    mostrarConclusion('conclusionDispersion', conclusion, Math.abs(correlacion) < 0.4 ? 'medio' : 'general');
}
// ============================================
// 5. HISTOGRAMA
// ============================================
function actualizarGraficaHistograma() {
    const ctx = document.getElementById('vizGraficaHistograma');
    if (!ctx || !datosViz) {
        return;
    }
    if (vizGraficas.histograma) {
        vizGraficas.histograma.destroy();
        vizGraficas.histograma = null;
    }
    let calificaciones = [];
    datosViz.alumnos.forEach(alumno => {
        if (Array.isArray(alumno.calificaciones)) {
            alumno.calificaciones.forEach(calificacion => {
                if (calificacion !== null && calificacion !== undefined && calificacion !== '' && Number.isFinite(Number(calificacion))) {
                    calificaciones.push(Number(calificacion));
                }
            });
        }
    });
    if (calificaciones.length === 0) {
        datosViz.alumnos.forEach(alumno => {
            const promedio = obtenerPromedioAlumno(alumno);
            if (promedio !== null) {
                calificaciones.push(promedio);
            }
        });
    }
    const rangos = ['0-59', '60-69', '70-79', '80-89', '90-100'];
    const frecuencias = [0, 0, 0, 0, 0];
    calificaciones.forEach(calificacion => {
        if (calificacion < 60) {
            frecuencias[0]++;
        } else if (calificacion < 70) {
            frecuencias[1]++;
        } else if (calificacion < 80) {
            frecuencias[2]++;
        } else if (calificacion < 90) {
            frecuencias[3]++;
        } else {
            frecuencias[4]++;
        }
    });
    const colores = [COLOR_ROJO, COLOR_AMARILLO, COLOR_AMARILLO, COLOR_VERDE, COLOR_VERDE];
    vizGraficas.histograma = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: rangos,
            datasets: [{
                label: 'Frecuencia',
                data: frecuencias,
                backgroundColor: colores,
                borderColor: colores,
                borderWidth: 2,
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            layout: {
                padding: {
                    top: 35,
                    bottom: 30
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.raw} calificación(es)`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Frecuencia',
                        color: COLOR_TEXTO
                    },
                    ticks: {
                        color: COLOR_TEXTO,
                        stepSize: 1
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Rango de Calificación (%)',
                        color: COLOR_TEXTO
                    },
                    ticks: {
                        color: COLOR_TEXTO
                    }
                }
            }
        }
    });
    const total = calificaciones.length;
    const bajas = calificaciones.filter(c => c < 60).length;
    const altas = calificaciones.filter(c => c >= 80).length;
    const conclusion = `El equipo "${obtenerNombreEquipo()}" cuenta con ${total} calificación(es) analizada(s). ${bajas} se encuentran por debajo de 60%, mientras que ${altas} alcanzan 80% o más.`;
    mostrarConclusion('conclusionHistograma', conclusion, bajas > altas ? 'medio' : 'general');
}
// ============================================
// 6. GRÁFICA DE ÁREA
// ============================================
function actualizarGraficaArea() {
    const ctx = document.getElementById('vizGraficaArea');
    if (!ctx || !datosViz) {
        return;
    }
    if (vizGraficas.area) {
        vizGraficas.area.destroy();
        vizGraficas.area = null;
    }
    const alumnos = datosViz.alumnos || [];
    const labels = alumnos.map(alumno => alumno.nombre);
    const datosOriginales = alumnos.map(alumno => obtenerPromedioAlumno(alumno));
    const colores = datosOriginales.map(colorPorCalificacion);
    const datosValidos = datosOriginales.filter(valor => valor !== null);
    if (datosValidos.length === 0) {
        limpiarCanvas('vizGraficaArea');
        mostrarConclusion('conclusionArea', `El equipo "${obtenerNombreEquipo()}" no cuenta con calificaciones registradas para mostrar el rendimiento académico.`, 'medio');
        return;
    }
    const data = datosOriginales.map(valor => valor === null ? 0 : valor);
    const sinCalificaciones = datosOriginales.map(valor => valor === null);
    vizGraficas.area = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Rendimiento Académico',
                data: data,
                _sinCalificaciones: sinCalificaciones,
                fill: true,
                backgroundColor: 'rgba(250, 204, 21, 0.18)',
                borderColor: COLOR_AMARILLO,
                borderWidth: 3,
                tension: 0.45,
                cubicInterpolationMode: 'monotone',
                borderCapStyle: 'round',
                borderJoinStyle: 'round',
                pointBackgroundColor: colores,
                pointBorderColor: COLOR_BLANCO,
                pointBorderWidth: 2,
                pointRadius: 8,
                pointHoverRadius: 12,
                pointHoverBorderWidth: 3,
                spanGaps: true,
                clip: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                mode: 'nearest',
                intersect: true
            },
            layout: {
                padding: {
                    top: 40,
                    bottom: 30,
                    left: 15,
                    right: 30
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function(context) {
                            const dataset = context.dataset;
                            const index = context.dataIndex;
                            const sinCalificacion = dataset._sinCalificaciones && dataset._sinCalificaciones[index];
                            if (sinCalificacion) {
                                return 'Sin calificación (0% visual)';
                            }
                            return `Promedio: ${Number(context.raw).toFixed(1)}%`;
                        }
                    }
                }
            },
            elements: {
                line: {
                    tension: 0.45,
                    cubicInterpolationMode: 'monotone',
                    borderWidth: 3,
                    borderCapStyle: 'round',
                    borderJoinStyle: 'round'
                },
                point: {
                    radius: 8,
                    hoverRadius: 12
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    min: 0,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Calificación (%)',
                        color: COLOR_TEXTO
                    },
                    ticks: {
                        color: COLOR_TEXTO,
                        stepSize: 10
                    }
                },
                x: {
                    ticks: {
                        color: COLOR_TEXTO,
                        maxRotation: 45,
                        minRotation: 0
                    }
                }
            }
        }
    });
    const promedio = datosValidos.reduce((a, b) => a + b, 0) / datosValidos.length;
    const alumnosSinDatos = datosOriginales.filter(valor => valor === null).length;
    let conclusion = `El equipo "${obtenerNombreEquipo()}" presenta un promedio académico general de ${promedio.toFixed(1)}%. La gráfica permite identificar diferencias de rendimiento entre los integrantes y detectar posibles áreas que requieren seguimiento.`;
    if (alumnosSinDatos > 0) {
        conclusion += ` Se muestran ${alumnosSinDatos} punto(s) en 0% visual para representar estudiantes sin calificación y mantener la continuidad de la gráfica.`;
    }
    mostrarConclusion('conclusionArea', conclusion, promedio < 70 ? 'medio' : 'general');
}
// ============================================
// 7. GRÁFICA AGRUPADA
// ============================================
function actualizarGraficaAgrupadas() {
    const ctx = document.getElementById('vizGraficaAgrupadas');
    if (!ctx || !datosViz) {
        return;
    }
    if (vizGraficas.agrupadas) {
        vizGraficas.agrupadas.destroy();
        vizGraficas.agrupadas = null;
    }
    const alumnos = datosViz.alumnos || [];
    const riesgo = { Alto: 0, Medio: 0, Bajo: 0, 'Sin riesgo': 0 };
    alumnos.forEach(alumno => {
        const nivel = alumno.nivel_riesgo || 'Sin riesgo';
        if (Object.prototype.hasOwnProperty.call(riesgo, nivel)) {
            riesgo[nivel]++;
        }
    });
    const labels = ['Alto Riesgo', 'Medio Riesgo', 'Bajo Riesgo', 'Sin Riesgo'];
    const data = [riesgo.Alto, riesgo.Medio, riesgo.Bajo, riesgo['Sin riesgo']];
    const colores = [COLOR_ROJO, COLOR_AMARILLO, COLOR_AMARILLO, COLOR_VERDE];
    vizGraficas.agrupadas = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Número de Estudiantes',
                data: data,
                backgroundColor: colores,
                borderColor: colores,
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            layout: {
                padding: {
                    top: 35,
                    bottom: 30
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.raw} estudiante(s)`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Número de Estudiantes',
                        color: COLOR_TEXTO
                    },
                    ticks: {
                        color: COLOR_TEXTO,
                        stepSize: 1
                    }
                },
                x: {
                    ticks: {
                        color: COLOR_TEXTO
                    }
                }
            }
        }
    });
    const conclusion = `En el equipo "${obtenerNombreEquipo()}", ${riesgo.Alto} estudiante(s) se encuentran en alto riesgo, ${riesgo.Medio + riesgo.Bajo} presentan algún nivel de riesgo medio o bajo y ${riesgo['Sin riesgo']} se encuentran sin riesgo.`;
    mostrarConclusion('conclusionAgrupadas', conclusion, riesgo.Alto > 0 ? 'riesgo' : 'general');
}
// ============================================
// 8. GRÁFICA DE PASTEL
// ============================================
function actualizarGraficaPastel() {
    const ctx = document.getElementById('vizGraficaPastel');
    if (!ctx || !datosViz) {
        return;
    }
    if (vizGraficas.pastel) {
        vizGraficas.pastel.destroy();
        vizGraficas.pastel = null;
    }
    const distribucion = datosViz.distribucion || {};
    const labels = Object.keys(distribucion);
    const data = Object.values(distribucion).map(valor => Number(valor) || 0);
    const colores = [COLOR_ROJO, COLOR_AMARILLO, COLOR_AMARILLO, COLOR_VERDE, COLOR_VERDE];
    if (labels.length === 0 || data.length === 0) {
        limpiarCanvas('vizGraficaPastel');
        mostrarConclusion('conclusionPastel', `El equipo "${obtenerNombreEquipo()}" no cuenta con calificaciones registradas para mostrar su distribución.`, 'medio');
        return;
    }
    vizGraficas.pastel = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colores,
                borderColor: COLOR_BLANCO,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: COLOR_TEXTO,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: { size: 10 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const porcentaje = total > 0 ? (context.raw / total) * 100 : 0;
                            return `${context.label}: ${context.raw} (${porcentaje.toFixed(1)}%)`;
                        }
                    }
                }
            }
        }
    });
    const total = data.reduce((a, b) => a + b, 0);
    const bajas = Number(distribucion['0-59'] || 0);
    const altas = Number(distribucion['80-89'] || 0) + Number(distribucion['90-100'] || 0);
    const conclusion = `La distribución de calificaciones del equipo "${obtenerNombreEquipo()}" contiene ${total} registro(s). ${bajas} calificación(es) se encuentran por debajo de 60%, mientras que ${altas} se ubican entre 80% y 100%.`;
    mostrarConclusion('conclusionPastel', conclusion, bajas > altas ? 'medio' : 'general');
}
// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM de visualización listo');
    const selectorEquipo = document.getElementById('selectorEquipo');
    if (selectorEquipo) {
        selectorEquipo.addEventListener('change', function() {
            const equipoId = this.value;
            if (equipoId) {
                cargarDatosVisualizacion(equipoId);
            } else {
                datosViz = null;
                destruirTodasLasGraficas();
                console.log('No hay equipo seleccionado. Gráficas limpiadas.');
            }
        });
    }
});
// ============================================
// EXPONER FUNCIONES
// ============================================
window.cargarDatosVisualizacion = cargarDatosVisualizacion;
window.exportarGrafica = exportarGrafica;
console.log('vizualizacion.js cargado correctamente');