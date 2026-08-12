

console.log('🚀 Iniciando analisis-cluster.js');

let clusterGraficas = {
    elbow: null,
    silueta: null,
    pca: null
};

let datosCluster = null;

// ============================================
// INICIALIZAR CUANDO EL DOM ESTÉ LISTO
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 analisis-cluster.js: DOMContentLoaded');
    inicializarCluster();
});

// ============================================
// INICIALIZAR CLUSTER
// ============================================
function inicializarCluster() {
    console.log('🔧 inicializarCluster() ejecutado');
    
    const btnEjecutar = document.getElementById('btnEjecutarCluster');
    const kRange = document.getElementById('kRange');
    const kValue = document.getElementById('kValue');

    console.log('🔍 btnEjecutar encontrado:', btnEjecutar ? '✅' : '❌');
    console.log('🔍 kRange encontrado:', kRange ? '✅' : '❌');
    console.log('🔍 kValue encontrado:', kValue ? '✅' : '❌');

    if (kRange && kValue) {
        kRange.addEventListener('input', function() {
            kValue.textContent = this.value;
        });
        console.log('✅ Evento de rango K asignado');
    }

    if (btnEjecutar) {
        btnEjecutar.addEventListener('click', ejecutarClusterizacion);
        console.log('✅ Evento de clic asignado al botón');
    } else {
        console.error('❌ Botón btnEjecutarCluster NO encontrado');
    }
}

// ============================================
// EJECUTAR CLUSTERIZACIÓN
// ============================================
async function ejecutarClusterizacion() {
    console.log('🔘 EJECUTAR CLUSTERIZACIÓN - Botón clickeado');
    
    const equipoId = document.getElementById('selectorEquipo')?.value;
    const loadingDiv = document.getElementById('clusterLoading');
    const resultsDiv = document.getElementById('clusterResults');
    const errorDiv = document.getElementById('clusterError');

    console.log('📌 equipoId:', equipoId);

    if (!equipoId) {
        mostrarError('Por favor, selecciona un equipo primero');
        return;
    }

    loadingDiv.style.display = 'block';
    resultsDiv.style.display = 'none';
    errorDiv.style.display = 'none';

    try {
        const k = parseInt(document.getElementById('kRange').value);
        const features = document.getElementById('featuresSelect').value;

        console.log('📤 Enviando datos:', { equipo_id: equipoId, k, features });

        const respuesta = await fetch('/api/analisis/cluster', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                equipo_id: equipoId,
                k: k,
                features: features
            })
        });

        console.log('📥 Status de respuesta:', respuesta.status);

        const resultado = await respuesta.json();
        console.log('📦 Resultado:', resultado);

        if (resultado.exito) {
            datosCluster = resultado;
            mostrarResultados(resultado);
            resultsDiv.style.display = 'block';
            console.log('✅ Análisis completado exitosamente');
        } else {
            mostrarError(resultado.mensaje || 'Error al ejecutar el análisis');
        }
    } catch (error) {
        console.error('❌ Error en fetch:', error);
        mostrarError('Error de conexión al servidor: ' + error.message);
    }

    loadingDiv.style.display = 'none';
}

// ============================================
// MOSTRAR RESULTADOS
// ============================================
function mostrarResultados(data) {
    console.log('📊 Mostrando resultados...');
    console.log('📊 Datos completos:', data);
    
    // Métricas
    const metricK = document.getElementById('metricK');
    const metricInercia = document.getElementById('metricInercia');
    const metricSilueta = document.getElementById('metricSilueta');
    const metricMejorK = document.getElementById('metricMejorK');

    if (metricK) metricK.textContent = data.k;
    if (metricInercia) metricInercia.textContent = data.inercia !== undefined ? data.inercia.toFixed(2) : '-';
    if (metricSilueta) metricSilueta.textContent = data.silueta !== undefined ? data.silueta.toFixed(4) : '-';
    if (metricMejorK) metricMejorK.textContent = data.mejor_k || data.k;

    // Resumen
    const summaryAlgoritmo = document.getElementById('summaryAlgoritmo');
    const summaryK = document.getElementById('summaryK');
    const summaryTiempo = document.getElementById('summaryTiempo');
    const summaryIteraciones = document.getElementById('summaryIteraciones');
    const summaryFeatures = document.getElementById('summaryFeatures');

    if (summaryAlgoritmo) summaryAlgoritmo.textContent = data.algoritmo || 'K-Means';
    if (summaryK) summaryK.textContent = data.k;
    if (summaryTiempo) summaryTiempo.textContent = data.tiempo_entrenamiento || '-';
    if (summaryIteraciones) summaryIteraciones.textContent = data.iteraciones || '-';
    if (summaryFeatures) summaryFeatures.textContent = data.features_utilizadas || 'Todas';

    // Gráficas
    if (data.elbow_data) {
        actualizarGraficaElbow(data.elbow_data);
    }

    if (data.silueta_data) {
        actualizarGraficaSilueta(data.silueta_data);
    }

    if (data.pca_data) {
        actualizarGraficaPCA(data.pca_data);
    }

    // Centroides
    if (data.centroids) {
        mostrarCentroides(data.centroids);
    }

    // Clasificación de alumnos
    if (data.alumnos_clusters) {
        console.log('📊 Enviando alumnos_clusters a mostrarAlumnosClusters:', data.alumnos_clusters);
        mostrarAlumnosClusters(data.alumnos_clusters);
    } else {
        console.error('❌ No hay alumnos_clusters en los datos');
    }
}

// ============================================
// GRÁFICA DEL CODO (ELBOW)
// ============================================
function actualizarGraficaElbow(data) {
    const ctx = document.getElementById('graficaElbow')?.getContext('2d');
    if (!ctx) return;

    if (clusterGraficas.elbow) {
        clusterGraficas.elbow.destroy();
    }

    const labels = data.map(d => `K=${d.k}`);
    const values = data.map(d => d.inercia);

    clusterGraficas.elbow = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Inercia (WCSS)',
                data: values,
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                fill: true,
                tension: 0.3,
                pointBackgroundColor: '#8b5cf6',
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: true, labels: { color: '#1e293b' } }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    title: { display: true, text: 'Inercia (WCSS)' },
                    ticks: { color: '#64748b' }
                },
                x: {
                    title: { display: true, text: 'Número de Clusters (K)' },
                    ticks: { color: '#64748b' }
                }
            }
        }
    });
}

// ============================================
// GRÁFICA DEL ÍNDICE DE SILUETA
// ============================================
function actualizarGraficaSilueta(data) {
    const ctx = document.getElementById('graficaSilueta')?.getContext('2d');
    if (!ctx) return;

    if (clusterGraficas.silueta) {
        clusterGraficas.silueta.destroy();
    }

    const labels = data.map(d => `K=${d.k}`);
    const values = data.map(d => d.silueta);
    const colors = values.map(v => v >= 0.5 ? '#10b981' : v >= 0.3 ? '#f59e0b' : '#ef4444');

    clusterGraficas.silueta = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Índice de Silueta',
                data: values,
                backgroundColor: colors,
                borderColor: colors,
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: true, labels: { color: '#1e293b' } }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    max: 1,
                    title: { display: true, text: 'Índice de Silueta' },
                    ticks: { color: '#64748b' }
                },
                x: {
                    title: { display: true, text: 'Número de Clusters (K)' },
                    ticks: { color: '#64748b' }
                }
            }
        }
    });
}

// ============================================
// GRÁFICA PCA
// ============================================
function actualizarGraficaPCA(data) {
    const ctx = document.getElementById('graficaPCA')?.getContext('2d');
    if (!ctx) return;

    if (clusterGraficas.pca) {
        clusterGraficas.pca.destroy();
    }

    const colores = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#ec4899', '#14b8a6', '#f97316'];

    const clusters = [...new Set(data.map(d => d.cluster))];
    const datasets = clusters.map((cluster, idx) => {
        const puntos = data.filter(d => d.cluster === cluster);
        return {
            label: `Cluster ${cluster + 1}`,
            data: puntos.map(d => ({ x: d.pc1, y: d.pc2, nombre: d.nombre })),
            backgroundColor: colores[idx % colores.length],
            borderColor: colores[idx % colores.length],
            borderWidth: 1,
            pointRadius: 6,
            pointHoverRadius: 8
        };
    });

    clusterGraficas.pca = new Chart(ctx, {
        type: 'scatter',
        data: { datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { 
                    position: 'top',
                    labels: { color: '#1e293b' }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Alumno: ${context.raw.nombre || 'Sin nombre'}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Componente Principal 1' },
                    ticks: { color: '#64748b' },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                y: {
                    title: { display: true, text: 'Componente Principal 2' },
                    ticks: { color: '#64748b' },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                }
            }
        }
    });
}

// ============================================
// MOSTRAR CENTROIDES
// ============================================
function mostrarCentroides(centroids) {
    const container = document.getElementById('centroidsContainer');
    if (!container) {
        console.error('❌ centroidsContainer no encontrado');
        return;
    }

    console.log('📊 Centroides recibidos:', centroids);

    const nombresFeatures = {
        'promedio': 'Promedio',
        'tareas_completadas': 'Tareas Completadas',
        'tareas_totales': 'Tareas Totales',
        'entregas_tardias': 'Entregas Tardías',
        'participacion': 'Participación (%)'
    };

    // Ordenar por cluster (1, 2, 3...)
    const sorted = [...centroids].sort((a, b) => (a.cluster || 0) - (b.cluster || 0));

    container.innerHTML = sorted.map((c, idx) => {
        const clusterClass = `cluster-${idx + 1}`;
        const values = Object.entries(c)
            .filter(([key]) => key !== 'cluster')
            .map(([key, value]) => {
                const nombre = nombresFeatures[key] || key;
                return `${nombre}: ${typeof value === 'number' ? value.toFixed(2) : value}`;
            })
            .join('<br>');

        return `
            <div class="centroid-card ${clusterClass}">
                <div class="centroid-label">Cluster ${idx + 1}</div>
                <div class="centroid-values">${values}</div>
            </div>
        `;
    }).join('');

    console.log('✅ Centroides actualizados');
}

// ============================================
// MOSTRAR ALUMNOS POR CLUSTER - CORREGIDO
// ============================================
function mostrarAlumnosClusters(alumnos) {
    const container = document.getElementById('clusterAlumnosContainer');
    if (!container) {
        console.error('❌ clusterAlumnosContainer no encontrado');
        return;
    }

    console.log('📊 Alumnos recibidos:', alumnos);

    // Agrupar por cluster
    const clusters = {};
    alumnos.forEach(a => {
        // ✅ El cluster ya viene como número (0, 1, 2...)
        const cluster = a.cluster;
        // Si es undefined o null, asignar 'Sin cluster'
        const key = (cluster !== undefined && cluster !== null) ? cluster : 'Sin cluster';
        if (!clusters[key]) clusters[key] = [];
        clusters[key].push(a.nombre || a.alumno || 'Sin nombre');
    });

    console.log('📊 Clusters agrupados:', clusters);

    const colores = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#ec4899', '#14b8a6', '#f97316'];

    let html = '<div class="cluster-alumnos-grid">';
    
    // Ordenar: primero los clusters numéricos, luego 'Sin cluster'
    const clusterKeys = Object.keys(clusters).sort((a, b) => {
        if (a === 'Sin cluster') return 1;
        if (b === 'Sin cluster') return -1;
        return parseInt(a) - parseInt(b);
    });

    clusterKeys.forEach((key, idx) => {
        const nombres = clusters[key];
        // ✅ Si es numérico, sumar 1 para mostrar (0 → Cluster 1, 1 → Cluster 2)
        const displayCluster = key === 'Sin cluster' ? 'Sin cluster' : parseInt(key) + 1;
        const color = colores[idx % colores.length];
        
        html += `
            <div class="cluster-alumno-group group-${idx + 1}" style="border-color: ${color};">
                <div class="group-title">
                    Cluster ${displayCluster}
                    <span class="group-count">(${nombres.length} alumnos)</span>
                </div>
                ${nombres.map(n => `<span class="alumno-tag">${n}</span>`).join('')}
            </div>
        `;
    });
    
    html += '</div>';

    container.innerHTML = html;
    console.log('✅ Clasificación de alumnos actualizada');
}

// ============================================
// MOSTRAR ERROR
// ============================================
function mostrarError(mensaje) {
    const errorDiv = document.getElementById('clusterError');
    const messageEl = document.getElementById('clusterErrorMessage');
    const loadingDiv = document.getElementById('clusterLoading');
    const resultsDiv = document.getElementById('clusterResults');

    if (loadingDiv) loadingDiv.style.display = 'none';
    if (resultsDiv) resultsDiv.style.display = 'none';
    if (errorDiv) {
        errorDiv.style.display = 'block';
        if (messageEl) messageEl.textContent = mensaje;
    }
    console.error('❌ Error:', mensaje);
}