// ============================================
// ARCHIVO: estadias.js
// Lógica para gestionar Estadías Profesionales
// ============================================

const usuario = JSON.parse(localStorage.getItem('usuario'));

if (!usuario) {
    window.location.href = '../../iniciar_sesion.html';
}

let estadiasCache = [];
let estadiaIdAEliminar = null;

// Elementos del modal
const modalConfirmar = document.getElementById('modalConfirmarEstadia');
const btnCancelarEliminar = document.getElementById('btnCancelarEliminarEstadia');
const btnConfirmarEliminar = document.getElementById('btnConfirmarEliminarEstadia');

// ============================================
// CONFIGURAR SEGÚN ROL
// ============================================
function configurarPorRol() {
    const btnCrear = document.getElementById('btnCrearEstadia');
    const titulo = document.getElementById('tituloEstadias');

    if (usuario.rol === 'alumno') {
        btnCrear.style.display = 'inline-flex';
        if (titulo) titulo.textContent = 'Mis Estadías';
        console.log('🎓 Alumno: Mostrando botón "Solicitar Estadía"');
    } else {
        btnCrear.style.display = 'none';
        if (titulo) titulo.textContent = 'Solicitudes de Estadía de mis Alumnos';
        console.log('👨‍🏫 Maestro: Mostrando solicitudes de alumnos');
    }
}

// ============================================
// CARGAR ESTADÍAS (según rol)
// ============================================
async function cargarEstadias() {
    const container = document.getElementById('estadiasContainer');
    container.innerHTML = '<div class="sin-estadias"><i class="fas fa-spinner fa-pulse"></i> Cargando estadías...</div>';

    try {
        const respuesta = await fetch(`/api/estadias/${usuario._id}`);
        const resultado = await respuesta.json();

        if (resultado.exito) {
            estadiasCache = resultado.estadias;
            mostrarEstadias(estadiasCache);

            const filtroEstado = document.getElementById('filtroEstado');
            const filtroBusqueda = document.getElementById('filtroBusqueda');
            const filtroFechaInicio = document.getElementById('filtroFechaInicio');
            const filtroFechaFin = document.getElementById('filtroFechaFin');

            if (filtroEstado) filtroEstado.addEventListener('change', filtrarEstadias);
            if (filtroBusqueda) filtroBusqueda.addEventListener('input', filtrarEstadias);

             // Filtro por fecha de inicio
            if (filtroFechaInicio) {
                filtroFechaInicio.addEventListener('change', filtrarEstadias);
            }

            // Filtro por fecha de fin
            if (filtroFechaFin) {
                filtroFechaFin.addEventListener('change', filtrarEstadias);
            }
        } else {
            container.innerHTML = `<div class="sin-estadias"><i class="fas fa-exclamation-triangle"></i> ${resultado.mensaje}</div>`;
        }
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = '<div class="sin-estadias"><i class="fas fa-exclamation-triangle"></i> Error al cargar estadías</div>';
    }
}

// ============================================
// FILTRAR ESTADÍAS
// ============================================
function filtrarEstadias() {
    const estadoFiltro = document.getElementById('filtroEstado')?.value || 'todos';
    const busquedaFiltro = document.getElementById('filtroBusqueda')?.value.toLowerCase() || '';
    const fechaInicioFiltro = document.getElementById('filtroFechaInicio')?.value || '';
    const fechaFinFiltro = document.getElementById('filtroFechaFin')?.value || '';

    let filtrados = [...estadiasCache];

    if (estadoFiltro !== 'todos') {
        filtrados = filtrados.filter(e => e.estado === estadoFiltro);
    }

    if (busquedaFiltro) {
        filtrados = filtrados.filter(e =>
            (e.empresa || '').toLowerCase().includes(busquedaFiltro) ||
            (e.titulo || '').toLowerCase().includes(busquedaFiltro)
        );
    }

    // Filtro por rango de fechas
if (fechaInicioFiltro || fechaFinFiltro) {
    filtrados = filtrados.filter(e => {

        if (!e.fecha_inicio || !e.fecha_fin) {
            return false;
        }

        const inicioEstadia = new Date(e.fecha_inicio);
        const finEstadia = new Date(e.fecha_fin);

        const inicioFiltro = fechaInicioFiltro
            ? new Date(fechaInicioFiltro + 'T00:00:00')
            : null;

        const finFiltro = fechaFinFiltro
            ? new Date(fechaFinFiltro + 'T23:59:59')
            : null;

        // Solo "Desde"
        if (inicioFiltro && !finFiltro) {
            return finEstadia >= inicioFiltro;
        }

        // Solo "Hasta"
        if (!inicioFiltro && finFiltro) {
            return inicioEstadia <= finFiltro;
        }

        // "Desde" y "Hasta"
        return inicioEstadia <= finFiltro &&
               finEstadia >= inicioFiltro;
    });
}

    mostrarEstadias(filtrados);
}


// ============================================
// LIMPIAR FILTROS
// ============================================
function limpiarFiltros() {

    // Restablecer estado
    const filtroEstado = document.getElementById('filtroEstado');
    if (filtroEstado) {
        filtroEstado.value = 'todos';
    }

    // Limpiar búsqueda
    const filtroBusqueda = document.getElementById('filtroBusqueda');
    if (filtroBusqueda) {
        filtroBusqueda.value = '';
    }

    // Limpiar fecha de inicio
    const filtroFechaInicio = document.getElementById('filtroFechaInicio');
    if (filtroFechaInicio) {
        filtroFechaInicio.value = '';
    }

    // Limpiar fecha de fin
    const filtroFechaFin = document.getElementById('filtroFechaFin');
    if (filtroFechaFin) {
        filtroFechaFin.value = '';
    }

    // Mostrar nuevamente todas las estadías
    mostrarEstadias(estadiasCache);
}


// ============================================
// MOSTRAR ESTADÍAS
// ============================================
function mostrarEstadias(estadias) {
    const container = document.getElementById('estadiasContainer');
    const esMaestro = usuario.rol === 'maestro';

    if (estadias.length === 0) {
        const mensaje = esMaestro 
            ? 'No hay solicitudes de estadía de tus alumnos.' 
            : 'No hay estadías registradas.';
        
        const boton = !esMaestro ? `
            <button onclick="crearEstadia()" class="btn primario" style="margin-top: 1rem;">
                <i class="fas fa-plus-circle"></i> Solicitar mi primera estadía
            </button>
        ` : '';

        container.innerHTML = `
            <div class="sin-estadias">
                <i class="fas fa-building fa-3x" style="color: #94a3b8; margin-bottom: 1rem; display: block;"></i>
                ${mensaje}
                ${boton}
            </div>
        `;
        return;
    }

    container.innerHTML = estadias.map(estadia => {
        let estadoClass = '';
        let estadoText = '';
        let estadoIcono = '';

        switch (estadia.estado) {
            case 'en-curso':
                estadoClass = 'estado-en-curso';
                estadoText = 'En curso';
                estadoIcono = '<i class="fas fa-play-circle"></i>';
                break;
            case 'pendiente':
                estadoClass = 'estado-pendiente';
                estadoText = 'Pendiente';
                estadoIcono = '<i class="fas fa-clock"></i>';
                break;
            case 'completada':
                estadoClass = 'estado-completada';
                estadoText = 'Completada';
                estadoIcono = '<i class="fas fa-check-circle"></i>';
                break;
            case 'cancelada':
                estadoClass = 'estado-cancelada';
                estadoText = 'Cancelada';
                estadoIcono = '<i class="fas fa-times-circle"></i>';
                break;
            default:
                estadoClass = 'estado-pendiente';
                estadoText = estadia.estado;
                estadoIcono = '<i class="fas fa-clock"></i>';
        }

        const diasRestantes = calcularDiasRestantes(estadia.fecha_fin);

        // ✅ SOLO PARA MAESTRO: mostrar nombre del alumno de su cuenta
        const alumnoCreadorHtml = esMaestro ? `
            <div class="estadia-alumno-creador" style="
                background: #f0f0ff;
                padding: 0.5rem 0.75rem;
                border-radius: 8px;
                margin-bottom: 0.5rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 0.85rem;
                color: #4338ca;
                font-weight: 500;
            ">
                <i class="fas fa-user-graduate"></i>
                <span>Alumno: <strong>${escapeHtml(estadia.alumno_creador_nombre || 'Sin nombre')}</strong></span>
                ${estadia.alumno_creador_email ? `<span style="color:#64748b; font-size:0.75rem;">(${escapeHtml(estadia.alumno_creador_email)})</span>` : ''}
            </div>
        ` : '';

        // ✅ CAMPO PROYECTO (visible para ambos roles)
        const proyectoHtml = estadia.proyecto ? `
    <div class="estadia-info" style="margin-top: 0.3rem;">
        <i class="fas fa-lightbulb"></i>
        <span>Proyecto: <strong>${escapeHtml(estadia.proyecto)}</strong></span>
    </div>
` : '';

// ✅ CAMPO EQUIPO DE TRABAJO (visible para ambos roles)
        const equipoTrabajoHtml = estadia.equipo ? `
            <div class="estadia-info" style="margin-top: 0.3rem;">
                <i class="fas fa-users"></i>
                <span>Equipo de Trabajo: <strong>${escapeHtml(estadia.equipo)}</strong></span>
            </div>
        ` : '';

        // ✅ SELECTOR DE ESTADO (solo para maestro)
        const selectorEstadoHtml = esMaestro ? `
            <div style="margin-top: 0.75rem;">
                <label style="font-size:0.75rem; color:#64748b; font-weight:600; display:block; margin-bottom:4px;">
                    <i class="fas fa-edit"></i> Cambiar estado:
                </label>
                <select class="estado-select" onchange="cambiarEstado('${estadia._id}', this.value)" style="
                    width: 100%;
                    padding: 6px 10px;
                    font-size: 0.8rem;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                    background: white;
                    color: #1e293b;
                    cursor: pointer;
                    font-weight: 500;
                ">
                    <option value="pendiente" ${estadia.estado === 'pendiente' ? 'selected' : ''}>Pendiente de aprobación</option>
                    <option value="en-curso" ${estadia.estado === 'en-curso' ? 'selected' : ''}>En curso</option>
                    <option value="completada" ${estadia.estado === 'completada' ? 'selected' : ''}>Completada</option>
                    <option value="cancelada" ${estadia.estado === 'cancelada' ? 'selected' : ''}>Cancelada</option>
                </select>
            </div>
        ` : '';

        // ✅ BOTONES SEGÚN ROL
        // - ALUMNO: solo Ver y Eliminar (una vez enviada, no puede editar)
        // - MAESTRO: Ver, Editar y Eliminar
        const botonesHtml = esMaestro ? `
            <div class="estadia-acciones">
                <button onclick="verDetalleEstadia('${estadia._id}')" class="btn-ver-estadia">
                    <i class="fas fa-eye"></i> Ver detalles
                </button>
                <button onclick="editarEstadia('${estadia._id}')" class="btn-editar-estadia">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button onclick="mostrarModalEliminarEstadia('${estadia._id}')" class="btn-eliminar-estadia">
                    <i class="fas fa-trash-alt"></i> Eliminar
                </button>
            </div>
        ` : `
            <div class="estadia-acciones">
                <button onclick="verDetalleEstadia('${estadia._id}')" class="btn-ver-estadia">
                    <i class="fas fa-eye"></i> Ver detalles
                </button>
                <button onclick="mostrarModalEliminarEstadia('${estadia._id}')" class="btn-eliminar-estadia">
                    <i class="fas fa-trash-alt"></i> Eliminar
                </button>
            </div>
        `;

        return `
    <div class="estadia-card ${estadia.estado === 'en-curso' ? 'en-curso' : ''}">
        ${alumnoCreadorHtml}
        <div class="estadia-titulo"><i class="fas fa-chalkboard-user"></i> ${escapeHtml(estadia.titulo)}</div>
        <div class="estadia-empresa"><i class="fas fa-building"></i> ${escapeHtml(estadia.empresa)}</div>
        <div class="estadia-fechas">
            <span><i class="fas fa-calendar-alt"></i> Inicio: ${formatearFecha(estadia.fecha_inicio)}</span>
            <span><i class="fas fa-calendar-check"></i> Fin: ${formatearFecha(estadia.fecha_fin)}</span>
        </div>
        <div class="estadia-fechas">
            <span><i class="fas fa-clock"></i> Horas: ${estadia.horas}</span>
            <span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(estadia.ubicacion || '')}</span>
        </div>
        ${proyectoHtml}         
        ${equipoTrabajoHtml}
        ${estadia.estado === 'en-curso' && diasRestantes > 0 ?
            `<div class="estadia-duracion"><i class="fas fa-hourglass-half"></i> ${diasRestantes} días restantes</div>` : ''}
        <span class="estadia-estado ${estadoClass}">${estadoIcono} ${estadoText}</span>

        ${selectorEstadoHtml}

        ${botonesHtml}
    </div>
`;
    }).join('');
}

// ============================================
// CAMBIAR ESTADO (solo maestro)
// ============================================
async function cambiarEstado(estadiaId, nuevoEstado) {
    try {
        const respuesta = await fetch(`/api/estadias/actualizar/${estadiaId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: nuevoEstado })
        });

        const resultado = await respuesta.json();

        if (resultado.exito) {
            mostrarMensaje('exito', 'Estado actualizado correctamente');
            cargarEstadias();
        } else {
            mostrarMensaje('error', resultado.mensaje || 'Error al actualizar estado');
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
// MODAL PARA ELIMINAR
// ============================================
function mostrarModalEliminarEstadia(estadiaId) {
    estadiaIdAEliminar = estadiaId;
    if (modalConfirmar) modalConfirmar.style.display = 'flex';
}

function cerrarModalEliminar() {
    if (modalConfirmar) modalConfirmar.style.display = 'none';
    estadiaIdAEliminar = null;
}

async function eliminarEstadiaConfirmado() {
    if (!estadiaIdAEliminar) return;

    try {
        const respuesta = await fetch(`/api/estadias/eliminar/${estadiaIdAEliminar}`, {
            method: 'DELETE'
        });

        const resultado = await respuesta.json();
        cerrarModalEliminar();

        if (resultado.exito) {
            mostrarMensaje('exito', 'Estadía eliminada correctamente');
            cargarEstadias();
        } else {
            mostrarMensaje('error', resultado.mensaje);
        }
    } catch (error) {
        cerrarModalEliminar();
        mostrarMensaje('error', 'Error de conexión');
    }
}

// ============================================
// HELPERS
// ============================================
function calcularDiasRestantes(fechaFin) {
    if (!fechaFin) return 0;
    const fin = new Date(fechaFin);
    const hoy = new Date();
    const diffTime = fin - hoy;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
}

function escapeHtml(texto) {
    if (!texto) return '';
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}

function formatearFecha(fecha) {
    if (!fecha) return 'Sin fecha';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-MX');
}

function verDetalleEstadia(estadiaId) {
    window.location.href = `detalle_estadia.html?id=${estadiaId}`;
}

function editarEstadia(estadiaId) {
    window.location.href = `crear_estadia.html?id=${estadiaId}`;
}

function crearEstadia() {
    window.location.href = 'crear_estadia.html';
}

// ============================================
// INICIALIZAR
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Configurar según rol
    configurarPorRol();

    // Cargar estadías
    cargarEstadias();

    const btnCrear = document.getElementById('btnCrearEstadia');
    if (btnCrear) {
        btnCrear.onclick = crearEstadia;
    }

    if (btnCancelarEliminar) btnCancelarEliminar.onclick = cerrarModalEliminar;
    if (btnConfirmarEliminar) btnConfirmarEliminar.onclick = eliminarEstadiaConfirmado;
    if (modalConfirmar) {
        modalConfirmar.onclick = function(e) {
            if (e.target === modalConfirmar) cerrarModalEliminar();
        };
    }

    const btnLimpiarFiltros = document.getElementById('btnLimpiarFiltros');

if (btnLimpiarFiltros) {
    btnLimpiarFiltros.onclick = limpiarFiltros;
}

if (btnCancelarEliminar) {
    btnCancelarEliminar.onclick = cerrarModalEliminar;
}
});