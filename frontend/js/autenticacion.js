// ============================================
// ARCHIVO: autenticacion.js
// PROPÓSITO: Manejar el registro e inicio de sesión
// ============================================

// ============================================
// REGISTRO DE USUARIOS
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    const formularioRegistro = document.getElementById('formulario-registro');

    if (formularioRegistro) {
        formularioRegistro.addEventListener('submit', async function(evento) {
            evento.preventDefault();

            const mensajeDiv = document.getElementById('mensaje');
            mensajeDiv.className = 'mensaje';
            mensajeDiv.textContent = 'Registrando...';
            mensajeDiv.style.display = 'block';

            const datos = {
                nombre: document.getElementById('nombre').value,
                email: document.getElementById('email').value,
                password: document.getElementById('password').value,
                rol: document.getElementById('rol').value
            };

            try {
                const respuesta = await fetch('/api/registro', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datos)
                });

                const resultado = await respuesta.json();

                if (resultado.exito) {
                    mensajeDiv.className = 'mensaje exito';
                    mensajeDiv.textContent = '¡Registro exitoso! Redirigiendo...';
                    setTimeout(() => {
                        window.location.href = 'iniciar_sesion.html';
                    }, 2000);
                } else {
                    mensajeDiv.className = 'mensaje error';
                    mensajeDiv.textContent = 'Error: ' + resultado.mensaje;
                }

            } catch (error) {
                mensajeDiv.className = 'mensaje error';
                mensajeDiv.textContent = 'Error de conexión. Asegúrate de que el servidor esté corriendo.';
            }
        });
    }
});


// ============================================
// FUNCIÓN: FORMATO DE TIEMPO (MM:SS)
// ============================================
function formatTime(segundos) {
    if (segundos < 0) segundos = 0;
    const minutos = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${minutos}:${segs.toString().padStart(2, '0')}`;
}


// ============================================
// FUNCIÓN: VERIFICAR ESTADO DE INTENTOS (CON TIEMPO REAL)
// ============================================
async function verificarEstadoIntentos() {
    try {
        const respuesta = await fetch('/api/estado-intentos');
        const resultado = await respuesta.json();
        
        console.log('📊 Estado de intentos:', resultado);
        
        const mensajeDiv = document.getElementById('mensaje');
        const email = document.getElementById('email');
        const password = document.getElementById('password');
        const btnSubmit = document.querySelector('#formulario-login button[type="submit"]');
        
        // ✅ Si está bloqueado, mostrar el contador con tiempo REAL del servidor
        if (resultado.exito && resultado.bloqueado) {
            const segundosRestantes = resultado.segundos_restantes || 300;
            
            mensajeDiv.className = 'mensaje error';
            mensajeDiv.innerHTML = `
                <i class="fas fa-lock"></i>
                Demasiados intentos fallidos. Cuenta bloqueada temporalmente.
                <div id="contadorBloqueo" style="margin-top: 8px; font-weight: 600; color: #dc2626;">
                    ⏳ ${formatTime(segundosRestantes)}
                </div>
            `;
            mensajeDiv.style.display = 'block';
            
            // Deshabilitar campos
            if (email) email.disabled = true;
            if (password) password.disabled = true;
            if (btnSubmit) btnSubmit.disabled = true;
            
            // ✅ Si no hay contador corriendo, iniciarlo
            if (!window.intervaloConteo) {
                iniciarConteoBloqueo(segundosRestantes);
            }
        } else if (resultado.exito && resultado.intentos > 0 && resultado.intentos < 3) {
            // ✅ Mostrar intentos restantes (sin bloqueo)
            const intentosRestantes = 3 - resultado.intentos;
            mensajeDiv.className = 'mensaje error';
            mensajeDiv.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i> 
                Tienes ${intentosRestantes} intento(s) restante(s) antes del bloqueo.
            `;
            mensajeDiv.style.display = 'block';
        } else {
            // ✅ Ocultar mensaje si no hay problemas
            mensajeDiv.style.display = 'none';
        }
    } catch (error) {
        console.log('Error al verificar estado de intentos:', error);
    }
}


// ============================================
// FUNCIÓN: CONTEO REGRESIVO DE BLOQUEO (CON AUTO-RECARGA)
// ============================================
function iniciarConteoBloqueo(segundosIniciales) {
    const contador = document.getElementById('contadorBloqueo');
    const email = document.getElementById('email');
    const password = document.getElementById('password');
    const btnSubmit = document.querySelector('#formulario-login button[type="submit"]');
    
    if (!contador) return;
    
    // ✅ Limpiar intervalo anterior si existe
    if (window.intervaloConteo) {
        clearInterval(window.intervaloConteo);
        window.intervaloConteo = null;
    }
    
    let segundosRestantes = segundosIniciales;
    
    // ✅ Actualizar inmediatamente
    contador.textContent = `⏳ ${formatTime(segundosRestantes)}`;
    
    window.intervaloConteo = setInterval(() => {
        segundosRestantes--;
        
        if (segundosRestantes <= 0) {
            clearInterval(window.intervaloConteo);
            window.intervaloConteo = null;
            
            contador.textContent = '✅ Bloqueo expirado. Ya puedes intentar de nuevo.';
            contador.style.color = '#10b981';
            
            // Reactivar campos
            if (email) email.disabled = false;
            if (password) password.disabled = false;
            if (btnSubmit) btnSubmit.disabled = false;
            
            // ✅ RECARGAR LA PÁGINA AUTOMÁTICAMENTE después de 1.5 segundos
            setTimeout(() => {
                location.reload();
            }, 1500);
            
            return;
        }
        
        contador.textContent = `⏳ ${formatTime(segundosRestantes)}`;
    }, 1000);
}


// ============================================
// INICIO DE SESIÓN CON SEGURIDAD
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    const formularioLogin = document.getElementById('formulario-login');

    if (formularioLogin) {
        // ✅ Verificar estado al cargar la página
        verificarEstadoIntentos();

        formularioLogin.addEventListener('submit', async function(evento) {
            evento.preventDefault();

            const mensajeDiv = document.getElementById('mensaje');
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            const btnSubmit = this.querySelector('button[type="submit"]');

            // 🔒 Deshabilitar botón mientras se procesa
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Verificando...';

            mensajeDiv.className = 'mensaje';
            mensajeDiv.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Iniciando sesión...';
            mensajeDiv.style.display = 'block';

            // Recoger datos
            const datos = {
                email: emailInput.value.trim(),
                password: passwordInput.value
            };

            try {
                const respuesta = await fetch('/api/iniciar-sesion', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datos)
                });

                const resultado = await respuesta.json();

                // 🔒 Verificar si está bloqueado
                if (resultado.bloqueado) {
                    const segundosRestantes = resultado.segundos_restantes || 300;
                    
                    mensajeDiv.className = 'mensaje error';
                    mensajeDiv.innerHTML = `
                        <i class="fas fa-lock"></i> 
                        ${resultado.mensaje}
                        <div id="contadorBloqueo" style="margin-top: 8px; font-weight: 600; color: #dc2626;">
                            ⏳ ${formatTime(segundosRestantes)}
                        </div>
                    `;
                    mensajeDiv.style.display = 'block';
                    
                    // Deshabilitar campos
                    emailInput.disabled = true;
                    passwordInput.disabled = true;
                    btnSubmit.disabled = true;
                    
                    // ✅ Iniciar conteo regresivo (si no está ya corriendo)
                    if (!window.intervaloConteo) {
                        iniciarConteoBloqueo(segundosRestantes);
                    }
                    
                    return;
                }

                if (resultado.exito) {
                    // ✅ LOGIN EXITOSO
                    mensajeDiv.className = 'mensaje exito';
                    mensajeDiv.innerHTML = `<i class="fas fa-check-circle"></i> ¡Bienvenido! Redirigiendo...`;
                    mensajeDiv.style.display = 'block';

                    localStorage.setItem('usuario', JSON.stringify(resultado.usuario));

                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1500);
                } else {
                    // ❌ LOGIN FALLIDO
                    passwordInput.value = '';
                    passwordInput.focus();
                    
                    let mensajeError = '';
                    
                    if (resultado.intentos_restantes !== undefined && resultado.intentos_restantes > 0) {
                        mensajeError = `Email o contraseña incorrectos. Intentos restantes: ${resultado.intentos_restantes}`;
                        
                        if (resultado.intentos_restantes === 1) {
                            mensajeDiv.style.borderColor = '#dc2626';
                            mensajeDiv.style.backgroundColor = 'rgba(220, 38, 38, 0.15)';
                        } else {
                            mensajeDiv.style.borderColor = '#f59e0b';
                            mensajeDiv.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
                        }
                    } else if (resultado.bloqueado) {
                        mensajeError = resultado.mensaje;
                    } else {
                        mensajeError = 'Email o contraseña incorrectos';
                    }
                    
                    mensajeDiv.className = 'mensaje error';
                    mensajeDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${mensajeError}`;
                    mensajeDiv.style.display = 'block';
                }

            } catch (error) {
                mensajeDiv.className = 'mensaje error';
                mensajeDiv.innerHTML = `<i class="fas fa-wifi"></i> Error de conexión. Verifica que el servidor esté corriendo.`;
                mensajeDiv.style.display = 'block';
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = '<i class="fas fa-sign-in-alt"></i> <span>Iniciar Sesión</span>';
            }
        });
    }
});


// ============================================
// FUNCIÓN: DEBUG - VER ESTADO DE INTENTOS
// ============================================
async function debugIntentos() {
    try {
        const respuesta = await fetch('/api/debug-intentos');
        const resultado = await respuesta.json();
        console.log('📊 DEBUG - Estado de intentos:', resultado);
        alert(JSON.stringify(resultado, null, 2));
    } catch (error) {
        console.error('Error en debug:', error);
    }
}


// ✅ Agregar atajo de debug (Ctrl+Shift+D)
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        debugIntentos();
    }
});


// ============================================
// FUNCIÓN: REINICIAR INTENTOS (para pruebas)
// ============================================
async function reiniciarIntentos() {
    try {
        const respuesta = await fetch('/api/reiniciar-intentos', {
            method: 'POST'
        });
        const resultado = await respuesta.json();
        if (resultado.exito) {
            location.reload();
        }
    } catch (error) {
        console.error('Error al reiniciar intentos:', error);
    }
}


// ============================================
// FUNCIÓN: CERRAR SESIÓN
// ============================================
function cerrarSesion() {
    localStorage.removeItem('usuario');
    window.location.href = 'iniciar_sesion.html';
}


// ============================================
// ✅ AL RECARGAR LA PÁGINA, VERIFICAR ESTADO
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Verificar estado al cargar la página
    verificarEstadoIntentos();
    
    // ✅ Verificar cada 5 segundos mientras la página esté abierta
    setInterval(verificarEstadoIntentos, 5000);
});