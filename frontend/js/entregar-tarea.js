// ============================================
// ARCHIVO: entregar-tarea.js
// Lógica para entregar una tarea (MongoDB)
// ============================================

console.log('🚀 Iniciando entregar-tarea.js');

const usuario = JSON.parse(localStorage.getItem('usuario'));

// Verificar sesión
if (!usuario) {
    console.log('❌ No hay sesión, redirigiendo...');
    window.location.href = '../iniciar_sesion.html';
}

// Solo alumnos pueden entregar tareas
if (usuario.rol !== 'alumno') {
    alert('❌ Solo los alumnos pueden entregar tareas');
    window.location.href = 'mis_equipos.html';
}

// Obtener parámetros de la URL
const urlParams = new URLSearchParams(window.location.search);
const tareaId = urlParams.get('tarea_id');
const equipoId = urlParams.get('equipo_id');

console.log('📌 tareaId:', tareaId);
console.log('📌 equipoId:', equipoId);

if (!tareaId) {
    console.log('❌ No hay tareaId, redirigiendo...');
    window.location.href = 'mis_equipos.html';
}

// ============================================
// MOSTRAR MENSAJE
// ============================================
function mostrarMensaje(tipo, texto) {
    const mensajeDiv = document.getElementById('mensaje');
    if (!mensajeDiv) {
        console.error('❌ No se encontró el elemento #mensaje');
        return;
    }
    mensajeDiv.className = `mensaje ${tipo}`;
    mensajeDiv.textContent = tipo === 'exito' ? `✅ Correcto: ${texto}` : `❌ Error: ${texto}`;
    mensajeDiv.style.display = 'flex';
    setTimeout(() => {
        mensajeDiv.style.display = 'none';
    }, 5000);
}

// ============================================
// CANCELAR (GLOBAL - para onclick en HTML)
// ============================================
function cancelar() {
    console.log('🔙 cancelar() ejecutado');
    if (equipoId) {
        window.location.href = `tareas_equipo.html?equipo_id=${equipoId}`;
    } else {
        window.location.href = 'mis_equipos.html';
    }
}

// ============================================
// VOLVER A TAREAS (GLOBAL)
// ============================================
function volverATareas() {
    console.log('🔙 volverATareas() ejecutado');
    if (equipoId) {
        window.location.href = `tareas_equipo.html?equipo_id=${equipoId}`;
    } else {
        window.location.href = 'mis_equipos.html';
    }
}

// ============================================
// VERIFICAR SI LA TAREA ESTÁ VENCIDA
// ============================================
function estaVencida(fechaLimite) {
    if (!fechaLimite) return false;
    const ahora = new Date();
    const limite = new Date(fechaLimite);
    return ahora > limite;
}

// ============================================
// ESCAPAR HTML
// ============================================
function escapeHtml(texto) {
    if (!texto) return '';
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}

// ============================================
// CARGAR INFORMACIÓN DE LA TAREA
// ============================================
async function cargarInfoTarea() {
    console.log('🔄 cargarInfoTarea() ejecutado');
    
    const infoContainer = document.getElementById('infoTarea');
    const formContainer = document.getElementById('formEntregar');
    
    console.log('🔍 infoContainer:', infoContainer);
    console.log('🔍 formContainer:', formContainer);
    
    if (!infoContainer) {
        console.error('❌ No se encontró #infoTarea');
        return;
    }
    
    if (!formContainer) {
        console.error('❌ No se encontró #formEntregar');
        return;
    }
    
    try {
        console.log(`📡 Haciendo fetch a: /api/tareas/detalle/${tareaId}`);
        const respuesta = await fetch(`/api/tareas/detalle/${tareaId}`);
        const resultado = await respuesta.json();
        
        console.log('📦 Respuesta del servidor:', resultado);
        
        if (resultado.exito) {
            const tarea = resultado.tarea;
            const fechaLimite = tarea.fecha_limite ? new Date(tarea.fecha_limite).toLocaleDateString('es-MX') : 'Sin fecha límite';
            
            const vencida = estaVencida(tarea.fecha_limite);
            
            infoContainer.innerHTML = `
                <h3>📌 ${escapeHtml(tarea.titulo)}</h3>
                <p>${escapeHtml(tarea.descripcion || 'Sin descripción')}</p>
                <p><strong>👤 Creada por:</strong> ${escapeHtml(tarea.creador_nombre)}</p>
                <p><strong>👥 Equipo:</strong> ${escapeHtml(tarea.equipo_nombre)}</p>
                <div class="fecha-limite ${vencida ? 'vencida' : ''}">
                    📅 Fecha límite: ${fechaLimite}
                    ${vencida ? ' ⚠️ (VENCIDA)' : ''}
                </div>
            `;
            
            // Verificar si ya entregó
            const yaEntrego = tarea.entregas && tarea.entregas.some(e => e.alumno_id === usuario._id);
            console.log('📤 ¿Ya entregó?:', yaEntrego);
            
            if (yaEntrego) {
                const entrega = tarea.entregas.find(e => e.alumno_id === usuario._id);
                const fechaEntrega = new Date(entrega.fecha_entrega).toLocaleDateString('es-MX');
                infoContainer.innerHTML += `
                    <div class="entrega-existente">
                        <p>✅ Ya has entregado esta tarea</p>
                        <p class="fecha-entrega">📅 Entregada el: ${fechaEntrega}</p>
                        ${entrega.calificacion !== null ? `
                            <p style="color: #34d399; margin-top: 0.5rem;">⭐ Calificación: ${entrega.calificacion}/100</p>
                        ` : `
                            <p style="color: #f59e0b; margin-top: 0.5rem;">⏳ Pendiente de calificar</p>
                        `}
                    </div>
                `;
                formContainer.style.display = 'none';
                console.log('❌ Formulario oculto: Ya entregó');
            } else if (vencida) {
                infoContainer.innerHTML += `
                    <div class="entrega-existente" style="background: rgba(239, 68, 68, 0.12); border-color: rgba(239, 68, 68, 0.2);">
                        <p style="color: #ef4444;">⛔ Esta tarea ya está vencida</p>
                        <p style="color: rgba(255,255,255,0.5); font-size: 0.85rem;">No es posible entregar después de la fecha límite</p>
                    </div>
                `;
                formContainer.style.display = 'none';
                console.log('❌ Formulario oculto: Tarea vencida');
            } else {
                formContainer.style.display = 'block';
                console.log('✅ Formulario visible: Tarea disponible');
            }
        } else {
            infoContainer.innerHTML = `<div class="sin-tareas">❌ Error: ${resultado.mensaje}</div>`;
            formContainer.style.display = 'none';
        }
    } catch (error) {
        console.error('❌ Error en cargarInfoTarea:', error);
        infoContainer.innerHTML = '<div class="sin-tareas">❌ Error de conexión</div>';
        formContainer.style.display = 'none';
    }
}

// ============================================
// MOSTRAR NOMBRE DEL ARCHIVO SELECCIONADO
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOMContentLoaded ejecutado');
    
    // ✅ Cargar tema guardado (usando 'theme' como en el resto)
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        console.log('🌙 Modo oscuro activado');
    } else {
        console.log('☀️ Modo claro activado');
    }
    
    const fileInput = document.getElementById('archivo');
    const fileNameDisplay = document.getElementById('fileName');
    
    if (fileInput && fileNameDisplay) {
        fileInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                fileNameDisplay.textContent = this.files[0].name;
                fileNameDisplay.style.color = '#10b981';
            } else {
                fileNameDisplay.textContent = 'Ningún archivo seleccionado';
                fileNameDisplay.style.color = 'rgba(255,255,255,0.4)';
            }
        });
    }
    
    // Configurar botón volver
    const volverLink = document.getElementById('volverLink');
    if (volverLink) {
        console.log('✅ Botón volver encontrado');
        volverLink.addEventListener('click', function(e) {
            e.preventDefault();
            volverATareas();
        });
    } else {
        console.error('❌ Botón volver NO encontrado');
    }
});

// ============================================
// ENTREGAR TAREA
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Configurando evento submit...');
    
    const form = document.getElementById('formEntregar');
    console.log('🔍 Formulario encontrado:', form);
    
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('📤 Formulario enviado!');
            
            const comentario = document.getElementById('comentario').value.trim();
            const archivo = document.getElementById('archivo').files[0];
            
            console.log('📝 Comentario:', comentario);
            console.log('📎 Archivo:', archivo?.name || 'Sin archivo');
            
            const btnSubmit = document.getElementById('btnEntregar');
            const textoOriginal = btnSubmit.innerHTML;
            btnSubmit.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Entregando...';
            btnSubmit.disabled = true;
            
            const formData = new FormData();
            formData.append('tarea_id', tareaId);
            formData.append('alumno_id', usuario._id);
            formData.append('comentario', comentario || '');
            if (archivo) {
                formData.append('archivo', archivo);
            }
            
            try {
                const respuesta = await fetch('/api/entregas/subir', {
                    method: 'POST',
                    body: formData
                });
                
                const resultado = await respuesta.json();
                console.log('📦 Respuesta del servidor:', resultado);
                
                if (resultado.exito) {
                    mostrarMensaje('exito', '¡Tarea entregada correctamente!');
                    setTimeout(() => {
                        if (equipoId) {
                            window.location.href = `tareas_equipo.html?equipo_id=${equipoId}`;
                        } else {
                            window.location.href = 'mis_equipos.html';
                        }
                    }, 2000);
                } else {
                    mostrarMensaje('error', resultado.mensaje || 'Error al entregar la tarea');
                    btnSubmit.innerHTML = textoOriginal;
                    btnSubmit.disabled = false;
                }
            } catch (error) {
                console.error('❌ Error en submit:', error);
                mostrarMensaje('error', 'Error de conexión. Intenta nuevamente.');
                btnSubmit.innerHTML = textoOriginal;
                btnSubmit.disabled = false;
            }
        });
    } else {
        console.error('❌ Formulario NO encontrado');
    }
});

// ============================================
// INICIALIZAR
// ============================================
console.log('🚀 Inicializando cargarInfoTarea...');
cargarInfoTarea();