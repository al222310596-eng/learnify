// ============================================
// ARCHIVO: duales.js
// Lógica para gestionar Duales (Firma por código de email)
// ============================================

const usuario = JSON.parse(localStorage.getItem('usuario'));

if (!usuario) {
    window.location.href = '../../iniciar_sesion.html';
}

let dualesCache = [];
let dualIdAEliminar = null;
let dualActual = null;
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
        console.log('👨‍🏫 Usuario es MAESTRO');
    } else {
        btnCrear.style.display = 'none';
        console.log('🎓 Usuario es ALUMNO');
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
                <p>Error de conexión.</p>
                <button onclick="cargarDuales()" class="btn primario" style="margin-top: 1rem;">
                    <i class="fas fa-sync-alt"></i> Reintentar
                </button>
            </div>
        `;
    }
}
// ============================================
// MOSTRAR DUALES
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
                    
                    ${!esMaestro ? `
                        <button data-iddual="${dual._id}" class="btn-compartir-dual" style="background: #06b6d4; color: white; border: none; padding: 8px 14px; border-radius: 8px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">
                            <i class="fas fa-share-alt"></i> Compartir
                        </button>
                    ` : ''}

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

    // ✅ Asignar el evento de clic a los botones de compartir (sin setTimeout)
    container.querySelectorAll('.btn-compartir-dual').forEach(btn => {
        btn.addEventListener('click', function () {
            const dualId = this.getAttribute('data-iddual');
            abrirModalCompartir(dualId, 'dual');
        });
    });
}

// ============================================
// CERRAR MODAL COMPARTIR
// ============================================
function cerrarModalCompartir() {
    const modal = document.getElementById('modalCompartirGlobal');
    if (modal) modal.classList.remove('active');
}

// ============================================
// CAMBIAR DE TAB (Correo / Enlace / Historial)
// ============================================
function cambiarTabCompartir(tab, btn) {
    const modal = document.getElementById('modalCompartirGlobal');
    if (!modal) return;

    // Quitar active de todos los tabs y contenidos
    modal.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    modal.querySelectorAll('.tab-content').forEach(c => {
        c.classList.remove('active');
        c.style.display = 'none';
    });

    // Activar el tab seleccionado
    if (btn) btn.classList.add('active');
    const contenido = document.getElementById(`tab-${tab}`);
    if (contenido) {
        contenido.classList.add('active');
        contenido.style.display = 'block';
    }

    // Si es historial, cargarlo
    if (tab === 'historial') {
        cargarHistorialCompartir();
    }
}

// ============================================
// COPIAR ENLACE AL PORTAPAPELES
// ============================================
function copiarEnlace() {
    const input = document.getElementById('inputEnlaceCompartir');
    if (!input || !input.value) {
        alert('Primero genera un enlace');
        return;
    }

    // Método moderno
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(input.value)
            .then(() => {
                const btn = document.querySelector('.btn-copiar');
                const original = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check"></i>';
                btn.style.background = '#10b981';
                setTimeout(() => {
                    btn.innerHTML = original;
                    btn.style.background = '';
                }, 1500);
            })
            .catch(() => {
                // Fallback
                input.select();
                document.execCommand('copy');
                alert('Enlace copiado');
            });
    } else {
        input.select();
        document.execCommand('copy');
        alert('Enlace copiado');
    }
}

// ============================================
// ENVIAR POR CORREO (Compartir)
// ============================================
async function ejecutarCompartir(docId, tipo) {
    const correosInput = document.getElementById('compartirCorreos');
    const btn = document.getElementById('btnEnviarCorreoDual');

    if (!docId) {
        alert('No se identificó el documento');
        return;
    }

    const correos = correosInput.value.trim();
    if (!correos) {
        alert('Ingresa al menos un correo destinatario');
        correosInput.focus();
        return;
    }

    const listaCorreos = correos.split(',').map(c => c.trim()).filter(Boolean);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidos = listaCorreos.filter(c => !emailRegex.test(c));
    if (invalidos.length > 0) {
        alert(`Correos inválidos:\n${invalidos.join('\n')}`);
        return;
    }

    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando PDF y enviando...';
    btn.disabled = true;

    try {
        // 1. Cargar los datos del dual
        const resDual = await fetch(`/api/duales/detalle/${docId}`);
        const dataDual = await resDual.json();
        if (!dataDual.exito) throw new Error('No se pudo cargar el dual');

        // 2. Generar el PDF en memoria usando jsPDF + html2canvas
        //    (reutilizamos generarFormatoImprimibleDual que ya tienes)
        const htmlFormato = generarFormatoImprimibleDual(dataDual.dual);
        const contenedor = document.createElement('div');
        contenedor.innerHTML = htmlFormato;
        contenedor.style.position = 'fixed';
        contenedor.style.left = '-9999px';
        contenedor.style.top = '0';
        contenedor.style.width = '800px';
        contenedor.style.background = 'white';
        document.body.appendChild(contenedor);

        const canvas = await html2canvas(contenedor, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        const pdfBlob = pdf.output('blob');
        document.body.removeChild(contenedor);

        // 3. Enviar el PDF al endpoint correcto
        const formData = new FormData();
        formData.append('pdf_file', pdfBlob, `dual_${docId}.pdf`);
        formData.append('correos', listaCorreos.join(','));
        formData.append('tipo_documento', 'dual');
        formData.append('documento_id', docId);
        formData.append('creador_id', usuario._id);

        const res = await fetch('/api/compartir/crear', {
            method: 'POST',
            body: formData
        });

        const data = await res.json();

        if (data.exito) {
            alert(`✅ Enviado correctamente a ${listaCorreos.length} destinatario(s)`);
            correosInput.value = '';
        } else {
            alert('❌ ' + (data.mensaje || 'Error al enviar'));
        }
    } catch (error) {
        console.error('Error al compartir:', error);
        alert('❌ ' + (error.message || 'Error de conexión'));
    } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
}
// ============================================
// GENERAR ENLACE PÚBLICO
// ============================================
async function generarSoloEnlace(docId, tipo) {
    const btn = document.getElementById('btnGenerarEnlaceDual');
    const inputEnlace = document.getElementById('inputEnlaceCompartir');

    if (!docId) {
        alert('No se identificó el documento');
        return;
    }

    const permisos = document.getElementById('compartirPermisosEnlace').value;
    const dias = document.getElementById('compartirExpiracionEnlace').value;

    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
    btn.disabled = true;

    try {
        const res = await fetch('/api/compartir/generar-enlace', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                documento_id: docId,
                tipo_documento: tipo || 'dual',
                creador_id: usuario._id,
                dias_expiracion: parseInt(dias),
                permisos: permisos
            })
        });

        const data = await res.json();

        if (data.exito && data.enlace) {
            inputEnlace.value = data.enlace;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(data.enlace).catch(() => { });
            }
        } else {
            alert('❌ ' + (data.mensaje || 'Error al generar enlace'));
        }
    } catch (error) {
        console.error('Error al generar enlace:', error);
        alert('❌ Error de conexión');
    } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
}
// ============================================
// CARGAR HISTORIAL DE COMPARTIDOS
// ============================================
async function cargarHistorialCompartir() {
    const contenedor = document.getElementById('historialContenido');
    if (!contenedor) return;

    const docId = window.currentDocIdCompartir;
    if (!docId) {
        contenedor.innerHTML = '<p style="text-align:center;color:#94a3b8;font-size:0.85rem;">Sin documento seleccionado</p>';
        return;
    }

    contenedor.innerHTML = '<p style="text-align:center;color:#94a3b8;font-size:0.85rem;"><i class="fas fa-spinner fa-spin"></i> Cargando historial...</p>';

    try {
        const res = await fetch(`/api/compartir/historial/${docId}`);
        const data = await res.json();

        if (!data.exito || !data.historial || data.historial.length === 0) {
            contenedor.innerHTML = `
                <p style="text-align:center;color:#94a3b8;font-size:0.85rem;">
                    <i class="fas fa-info-circle"></i> Aún no has compartido este documento.
                </p>
            `;
            return;
        }

        contenedor.innerHTML = data.historial.map(item => {
            const icono = item.accion === 'visto'
                ? '<i class="fas fa-eye"></i>'
                : '<i class="fas fa-paper-plane"></i>';
            const clase = item.accion === 'visto' ? 'enlace' : 'correo';
            const texto = item.accion === 'visto' ? 'Visto' : 'Compartido';

            return `
                <div class="historial-item">
                    <div class="historial-icono ${clase}">${icono}</div>
                    <div class="historial-detalle">
                        <p><strong>${texto}</strong> ${item.ip ? '· IP: ' + item.ip : ''}</p>
                        <span>${item.fecha || ''}</span>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error al cargar historial:', error);
        contenedor.innerHTML = `
            <p style="text-align:center;color:#dc2626;font-size:0.85rem;">
                <i class="fas fa-exclamation-triangle"></i> Error al cargar el historial
            </p>
        `;
    }
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
// FIRMA POR CÓDIGO DE EMAIL
// ============================================

function abrirModalFirma(dualId, asignacionIndex) {
    dualIdParaFirma = dualId;
    asignacionIndexParaFirma = asignacionIndex;

    // Resetear el modal
    document.getElementById('paso1Codigo').style.display = 'block';
    document.getElementById('paso2Codigo').style.display = 'none';
    document.getElementById('inputCodigoFirma').value = '';
    document.getElementById('inputPasswordFirma').value = '';
    document.getElementById('mensajeCodigo').style.display = 'none';

    const btn = document.getElementById('btnSolicitarCodigo');
    if (btn) {
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar código a mi correo';
        btn.disabled = false;
    }

    const modal = document.getElementById('modalFirma');
    modal.classList.add('active');
}

function cerrarModalFirma() {
    const modal = document.getElementById('modalFirma');
    modal.classList.remove('active');
}

async function solicitarCodigoFirma() {
    const btn = document.getElementById('btnSolicitarCodigo');
    const textoOriginal = btn.innerHTML;

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
    btn.disabled = true;

    try {
        const respuesta = await fetch('/api/duales/solicitar-codigo-firma', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                dual_id: dualIdParaFirma,
                asignacion_index: asignacionIndexParaFirma,
                usuario_id: usuario._id
            })
        });

        const resultado = await respuesta.json();

        if (resultado.exito) {
            // Cambiar al paso 2
            document.getElementById('paso1Codigo').style.display = 'none';
            document.getElementById('paso2Codigo').style.display = 'block';
            document.getElementById('mensajeCodigoEnviado').textContent = resultado.mensaje;
            document.getElementById('inputCodigoFirma').focus();

            console.log('✅ Código solicitado correctamente');
        } else {
            mostrarMensajeCodigo('error', resultado.mensaje || 'Error al enviar código');
            btn.innerHTML = textoOriginal;
            btn.disabled = false;
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarMensajeCodigo('error', 'Error de conexión');
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
}

async function verificarCodigoFirma() {
    const codigo = document.getElementById('inputCodigoFirma').value.trim();
    const password = document.getElementById('inputPasswordFirma').value;
    const btn = document.getElementById('btnFirmar');

    // Validaciones
    if (!codigo || codigo.length !== 6) {
        mostrarMensajeCodigo('error', 'El código debe tener 6 dígitos');
        return;
    }

    if (!password) {
        mostrarMensajeCodigo('error', 'Ingresa tu contraseña');
        return;
    }

    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Firmando...';
    btn.disabled = true;

    try {
        const respuesta = await fetch('/api/duales/verificar-codigo-firma', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                dual_id: dualIdParaFirma,
                asignacion_index: asignacionIndexParaFirma,
                usuario_id: usuario._id,
                codigo: codigo,
                password: password
            })
        });

        const resultado = await respuesta.json();

        if (resultado.exito) {
            mostrarMensaje('exito', 'Firma registrada correctamente ✅');
            cerrarModalFirma();
            verDetalleDual(dualIdParaFirma);
            cargarDuales();
        } else {
            mostrarMensajeCodigo('error', resultado.mensaje || 'Error al verificar');
            btn.innerHTML = textoOriginal;
            btn.disabled = false;
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarMensajeCodigo('error', 'Error de conexión');
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
}

function mostrarMensajeCodigo(tipo, texto) {
    const div = document.getElementById('mensajeCodigo');
    if (!div) return;

    if (tipo === 'exito') {
        div.style.background = '#dcfce7';
        div.style.color = '#166534';
        div.style.border = '1px solid #bbf7d0';
        div.innerHTML = `<i class="fas fa-check-circle"></i> ${texto}`;
    } else {
        div.style.background = '#fee2e2';
        div.style.color = '#991b1b';
        div.style.border = '1px solid #fecaca';
        div.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${texto}`;
    }
    div.style.display = 'block';
}

function volverPaso1Codigo() {
    document.getElementById('paso1Codigo').style.display = 'block';
    document.getElementById('paso2Codigo').style.display = 'none';
    document.getElementById('inputCodigoFirma').value = '';
    document.getElementById('inputPasswordFirma').value = '';
    document.getElementById('mensajeCodigo').style.display = 'none';

    const btn = document.getElementById('btnSolicitarCodigo');
    if (btn) {
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar código a mi correo';
        btn.disabled = false;
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

        let contenedor = document.getElementById('formatoImprimible');
        if (!contenedor) {
            console.warn('⚠️ Contenedor no encontrado. Creándolo dinámicamente...');
            contenedor = document.createElement('div');
            contenedor.id = 'formatoImprimible';
            contenedor.className = 'formato-imprimible';
            document.body.appendChild(contenedor);
        }

        contenedor.innerHTML = generarFormatoImprimibleDual(dualActual);

        setTimeout(() => {
            window.print();
        }, 300);

    } catch (error) {
        console.error('Error:', error);
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
                    <img src="../../img/tecnm.png" alt="Logo Institución"
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
                    <p class="firma-rol">Tutor Empresarial</p>
                </div>
                <div class="formato-firma">
                    <div class="firma-linea"></div>
                    <p><strong>___________________</strong></p>
                    <p class="firma-rol">Coordinador Dual</p>
                </div>
            </section>

            <footer class="formato-pie">
                <p>Documento generado por <strong>Learnify</strong> · ${hoy}</p>
            </footer>
        </div>
    `;
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
    if (modalConfirmar) modalConfirmar.style.display = 'flex';
}

function cerrarModalEliminar() {
    if (modalConfirmar) modalConfirmar.style.display = 'none';
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
// ============================================
// COMPARTIR DUALES (VERSIÓN ÚNICA Y DEFINITIVA)
// ============================================
function abrirModalCompartir(dualId, tipo = 'dual') {
    let modal = document.getElementById('modalCompartirGlobal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalCompartirGlobal';
        modal.className = 'modal-compartir';
        modal.innerHTML = `
            <div class="modal-compartir-contenido">
                <div class="modal-compartir-header">
                    <h3><i class="fas fa-share-alt"></i> Compartir Documento</h3>
                    <button onclick="cerrarModalCompartir()" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:#94a3b8;">&times;</button>
                </div>
                
                <div class="tabs-compartir">
                    <button class="tab-btn active" onclick="cambiarTabCompartir('correo', this)">Por Correo</button>
                    <button class="tab-btn" onclick="cambiarTabCompartir('enlace', this)">Por Enlace</button>
                    <button class="tab-btn" onclick="cambiarTabCompartir('historial', this)">Historial</button>
                </div>
                
                <div id="tab-correo" class="tab-content active">
                    <div class="form-grupo-compartir">
                        <label>Correos destinatarios (separados por coma)</label>
                        <input type="text" id="compartirCorreos" placeholder="ejemplo1@correo.com, ejemplo2@correo.com">
                    </div>
                    <button id="btnEnviarCorreoDual" class="btn-compartir-accion">
                        <i class="fas fa-paper-plane"></i> Enviar
                    </button>
                </div>

                <div id="tab-enlace" class="tab-content" style="display: none;">
                    <div class="form-grupo-compartir">
                        <label>Permisos</label>
                        <select id="compartirPermisosEnlace">
                            <option value="ver">Solo Ver</option>
                        </select>
                    </div>
                    <div class="form-grupo-compartir">
                        <label>Vigencia (Expiración)</label>
                        <select id="compartirExpiracionEnlace">
                            <option value="1">1 Día</option>
                            <option value="7" selected>7 Días</option>
                            <option value="30">30 Días</option>
                            <option value="0">Nunca</option>
                        </select>
                    </div>
                    <button id="btnGenerarEnlaceDual" class="btn-compartir-accion" style="margin-bottom: 10px;">
                        <i class="fas fa-link"></i> Generar Enlace
                    </button>
                    <div class="enlace-container">
                        <input type="text" id="inputEnlaceCompartir" readonly placeholder="El enlace aparecerá aquí...">
                        <button class="btn-copiar" onclick="copiarEnlace()"><i class="fas fa-copy"></i></button>
                    </div>
                </div>

                <div id="tab-historial" class="tab-content" style="display: none;">
                    <div id="historialContenido" class="historial-lista">
                        <p style="text-align:center;color:#94a3b8;font-size:0.85rem;">Cargando historial...</p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.onclick = (e) => { if (e.target === modal) cerrarModalCompartir(); };

        document.getElementById('btnEnviarCorreoDual').onclick = function() {
            ejecutarCompartir(window.currentDocIdCompartir, window.currentDocTipoCompartir);
        };
        document.getElementById('btnGenerarEnlaceDual').onclick = function() {
            generarSoloEnlace(window.currentDocIdCompartir, window.currentDocTipoCompartir);
        };
    }

    window.currentDocIdCompartir = dualId;
    window.currentDocTipoCompartir = tipo;

    document.querySelectorAll('.tab-btn').forEach((b, index) => {
        if (index === 0) b.classList.add('active'); else b.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach((c, index) => {
        if (index === 0) c.style.display = 'block'; else c.style.display = 'none';
    });

    document.getElementById('compartirCorreos').value = '';
    document.getElementById('compartirPermisosEnlace').value = 'descargar';
    document.getElementById('compartirExpiracionEnlace').value = '7';
    document.getElementById('inputEnlaceCompartir').value = '';
    document.getElementById('historialContenido').innerHTML = '<p style="text-align:center;color:#94a3b8;font-size:0.85rem;">Cargando historial...</p>';

    modal.classList.add('active');
}