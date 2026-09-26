// ============================================
// ARCHIVO: duales.js
// Lógica para gestionar Duales (VERSIÓN COMPLETA CON FIRMA Y PDF)
// ============================================

const usuario = JSON.parse(localStorage.getItem('usuario'));

if (!usuario) {
    window.location.href = '../../iniciar_sesion.html';
}

let dualesCache = [];
let dualIdAEliminar = null;
let dualActual = null;
let firmaData = null;
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let canvas = null;
let ctx = null;
let dualIdParaFirma = null;
let asignacionIndexParaFirma = null;

// Elementos del DOM
const modalConfirmar = document.getElementById('modalConfirmar');
const modalDetalle = document.getElementById('modalDetalleDual');
const modalFirma = document.getElementById('modalFirma');
const btnCancelarEliminar = document.getElementById('btnCancelarEliminar');
const btnConfirmarEliminar = document.getElementById('btnConfirmarEliminar');

// ============================================
// CONFIGURAR BOTONES SEGÚN ROL DEL USUARIO
// ============================================
function configurarBotonesPorRol() {
    const btnCrear = document.getElementById('btnCrearDual');
    if (!btnCrear) return;

    const esMaestro = usuario.rol === 'maestro';

    if (esMaestro) {
        btnCrear.style.display = 'inline-flex';
        console.log('👨‍🏫 Usuario es MAESTRO - Mostrando botón "Registrar Dual"');
    } else {
        btnCrear.style.display = 'none';
        console.log('🎓 Usuario es ALUMNO - Ocultando botón "Registrar Dual"');
    }
}

// ============================================
// CARGAR DUALES DEL USUARIO
// ============================================
async function cargarDuales() {
    const container = document.getElementById('dualesContainer');
    container.innerHTML = '<div class="sin-duales"><i class="fas fa-spinner fa-pulse"></i> Cargando duales...</div>';

    try {
        const respuesta = await fetch(`/api/duales/${usuario._id}`);
        const resultado = await respuesta.json();

        if (resultado.exito) {
            dualesCache = resultado.duales || [];
            mostrarDuales(dualesCache);
        } else {
            container.innerHTML = `
                <div class="sin-duales">
                    <i class="fas fa-exclamation-triangle" style="color: #dc2626;"></i>
                    <p>${resultado.mensaje || 'Error al cargar duales'}</p>
                    <button onclick="cargarDuales()" class="btn primario" style="margin-top: 1rem;">
                        <i class="fas fa-sync-alt"></i> Reintentar
                    </button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = `
            <div class="sin-duales">
                <i class="fas fa-wifi" style="color: #dc2626;"></i>
                <p>Error de conexión. Verifica que el servidor esté corriendo.</p>
                <button onclick="cargarDuales()" class="btn primario" style="margin-top: 1rem;">
                    <i class="fas fa-sync-alt"></i> Reintentar
                </button>
            </div>
        `;
    }
}

// ============================================
// MOSTRAR DUALES (VERSIÓN CON ESTADO AUTOMÁTICO)
// ============================================
function mostrarDuales(duales) {
    const container = document.getElementById('dualesContainer');

    if (duales.length === 0) {
        container.innerHTML = `
            <div class="sin-duales">
                <i class="fas fa-briefcase fa-3x" style="color: #94a3b8; margin-bottom: 1rem; display: block;"></i>
                No tienes duales registrados.<br>
                <button id="btnCrearVacio" class="btn primario" style="margin-top: 1rem;">
                    <i class="fas fa-plus-circle"></i> Registrar tu primer dual
                </button>
            </div>
        `;
        const btnVacio = document.getElementById('btnCrearVacio');
        if (btnVacio) {
            if (usuario.rol === 'maestro') {
                btnVacio.style.display = 'inline-flex';
                btnVacio.onclick = () => window.location.href = 'crear_dual.html';
            } else {
                btnVacio.style.display = 'none';
            }
        }
        return;
    }

    const esMaestro = usuario.rol === 'maestro';

    container.innerHTML = duales.map(dual => {
        let estadoClass = '', estadoText = '', estadoIcono = '';
        switch (dual.estado) {
            case 'activo':
                estadoClass = 'estado-activo';
                estadoText = 'Activo';
                estadoIcono = '<i class="fas fa-play-circle"></i>';
                break;
            case 'pendiente':
                estadoClass = 'estado-pendiente';
                estadoText = 'Pendiente';
                estadoIcono = '<i class="fas fa-clock"></i>';
                break;
            case 'inactivo':
                estadoClass = 'estado-finalizado';
                estadoText = 'Inactivo';
                estadoIcono = '<i class="fas fa-stop-circle"></i>';
                break;
            default:
                estadoClass = 'estado-pendiente';
                estadoText = dual.estado || 'Pendiente';
                estadoIcono = '<i class="fas fa-clock"></i>';
        }

        const totalFirmas = dual.asignaciones ? dual.asignaciones.length : 0;
        const firmasCompletadas = dual.asignaciones ? dual.asignaciones.filter(a => a.firmado).length : 0;

        return `
            <div class="dual-card ${dual.estado === 'activo' ? 'activo' : ''}">
                <div class="dual-titulo"><i class="fas fa-bullseye"></i> ${escapeHtml(dual.titulo)}</div>
                <div class="dual-empresa"><i class="fas fa-building"></i> ${escapeHtml(dual.empresa)}</div>
                <div class="dual-fechas">
                    <span><i class="fas fa-calendar-alt"></i> Inicio: ${formatearFecha(dual.fecha_inicio)}</span>
                    <span><i class="fas fa-calendar-check"></i> Fin: ${formatearFecha(dual.fecha_fin)}</span>
                </div>
                ${dual.cuatrimestre ? `<div class="dual-fechas"><span><i class="fas fa-layer-group"></i> Cuatrimestre: ${dual.cuatrimestre}</span></div>` : ''}
                ${esMaestro ? `
                    <div class="dual-fechas">
                        <span><i class="fas fa-user-graduate"></i> Alumno: ${escapeHtml(dual.alumno?.nombre || 'No asignado')}</span>
                    </div>
                ` : ''}
                <div class="dual-fechas">
                    <span><i class="fas fa-user-tag"></i> Tutor: ${escapeHtml(dual.tutor)}</span>
                    <span><i class="fas fa-clock"></i> Horas: ${dual.horas}</span>
                </div>
                ${!esMaestro ? `
                    <div class="dual-firmas-resumen">
                        <span><i class="fas fa-file-signature"></i> Firmas: ${firmasCompletadas}/${totalFirmas}</span>
                    </div>
                ` : ''}
                <span class="dual-estado ${estadoClass}">${estadoIcono} ${estadoText}</span>
                <div class="dual-acciones">
                    <button onclick="verDetalleDual('${dual._id}')" class="btn-detalle-dual">
                        <i class="fas fa-eye"></i> Ver detalles
                    </button>
                    ${esMaestro ? `
                        ${dual.estado !== 'inactivo' ? `
                            <button onclick="editarDual('${dual._id}')" class="btn-editar-dual">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                        ` : ''}
                        <button onclick="mostrarModalEliminarDual('${dual._id}')" class="btn-eliminar-dual">
                            <i class="fas fa-trash-alt"></i> Eliminar
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// VER DETALLE DEL DUAL (Modal)
// ============================================
async function verDetalleDual(dualId) {
    const modal = document.getElementById('modalDetalleDual');
    const content = document.getElementById('detalleDualContent');

    modal.classList.add('active');
    content.innerHTML = '<p><i class="fas fa-spinner fa-pulse"></i> Cargando detalles...</p>';

    try {
        const respuesta = await fetch(`/api/duales/detalle/${dualId}`);
        const resultado = await respuesta.json();

        if (resultado.exito) {
            dualActual = resultado.dual;
            const dual = dualActual;
            const esMaestro = usuario.rol === 'maestro';
            const esAlumno = usuario.rol === 'alumno';

            let html = `
                <div class="detalle-grid">
                    <div class="detalle-field full-width">
                        <label>Título</label>
                        <div class="detalle-valor">${escapeHtml(dual.titulo)}</div>
                    </div>
                    <div class="detalle-field">
                        <label>Empresa</label>
                        <div class="detalle-valor">${escapeHtml(dual.empresa)}</div>
                    </div>
                    <div class="detalle-field">
                        <label>Estado</label>
                        <div class="detalle-valor"><span class="dual-estado ${dual.estado === 'activo' ? 'estado-activo' : dual.estado === 'pendiente' ? 'estado-pendiente' : 'estado-finalizado'}">${dual.estado}</span></div>
                    </div>
                    <div class="detalle-field">
                        <label>Cuatrimestre</label>
                        <div class="detalle-valor">${dual.cuatrimestre || 'No especificado'}</div>
                    </div>
                    <div class="detalle-field">
                        <label>Curso</label>
                        <div class="detalle-valor">${dual.curso || 'No especificado'}</div>
                    </div>
                    <div class="detalle-field">
                        <label>Carrera</label>
                        <div class="detalle-valor">${dual.carrera || 'No especificado'}</div>
                    </div>
                    <div class="detalle-field">
                        <label>Fecha Inicio</label>
                        <div class="detalle-valor">${formatearFecha(dual.fecha_inicio)}</div>
                    </div>
                    <div class="detalle-field">
                        <label>Fecha Fin</label>
                        <div class="detalle-valor">${formatearFecha(dual.fecha_fin)}</div>
                    </div>
                    <div class="detalle-field">
                        <label>Horas</label>
                        <div class="detalle-valor">${dual.horas}</div>
                    </div>
                    <div class="detalle-field">
                        <label>Tutor</label>
                        <div class="detalle-valor">${escapeHtml(dual.tutor || 'No asignado')}</div>
                    </div>
                    ${dual.alumno ? `
                        <div class="detalle-field full-width">
                            <label>Alumno</label>
                            <div class="detalle-valor">${escapeHtml(dual.alumno.nombre)} (${escapeHtml(dual.alumno.email)})</div>
                        </div>
                    ` : ''}
                    ${dual.descripcion ? `
                        <div class="detalle-field full-width">
                            <label>Descripción</label>
                            <div class="detalle-valor">${escapeHtml(dual.descripcion)}</div>
                        </div>
                    ` : ''}
                </div>

                <div class="asignaciones-detalle">
                    <h4><i class="fas fa-file-signature"></i> Materias y Firmas</h4>
                    ${dual.asignaciones && dual.asignaciones.length > 0 ? dual.asignaciones.map((a, index) => `
                        <div class="asignacion-detalle-item">
                            <div class="asignacion-info">
                                <span class="materia">${escapeHtml(a.materia || 'Sin materia')}</span>
                                <span class="maestro"><i class="fas fa-chalkboard-teacher"></i> ${escapeHtml(a.maestro_nombre || 'No asignado')} ${a.maestro_email ? `(${escapeHtml(a.maestro_email)})` : ''}</span>
                            </div>
                            <div class="firma-status ${a.firmado ? 'firmado' : 'pendiente'}">
                                ${a.firmado ?
                                    `<i class="fas fa-check-circle"></i> Firmado` :
                                    `<i class="fas fa-clock"></i> Pendiente
                                    ${esMaestro ? `<button class="btn-firmar" onclick="abrirModalFirma('${dual._id}', ${index})"><i class="fas fa-pen"></i> Firmar</button>` : ''}
                                    `
                                }
                            </div>
                        </div>
                    `).join('') : '<p style="color: #94a3b8;">No hay materias asignadas.</p>'}
                </div>

                <div class="modal-actions">
                    ${esMaestro ? `
                        <button class="btn btn-editar" onclick="editarDual('${dual._id}')">
                            <i class="fas fa-edit"></i> Editar Dual
                        </button>
                    ` : ''}
                    ${esAlumno ? `
                        <button class="btn btn-pdf" onclick="generarPDF('${dual._id}')">
                            <i class="fas fa-file-pdf"></i> Descargar PDF
                        </button>
                    ` : ''}
                    <button class="btn btn-cerrar" onclick="cerrarDetalleDual()">
                        <i class="fas fa-times"></i> Cerrar
                    </button>
                </div>
            `;

            content.innerHTML = html;
        } else {
            content.innerHTML = `<p style="color: #dc2626;"><i class="fas fa-exclamation-triangle"></i> ${resultado.mensaje}</p>`;
        }
    } catch (error) {
        console.error('Error:', error);
        content.innerHTML = '<p style="color: #dc2626;"><i class="fas fa-exclamation-triangle"></i> Error al cargar los detalles</p>';
    }
}

function cerrarDetalleDual() {
    const modal = document.getElementById('modalDetalleDual');
    modal.classList.remove('active');
}

// ============================================
// FIRMA DIGITAL (Canvas) - CON AJUSTE PARA MODO OSCURO
// ============================================
function abrirModalFirma(dualId, asignacionIndex) {
    dualIdParaFirma = dualId;
    asignacionIndexParaFirma = asignacionIndex;
    const modal = document.getElementById('modalFirma');
    modal.classList.add('active');

    setTimeout(inicializarCanvas, 100);
}

function cerrarModalFirma() {
    const modal = document.getElementById('modalFirma');
    modal.classList.remove('active');
    limpiarFirma();
}

function inicializarCanvas() {
    const container = document.getElementById('canvasContainer');
    canvas = document.getElementById('firmaCanvas');
    const rect = container.getBoundingClientRect();

    canvas.width = container.clientWidth || 400;
    canvas.height = container.clientHeight || 180;

    ctx = canvas.getContext('2d');
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const isDarkMode = document.body.classList.contains('dark-mode');
    const inkColor = isDarkMode ? '#ffffff' : '#1e293b';
    ctx.strokeStyle = inkColor;

    const bgColor = isDarkMode ? '#1a1a2e' : '#ffffff';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    canvas.removeEventListener('mousedown', iniciarDibujo);
    canvas.removeEventListener('mousemove', dibujar);
    canvas.removeEventListener('mouseup', finalizarDibujo);
    canvas.removeEventListener('mouseleave', finalizarDibujo);
    canvas.removeEventListener('touchstart', iniciarDibujoTouch);
    canvas.removeEventListener('touchmove', dibujarTouch);
    canvas.removeEventListener('touchend', finalizarDibujo);

    canvas.addEventListener('mousedown', iniciarDibujo);
    canvas.addEventListener('mousemove', dibujar);
    canvas.addEventListener('mouseup', finalizarDibujo);
    canvas.addEventListener('mouseleave', finalizarDibujo);
    canvas.addEventListener('touchstart', iniciarDibujoTouch);
    canvas.addEventListener('touchmove', dibujarTouch);
    canvas.addEventListener('touchend', finalizarDibujo);

    const placeholder = document.getElementById('firmaPlaceholder');
    if (placeholder) {
        placeholder.style.display = 'block';
    }

    console.log(`🖊️ Canvas inicializado - Modo: ${isDarkMode ? 'OSCURO' : 'CLARO'}, Tinta: ${inkColor}`);
}

function iniciarDibujo(e) {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    lastX = (e.clientX - rect.left) * scaleX;
    lastY = (e.clientY - rect.top) * scaleY;

    const isDarkMode = document.body.classList.contains('dark-mode');
    ctx.strokeStyle = isDarkMode ? '#ffffff' : '#1e293b';
    ctx.lineWidth = 3;

    const placeholder = document.getElementById('firmaPlaceholder');
    if (placeholder) {
        placeholder.style.display = 'none';
    }
}

function iniciarDibujoTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    lastX = (touch.clientX - rect.left) * scaleX;
    lastY = (touch.clientY - rect.top) * scaleY;
    isDrawing = true;

    const isDarkMode = document.body.classList.contains('dark-mode');
    ctx.strokeStyle = isDarkMode ? '#ffffff' : '#1e293b';
    ctx.lineWidth = 3;

    const placeholder = document.getElementById('firmaPlaceholder');
    if (placeholder) {
        placeholder.style.display = 'none';
    }
}

function dibujar(e) {
    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();

    lastX = x;
    lastY = y;
}

function dibujarTouch(e) {
    e.preventDefault();
    if (!isDrawing) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (touch.clientX - rect.left) * scaleX;
    const y = (touch.clientY - rect.top) * scaleY;

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();

    lastX = x;
    lastY = y;
}

function finalizarDibujo() {
    isDrawing = false;
}

function limpiarFirma() {
    if (!ctx || !canvas) return;

    const isDarkMode = document.body.classList.contains('dark-mode');
    const bgColor = isDarkMode ? '#1a1a2e' : '#ffffff';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const placeholder = document.getElementById('firmaPlaceholder');
    if (placeholder) {
        placeholder.style.display = 'block';
    }
    firmaData = null;
}

function guardarFirma() {
    if (!canvas || !ctx) {
        mostrarMensaje('error', 'No se pudo capturar la firma');
        return;
    }

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let isEmpty = true;

    const isDarkMode = document.body.classList.contains('dark-mode');
    const bgR = isDarkMode ? 26 : 255;
    const bgG = isDarkMode ? 26 : 255;
    const bgB = isDarkMode ? 46 : 255;

    for (let i = 0; i < pixels.length; i += 4) {
        const diffR = Math.abs(pixels[i] - bgR);
        const diffG = Math.abs(pixels[i + 1] - bgG);
        const diffB = Math.abs(pixels[i + 2] - bgB);
        if (diffR > 20 || diffG > 20 || diffB > 20) {
            isEmpty = false;
            break;
        }
    }

    if (isEmpty) {
        mostrarMensaje('error', 'Por favor, firma en el recuadro antes de continuar');
        return;
    }

    firmaData = canvas.toDataURL('image/png');
    enviarFirma();
}

async function enviarFirma() {
    try {
        const respuesta = await fetch('/api/duales/firmar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                dual_id: dualIdParaFirma,
                asignacion_index: asignacionIndexParaFirma,
                usuario_id: usuario._id,
                firma: firmaData
            })
        });

        const resultado = await respuesta.json();

        if (resultado.exito) {
            mostrarMensaje('exito', 'Firma registrada correctamente ✅');
            cerrarModalFirma();
            verDetalleDual(dualIdParaFirma);
            cargarDuales();
        } else {
            mostrarMensaje('error', resultado.mensaje || 'Error al registrar la firma');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('error', 'Error de conexión');
    }
}


// ============================================
// GENERAR PDF CON FORMATO OFICIAL
// ============================================
async function generarPDF(dualId) {
    try {
        const respuesta = await fetch(`/api/duales/detalle/${dualId}`);
        const resultado = await respuesta.json();

        if (!resultado.exito) {
            mostrarMensaje('error', resultado.mensaje || 'Error al cargar el dual');
            return;
        }

        dualActual = resultado.dual;

        // ✅ Buscar el contenedor; si no existe, crearlo dinámicamente
        let contenedor = document.getElementById('formatoImprimible');
        
        if (!contenedor) {
            console.warn('⚠️ Contenedor "formatoImprimible" no encontrado. Creándolo dinámicamente...');
            contenedor = document.createElement('div');
            contenedor.id = 'formatoImprimible';
            contenedor.className = 'formato-imprimible';
            document.body.appendChild(contenedor);
            console.log('✅ Contenedor creado:', contenedor);
        }

        contenedor.innerHTML = generarFormatoImprimibleDual(dualActual);

        // Esperar a que se renderice y lanzar impresión
        setTimeout(() => {
            window.print();
        }, 300);

    } catch (error) {
        console.error('Error al generar PDF:', error);
        mostrarMensaje('error', 'Error de conexión al generar el PDF');
    }
}

// ============================================
// GENERAR EL HTML DEL FORMATO OFICIAL
// ============================================
function generarFormatoImprimibleDual(d) {
    const fechaInicio = formatearFechaLarga(d.fecha_inicio);
    const fechaFin = formatearFechaLarga(d.fecha_fin);
    const hoy = new Date().toLocaleDateString('es-MX', {
        day: '2-digit', month: 'long', year: 'numeric'
    });

    let asignacionesHTML = '<p style="color: #94a3b8;">Sin materias asignadas.</p>';
    if (d.asignaciones && d.asignaciones.length > 0) {
        asignacionesHTML = `
            <table class="formato-tabla">
                <thead>
                    <tr>
                        <td class="formato-label" style="width: 40%;">Materia</td>
                        <td class="formato-label" style="width: 35%;">Maestro</td>
                        <td class="formato-label" style="width: 25%;">Estado</td>
                    </tr>
                </thead>
                <tbody>
                    ${d.asignaciones.map(a => `
                        <tr>
                            <td class="formato-valor">${escapeHtml(a.materia || 'Sin materia')}</td>
                            <td class="formato-valor">
                                ${escapeHtml(a.maestro_nombre || 'No asignado')}
                                ${a.maestro_email ? `<br><span style="font-size: 7.5pt; color:#64748b;">${escapeHtml(a.maestro_email)}</span>` : ''}
                            </td>
                            <td class="formato-valor" style="color: ${a.firmado ? '#059669' : '#d97706'}; font-weight: 700;">
                                ${a.firmado ? '✅ FIRMADO' : '⏳ PENDIENTE'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    return `
        <div class="formato-pagina">
            <header class="formato-header">
                <div class="formato-logo formato-logo-izq">
                    <img src="../../img/logo_escuela.png" alt="Logo Escuela"
                         onerror="this.style.display='none'; this.parentNode.innerHTML='<div class=&quot;logo-placeholder&quot;>LOGO<br>ESCUELA</div>';">
                </div>
                <div class="formato-titulo">
                    <h1>FORMATO DE PROGRAMA DUAL</h1>
                    <p class="formato-subtitulo">Registro y Control de Programas Duales</p>
                </div>
                <div class="formato-logo formato-logo-der">
                    <img src="../../img/logo_tecnm.png" alt="Logo Institución"
                         onerror="this.style.display='none'; this.parentNode.innerHTML='<div class=&quot;logo-placeholder&quot;>LOGO<br>TECNM</div>';">
                </div>
            </header>

            <div class="formato-info-doc">
                <span><strong>Folio:</strong> DUAL-${String(d._id).slice(-6).toUpperCase()}</span>
                <span><strong>Fecha de emisión:</strong> ${hoy}</span>
            </div>

            <section class="formato-seccion">
                <h2 class="formato-seccion-titulo">1. DATOS DEL ALUMNO</h2>
                <table class="formato-tabla">
                    <tr>
                        <td class="formato-label">Nombre completo</td>
                        <td class="formato-valor">${escapeHtml(d.alumno?.nombre || 'No asignado')}</td>
                        <td class="formato-label">Correo</td>
                        <td class="formato-valor">${escapeHtml(d.alumno?.email || 'No especificado')}</td>
                    </tr>
                </table>
            </section>

            <section class="formato-seccion">
                <h2 class="formato-seccion-titulo">2. DATOS DE LA EMPRESA</h2>
                <table class="formato-tabla">
                    <tr>
                        <td class="formato-label">Empresa</td>
                        <td class="formato-valor" colspan="3">${escapeHtml(d.empresa || 'No especificada')}</td>
                    </tr>
                    <tr>
                        <td class="formato-label">Título del proyecto</td>
                        <td class="formato-valor" colspan="3">${escapeHtml(d.titulo || 'No especificado')}</td>
                    </tr>
                    <tr>
                        <td class="formato-label">Tutor</td>
                        <td class="formato-valor" colspan="3">${escapeHtml(d.tutor || 'No asignado')}</td>
                    </tr>
                </table>
            </section>

            <section class="formato-seccion">
                <h2 class="formato-seccion-titulo">3. DATOS ACADÉMICOS</h2>
                <table class="formato-tabla">
                    <tr>
                        <td class="formato-label">Carrera</td>
                        <td class="formato-valor">${escapeHtml(d.carrera || 'No especificada')}</td>
                        <td class="formato-label">Cuatrimestre</td>
                        <td class="formato-valor">${escapeHtml(d.cuatrimestre || 'No especificado')}</td>
                    </tr>
                    <tr>
                        <td class="formato-label">Curso</td>
                        <td class="formato-valor">${escapeHtml(d.curso || 'No especificado')}</td>
                        <td class="formato-label">Horas</td>
                        <td class="formato-valor">${parseInt(d.horas) || 0} hrs</td>
                    </tr>
                    <tr>
                        <td class="formato-label">Fecha de inicio</td>
                        <td class="formato-valor">${fechaInicio || 'No especificada'}</td>
                        <td class="formato-label">Fecha de término</td>
                        <td class="formato-valor">${fechaFin || 'No especificada'}</td>
                    </tr>
                    <tr>
                        <td class="formato-label">Estado</td>
                        <td class="formato-valor" colspan="3" style="text-transform: capitalize;">${escapeHtml(d.estado || 'pendiente')}</td>
                    </tr>
                </table>
            </section>

            ${d.descripcion ? `
                <section class="formato-seccion">
                    <h2 class="formato-seccion-titulo">4. DESCRIPCIÓN DEL PROYECTO</h2>
                    <table class="formato-tabla">
                        <tr>
                            <td class="formato-valor formato-descripcion" colspan="4">
                                ${escapeHtml(d.descripcion)}
                            </td>
                        </tr>
                    </table>
                </section>
            ` : ''}

            <section class="formato-seccion">
                <h2 class="formato-seccion-titulo">${d.descripcion ? '5' : '4'}. MATERIAS Y FIRMAS</h2>
                ${asignacionesHTML}
            </section>

            <section class="formato-firmas">
                <div class="formato-firma">
                    <div class="firma-linea"></div>
                    <p><strong>${escapeHtml(d.alumno?.nombre || '___________________')}</strong></p>
                    <p class="firma-rol">Alumno</p>
                </div>
                <div class="formato-firma">
                    <div class="firma-linea"></div>
                    <p><strong>${escapeHtml(d.tutor || '___________________')}</strong></p>
                    <p class="firma-rol">Tutor </p>
                </div>
            </section>

            <footer class="formato-pie">
                <p>Documento generado por <strong>Learnify</strong> · ${hoy}</p>
            </footer>
        </div>
    `;
}

// ============================================
// HELPERS
// ============================================
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
    }, 5000);
}

// ============================================
// MODAL PARA ELIMINAR DUAL
// ============================================
function mostrarModalEliminarDual(dualId) {
    dualIdAEliminar = dualId;
    if (modalConfirmar) {
        modalConfirmar.style.display = 'flex';
    }
}

function cerrarModalEliminar() {
    if (modalConfirmar) {
        modalConfirmar.style.display = 'none';
    }
    dualIdAEliminar = null;
}

async function eliminarDualConfirmado() {
    if (!dualIdAEliminar) return;

    try {
        const respuesta = await fetch(`/api/duales/eliminar/${dualIdAEliminar}`, {
            method: 'DELETE'
        });

        const resultado = await respuesta.json();

        cerrarModalEliminar();

        if (resultado.exito) {
            mostrarMensaje('exito', 'Dual eliminado correctamente');
            cargarDuales();
        } else {
            mostrarMensaje('error', resultado.mensaje);
        }
    } catch (error) {
        cerrarModalEliminar();
        mostrarMensaje('error', 'Error de conexión');
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

function formatearFecha(fecha) {
    if (!fecha) return 'Sin fecha';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-MX');
}

function editarDual(dualId) {
    window.location.href = `crear_dual.html?id=${dualId}`;
}

function crearDual() {
    window.location.href = 'crear_dual.html';
}

// ============================================
// CERRAR SESIÓN
// ============================================
function cerrarSesion() {
    localStorage.removeItem('usuario');
    window.location.href = '../../iniciar_sesion.html';
}

// ============================================
// INICIALIZAR
// ============================================
document.addEventListener('DOMContentLoaded', function () {
    configurarBotonesPorRol();
    cargarDuales();

    const btnCrear = document.getElementById('btnCrearDual');
    if (btnCrear) {
        btnCrear.onclick = crearDual;
    }

    if (btnCancelarEliminar) {
        btnCancelarEliminar.onclick = cerrarModalEliminar;
    }
    if (btnConfirmarEliminar) {
        btnConfirmarEliminar.onclick = eliminarDualConfirmado;
    }
    if (modalConfirmar) {
        modalConfirmar.onclick = function (e) {
            if (e.target === modalConfirmar) {
                cerrarModalEliminar();
            }
        };
    }

    if (modalDetalle) {
        modalDetalle.onclick = function (e) {
            if (e.target === modalDetalle) {
                cerrarDetalleDual();
            }
        };
    }

    if (modalFirma) {
        modalFirma.onclick = function (e) {
            if (e.target === modalFirma) {
                cerrarModalFirma();
            }
        };
    }
});