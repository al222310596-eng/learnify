// ============================================
// ARCHIVO: registro_horas.js
// Lógica para registrar horas y actividades
// ============================================

const usuario = JSON.parse(localStorage.getItem('usuario'));

if (!usuario) {
    window.location.href = '../../iniciar_sesion.html';
}

// Obtener estadia_id de la URL
const params = new URLSearchParams(window.location.search);
const estadiaId = params.get('estadia_id');

if (!estadiaId) {
    alert('No se especificó una estadía');
    window.location.href = 'mis_estadias.html';
}

let registrosCache = [];

// ============================================
// CARGAR DATOS INICIALES
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    // Fecha por defecto: hoy
    document.getElementById('fecha').value = new Date().toISOString().split('T')[0];

    await cargarNombreEstadia();
    await cargarProgreso();
    await cargarRegistros();
});

// ============================================
// CARGAR NOMBRE DE LA ESTADÍA
// ============================================
async function cargarNombreEstadia() {
    try {
        const res = await fetch(`/api/estadias/detalle/${estadiaId}`);
        const data = await res.json();
        if (data.exito) {
            const e = data.estadia;
            document.getElementById('nombreEstadia').innerHTML =
                `<i class="fas fa-building"></i> <strong>${escapeHtml(e.empresa)}</strong> — ${escapeHtml(e.titulo || '')}`;
            document.getElementById('horasRequeridas').textContent = e.horas || 0;
        }
    } catch (error) {
        console.error('Error al cargar estadía:', error);
    }
}

// ============================================
// CARGAR PROGRESO (total horas)
// ============================================
async function cargarProgreso() {
    try {
        const res = await fetch(`/api/estadias/${estadiaId}/progreso`);
        const data = await res.json();
        if (data.exito) {
            document.getElementById('totalHoras').textContent = data.total_horas;
            document.getElementById('horasRequeridas').textContent = data.horas_requeridas;
            document.getElementById('porcentajeTexto').textContent = data.porcentaje + '%';
            document.getElementById('progresoBarra').style.width = Math.min(data.porcentaje, 100) + '%';
        }
    } catch (error) {
        console.error('Error al cargar progreso:', error);
    }
}

// ============================================
// CARGAR REGISTROS
// ============================================
async function cargarRegistros() {
    const tbody = document.getElementById('tablaBody');
    tbody.innerHTML = '<tr><td colspan="5" class="sin-registros"><i class="fas fa-spinner fa-pulse"></i> Cargando registros...</td></tr>';

    try {
        const res = await fetch(`/api/estadias/${estadiaId}/registros`);
        const data = await res.json();

        if (data.exito) {
            registrosCache = data.registros;
            mostrarRegistros(registrosCache);
        } else {
            tbody.innerHTML = `<tr><td colspan="5" class="sin-registros">${data.mensaje}</td></tr>`;
        }
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = '<tr><td colspan="5" class="sin-registros">Error al cargar registros</td></tr>';
    }
}

// ============================================
// MOSTRAR REGISTROS EN LA TABLA
// ============================================
function mostrarRegistros(registros) {
    const tbody = document.getElementById('tablaBody');

    if (registros.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="sin-registros">
                    <i class="fas fa-clipboard-list"></i>
                    No hay registros todavía. ¡Empieza agregando uno arriba!
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = registros.map(r => `
        <tr>
            <td><i class="fas fa-calendar-alt" style="color:#94a3b8;"></i> ${formatearFecha(r.fecha)}</td>
            <td><strong style="color:#6366f1;">${r.horas} h</strong></td>
            <td>${escapeHtml(r.actividad)}</td>
            <td style="color:#64748b; font-size: 0.85rem;">${escapeHtml(r.descripcion) || '—'}</td>
            <td style="text-align: right; white-space: nowrap;">
                <button class="btn-editar" onclick="editarRegistro('${r._id}')" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-peligro" onclick="eliminarRegistro('${r._id}')" title="Eliminar">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// ============================================
// GUARDAR (crear o editar)
// ============================================
async function guardarRegistro(event) {
    event.preventDefault();

    const registroId = document.getElementById('registroId').value;
    const datos = {
        alumno_id: usuario._id,
        fecha: document.getElementById('fecha').value,
        horas: parseFloat(document.getElementById('horas').value),
        actividad: document.getElementById('actividad').value.trim(),
        descripcion: document.getElementById('descripcion').value.trim()
    };

    if (!datos.horas || datos.horas <= 0 || datos.horas > 24) {
        mostrarMensaje('error', 'Las horas deben estar entre 0.5 y 24');
        return;
    }

    if (!datos.actividad) {
        mostrarMensaje('error', 'La actividad es obligatoria');
        return;
    }

    try {
        let url, metodo;
        if (registroId) {
            url = `/api/registros/${registroId}`;
            metodo = 'PUT';
        } else {
            url = `/api/estadias/${estadiaId}/registros`;
            metodo = 'POST';
        }

        const res = await fetch(url, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });

        const data = await res.json();

        if (data.exito) {
            mostrarMensaje('exito', registroId ? 'Registro actualizado' : 'Registro creado correctamente');
            limpiarFormulario();
            await cargarRegistros();
            await cargarProgreso();
        } else {
            mostrarMensaje('error', data.mensaje || 'Error al guardar');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('error', 'Error de conexión');
    }
}

// ============================================
// EDITAR REGISTRO
// ============================================
function editarRegistro(registroId) {
    const r = registrosCache.find(x => x._id === registroId);
    if (!r) return;

    document.getElementById('registroId').value = r._id;
    document.getElementById('fecha').value = r.fecha;
    document.getElementById('horas').value = r.horas;
    document.getElementById('actividad').value = r.actividad;
    document.getElementById('descripcion').value = r.descripcion || '';

    document.getElementById('tituloForm').textContent = 'Editar registro';
    document.getElementById('btnTexto').textContent = 'Actualizar registro';
    document.getElementById('btnCancelarEdicion').style.display = 'inline-flex';

    document.querySelector('.form-registro').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ============================================
// CANCELAR EDICIÓN
// ============================================
function cancelarEdicion() {
    limpiarFormulario();
}

function limpiarFormulario() {
    document.getElementById('formRegistro').reset();
    document.getElementById('registroId').value = '';
    document.getElementById('fecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('tituloForm').textContent = 'Nuevo registro';
    document.getElementById('btnTexto').textContent = 'Guardar registro';
    document.getElementById('btnCancelarEdicion').style.display = 'none';
}

// ============================================
// ELIMINAR REGISTRO
// ============================================
async function eliminarRegistro(registroId) {
    if (!confirm('¿Estás seguro de eliminar este registro?')) return;

    try {
        const res = await fetch(`/api/registros/${registroId}`, { method: 'DELETE' });
        const data = await res.json();

        if (data.exito) {
            mostrarMensaje('exito', 'Registro eliminado');
            await cargarRegistros();
            await cargarProgreso();
        } else {
            mostrarMensaje('error', data.mensaje || 'Error al eliminar');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('error', 'Error de conexión');
    }
}

// ============================================
// HELPERS
// ============================================
function mostrarMensaje(tipo, texto) {
    const div = document.getElementById('mensaje');
    const icono = tipo === 'exito' ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-exclamation-triangle"></i>';
    div.className = `mensaje ${tipo}`;
    div.innerHTML = `${icono} ${texto}`;
    div.style.display = 'block';
    setTimeout(() => { div.style.display = 'none'; }, 3000);
}

function formatearFecha(fecha) {
    if (!fecha) return 'Sin fecha';
    const d = new Date(fecha + 'T00:00:00');
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function escapeHtml(texto) {
    if (!texto) return '';
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}