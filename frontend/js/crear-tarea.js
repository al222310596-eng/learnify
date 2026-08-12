// ============================================
// ARCHIVO: crear-tarea.js
// Lógica para crear una nueva tarea (MongoDB)
// ============================================

console.log('🚀 Iniciando crear-tarea.js');

const usuario = JSON.parse(localStorage.getItem('usuario'));

// Verificar sesión
if (!usuario) {
    console.log('❌ No hay sesión');
    window.location.href = '../iniciar_sesion.html';
}

// Solo maestros pueden crear tareas
if (usuario.rol !== 'maestro') {
    alert('❌ Solo los maestros pueden crear tareas');
    window.location.href = 'mis_equipos.html';
}

// Obtener ID del equipo de la URL
const urlParams = new URLSearchParams(window.location.search);
const equipoId = urlParams.get('equipo_id');

console.log('📌 equipoId:', equipoId);

if (!equipoId) {
    console.log('❌ No hay equipoId');
    window.location.href = 'mis_equipos.html';
}

// ============================================
// MOSTRAR MENSAJE
// ============================================
function mostrarMensaje(tipo, texto) {
    const mensajeDiv = document.getElementById('mensaje');
    if (!mensajeDiv) {
        console.error('❌ No se encontró #mensaje');
        return;
    }
    mensajeDiv.className = `mensaje ${tipo}`;
    mensajeDiv.textContent = tipo === 'exito' ? `✅ Correcto: ${texto}` : `❌ Error: ${texto}`;
    mensajeDiv.style.display = 'flex';
    setTimeout(() => {
        mensajeDiv.style.display = 'none';
    }, 4000);
}

// ============================================
// CANCELAR
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
// VOLVER A TAREAS
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
// INICIALIZAR
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOMContentLoaded ejecutado');
    
    // Cargar tema guardado
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        console.log('🌙 Modo oscuro activado');
    }
    
    // ✅ VERIFICAR QUE LOS ELEMENTOS EXISTEN
    const form = document.getElementById('formCrearTarea');
    const titulo = document.getElementById('titulo');
    const descripcion = document.getElementById('descripcion');
    const fechaLimite = document.getElementById('fecha_limite');
    const btnSubmit = document.getElementById('btnSubmit');
    const volverLink = document.getElementById('volverLink');
    
    console.log('🔍 form:', form ? '✅' : '❌');
    console.log('🔍 titulo:', titulo ? '✅' : '❌');
    console.log('🔍 descripcion:', descripcion ? '✅' : '❌');
    console.log('🔍 fechaLimite:', fechaLimite ? '✅' : '❌');
    console.log('🔍 btnSubmit:', btnSubmit ? '✅' : '❌');
    console.log('🔍 volverLink:', volverLink ? '✅' : '❌');
    
    // Configurar botón volver
    if (volverLink) {
        volverLink.addEventListener('click', function(e) {
            e.preventDefault();
            volverATareas();
        });
    }
    
    // Configurar formulario
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('📤 Formulario enviado!');
            
            const tituloValor = document.getElementById('titulo').value.trim();
            const descripcionValor = document.getElementById('descripcion').value.trim();
            const fechaLimiteValor = document.getElementById('fecha_limite').value;
            
            console.log('📝 Título:', tituloValor);
            console.log('📝 Descripción:', descripcionValor);
            console.log('📅 Fecha límite:', fechaLimiteValor);
            
            if (!tituloValor) {
                mostrarMensaje('error', 'El título de la tarea es obligatorio');
                return;
            }
            
            const btnSubmit = document.getElementById('btnSubmit');
            const btnTexto = document.getElementById('btnTexto');
            const textoOriginal = btnTexto.textContent;
            
            btnTexto.textContent = 'Creando...';
            btnSubmit.disabled = true;
            
            try {
                console.log('📡 Enviando petición...');
                const respuesta = await fetch('/api/tareas/crear', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        titulo: tituloValor,
                        descripcion: descripcionValor,
                        equipo_id: equipoId,
                        creador_id: usuario._id,
                        fecha_limite: fechaLimiteValor || null
                    })
                });
                
                const resultado = await respuesta.json();
                console.log('📦 Respuesta:', resultado);
                
                if (resultado.exito) {
                    mostrarMensaje('exito', '✅ Tarea creada correctamente');
                    setTimeout(() => {
                        if (equipoId) {
                            window.location.href = `tareas_equipo.html?equipo_id=${equipoId}`;
                        } else {
                            window.location.href = 'mis_equipos.html';
                        }
                    }, 1500);
                } else {
                    mostrarMensaje('error', resultado.mensaje || 'Error al crear la tarea');
                    btnTexto.textContent = textoOriginal;
                    btnSubmit.disabled = false;
                }
            } catch (error) {
                console.error('❌ Error:', error);
                mostrarMensaje('error', 'Error de conexión');
                btnTexto.textContent = textoOriginal;
                btnSubmit.disabled = false;
            }
        });
    } else {
        console.error('❌ Formulario NO encontrado!');
    }
});

console.log('🚀 Script de crear-tarea.js cargado correctamente');