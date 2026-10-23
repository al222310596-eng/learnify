// ============================================
// minutas.js - Lógica de Minutas
// ============================================

const usuario = JSON.parse(localStorage.getItem('usuario'));
if (!usuario) {
    window.location.href = '../../iniciar_sesion.html';
}

let minutasCache = [];

// ============================================
// 1. LISTAR MINUTAS
// ============================================
async function cargarMinutas() {
    const container = document.getElementById('minutasContainer');
    if (!container) return;

    container.innerHTML = '<div class="sin-minutas"><i class="fas fa-spinner fa-pulse"></i> Cargando minutas...</div>';

    try {
        const response = await fetch(`/api/minutas/${usuario._id}`);
        const result = await response.json();

        if (result.exito) {
            minutasCache = result.minutas || [];
            renderizarMinutas(minutasCache);
        } else {
            container.innerHTML = `<div class="sin-minutas"><i class="fas fa-exclamation-triangle"></i> ${result.mensaje}</div>`;
        }
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = '<div class="sin-minutas"><i class="fas fa-exclamation-triangle"></i> Error al cargar</div>';
    }
}

function renderizarMinutas(minutas) {
    const container = document.getElementById('minutasContainer');
    if (!container) return;

    if (minutas.length === 0) {
        container.innerHTML = `
            <div class="sin-minutas">
                <i class="fas fa-file-alt"></i>
                <p>Aún no has creado ninguna minuta</p>
                <a href="crear_minuta.html" class="btn primario" style="margin-top:1rem;display:inline-flex;">
                    <i class="fas fa-plus-circle"></i> Crear mi primera minuta
                </a>
            </div>
        `;
        return;
    }

    container.innerHTML = minutas.map(m => {
        const fecha = formatearFecha(m.fecha);
        return `
            <div class="minuta-card">
                <div class="minuta-fecha">
                    <i class="fas fa-calendar"></i>
                    ${fecha} ${m.hora ? '· ' + m.hora : ''}
                </div>
                <div class="minuta-asunto">${escapeHtml(m.asunto)}</div>
                ${m.area_carrera ? `
                    <div class="minuta-area">
                        <i class="fas fa-graduation-cap"></i>
                        ${escapeHtml(m.area_carrera)}
                    </div>` : ''}
                <div class="minuta-info-grid">
                    <span class="minuta-info-item">
                        <i class="fas fa-users"></i> ${m.total_asistentes} asistentes
                    </span>
                    <span class="minuta-info-item">
                        <i class="fas fa-clipboard-check"></i> ${m.total_acuerdos} acuerdos
                    </span>
                </div>
                <div class="minuta-acciones">
                    <button class="btn-minuta btn-ver" onclick="verMinuta('${m._id}')">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                    <button class="btn-minuta btn-imprimir" onclick="imprimirDesdeLista('${m._id}')">
                        <i class="fas fa-print"></i> PDF
                    </button>
                    <!-- NUEVO BOTÓN COMPARTIR -->
                    <button class="btn-minuta btn-compartir" onclick="abrirModalCompartir('${m._id}', 'minuta')">
                        <i class="fas fa-share-alt"></i> Compartir
                    </button>
                    <button class="btn-minuta btn-eliminar" onclick="eliminarMinuta('${m._id}')">
                        <i class="fas fa-trash-alt"></i> Eliminar
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// 2. VER / IMPRIMIR DESDE LISTA
// ============================================
async function verMinuta(id) {
    try {
        const response = await fetch(`/api/minutas/detalle/${id}`);
        const result = await response.json();

        if (!result.exito || !result.minuta) {
            mostrarMensaje('error', 'No se pudo cargar la minuta');
            return;
        }

        const m = result.minuta;

        // Crear modal simple para ver
        const modal = document.createElement('div');
        modal.className = 'modal-minuta';
        modal.style.cssText = `
            position: fixed; inset: 0; background: rgba(0,0,0,0.7);
            z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px;
        `;
        modal.innerHTML = `
            <div style="background:#fff; border-radius:16px; max-width:800px; max-height:90vh; overflow-y:auto; padding:2rem; width:100%;">
                <div style="display:flex; justify-content:space-between; margin-bottom:1.5rem; align-items:center;">
                    <h3 style="margin:0; color:#1e293b;">
                        <i class="fas fa-file-alt" style="color:#667eea;"></i> Detalle de Minuta
                    </h3>
                    <button onclick="this.closest('.modal-minuta').remove()" style="background:#dc2626; color:#fff; border:none; padding:8px 12px; border-radius:8px; cursor:pointer;">
                        <i class="fas fa-times"></i> Cerrar
                    </button>
                </div>
                ${generarVistaDetalle(m)}
            </div>
        `;
        document.body.appendChild(modal);
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    } catch (error) {
        console.error(error);
        mostrarMensaje('error', 'Error al cargar minuta');
    }
}

function generarVistaDetalle(m) {
    return `
        <div style="color:#1e293b; font-size:0.9rem; line-height:1.6;">
            <p><strong>Fecha:</strong> ${formatearFecha(m.fecha)} ${m.hora ? '· ' + m.hora : ''}</p>
            ${m.area_carrera ? `<p><strong>Área:</strong> ${escapeHtml(m.area_carrera)}</p>` : ''}
            <p><strong>Asunto:</strong> ${escapeHtml(m.asunto)}</p>

            <h4 style="color:#667eea; margin-top:1.5rem;">Asistentes (${m.asistentes.length})</h4>
            ${m.asistentes.length === 0
            ? '<p style="color:#94a3b8;font-style:italic;">Sin asistentes</p>'
            : `<ul>${m.asistentes.map(a => `<li>${escapeHtml(a.nombre)}</li>`).join('')}</ul>`}

            <h4 style="color:#667eea; margin-top:1.5rem;">Acuerdos (${m.acuerdos.length})</h4>
            ${m.acuerdos.length === 0
            ? '<p style="color:#94a3b8;font-style:italic;">Sin acuerdos</p>'
            : `<table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
                    <tr style="background:#f1f5f9;">
                        <th style="padding:6px;border:1px solid #cbd5e1;text-align:left;">Agenda</th>
                        <th style="padding:6px;border:1px solid #cbd5e1;text-align:left;">Acuerdo</th>
                        <th style="padding:6px;border:1px solid #cbd5e1;text-align:left;">Responsable</th>
                        <th style="padding:6px;border:1px solid #cbd5e1;text-align:left;">Fecha</th>
                    </tr>
                    ${m.acuerdos.map(a => `
                        <tr>
                            <td style="padding:6px;border:1px solid #cbd5e1;">${escapeHtml(a.agenda || '-')}</td>
                            <td style="padding:6px;border:1px solid #cbd5e1;">${escapeHtml(a.acuerdo || '-')}</td>
                            <td style="padding:6px;border:1px solid #cbd5e1;">${escapeHtml(a.responsable || '-')}</td>
                            <td style="padding:6px;border:1px solid #cbd5e1;">${a.fecha_compromiso ? formatearFecha(a.fecha_compromiso) : '-'}</td>
                        </tr>
                    `).join('')}
                </table>`}
        </div>
    `;
}

async function imprimirDesdeLista(id) {
    try {
        const response = await fetch(`/api/minutas/detalle/${id}`);
        const result = await response.json();
        if (result.exito && result.minuta) {
            generarFormatoImprimible(result.minuta);
            setTimeout(() => window.print(), 300);
        }
    } catch (error) {
        console.error(error);
    }
}

// ============================================
// 3. ELIMINAR
// ============================================
async function eliminarMinuta(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta minuta?\nEsta acción no se puede deshacer.')) return;

    try {
        const response = await fetch(`/api/minutas/eliminar/${id}`, { method: 'DELETE' });
        const result = await response.json();

        if (result.exito) {
            mostrarMensaje('exito', 'Minuta eliminada correctamente');
            cargarMinutas();
        } else {
            mostrarMensaje('error', result.mensaje || 'Error al eliminar');
        }
    } catch (error) {
        console.error(error);
        mostrarMensaje('error', 'Error de conexión');
    }
}

// ============================================
// 4. CREAR MINUTA - FORMULARIO
// ============================================
let contadorAsistentes = 0;
let contadorAcuerdos = 0;

function agregarAsistente(nombre = '', firma = '') {
    const lista = document.getElementById('listaAsistentes');
    if (!lista) return;

    contadorAsistentes++;
    const idx = contadorAsistentes;

    const div = document.createElement('div');
    div.className = 'item-dinamico asistente-item';
    div.innerHTML = `
        <div class="item-dinamico-header">
            <span class="item-dinamico-titulo">Asistente #${idx}</span>
            <button type="button" class="btn-eliminar-item" onclick="this.closest('.item-dinamico').remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="form-row">
            <div class="form-grupo">
                <label><i class="fas fa-user"></i> Nombre</label>
                <input type="text" class="asistente-nombre" placeholder="Nombre completo" value="${escapeHtml(nombre)}">
            </div>
            <div class="form-grupo">
                <label><i class="fas fa-signature"></i> Firma</label>
                <input type="text" class="asistente-firma" placeholder="Nombre de la firma" value="${escapeHtml(firma)}">
            </div>
        </div>
    `;
    lista.appendChild(div);
}

function agregarAcuerdo(agenda = '', acuerdo = '', responsable = '', fecha = '') {
    const lista = document.getElementById('listaAcuerdos');
    if (!lista) return;

    contadorAcuerdos++;
    const idx = contadorAcuerdos;

    const div = document.createElement('div');
    div.className = 'item-dinamico acuerdo-item';
    div.innerHTML = `
        <div class="item-dinamico-header">
            <span class="item-dinamico-titulo">Acuerdo #${idx}</span>
            <button type="button" class="btn-eliminar-item" onclick="this.closest('.item-dinamico').remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="form-row">
            <div class="form-grupo">
                <label><i class="fas fa-list-ol"></i> Agenda</label>
                <input type="text" class="acuerdo-agenda" placeholder="Punto de la agenda" value="${escapeHtml(agenda)}">
            </div>
            <div class="form-grupo">
                <label><i class="fas fa-user-tie"></i> Responsable</label>
                <input type="text" class="acuerdo-responsable" placeholder="Quién se compromete" value="${escapeHtml(responsable)}">
            </div>
        </div>
        <div class="form-grupo">
            <label><i class="fas fa-handshake"></i> Acuerdo</label>
            <textarea class="acuerdo-texto" placeholder="Descripción del acuerdo">${escapeHtml(acuerdo)}</textarea>
        </div>
        <div class="form-grupo">
            <label><i class="fas fa-calendar-check"></i> Fecha compromiso</label>
            <input type="date" class="acuerdo-fecha" value="${fecha}">
        </div>
    `;
    lista.appendChild(div);
}

// ============================================
// 5. GUARDAR MINUTA
// ============================================
async function guardarMinuta(e) {
    e.preventDefault();

    const fecha = document.getElementById('inputFecha').value;
    const hora = document.getElementById('inputHora').value;
    const area = document.getElementById('inputArea').value.trim();
    const asunto = document.getElementById('inputAsunto').value.trim();

    if (!fecha || !asunto) {
        mostrarMensaje('error', 'Fecha y asunto son obligatorios');
        return;
    }

    // Recolectar asistentes
    const asistentes = [];
    document.querySelectorAll('.asistente-item').forEach(item => {
        const nombre = item.querySelector('.asistente-nombre').value.trim();
        const firma = item.querySelector('.asistente-firma').value.trim();
        if (nombre) asistentes.push({ nombre, firma });
    });

    // Recolectar acuerdos
    const acuerdos = [];
    document.querySelectorAll('.acuerdo-item').forEach(item => {
        const agenda = item.querySelector('.acuerdo-agenda').value.trim();
        const acuerdo = item.querySelector('.acuerdo-texto').value.trim();
        const responsable = item.querySelector('.acuerdo-responsable').value.trim();
        const fecha_compromiso = item.querySelector('.acuerdo-fecha').value;
        if (agenda || acuerdo) {
            acuerdos.push({ agenda, acuerdo, responsable, fecha_compromiso });
        }
    });

    const datos = {
        usuario_id: usuario._id,
        fecha, hora, area_carrera: area, asunto,
        asistentes, acuerdos
    };

    try {
        const response = await fetch('/api/minutas/crear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });
        const result = await response.json();

        if (result.exito) {
            mostrarMensaje('exito', 'Minuta guardada correctamente');
            setTimeout(() => window.location.href = 'mis_minutas.html', 1200);
        } else {
            mostrarMensaje('error', result.mensaje || 'Error al guardar');
        }
    } catch (error) {
        console.error(error);
        mostrarMensaje('error', 'Error de conexión');
    }
}

// ============================================
// 6. IMPRIMIR MINUTA ACTUAL
// ============================================
function imprimirMinuta() {
    const fecha = document.getElementById('inputFecha').value;
    const asunto = document.getElementById('inputAsunto').value.trim();

    if (!fecha || !asunto) {
        mostrarMensaje('error', 'Completa los campos obligatorios antes de imprimir');
        return;
    }

    const hora = document.getElementById('inputHora').value;
    const area = document.getElementById('inputArea').value.trim();

    const asistentes = [];
    document.querySelectorAll('.asistente-item').forEach(item => {
        const nombre = item.querySelector('.asistente-nombre').value.trim();
        const firma = item.querySelector('.asistente-firma').value.trim();
        if (nombre) asistentes.push({ nombre, firma });
    });

    const acuerdos = [];
    document.querySelectorAll('.acuerdo-item').forEach(item => {
        const agenda = item.querySelector('.acuerdo-agenda').value.trim();
        const acuerdo = item.querySelector('.acuerdo-texto').value.trim();
        const responsable = item.querySelector('.acuerdo-responsable').value.trim();
        const fecha_compromiso = item.querySelector('.acuerdo-fecha').value;
        if (agenda || acuerdo) {
            acuerdos.push({ agenda, acuerdo, responsable, fecha_compromiso });
        }
    });

    generarFormatoImprimible({
        fecha, hora, area_carrera: area, asunto,
        asistentes, acuerdos,
        usuario_nombre: usuario.nombre
    });

     fetch('/api/historial/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            usuario_id: usuario._id,
            tipo: 'Minuta',
            referencia: asunto
        })
    });

    setTimeout(() => window.print(), 300);
}

// ============================================
// 7. FORMATO OFICIAL 2-R-COM-04
// ============================================
function generarFormatoImprimible(m) {
    const container = document.getElementById('formatoImprimible');
    if (!container) return;

    const baseUrl = window.location.origin;
    const hoy = new Date().toLocaleDateString('es-MX');
    const fechaFormateada = m.fecha ? formatearFecha(m.fecha) : hoy;

    // Dividir asistentes en 2 columnas
    const mitad = Math.ceil(m.asistentes.length / 2);
    const asistentesIzq = m.asistentes.slice(0, mitad);
    const asistentesDer = m.asistentes.slice(mitad);
    const maxFilas = Math.max(asistentesIzq.length, asistentesDer.length, 10);

    let filasAsistentes = '';
    for (let i = 0; i < maxFilas; i++) {
        const izq = asistentesIzq[i] || { nombre: '', firma: '' };
        const der = asistentesDer[i] || { nombre: '', firma: '' };
        filasAsistentes += `
            <tr>
                <td>${escapeHtml(izq.nombre)}</td>
                <td>${escapeHtml(izq.firma || '')}</td>
                <td>${escapeHtml(der.nombre)}</td>
                <td>${escapeHtml(der.firma || '')}</td>
            </tr>
        `;
    }

    // Filas de acuerdos
    let filasAcuerdos = '';
    const minAcuerdos = Math.max(m.acuerdos.length, 8);
    for (let i = 0; i < minAcuerdos; i++) {
        const a = m.acuerdos[i] || {};
        filasAcuerdos += `
            <tr>
                <td>${escapeHtml(a.agenda || '')}</td>
                <td>${escapeHtml(a.acuerdo || '')}</td>
                <td>${escapeHtml(a.responsable || '')}</td>
                <td>${a.fecha_compromiso ? formatearFecha(a.fecha_compromiso) : ''}</td>
            </tr>
        `;
    }

    container.innerHTML = `
        <div class="formato-pagina">
            <div class="formato-header">
                <div class="formato-logo">
                    <img src="${baseUrl}/img/logo_escuela.png" alt="Logo Escuela"
                         onerror="this.style.display='none'; this.parentNode.innerHTML='<div class=&quot;formato-logo-placeholder&quot;>LOGO<br>ESCUELA</div>';">
                </div>
                <div class="formato-titulo-centro">
                    <h1>MINUTA</h1>
                    <p>Registro formal de reunión</p>
                </div>
                <div class="formato-logo">
                    <img src="${baseUrl}/img/logo_tecnm.png" alt="Logo TecNM"
                         onerror="this.style.display='none'; this.parentNode.innerHTML='<div class=&quot;formato-logo-placeholder&quot;>LOGO<br>TECNM</div>';">
                </div>
            </div>

            <div class="formato-info-doc">
                <span class="campo"><strong>FECHA:</strong> <span class="linea-campo">${fechaFormateada}</span></span>
                <span class="campo"><strong>HORA:</strong> <span class="linea-campo">${m.hora || '___:___'}</span></span>
            </div>

            <div class="formato-info-doc">
                <span class="campo"><strong>ÁREA O CARRERA:</strong> <span class="linea-campo" style="min-width:300px;">${escapeHtml(m.area_carrera || '')}</span></span>
                <span class="campo"><strong>PÁG:</strong> 1 <strong>DE</strong> 1</span>
            </div>

            <div class="formato-seccion">
                <div class="formato-seccion-titulo">ASUNTO</div>
                <div class="formato-asunto">${escapeHtml(m.asunto || '')}</div>
            </div>

            <div class="formato-seccion">
                <div class="formato-seccion-titulo">ASISTENTES</div>
                <table class="formato-tabla">
                    <thead>
                        <tr>
                            <th style="width:30%;">NOMBRE</th>
                            <th style="width:20%;">FIRMA</th>
                            <th style="width:30%;">NOMBRE</th>
                            <th style="width:20%;">FIRMA</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filasAsistentes}
                    </tbody>
                </table>
            </div>

            <div class="formato-seccion">
                <div class="formato-seccion-titulo">AGENDA Y ACUERDOS</div>
                <table class="formato-tabla">
                    <thead>
                        <tr>
                            <th style="width:25%;">AGENDA</th>
                            <th style="width:40%;">ACUERDOS</th>
                            <th style="width:20%;">RESPONSABLE</th>
                            <th style="width:15%;">FECHA COMPROMISO</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filasAcuerdos}
                    </tbody>
                </table>
            </div>

            <div class="formato-pie">
                <span>Revisión 02</span>
                <span>R-COM-04</span>
            </div>
        </div>
    `;
}

// ============================================
// 8. HELPERS
// ============================================
function escapeHtml(texto) {
    if (!texto) return '';
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}

function formatearFecha(fecha) {
    if (!fecha) return '';
    try {
        const d = new Date(fecha + 'T12:00:00');
        return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return fecha;
    }
}

function mostrarMensaje(tipo, texto) {
    const el = document.getElementById('mensaje');
    if (!el) return;
    const icono = tipo === 'exito'
        ? '<i class="fas fa-check-circle"></i>'
        : '<i class="fas fa-exclamation-triangle"></i>';
    el.className = `mensaje ${tipo}`;
    el.innerHTML = `${icono} ${texto}`;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 3000);
}

// ============================================
// 9. INICIALIZAR
// ============================================
document.addEventListener('DOMContentLoaded', function () {
    // Página de lista
    if (document.getElementById('minutasContainer')) {
        cargarMinutas();

        const buscador = document.getElementById('buscadorMinutas');
        if (buscador) {
            buscador.addEventListener('input', function () {
                const q = this.value.toLowerCase().trim();
                const filtradas = minutasCache.filter(m =>
                    (m.asunto || '').toLowerCase().includes(q) ||
                    (m.area_carrera || '').toLowerCase().includes(q)
                );
                renderizarMinutas(filtradas);
            });
        }
    }

    // Página de creación
    const form = document.getElementById('formMinuta');
    if (form) {
        // Fecha por defecto: hoy
        const inputFecha = document.getElementById('inputFecha');
        if (inputFecha) {
            const hoy = new Date().toISOString().split('T')[0];
            inputFecha.value = hoy;
        }

        // Hora actual por defecto
        const inputHora = document.getElementById('inputHora');
        if (inputHora) {
            const ahora = new Date();
            const hh = String(ahora.getHours()).padStart(2, '0');
            const mm = String(ahora.getMinutes()).padStart(2, '0');
            inputHora.value = `${hh}:${mm}`;
        }

        // Agregar 4 asistentes y 3 acuerdos por defecto
        for (let i = 0; i < 4; i++) agregarAsistente();
        for (let i = 0; i < 3; i++) agregarAcuerdo();

        form.addEventListener('submit', guardarMinuta);
    }
});
// ============================================
// COMPARTIR MINUTAS (VERSIÓN FINAL)
// ============================================
function abrirModalCompartir(minutaId, tipo = 'minuta') {
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
                    <button id="btnEnviarCorreo" class="btn-compartir-accion">
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
                        <label>Expiración</label>
                        <select id="compartirExpiracionEnlace">
                            <option value="1">1 Día</option>
                            <option value="7" selected>7 Días</option>
                            <option value="30">30 Días</option>
                            <option value="0">Nunca</option>
                        </select>
                    </div>
                    <button id="btnGenerarEnlace" class="btn-compartir-accion" style="margin-bottom: 10px;">
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

        // EVENTO DEL BOTÓN ENVIAR
        document.getElementById('btnEnviarCorreo').onclick = function() {
            ejecutarCompartir(window.currentDocIdCompartir, window.currentDocTipoCompartir);
        };
        
        // EVENTO DEL BOTÓN GENERAR ENLACE
        document.getElementById('btnGenerarEnlace').onclick = function() {
            generarSoloEnlace(window.currentDocIdCompartir, window.currentDocTipoCompartir);
        };
    }

    window.currentDocIdCompartir = minutaId;
    window.currentDocTipoCompartir = tipo;

    // Reiniciar pestaña a "Correo"
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.querySelector('.tab-btn').classList.add('active');
    document.getElementById('tab-correo').style.display = 'block';
    
    document.getElementById('compartirCorreos').value = '';
    document.getElementById('compartirPermisosEnlace').value = 'descargar';
    document.getElementById('compartirExpiracionEnlace').value = '7';
    document.getElementById('inputEnlaceCompartir').value = '';
    document.getElementById('historialContenido').innerHTML = '<p style="text-align:center;color:#94a3b8;font-size:0.85rem;">Cargando historial...</p>';

    modal.classList.add('active');
}

function cerrarModalCompartir() {
    document.getElementById('modalCompartirGlobal').classList.remove('active');
}

function cambiarTabCompartir(tab, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    
    if (btn) btn.classList.add('active');
    
    const tabElement = document.getElementById(`tab-${tab}`);
    if (tabElement) tabElement.style.display = 'block';

    if (tab === 'historial') {
        cargarHistorialCompartir(window.currentDocIdCompartir);
    }
}

function copiarEnlace() {
    const input = document.getElementById('inputEnlaceCompartir');
    if (!input.value) return mostrarMensaje('error', 'Genera un enlace primero');
    input.select();
    document.execCommand('copy');
    mostrarMensaje('exito', 'Enlace copiado al portapapeles');
}

async function cargarHistorialCompartir(docId) {
    const cont = document.getElementById('historialContenido');
    if(!cont) return;
    try {
        const res = await fetch(`/api/compartir/historial/${docId}`);
        const data = await res.json();
        if (data.exito && data.historial.length > 0) {
            cont.innerHTML = data.historial.map(h => `
                <div class="historial-item">
                    <span class="accion"><i class="fas fa-${h.accion === 'creado' ? 'plus-circle' : 'eye'}"></i> ${h.accion.toUpperCase()}</span>
                    <span class="fecha">${h.fecha}</span>
                    <span style="font-size:0.7rem;color:#94a3b8;">IP: ${h.ip}</span>
                </div>
            `).join('');
        } else {
            cont.innerHTML = '<p style="text-align:center;color:#94a3b8;font-size:0.85rem;">No hay historial aún.</p>';
        }
    } catch (e) {
        cont.innerHTML = '<p style="text-align:center;color:#dc2626;font-size:0.85rem;">Error al cargar historial.</p>';
    }
}

async function generarSoloEnlace(docId, tipo) {
    const btn = document.getElementById('btnGenerarEnlace');
    if (!btn) return;

    const permisos = document.getElementById('compartirPermisosEnlace').value;
    const dias_expiracion = parseInt(document.getElementById('compartirExpiracionEnlace').value, 10);

    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
    btn.disabled = true;

    try {
        const res = await fetch('/api/compartir/generar-enlace', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                documento_id: docId,
                tipo_documento: tipo,
                creador_id: usuario._id,
                dias_expiracion: dias_expiracion,
                permisos: permisos,
                correos: []
            })
        });
        const data = await res.json();

        if (data.exito) {
            document.getElementById('inputEnlaceCompartir').value = data.enlace;
            mostrarMensaje('exito', '✅ Enlace generado correctamente');
        } else {
            mostrarMensaje('error', data.mensaje);
        }
    } catch (e) {
        console.error(e);
        mostrarMensaje('error', 'Error de conexión');
    } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
}

// ============================================
// FUNCIÓN QUE FALTABA: EJECUTAR COMPARTIR
// ============================================
async function ejecutarCompartir(docId, tipo) {
    const correosStr = document.getElementById('compartirCorreos').value;
    const correos = correosStr.split(',').map(c => c.trim()).filter(c => c);

    if (correos.length === 0) {
        mostrarMensaje('error', 'Ingresa al menos un correo electrónico');
        return;
    }

    const btn = document.getElementById('btnEnviarCorreo');
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando PDF...';
    btn.disabled = true;

    try {
        // 1. Obtenemos los datos
        const resDetalle = await fetch(`/api/minutas/detalle/${docId}`);
        const dataDetalle = await resDetalle.json();

        if (!dataDetalle.exito) throw new Error('No se pudo cargar la minuta');

        // 2. Generamos el HTML
        generarFormatoImprimible(dataDetalle.minuta);
        await new Promise(r => setTimeout(r, 500));

        // 3. Convertimos a PDF
        const elemento = document.getElementById('formatoImprimible');
        const displayOriginal = elemento.style.display;
        elemento.style.display = 'block';
        elemento.style.position = 'absolute';
        elemento.style.left = '-9999px';
        elemento.style.top = '0';
        elemento.style.width = '21cm'; 

        const canvas = await html2canvas(elemento, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'letter');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        const pdfBlob = pdf.output('blob');

        // Restaurar estilos
        elemento.style.display = displayOriginal;
        elemento.style.position = '';
        elemento.style.left = '';
        elemento.style.top = '';
        elemento.style.width = '';

        // 4. Enviamos al servidor
        const formData = new FormData();
        formData.append('pdf_file', pdfBlob, 'documento.pdf');
        formData.append('correos', correos.join(','));
        formData.append('tipo_documento', tipo);
        formData.append('documento_id', docId);
        formData.append('creador_id', usuario._id);

        const res = await fetch('/api/compartir/crear', {
            method: 'POST',
            body: formData
        });

        const data = await res.json();

        if (data.exito) {
            mostrarMensaje('exito', '✅ Correo enviado con el PDF adjunto');
            cerrarModalCompartir();
        } else {
            mostrarMensaje('error', data.mensaje);
        }

    } catch (error) {
        console.error(error);
        mostrarMensaje('error', 'Error al generar o enviar el PDF. Revisa la consola.');
    } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
}