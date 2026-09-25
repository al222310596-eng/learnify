// ============================================
// ARCHIVO: detalle_estadia.js
// Lógica para la vista de detalle de una Estadía
// ============================================

// ============================================
// 1. CONFIGURACIÓN INICIAL
// ============================================
const usuario = JSON.parse(localStorage.getItem('usuario'));

if (!usuario) {
    window.location.href = '../../iniciar_sesion.html';
}

const urlParams = new URLSearchParams(window.location.search);
const estadiaId = urlParams.get('id');

if (!estadiaId) {
    window.location.href = 'mis_estadias.html';
}

let estadiaActual = null;

// Elementos del modal
const modalConfirmar = document.getElementById('modalConfirmarEstadia');
const btnCancelarEliminar = document.getElementById('btnCancelarEliminarEstadia');
const btnConfirmarEliminar = document.getElementById('btnConfirmarEliminarEstadia');

// ============================================
// 2. UTILIDADES
// ============================================
function escapeHtml(texto) {
    if (!texto) return '';
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}

function formatearFechaLarga(fecha) {
    if (!fecha) return null;
    try {
        const d = new Date(fecha);
        if (isNaN(d.getTime())) return fecha;
        return d.toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    } catch {
        return fecha;
    }
}

function etiquetaEstado(estado) {
    const mapa = {
        'pendiente':  { texto: 'Pendiente',  icono: 'fa-clock',         clase: 'estado-pendiente' },
        'en-curso':   { texto: 'En curso',   icono: 'fa-play-circle',   clase: 'estado-en-curso' },
        'completada': { texto: 'Completada', icono: 'fa-check-circle',  clase: 'estado-completada' },
        'cancelada':  { texto: 'Cancelada',  icono: 'fa-times-circle',  clase: 'estado-cancelada' }
    };
    return mapa[estado] || { texto: estado || 'Sin estado', icono: 'fa-clock', clase: 'estado-pendiente' };
}

function mostrarMensaje(tipo, texto) {
    const mensajeDiv = document.getElementById('mensaje');
    if (!mensajeDiv) return;

    const icono = tipo === 'exito'
        ? '<i class="fas fa-check-circle"></i>'
        : '<i class="fas fa-exclamation-triangle"></i>';

    mensajeDiv.className = `mensaje ${tipo}`;
    mensajeDiv.innerHTML = `${icono} ${texto}`;
    mensajeDiv.style.display = 'block';

    setTimeout(() => {
        mensajeDiv.style.display = 'none';
    }, 3000);
}

function cerrarSesion() {
    localStorage.removeItem('usuario');
    window.location.href = '../../iniciar_sesion.html';
}

// ============================================
// 3. CARGAR DETALLE
// ============================================
async function cargarDetalle() {
    try {
        const response = await fetch(`/api/estadias/detalle/${estadiaId}`);
        const result = await response.json();

        if (!result.exito || !result.estadia) {
            throw new Error(result.mensaje || 'No se encontró la estadía');
        }

        estadiaActual = result.estadia;
        renderizarDetalle(estadiaActual);
    } catch (error) {
        console.error('Error al cargar detalle:', error);
        const cont = document.getElementById('detalleContenido');
        if (cont) {
            cont.innerHTML = `
                <div class="detalle-error">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>No se pudo cargar la información de la estadía.</p>
                    <a href="mis_estadias.html" class="btn primario">
                        <i class="fas fa-arrow-left"></i> Volver a Mis Estadías
                    </a>
                </div>
            `;
        }
    }
}

// ============================================
// 4. RENDERIZAR DETALLE
// ============================================
function renderizarDetalle(e) {
    const estadoInfo = etiquetaEstado(e.estado);
    const fechaInicio = formatearFechaLarga(e.fecha_inicio);
    const fechaFin = formatearFechaLarga(e.fecha_fin);
    const esPropietario = e.usuario_id === usuario._id;

    // Progreso de horas (meta por defecto 600)
    const metaHoras = 600;
    const horasActuales = parseInt(e.horas) || 0;
    const porcentajeHoras = Math.min(100, Math.round((horasActuales / metaHoras) * 100));

    // Equipo como chips
    let equipoHTML = '<span class="detalle-item-valor vacio">Sin equipo asignado</span>';
    if (e.equipo && e.equipo.trim()) {
        const miembros = e.equipo.split(',').map(m => m.trim()).filter(Boolean);
        if (miembros.length > 0) {
            equipoHTML = `<div class="equipo-lista">${miembros.map(m =>
                `<span class="equipo-chip"><i class="fas fa-user"></i>${escapeHtml(m)}</span>`
            ).join('')}</div>`;
        }
    }

    const html = `
        <!-- Header con acciones -->
        <div class="detalle-header">
            <h2>
                <i class="fas fa-building"></i>
                Detalle de Estadía
            </h2>
            <div class="detalle-header-acciones">
                <a href="mis_estadias.html" class="btn secundario">
                    <i class="fas fa-arrow-left"></i> Volver
                </a>
    <button class="btn imprimir" onclick="imprimirFormato()">
        <i class="fas fa-print"></i> Imprimir Formato
    </button>
                ${esPropietario ? `
                    <a href="crear_estadia.html?id=${e._id}" class="btn primario">
                        <i class="fas fa-edit"></i> Editar
                    </a>
                    <button class="btn-danger" onclick="abrirModalEliminarDetalle()">
                        <i class="fas fa-trash-alt"></i> Eliminar
                    </button>
                ` : ''}
            </div>
        </div>

        <!-- Tarjeta hero -->
        <div class="detalle-card">
            <div class="detalle-hero">
                <div class="detalle-hero-icono">
                    <i class="fas fa-industry"></i>
                </div>
                <div class="detalle-hero-info">
                    <h1>${escapeHtml(e.proyecto || 'Proyecto sin nombre')}</h1>
                    <div class="empresa-nombre">
                        <i class="fas fa-building"></i>
                        ${escapeHtml(e.empresa || 'Empresa no especificada')}
                    </div>
                    <span class="estadia-estado ${estadoInfo.clase}">
                        <i class="fas ${estadoInfo.icono}"></i>
                        ${estadoInfo.texto}
                    </span>
                </div>
            </div>

            <!-- SECCIÓN: Datos del Alumno -->
            <div class="detalle-seccion">
                <div class="detalle-seccion-titulo">
                    <i class="fas fa-user-graduate"></i> Datos del Alumno
                </div>
                <div class="detalle-grid">
                    <div class="detalle-item">
                        <span class="detalle-item-label">Nombre completo</span>
                        <span class="detalle-item-valor">
                            <i class="fas fa-user"></i>
                            ${escapeHtml(`${e.nombre || ''} ${e.apellidos || ''}`.trim() || 'No especificado')}
                        </span>
                    </div>
                    <div class="detalle-item">
                        <span class="detalle-item-label">Carrera</span>
                        <span class="detalle-item-valor">
                            <i class="fas fa-graduation-cap"></i>
                            ${escapeHtml(e.carrera || 'No especificada')}
                        </span>
                    </div>
                    <div class="detalle-item">
                        <span class="detalle-item-label">Grupo</span>
                        <span class="detalle-item-valor">
                            <i class="fas fa-users"></i>
                            ${escapeHtml(e.grupo || 'No especificado')}
                        </span>
                    </div>
                </div>
            </div>

            <!-- SECCIÓN: Empresa y Asesores -->
            <div class="detalle-seccion">
                <div class="detalle-seccion-titulo">
                    <i class="fas fa-briefcase"></i> Empresa y Asesores
                </div>
                <div class="detalle-grid">
                    <div class="detalle-item">
                        <span class="detalle-item-label">Empresa</span>
                        <span class="detalle-item-valor">
                            <i class="fas fa-industry"></i>
                            ${escapeHtml(e.empresa || 'No especificada')}
                        </span>
                    </div>
                    <div class="detalle-item">
                        <span class="detalle-item-label">Lugar de estadía</span>
                        <span class="detalle-item-valor">
                            <i class="fas fa-map-marker-alt"></i>
                            ${escapeHtml(e.ubicacion || e.lugar_estadia || 'No especificado')}
                        </span>
                    </div>
                    <div class="detalle-item">
                        <span class="detalle-item-label">Asesor Académico</span>
                        <span class="detalle-item-valor">
                            <i class="fas fa-chalkboard-teacher"></i>
                            ${escapeHtml(e.asesor_academico || 'No especificado')}
                        </span>
                    </div>
                    <div class="detalle-item">
                        <span class="detalle-item-label">Asesor Externo</span>
                        <span class="detalle-item-valor">
                            <i class="fas fa-user-tie"></i>
                            ${escapeHtml(e.asesor_externo || 'No especificado')}
                        </span>
                    </div>
                </div>
            </div>

            <!-- SECCIÓN: Proyecto -->
            <div class="detalle-seccion">
                <div class="detalle-seccion-titulo">
                    <i class="fas fa-project-diagram"></i> Proyecto
                </div>
                <div class="detalle-grid mb-1">
                    <div class="detalle-item">
                        <span class="detalle-item-label">Nombre del proyecto</span>
                        <span class="detalle-item-valor">
                            <i class="fas fa-lightbulb"></i>
                            ${escapeHtml(e.proyecto || 'No especificado')}
                        </span>
                    </div>
                </div>
                <div class="detalle-item mb-1">
                    <span class="detalle-item-label">Equipo de trabajo</span>
                    ${equipoHTML}
                </div>
                <div class="detalle-item">
                    <span class="detalle-item-label">Descripción</span>
                    ${e.descripcion && e.descripcion.trim()
                        ? `<div class="detalle-texto">${escapeHtml(e.descripcion)}</div>`
                        : '<span class="detalle-item-valor vacio">Sin descripción</span>'}
                </div>
            </div>

            <!-- SECCIÓN: Periodo y Fechas -->
            <div class="detalle-seccion">
                <div class="detalle-seccion-titulo">
                    <i class="fas fa-calendar-alt"></i> Periodo y Fechas
                </div>
                <div class="detalle-grid">
                    <div class="detalle-item">
                        <span class="detalle-item-label">Periodo</span>
                        <span class="detalle-item-valor">
                            <i class="fas fa-clock"></i>
                            ${escapeHtml(e.periodo || 'No especificado')}
                        </span>
                    </div>
                    <div class="detalle-item">
                        <span class="detalle-item-label">Fecha de inicio</span>
                        <span class="detalle-item-valor">
                            <i class="fas fa-calendar-plus"></i>
                            ${fechaInicio || 'No especificada'}
                        </span>
                    </div>
                    <div class="detalle-item">
                        <span class="detalle-item-label">Fecha de término</span>
                        <span class="detalle-item-valor">
                            <i class="fas fa-calendar-check"></i>
                            ${fechaFin || 'No especificada'}
                        </span>
                    </div>
                    <div class="detalle-item">
                        <span class="detalle-item-label">Horas totales</span>
                        <span class="detalle-item-valor">
                            <i class="fas fa-hourglass-half"></i>
                            ${horasActuales} / ${metaHoras} hrs
                        </span>
                        <div class="progreso-horas">
                            <div class="progreso-barra">
                                <div class="progreso-barra-fill" style="width: ${porcentajeHoras}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('detalleContenido').innerHTML = html;
}

// ============================================
// 5. MODAL ELIMINAR (vista detalle)
// ============================================
function abrirModalEliminarDetalle() {
    if (modalConfirmar) modalConfirmar.style.display = 'flex';
}

function cerrarModalEliminar() {
    if (modalConfirmar) modalConfirmar.style.display = 'none';
}

async function eliminarEstadiaDesdeDetalle() {
    const btn = btnConfirmarEliminar;
    if (!btn) return;

    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Eliminando...';
    btn.disabled = true;

    try {
        const response = await fetch(`/api/estadias/eliminar/${estadiaId}`, {
            method: 'DELETE'
        });
        const result = await response.json();

        cerrarModalEliminar();

        if (result.exito) {
            mostrarMensaje('exito', 'Estadía eliminada correctamente');
            setTimeout(() => {
                window.location.href = 'mis_estadias.html';
            }, 1500);
        } else {
            mostrarMensaje('error', result.mensaje || 'Error al eliminar la estadía');
            btn.innerHTML = textoOriginal;
            btn.disabled = false;
        }
    } catch (error) {
        console.error('Error:', error);
        cerrarModalEliminar();
        mostrarMensaje('error', 'Error de conexión al eliminar');
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
}


// ============================================
// 5.5 IMPRIMIR FORMATO OFICIAL DE ESTADÍA
// ============================================
function generarFormatoImprimible(e) {
    const fechaInicio = formatearFechaLarga(e.fecha_inicio);
    const fechaFin = formatearFechaLarga(e.fecha_fin);
    const estadoInfo = etiquetaEstado(e.estado);
    const nombreCompleto = `${e.nombre || ''} ${e.apellidos || ''}`.trim() || 'No especificado';
    const hoy = new Date().toLocaleDateString('es-MX', {
        day: '2-digit', month: 'long', year: 'numeric'
    });

    // Equipo como texto
    let equipoTexto = 'Proyecto individual';
    if (e.equipo && e.equipo.trim()) {
        const miembros = e.equipo.split(',').map(m => m.trim()).filter(Boolean);
        if (miembros.length > 1) equipoTexto = miembros.join(', ');
    }

    return `
        <div class="formato-pagina">
            <!-- ENCABEZADO CON LOGOS -->
            <header class="formato-header">
                <div class="formato-logo formato-logo-izq">
                    <img src="../../img/logo_escuela.png" alt="Logo Escuela"
                         onerror="this.style.display='none'; this.parentNode.innerHTML='<div class=&quot;logo-placeholder&quot;>LOGO<br>ESCUELA</div>';">
                </div>
                <div class="formato-titulo">
                    <h1>FORMATO DE ESTADÍA PROFESIONAL</h1>
                    <p class="formato-subtitulo">Registro y Control de Estadías</p>
                </div>
                <div class="formato-logo formato-logo-der">
                    <img src="../../img/logo_tecnm.png" alt="Logo Institución"
                         onerror="this.style.display='none'; this.parentNode.innerHTML='<div class=&quot;logo-placeholder&quot;>LOGO<br>TECNM</div>';">
                </div>
            </header>

            <div class="formato-info-doc">
                <span><strong>Folio:</strong> EST-${String(e._id).slice(-6).toUpperCase()}</span>
                <span><strong>Fecha de emisión:</strong> ${hoy}</span>
            </div>

            <!-- SECCIÓN 1: DATOS DEL ALUMNO -->
            <section class="formato-seccion">
                <h2 class="formato-seccion-titulo">1. DATOS DEL ALUMNO</h2>
                <table class="formato-tabla">
                    <tr>
                        <td class="formato-label">Nombre completo</td>
                        <td class="formato-valor">${escapeHtml(nombreCompleto)}</td>
                        <td class="formato-label">Grupo</td>
                        <td class="formato-valor">${escapeHtml(e.grupo || 'No especificado')}</td>
                    </tr>
                    <tr>
                        <td class="formato-label">Carrera</td>
                        <td class="formato-valor" colspan="3">${escapeHtml(e.carrera || 'No especificada')}</td>
                    </tr>
                </table>
            </section>

            <!-- SECCIÓN 2: EMPRESA Y ASESORES -->
            <section class="formato-seccion">
                <h2 class="formato-seccion-titulo">2. EMPRESA Y ASESORES</h2>
                <table class="formato-tabla">
                    <tr>
                        <td class="formato-label">Empresa</td>
                        <td class="formato-valor" colspan="3">${escapeHtml(e.empresa || 'No especificada')}</td>
                    </tr>
                    <tr>
                        <td class="formato-label">Lugar de estadía</td>
                        <td class="formato-valor" colspan="3">${escapeHtml(e.ubicacion || e.lugar_estadia || 'No especificado')}</td>
                    </tr>
                    <tr>
                        <td class="formato-label">Asesor Académico</td>
                        <td class="formato-valor">${escapeHtml(e.asesor_academico || 'No especificado')}</td>
                        <td class="formato-label">Asesor Externo</td>
                        <td class="formato-valor">${escapeHtml(e.asesor_externo || 'No especificado')}</td>
                    </tr>
                </table>
            </section>

            <!-- SECCIÓN 3: PROYECTO -->
            <section class="formato-seccion">
                <h2 class="formato-seccion-titulo">3. PROYECTO</h2>
                <table class="formato-tabla">
                    <tr>
                        <td class="formato-label">Nombre del proyecto</td>
                        <td class="formato-valor" colspan="3">${escapeHtml(e.proyecto || 'No especificado')}</td>
                    </tr>
                    <tr>
                        <td class="formato-label">Equipo de trabajo</td>
                        <td class="formato-valor" colspan="3">${escapeHtml(equipoTexto)}</td>
                    </tr>
                    <tr>
                        <td class="formato-label">Descripción</td>
                        <td class="formato-valor formato-descripcion" colspan="3">
                            ${escapeHtml(e.descripcion || 'Sin descripción')}
                        </td>
                    </tr>
                </table>
            </section>

            <!-- SECCIÓN 4: PERIODO Y FECHAS -->
            <section class="formato-seccion">
                <h2 class="formato-seccion-titulo">4. PERIODO Y FECHAS</h2>
                <table class="formato-tabla">
                    <tr>
                        <td class="formato-label">Periodo</td>
                        <td class="formato-valor">${escapeHtml(e.periodo || 'No especificado')}</td>
                        <td class="formato-label">Horas totales</td>
                        <td class="formato-valor">${parseInt(e.horas) || 0} / 600 hrs</td>
                    </tr>
                    <tr>
                        <td class="formato-label">Fecha de inicio</td>
                        <td class="formato-valor">${fechaInicio || 'No especificada'}</td>
                        <td class="formato-label">Fecha de término</td>
                        <td class="formato-valor">${fechaFin || 'No especificada'}</td>
                    </tr>
                    <tr>
                        <td class="formato-label">Estado</td>
                        <td class="formato-valor" colspan="3">${estadoInfo.texto}</td>
                    </tr>
                </table>
            </section>

            <!-- FIRMAS -->
            <section class="formato-firmas">
                <div class="formato-firma">
                    <div class="firma-linea"></div>
                    <p><strong>${escapeHtml(nombreCompleto)}</strong></p>
                    <p class="firma-rol">Alumno</p>
                </div>
                <div class="formato-firma">
                    <div class="firma-linea"></div>
                    <p><strong>${escapeHtml(e.asesor_academico || '___________________')}</strong></p>
                    <p class="firma-rol">Asesor Académico</p>
                </div>
                <div class="formato-firma">
                    <div class="firma-linea"></div>
                    <p><strong>${escapeHtml(e.asesor_externo || '___________________')}</strong></p>
                    <p class="firma-rol">Asesor Externo</p>
                </div>
            </section>

            <footer class="formato-pie">
                <p>Documento generado por <strong>Learnify</strong> · ${hoy}</p>
            </footer>
        </div>
    `;
}

function imprimirFormato() {
    if (!estadiaActual) {
        mostrarMensaje('error', 'No hay datos para imprimir');
        return;
    }

    const contenedor = document.getElementById('formatoImprimible');
    contenedor.innerHTML = generarFormatoImprimible(estadiaActual);

    // Esperar a que carguen las imágenes y lanzar impresión
    setTimeout(() => {
        window.print();
    }, 300);
}

// ============================================
// 6. INICIALIZAR
// ============================================
document.addEventListener('DOMContentLoaded', function () {
    // Datos del usuario en el sidebar
    if (usuario) {
        const info = document.getElementById('userInfoSidebar');
        if (info) {
            info.innerHTML = `
                <div class="user-avatar">${usuario.nombre.charAt(0).toUpperCase()}</div>
                <div class="user-name">${usuario.nombre}</div>
                <div class="user-role">${usuario.rol === 'maestro' ? '👨‍🏫 Maestro' : '🎓 Alumno'}</div>
            `;
        }
    }

    // Eventos del modal
    if (btnCancelarEliminar) btnCancelarEliminar.onclick = cerrarModalEliminar;
    if (btnConfirmarEliminar) btnConfirmarEliminar.onclick = eliminarEstadiaDesdeDetalle;
    if (modalConfirmar) {
        modalConfirmar.onclick = function (e) {
            if (e.target === modalConfirmar) cerrarModalEliminar();
        };
    }

    // Cargar el detalle
    cargarDetalle();
    console.log('🔍 Vista de detalle cargada para ID:', estadiaId);
});