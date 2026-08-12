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
            // Solo mostrar el botón si es maestro
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
        // ✅ ESTADOS AUTOMÁTICOS: activo, pendiente, inactivo
        let estadoClass = '', estadoText = '', estadoIcono = '';
        switch(dual.estado) {
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
    
    // Inicializar canvas después de un pequeño delay
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
    
    // Ajustar tamaño del canvas al contenedor
    canvas.width = container.clientWidth || 400;
    canvas.height = container.clientHeight || 180;
    
    ctx = canvas.getContext('2d');
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // ✅ DETECTAR MODO OSCURO Y AJUSTAR COLOR DE LA TINTA
    const isDarkMode = document.body.classList.contains('dark-mode');
    const inkColor = isDarkMode ? '#ffffff' : '#1e293b';
    ctx.strokeStyle = inkColor;
    
    // ✅ Fondo del canvas según modo
    const bgColor = isDarkMode ? '#1a1a2e' : '#ffffff';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // ✅ Actualizar color de la tinta si cambia el modo mientras se dibuja
    // (se actualiza en cada inicio de dibujo)
    
    // Eventos para mouse
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
    
    // Ocultar placeholder
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
    
    // ✅ Asegurar color correcto al empezar a dibujar
    const isDarkMode = document.body.classList.contains('dark-mode');
    ctx.strokeStyle = isDarkMode ? '#ffffff' : '#1e293b';
    ctx.lineWidth = 3;
    
    // Ocultar placeholder al dibujar
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
    
    // ✅ Asegurar color correcto
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
    
    // Mostrar placeholder
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
    
    // Verificar si hay algo dibujado
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let isEmpty = true;
    // Verificar los píxeles (buscando colores que no sean el fondo)
    const isDarkMode = document.body.classList.contains('dark-mode');
    const bgColor = isDarkMode ? '#1a1a2e' : '#ffffff';
    const bgR = isDarkMode ? 26 : 255;
    const bgG = isDarkMode ? 26 : 255;
    const bgB = isDarkMode ? 46 : 255;
    
    for (let i = 0; i < pixels.length; i += 4) {
        // Si el píxel es diferente al fondo (con margen de 20)
        const diffR = Math.abs(pixels[i] - bgR);
        const diffG = Math.abs(pixels[i+1] - bgG);
        const diffB = Math.abs(pixels[i+2] - bgB);
        if (diffR > 20 || diffG > 20 || diffB > 20) {
            isEmpty = false;
            break;
        }
    }
    
    if (isEmpty) {
        mostrarMensaje('error', 'Por favor, firma en el recuadro antes de continuar');
        return;
    }
    
    // Guardar firma como imagen
    firmaData = canvas.toDataURL('image/png');
    
    // Enviar al servidor
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
            // Recargar el detalle
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
// GENERAR PDF (Alumno)
// ============================================
async function generarPDF(dualId) {
    try {
        const respuesta = await fetch(`/api/duales/detalle/${dualId}`);
        const resultado = await respuesta.json();
        
        if (resultado.exito) {
            const dual = resultado.dual;
            
            // Crear el contenido HTML para el PDF
            const contenidoHTML = `
                <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #667eea; font-size: 28px;">Learnify</h1>
                        <h2 style="color: #1e293b;">Reporte de Dual</h2>
                        <p style="color: #94a3b8;">Generado: ${new Date().toLocaleString('es-MX')}</p>
                    </div>
                    
                    <div style="border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                        <h3 style="color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Datos del Alumno</h3>
                        <p><strong>Nombre:</strong> ${escapeHtml(dual.alumno?.nombre || 'No disponible')}</p>
                        <p><strong>Correo:</strong> ${escapeHtml(dual.alumno?.email || 'No disponible')}</p>
                    </div>
                    
                    <div style="border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                        <h3 style="color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Datos del Dual</h3>
                        <p><strong>Título:</strong> ${escapeHtml(dual.titulo)}</p>
                        <p><strong>Empresa:</strong> ${escapeHtml(dual.empresa)}</p>
                        <p><strong>Descripción:</strong> ${escapeHtml(dual.descripcion || 'Sin descripción')}</p>
                        <p><strong>Cuatrimestre:</strong> ${dual.cuatrimestre || 'No especificado'}</p>
                        <p><strong>Curso:</strong> ${dual.curso || 'No especificado'}</p>
                        <p><strong>Carrera:</strong> ${dual.carrera || 'No especificado'}</p>
                        <p><strong>Tutor:</strong> ${escapeHtml(dual.tutor || 'No asignado')}</p>
                        <p><strong>Horas:</strong> ${dual.horas}</p>
                        <p><strong>Fecha Inicio:</strong> ${formatearFecha(dual.fecha_inicio)}</p>
                        <p><strong>Fecha Fin:</strong> ${formatearFecha(dual.fecha_fin)}</p>
                        <p><strong>Estado:</strong> ${dual.estado}</p>
                    </div>
                    
                    <div style="border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px;">
                        <h3 style="color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Materias y Firmas</h3>
                        ${dual.asignaciones && dual.asignaciones.length > 0 ? 
                            dual.asignaciones.map(a => `
                                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                                    <div>
                                        <strong>${escapeHtml(a.materia || 'Sin materia')}</strong><br>
                                        <span style="color: #94a3b8;">Maestro: ${escapeHtml(a.maestro_nombre || 'No asignado')}</span>
                                    </div>
                                    <div style="text-align: right;">
                                        <span style="color: ${a.firmado ? '#10b981' : '#f59e0b'}; font-weight: 600;">
                                            ${a.firmado ? '✅ FIRMADO' : '⏳ PENDIENTE'}
                                        </span>
                                    </div>
                                </div>
                            `).join('') : 
                            '<p style="color: #94a3b8;">No hay materias asignadas.</p>'
                        }
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e2e8f0;">
                        <p style="color: #94a3b8; font-size: 12px;">Este documento fue generado automáticamente por Learnify</p>
                    </div>
                </div>
            `;
            
            // Crear un elemento temporal para el PDF
            const ventana = window.open('', '_blank');
            ventana.document.write(`
                <html>
                    <head>
                        <title>Reporte Dual - Learnify</title>
                        <style>
                            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                            @media print {
                                body { padding: 0; }
                            }
                        </style>
                    </head>
                    <body>
                        ${contenidoHTML}
                        <script>
                            window.onload = function() {
                                window.print();
                                setTimeout(function() { window.close(); }, 1000);
                            };
                        <\/script>
                    </body>
                </html>
            `);
            ventana.document.close();
            
            mostrarMensaje('exito', 'Reporte PDF generado correctamente');
        } else {
            mostrarMensaje('error', resultado.mensaje || 'Error al generar el reporte');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('error', 'Error de conexión al generar el PDF');
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
document.addEventListener('DOMContentLoaded', function() {
    // 1. Configurar botones según rol
    configurarBotonesPorRol();
    
    // 2. Cargar duales
    cargarDuales();
    
    // 3. Evento del botón crear
    const btnCrear = document.getElementById('btnCrearDual');
    if (btnCrear) {
        btnCrear.onclick = crearDual;
    }
    
    // 4. Eventos del modal de confirmación
    if (btnCancelarEliminar) {
        btnCancelarEliminar.onclick = cerrarModalEliminar;
    }
    if (btnConfirmarEliminar) {
        btnConfirmarEliminar.onclick = eliminarDualConfirmado;
    }
    if (modalConfirmar) {
        modalConfirmar.onclick = function(e) {
            if (e.target === modalConfirmar) {
                cerrarModalEliminar();
            }
        };
    }
    
    // 5. Cerrar modal de detalle con click fuera
    if (modalDetalle) {
        modalDetalle.onclick = function(e) {
            if (e.target === modalDetalle) {
                cerrarDetalleDual();
            }
        };
    }
    
    // 6. Cerrar modal de firma con click fuera
    if (modalFirma) {
        modalFirma.onclick = function(e) {
            if (e.target === modalFirma) {
                cerrarModalFirma();
            }
        };
    }
});