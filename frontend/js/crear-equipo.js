// ============================================
// ARCHIVO: crear-equipo.js
// Lógica para crear equipos
// ============================================

const usuario = JSON.parse(localStorage.getItem('usuario'));

// Verificar sesión
if (!usuario) {
    window.location.href = '../iniciar_sesion.html';
}

// ============================================
// MOSTRAR MENSAJE SEGÚN ROL
// ============================================
function mostrarMensajeBienvenida() {
    const titulo = document.getElementById('tituloPrincipal');
    const subtitulo = document.getElementById('subtituloPrincipal');
    
    if (usuario.rol === 'alumno') {
        if (titulo) titulo.textContent = 'Crear equipo de proyecto';
        if (subtitulo) subtitulo.textContent = 'Forma un equipo para trabajar en proyectos con tus compañeros.';
    } else {
        if (titulo) titulo.textContent = 'Crear nuevo equipo';
        if (subtitulo) subtitulo.textContent = 'Forma un equipo para colaborar en proyectos y actividades.';
    }
}

// ============================================
// MOSTRAR MENSAJE
// ============================================
function mostrarMensaje(tipo, texto) {
    const container = document.getElementById('mensaje');
    const icon = document.getElementById('mensajeIcon');
    const textElement = document.getElementById('mensajeTexto');
    
    container.className = `message-container ${tipo}`;
    container.style.display = 'block';
    
    if (tipo === 'success') {
        icon.className = 'fas fa-check-circle';
    } else {
        icon.className = 'fas fa-exclamation-circle';
    }
    
    textElement.textContent = texto;
    
    setTimeout(() => {
        container.style.display = 'none';
    }, 4000);
}

// ============================================
// CANCELAR
// ============================================
function cancelar() {
    window.location.href = 'mis_equipos.html';
}

// ============================================
// CERRAR SESIÓN
// ============================================
function cerrarSesion() {
    localStorage.removeItem('usuario');
    window.location.href = '../iniciar_sesion.html';
}

// ============================================
// ENVIAR FORMULARIO
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Mostrar mensaje según rol
    mostrarMensajeBienvenida();
    
    // Cargar tema guardado
    const savedTheme = localStorage.getItem('learnify-theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
    
    // Formulario
    const form = document.getElementById('formCrearEquipo');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const nombre = document.getElementById('nombre').value.trim();
        const descripcion = document.getElementById('descripcion').value.trim();
        
        if (!nombre) {
            mostrarMensaje('error', 'El nombre del equipo es obligatorio');
            return;
        }
        
        const btnSubmit = document.getElementById('btnSubmit');
        const btnTexto = document.getElementById('btnTexto');
        const icon = btnSubmit.querySelector('i');
        const textoOriginal = btnTexto.textContent;
        
        btnTexto.textContent = 'Creando...';
        btnSubmit.disabled = true;
        icon.className = 'fas fa-spinner fa-pulse';
        
        try {
            const respuesta = await fetch('/api/equipos/crear', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: nombre,
                    descripcion: descripcion,
                    lider_id: usuario._id
                })
            });
            
            const resultado = await respuesta.json();
            
            if (resultado.exito) {
                mostrarMensaje('success', '✅ Equipo creado correctamente');
                setTimeout(() => {
                    window.location.href = 'mis_equipos.html';
                }, 1500);
            } else {
                mostrarMensaje('error', '❌ ' + (resultado.mensaje || 'Error al crear el equipo'));
                btnTexto.textContent = textoOriginal;
                btnSubmit.disabled = false;
                icon.className = 'fas fa-save';
            }
            
        } catch (error) {
            console.error('Error:', error);
            mostrarMensaje('error', '❌ Error de conexión');
            btnTexto.textContent = textoOriginal;
            btnSubmit.disabled = false;
            icon.className = 'fas fa-save';
        }
    });
});