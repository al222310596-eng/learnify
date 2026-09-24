# ============================================
# ARCHIVO: app.py
# SERVIDOR PRINCIPAL - LEARNIFY
# ============================================

# ============================================
# IMPORTAR LIBRERÍAS NECESARIAS
# ============================================
import hashlib
import gridfs
import os
import random
import string
import json
from functools import wraps
from datetime import datetime, timedelta

from flask import Flask, jsonify, request, send_from_directory, Response
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from werkzeug.utils import secure_filename
from bson import ObjectId

from mongo_config import get_mongo_connection

# ============================================
# CONFIGURACIÓN DEL SERVIDOR
# ============================================
app = Flask(__name__, 
            static_folder='../frontend',
            static_url_path='')

CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# ============================================
# CONEXIÓN A MONGODB Y GRIDFS
# ============================================
db = get_mongo_connection()
fs = gridfs.GridFS(db)

# ============================================
# SEGURIDAD: BLOQUEO POR INTENTOS FALLIDOS (VERSIÓN CORREGIDA)
# ============================================

ARCHIVO_INTENTOS = "intentos_fallidos.json"

def cargar_intentos():
    """Carga el registro de intentos fallidos desde archivo"""
    try:
        if os.path.exists(ARCHIVO_INTENTOS):
            with open(ARCHIVO_INTENTOS, 'r', encoding='utf-8') as f:
                return json.load(f)
    except:
        pass
    return {}

def guardar_intentos(intentos):
    """Guarda el registro de intentos fallidos en archivo"""
    try:
        with open(ARCHIVO_INTENTOS, 'w', encoding='utf-8') as f:
            json.dump(intentos, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"❌ Error al guardar: {e}")
        return False

def obtener_id_cliente():
    """Obtiene un identificador único para el cliente"""
    ip = request.remote_addr
    return ip

def verificar_bloqueo(id_cliente):
    """Verifica si un identificador está bloqueado y devuelve segundos restantes"""
    intentos = cargar_intentos()
    
    if id_cliente in intentos:
        data = intentos[id_cliente]
        if 'bloqueo_hasta' in data and data['bloqueo_hasta']:
            try:
                bloqueo_hasta = datetime.fromisoformat(data['bloqueo_hasta'])
                ahora = datetime.now()
                if ahora < bloqueo_hasta:
                    segundos = int((bloqueo_hasta - ahora).total_seconds())
                    if segundos < 1:
                        segundos = 1
                    minutos = int(segundos / 60)
                    if minutos < 1:
                        minutos = 1
                    return True, minutos, segundos
            except:
                pass
    return False, 0, 0

def registrar_intento_fallido(id_cliente):
    """Registra un intento fallido para un identificador"""
    intentos = cargar_intentos()
    ahora = datetime.now()
    
    if id_cliente not in intentos:
        intentos[id_cliente] = {
            "intentos": 0,
            "primer_intento": ahora.isoformat(),
            "ultimo_intento": ahora.isoformat(),
            "bloqueo_hasta": None
        }
    
    intentos[id_cliente]["intentos"] += 1
    intentos[id_cliente]["ultimo_intento"] = ahora.isoformat()
    
    intentos_fallidos = intentos[id_cliente]["intentos"]
    
    if intentos_fallidos >= 3:
        primer_intento = datetime.fromisoformat(intentos[id_cliente]["primer_intento"])
        intentos[id_cliente]["bloqueo_hasta"] = (primer_intento + timedelta(minutes=5)).isoformat()
        print(f"🔒 BLOQUEADO: {id_cliente} hasta {intentos[id_cliente]['bloqueo_hasta']}")
    else:
        intentos[id_cliente]["bloqueo_hasta"] = None
        print(f"⚠️ INTENTO {intentos_fallidos}/3: {id_cliente}")
    
    guardar_intentos(intentos)
    
    if intentos[id_cliente]["bloqueo_hasta"]:
        bloqueo_hasta = datetime.fromisoformat(intentos[id_cliente]["bloqueo_hasta"])
        segundos = int((bloqueo_hasta - ahora).total_seconds())
        if segundos < 1:
            segundos = 1
        return {
            "bloqueado": True,
            "minutos_restantes": int(segundos / 60),
            "segundos_restantes": segundos,
            "intentos": intentos_fallidos
        }
    else:
        return {
            "bloqueado": False,
            "intentos": intentos_fallidos
        }

def reiniciar_intentos(id_cliente):
    """Reinicia el contador de intentos"""
    intentos = cargar_intentos()
    if id_cliente in intentos:
        del intentos[id_cliente]
        guardar_intentos(intentos)
        print(f"🔄 Intentos reiniciados para: {id_cliente}")

def obtener_info_intentos(id_cliente):
    """Obtiene información de intentos para un identificador"""
    intentos = cargar_intentos()
    if id_cliente in intentos:
        data = intentos[id_cliente]
        bloqueado = False
        segundos_restantes = 0
        if data.get('bloqueo_hasta'):
            try:
                bloqueo_hasta = datetime.fromisoformat(data['bloqueo_hasta'])
                ahora = datetime.now()
                if ahora < bloqueo_hasta:
                    bloqueado = True
                    segundos_restantes = int((bloqueo_hasta - ahora).total_seconds())
                    if segundos_restantes < 1:
                        segundos_restantes = 1
            except:
                pass
        return {
            "intentos": data.get("intentos", 0),
            "bloqueado": bloqueado,
            "segundos_restantes": segundos_restantes
        }
    return {"intentos": 0, "bloqueado": False, "segundos_restantes": 0}

# ============================================
# HELPER: CONVERTIR OBJECTID
# ============================================
def convertir_objectid(documento):
    if documento is None:
        return None
    if isinstance(documento, list):
        return [convertir_objectid(item) for item in documento]
    if isinstance(documento, dict):
        nuevo_doc = {}
        for key, value in documento.items():
            if isinstance(value, ObjectId):
                nuevo_doc[key] = str(value)
            elif isinstance(value, list):
                nuevo_doc[key] = [convertir_objectid(item) for item in value]
            elif isinstance(value, dict):
                nuevo_doc[key] = convertir_objectid(value)
            else:
                nuevo_doc[key] = value
        return nuevo_doc
    return documento

# ============================================
# REGISTRAR ACTIVIDAD
# ============================================
def registrar_actividad(usuario_id, tipo_accion, descripcion=""):
    try:
        if isinstance(usuario_id, str):
            usuario_id = ObjectId(usuario_id)
        db.actividad.insert_one({
            "usuario_id": usuario_id,
            "tipo": tipo_accion,
            "descripcion": descripcion,
            "fecha": datetime.now(),
            "ip": request.remote_addr if request else None
        })
        print(f" Actividad registrada: {tipo_accion} - Usuario: {usuario_id}")
    except Exception as e:
        print(f" Error al registrar actividad: {e}")

def registrar_actividad_decorator(tipo_accion):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            response = f(*args, **kwargs)
            usuario_id = None
            if 'usuario_id' in kwargs:
                usuario_id = kwargs['usuario_id']
            elif 'alumno_id' in kwargs:
                usuario_id = kwargs['alumno_id']
            if not usuario_id and request.json:
                usuario_id = (request.json.get('usuario_id') or 
                             request.json.get('alumno_id') or 
                             request.json.get('creador_id') or
                             request.json.get('lider_id'))
            if not usuario_id:
                usuario_id = (request.args.get('usuario_id') or 
                             request.args.get('alumno_id'))
            if usuario_id:
                try:
                    registrar_actividad(usuario_id, tipo_accion)
                except Exception as e:
                    print(f" Error al registrar actividad en decorador: {e}")
            return response
        return decorated_function
    return decorator

# ============================================
# ============================================
# 1. AUTENTICACIÓN Y USUARIOS
# ============================================

@app.route('/api/test', methods=['GET'])
def test():
    return jsonify({"mensaje": "Servidor funcionando correctamente", "estado": "ok", "base_datos": "MongoDB"})

@app.route('/api/registro', methods=['POST'])
def registrar_usuario():
    try:
        datos = request.json
        nombre = datos['nombre']
        email = datos['email']
        password = datos['password']
        rol = datos['rol']
        
        if db.usuarios.find_one({"email": email}):
            return jsonify({"exito": False, "mensaje": "El email ya está registrado"}), 400
        
        nuevo_usuario = {
            "nombre": nombre,
            "email": email,
            "password": password,
            "rol": rol,
            "fecha_registro": datetime.now()
        }
        resultado = db.usuarios.insert_one(nuevo_usuario)
        return jsonify({"exito": True, "mensaje": "Usuario registrado correctamente", "usuario_id": str(resultado.inserted_id)})
    except Exception as error:
        return jsonify({"exito": False, "mensaje": f"Error: {str(error)}"}), 400

@app.route('/api/iniciar-sesion', methods=['POST'])
def iniciar_sesion():
    try:
        id_cliente = obtener_id_cliente()
        print(f"🔐 Login desde IP: {id_cliente}")
        
        # Verificar bloqueo
        bloqueado, minutos, segundos = verificar_bloqueo(id_cliente)
        if bloqueado:
            return jsonify({
                "exito": False,
                "bloqueado": True,
                "mensaje": f"Demasiados intentos fallidos. Bloqueado por {minutos} minutos.",
                "minutos_restantes": minutos,
                "segundos_restantes": segundos
            }), 403
        
        datos = request.json
        email = datos.get('email', '').strip().lower()
        password = datos.get('password', '').strip()
        
        if not email or not password:
            return jsonify({
                "exito": False,
                "mensaje": "Completa todos los campos"
            }), 400
        
        usuario = db.usuarios.find_one({"email": email})
        
        if usuario and usuario['password'] == password:
            # Login exitoso
            reiniciar_intentos(id_cliente)
            registrar_actividad(usuario['_id'], "login", f"Desde {id_cliente}")
            usuario['_id'] = str(usuario['_id'])
            del usuario['password']
            return jsonify({
                "exito": True,
                "mensaje": "Login exitoso",
                "usuario": usuario
            })
        else:
            # Login fallido
            info = registrar_intento_fallido(id_cliente)
            
            intentos_restantes = 3 - info["intentos"]
            if intentos_restantes < 0:
                intentos_restantes = 0
            
            if info["bloqueado"]:
                mensaje = f"Bloqueado por {info['minutos_restantes']} minutos"
            elif intentos_restantes > 0:
                mensaje = f"Email o contraseña incorrectos. Intentos restantes: {intentos_restantes}"
            else:
                mensaje = "Email o contraseña incorrectos"
            
            return jsonify({
                "exito": False,
                "mensaje": mensaje,
                "intentos_restantes": intentos_restantes,
                "bloqueado": info["bloqueado"],
                "minutos_restantes": info.get("minutos_restantes", 0),
                "segundos_restantes": info.get("segundos_restantes", 0),
                "intentos": info["intentos"]
            }), 401
            
    except Exception as error:
        print(f"❌ Error: {error}")
        return jsonify({"exito": False, "mensaje": str(error)}), 400
    
@app.route('/api/estado-intentos', methods=['GET'])
def estado_intentos():
    try:
        id_cliente = obtener_id_cliente()
        intentos = cargar_intentos()
        
        if id_cliente in intentos:
            data = intentos[id_cliente]
            bloqueado = False
            segundos_restantes = 0
            minutos_restantes = 0
            
            if data.get('bloqueo_hasta'):
                try:
                    bloqueo_hasta = datetime.fromisoformat(data['bloqueo_hasta'])
                    ahora = datetime.now()
                    if ahora < bloqueo_hasta:
                        bloqueado = True
                        segundos_restantes = int((bloqueo_hasta - ahora).total_seconds())
                        if segundos_restantes < 1:
                            segundos_restantes = 1
                        minutos_restantes = int(segundos_restantes / 60)
                        if minutos_restantes < 1:
                            minutos_restantes = 1
                    else:
                        del intentos[id_cliente]
                        guardar_intentos(intentos)
                except:
                    pass
            
            return jsonify({
                "exito": True,
                "intentos": data.get("intentos", 0),
                "bloqueado": bloqueado,
                "minutos_restantes": minutos_restantes,
                "segundos_restantes": segundos_restantes
            })
        
        return jsonify({
            "exito": True,
            "intentos": 0,
            "bloqueado": False,
            "minutos_restantes": 0,
            "segundos_restantes": 0
        })
    except Exception as error:
        return jsonify({
            "exito": False,
            "mensaje": str(error)
        }), 400

@app.route('/api/reiniciar-intentos', methods=['POST'])
def reiniciar_intentos_endpoint():
    try:
        id_cliente = obtener_id_cliente()
        reiniciar_intentos(id_cliente)
        return jsonify({
            "exito": True,
            "mensaje": "Intentos reiniciados correctamente"
        })
    except Exception as error:
        return jsonify({
            "exito": False,
            "mensaje": str(error)
        }), 400

@app.route('/api/debug-intentos', methods=['GET'])
def debug_intentos():
    """Endpoint para depuración - Muestra los intentos guardados"""
    try:
        id_cliente = obtener_id_cliente()
        intentos = cargar_intentos()
        info = intentos.get(id_cliente, {})
        return jsonify({
            "id_cliente": id_cliente,
            "intentos": info.get("intentos", 0),
            "bloqueo_hasta": info.get("bloqueo_hasta"),
            "ultimo_intento": info.get("ultimo_intento"),
            "todos_los_intentos": intentos
        })
    except Exception as error:
        return jsonify({"error": str(error)}), 400

@app.route('/api/usuarios/buscar', methods=['GET'])
def buscar_usuario():
    try:
        email = request.args.get('email')
        if not email:
            return jsonify({"exito": False, "mensaje": "Correo requerido"}), 400
        usuario = db.usuarios.find_one({"email": email.lower()})
        if usuario:
            return jsonify({
                "exito": True,
                "usuario": {
                    "_id": str(usuario["_id"]),
                    "nombre": usuario["nombre"],
                    "email": usuario["email"],
                    "rol": usuario["rol"]
                }
            })
        return jsonify({"exito": False, "mensaje": "Usuario no encontrado"}), 404
    except Exception as error:
        return jsonify({"exito": False, "mensaje": str(error)}), 400

@app.route('/api/registrar-actividad', methods=['POST'])
def api_registrar_actividad():
    try:
        datos = request.json
        usuario_id = datos.get('usuario_id')
        tipo = datos.get('tipo', 'accion')
        descripcion = datos.get('descripcion', '')
        if not usuario_id:
            return jsonify({"exito": False, "mensaje": "Usuario no identificado"}), 400
        registrar_actividad(usuario_id, tipo, descripcion)
        return jsonify({"exito": True, "mensaje": "Actividad registrada"})
    except Exception as error:
        return jsonify({"exito": False, "mensaje": str(error)}), 400

@app.route('/api/usuarios/actualizar', methods=['PUT'])
def actualizar_usuario():
    try:
        datos = request.json
        usuario_id = datos.get('usuario_id')
        nombre = datos.get('nombre')
        email = datos.get('email')
        password = datos.get('password')
        
        if not usuario_id or not nombre or not email:
            return jsonify({"exito": False, "mensaje": "Datos incompletos"}), 400
        
        existe = db.usuarios.find_one({"email": email, "_id": {"$ne": ObjectId(usuario_id)}})
        if existe:
            return jsonify({"exito": False, "mensaje": "El correo ya está registrado"}), 400
        
        actualizacion = {"nombre": nombre, "email": email}
        if password:
            actualizacion["password"] = password
        
        db.usuarios.update_one({"_id": ObjectId(usuario_id)}, {"$set": actualizacion})
        usuario_actualizado = db.usuarios.find_one({"_id": ObjectId(usuario_id)})
        usuario_actualizado["_id"] = str(usuario_actualizado["_id"])
        del usuario_actualizado["password"]
        return jsonify({"exito": True, "mensaje": "Perfil actualizado", "usuario": usuario_actualizado})
    except Exception as error:
        return jsonify({"exito": False, "mensaje": str(error)}), 400

@app.route('/api/usuarios/subir-foto', methods=['POST'])
def subir_foto_perfil():
    try:
        usuario_id = request.form.get('usuario_id')
        archivo = request.files.get('foto')
        if not usuario_id or not archivo:
            return jsonify({"exito": False, "mensaje": "Datos incompletos"}), 400
        
        nombre_archivo = secure_filename(archivo.filename)
        archivo_id = fs.put(archivo.read(), filename=nombre_archivo, content_type=archivo.content_type)
        foto_url = f"/api/archivos/{archivo_id}"
        db.usuarios.update_one({"_id": ObjectId(usuario_id)}, {"$set": {"foto_url": foto_url, "foto_id": str(archivo_id)}})
        return jsonify({"exito": True, "mensaje": "Foto actualizada", "foto_url": foto_url})
    except Exception as error:
        return jsonify({"exito": False, "mensaje": str(error)}), 400

# ============================================
# 2. GESTIÓN DE EQUIPOS
# ============================================

@app.route('/api/equipos/crear', methods=['POST'])
def crear_equipo():
    try:
        datos = request.json
        nombre = datos.get('nombre')
        descripcion = datos.get('descripcion', '')
        lider_id = datos.get('lider_id')
        
        if not nombre or not lider_id:
            return jsonify({"exito": False, "mensaje": "Nombre y líder son obligatorios"}), 400
        
        lider = db.usuarios.find_one({"_id": ObjectId(lider_id)})
        if not lider:
            return jsonify({"exito": False, "mensaje": "El líder no existe"}), 404
        
        nuevo_equipo = {
            "nombre": nombre,
            "descripcion": descripcion,
            "lider_id": ObjectId(lider_id),
            "fecha_creacion": datetime.now(),
            "miembros": []
        }
        resultado = db.equipos.insert_one(nuevo_equipo)
        return jsonify({"exito": True, "mensaje": "Equipo creado correctamente", "equipo_id": str(resultado.inserted_id)})
    except Exception as error:
        return jsonify({"exito": False, "mensaje": f"Error: {str(error)}"}), 400

@app.route('/api/equipos/<string:usuario_id>', methods=['GET'])
def listar_equipos(usuario_id):
    try:
        usuario = db.usuarios.find_one({"_id": ObjectId(usuario_id)})
        if not usuario:
            return jsonify({"exito": False, "mensaje": "Usuario no encontrado"}), 404
        
        equipos = []
        if usuario['rol'] == 'maestro':
            cursor = db.equipos.find({"lider_id": ObjectId(usuario_id)})
        else:
            cursor = db.equipos.find({"$or": [{"lider_id": ObjectId(usuario_id)}, {"miembros": ObjectId(usuario_id)}]})
        
        for equipo in cursor:
            equipo_data = {
                "_id": str(equipo["_id"]),
                "nombre": equipo["nombre"],
                "descripcion": equipo.get("descripcion", ""),
                "lider_id": str(equipo["lider_id"]),
                "fecha_creacion": equipo["fecha_creacion"],
                "total_miembros": len(equipo.get("miembros", [])),
                "miembros": [str(m) for m in equipo.get("miembros", [])]
            }
            lider = db.usuarios.find_one({"_id": ObjectId(equipo_data["lider_id"])})
            equipo_data["lider_nombre"] = lider["nombre"] if lider else "Desconocido"
            equipos.append(equipo_data)
        
        return jsonify({"exito": True, "equipos": equipos})
    except Exception as error:
        print(f"Error en listar_equipos: {error}")
        return jsonify({"exito": False, "mensaje": str(error)}), 400

@app.route('/api/equipos/detalle/<string:equipo_id>', methods=['GET'])
def detalle_equipo(equipo_id):
    try:
        equipo = db.equipos.find_one({"_id": ObjectId(equipo_id)})
        if not equipo:
            return jsonify({"exito": False, "mensaje": "Equipo no encontrado"}), 404
        
        lider = db.usuarios.find_one({"_id": equipo["lider_id"]})
        miembros = []
        for miembro_id in equipo.get('miembros', []):
            miembro = db.usuarios.find_one({"_id": miembro_id})
            if miembro:
                miembros.append({"id": str(miembro["_id"]), "nombre": miembro["nombre"], "email": miembro["email"]})
        
        equipo = convertir_objectid(equipo)
        return jsonify({
            "exito": True,
            "equipo": {
                "id": equipo["_id"],
                "nombre": equipo["nombre"],
                "descripcion": equipo["descripcion"],
                "lider_id": str(equipo["lider_id"]),
                "lider_nombre": lider["nombre"] if lider else "Desconocido",
                "fecha_creacion": equipo["fecha_creacion"],
                "total_miembros": len(miembros),
                "miembros": miembros
            }
        })
    except Exception as error:
        return jsonify({"exito": False, "mensaje": str(error)}), 400

@app.route('/api/equipos/unirse', methods=['POST'])
def unirse_equipo():
    try:
        datos = request.json
        equipo_id = datos.get('equipo_id')
        usuario_id = datos.get('usuario_id')
        
        if not equipo_id or not usuario_id:
            return jsonify({"exito": False, "mensaje": "Equipo y usuario son obligatorios"}), 400
        
        equipo = db.equipos.find_one({"_id": ObjectId(equipo_id)})
        if not equipo:
            return jsonify({"exito": False, "mensaje": "El equipo no existe"}), 404
        
        if ObjectId(usuario_id) in equipo.get('miembros', []):
            return jsonify({"exito": False, "mensaje": "Ya eres miembro de este equipo"}), 400
        
        db.equipos.update_one({"_id": ObjectId(equipo_id)}, {"$push": {"miembros": ObjectId(usuario_id)}})
        return jsonify({"exito": True, "mensaje": "Te has unido al equipo correctamente"})
    except Exception as error:
        return jsonify({"exito": False, "mensaje": f"Error: {str(error)}"}), 400

@app.route('/api/equipos/eliminar/<string:equipo_id>', methods=['DELETE'])
def eliminar_equipo(equipo_id):
    try:
        datos = request.json
        usuario_id = datos.get('usuario_id')
        if not usuario_id:
            return jsonify({"exito": False, "mensaje": "Usuario no identificado"}), 400
        
        equipo = db.equipos.find_one({"_id": ObjectId(equipo_id)})
        if not equipo:
            return jsonify({"exito": False, "mensaje": "El equipo no existe"}), 404
        
        if str(equipo["lider_id"]) != usuario_id:
            return jsonify({"exito": False, "mensaje": "No tienes permiso para eliminar este equipo"}), 403
        
        db.equipos.delete_one({"_id": ObjectId(equipo_id)})
        return jsonify({"exito": True, "mensaje": "Equipo eliminado correctamente"})
    except Exception as error:
        return jsonify({"exito": False, "mensaje": f"Error: {str(error)}"}), 400

@app.route('/api/equipos/salir/<string:equipo_id>', methods=['DELETE'])
def salir_del_equipo(equipo_id):
    try:
        datos = request.json
        usuario_id = datos.get('usuario_id')
        if not usuario_id:
            return jsonify({"exito": False, "mensaje": "Usuario no identificado"}), 400
        
        equipo = db.equipos.find_one({"_id": ObjectId(equipo_id)})
        if not equipo:
            return jsonify({"exito": False, "mensaje": "El equipo no existe"}), 404
        
        if str(equipo["lider_id"]) == usuario_id:
            return jsonify({"exito": False, "mensaje": "Eres el líder del equipo. No puedes salir, solo eliminarlo."}), 403
        
        if ObjectId(usuario_id) not in equipo.get('miembros', []):
            return jsonify({"exito": False, "mensaje": "No eres miembro de este equipo"}), 404
        
        db.equipos.update_one({"_id": ObjectId(equipo_id)}, {"$pull": {"miembros": ObjectId(usuario_id)}})
        return jsonify({"exito": True, "mensaje": "Has salido del equipo correctamente"})
    except Exception as error:
        return jsonify({"exito": False, "mensaje": f"Error: {str(error)}"}), 400

# ============================================
# 3. GESTIÓN DE TAREAS
# ============================================

@app.route('/api/tareas/crear', methods=['POST'])
def crear_tarea():
    try:
        datos = request.json
        titulo = datos.get('titulo')
        descripcion = datos.get('descripcion', '')
        equipo_id = datos.get('equipo_id')
        creador_id = datos.get('creador_id')
        fecha_limite = datos.get('fecha_limite')
        
        if not titulo or not equipo_id or not creador_id:
            return jsonify({"exito": False, "mensaje": "Título, equipo y creador son obligatorios"}), 400
        
        equipo = db.equipos.find_one({"_id": ObjectId(equipo_id)})
        if not equipo:
            return jsonify({"exito": False, "mensaje": "El equipo no existe"}), 404
        
        if str(equipo["lider_id"]) != creador_id:
            return jsonify({"exito": False, "mensaje": "Solo el líder del equipo puede crear tareas"}), 403
        
        fecha_limite_obj = datetime.strptime(fecha_limite, '%Y-%m-%d') if fecha_limite else None
        
        nueva_tarea = {
            "titulo": titulo,
            "descripcion": descripcion,
            "equipo_id": ObjectId(equipo_id),
            "creador_id": ObjectId(creador_id),
            "fecha_limite": fecha_limite_obj,
            "fecha_creacion": datetime.now(),
            "archivos_adjuntos": []
        }
        resultado = db.tareas.insert_one(nueva_tarea)
        return jsonify({"exito": True, "mensaje": "Tarea creada correctamente", "tarea_id": str(resultado.inserted_id)})
    except Exception as error:
        return jsonify({"exito": False, "mensaje": f"Error: {str(error)}"}), 400

@app.route('/api/tareas/equipo/<string:equipo_id>', methods=['GET'])
def listar_tareas_equipo(equipo_id):
    try:
        equipo = db.equipos.find_one({"_id": ObjectId(equipo_id)})
        lider_id = str(equipo["lider_id"]) if equipo else None
        
        cursor = db.tareas.find({"equipo_id": ObjectId(equipo_id)})
        tareas = []
        for tarea in cursor:
            tarea_data = {
                "_id": str(tarea["_id"]),
                "titulo": tarea["titulo"],
                "descripcion": tarea.get("descripcion", ""),
                "equipo_id": str(tarea["equipo_id"]),
                "creador_id": str(tarea["creador_id"]),
                "fecha_limite": tarea.get("fecha_limite"),
                "fecha_creacion": tarea["fecha_creacion"],
                "lider_id": lider_id
            }
            creador = db.usuarios.find_one({"_id": tarea["creador_id"]})
            tarea_data["creador_nombre"] = creador["nombre"] if creador else "Desconocido"
            equipo_nombre = db.equipos.find_one({"_id": tarea["equipo_id"]})
            tarea_data["equipo_nombre"] = equipo_nombre["nombre"] if equipo_nombre else "Desconocido"
            tarea_data["total_entregas"] = db.entregas.count_documents({"tarea_id": ObjectId(tarea["_id"])})
            tareas.append(tarea_data)
        
        tareas.sort(key=lambda x: x.get('fecha_limite') or datetime.max)
        return jsonify({"exito": True, "tareas": tareas})
    except Exception as error:
        print(f"Error en listar_tareas_equipo: {error}")
        return jsonify({"exito": False, "mensaje": str(error)}), 400

@app.route('/api/tareas/detalle/<string:tarea_id>', methods=['GET'])
def detalle_tarea(tarea_id):
    try:
        tarea = db.tareas.find_one({"_id": ObjectId(tarea_id)})
        if not tarea:
            return jsonify({"exito": False, "mensaje": "Tarea no encontrada"}), 404
        
        equipo = db.equipos.find_one({"_id": tarea["equipo_id"]})
        tarea_data = {
            "_id": str(tarea["_id"]),
            "titulo": tarea["titulo"],
            "descripcion": tarea.get("descripcion", ""),
            "equipo_id": str(tarea["equipo_id"]),
            "creador_id": str(tarea["creador_id"]),
            "fecha_limite": tarea.get("fecha_limite"),
            "fecha_creacion": tarea["fecha_creacion"],
            "lider_id": str(equipo["lider_id"]) if equipo else None
        }
        creador = db.usuarios.find_one({"_id": tarea["creador_id"]})
        tarea_data["creador_nombre"] = creador["nombre"] if creador else "Desconocido"
        tarea_data["equipo_nombre"] = equipo["nombre"] if equipo else "Desconocido"
        
        entregas = []
        cursor = db.entregas.find({"tarea_id": ObjectId(tarea_id)})
        for entrega in cursor:
            entrega_data = {
                "_id": str(entrega["_id"]),
                "tarea_id": str(entrega["tarea_id"]),
                "alumno_id": str(entrega["alumno_id"]),
                "comentario": entrega.get("comentario", ""),
                "archivo_id": str(entrega["archivo_id"]) if entrega.get("archivo_id") else None,
                "nombre_archivo": entrega.get("nombre_archivo"),
                "calificacion": entrega.get("calificacion"),
                "fecha_entrega": entrega["fecha_entrega"]
            }
            alumno = db.usuarios.find_one({"_id": entrega["alumno_id"]})
            entrega_data["alumno_nombre"] = alumno["nombre"] if alumno else "Desconocido"
            entregas.append(entrega_data)
        
        tarea_data["entregas"] = entregas
        return jsonify({"exito": True, "tarea": tarea_data})
    except Exception as error:
        print(f"Error en detalle_tarea: {error}")
        return jsonify({"exito": False, "mensaje": str(error)}), 400

@app.route('/api/tareas/alumno/<string:alumno_id>', methods=['GET'])
def tareas_alumno(alumno_id):
    try:
        equipos = db.equipos.find({"$or": [{"lider_id": ObjectId(alumno_id)}, {"miembros": ObjectId(alumno_id)}]})
        equipos_ids = [equipo["_id"] for equipo in equipos]
        if not equipos_ids:
            return jsonify({"exito": True, "tareas": []})
        
        tareas_pendientes = []
        entregas_realizadas = [e["tarea_id"] for e in db.entregas.find({"alumno_id": ObjectId(alumno_id)})]
        cursor = db.tareas.find({"equipo_id": {"$in": equipos_ids}, "_id": {"$nin": entregas_realizadas}})
        
        for tarea in cursor:
            equipo = db.equipos.find_one({"_id": tarea["equipo_id"]})
            tarea_data = {
                "_id": str(tarea["_id"]),
                "titulo": tarea["titulo"],
                "descripcion": tarea.get("descripcion", ""),
                "equipo_id": str(tarea["equipo_id"]),
                "creador_id": str(tarea["creador_id"]),
                "fecha_limite": tarea.get("fecha_limite"),
                "fecha_creacion": tarea["fecha_creacion"],
                "lider_id": str(equipo["lider_id"]) if equipo else None,
                "equipo_nombre": equipo["nombre"] if equipo else "Desconocido"
            }
            tareas_pendientes.append(tarea_data)
        
        return jsonify({"exito": True, "tareas": tareas_pendientes})
    except Exception as error:
        print(f"Error en tareas_alumno: {error}")
        return jsonify({"exito": False, "mensaje": str(error)}), 400

@app.route('/api/tareas/lider/<string:lider_id>', methods=['GET'])
def tareas_lider(lider_id):
    try:
        equipos = db.equipos.find({"lider_id": ObjectId(lider_id)})
        equipos_ids = [equipo["_id"] for equipo in equipos]
        
        tareas = []
        cursor = db.tareas.find({"equipo_id": {"$in": equipos_ids}}).sort("fecha_creacion", -1).limit(10)
        
        for tarea in cursor:
            tarea_data = {
                "_id": str(tarea["_id"]),
                "titulo": tarea["titulo"],
                "descripcion": tarea.get("descripcion", ""),
                "equipo_id": str(tarea["equipo_id"]),
                "creador_id": str(tarea["creador_id"]),
                "fecha_limite": tarea.get("fecha_limite"),
                "fecha_creacion": tarea["fecha_creacion"],
                "total_entregas": db.entregas.count_documents({"tarea_id": tarea["_id"]})
            }
            equipo = db.equipos.find_one({"_id": tarea["equipo_id"]})
            tarea_data["equipo_nombre"] = equipo["nombre"] if equipo else "Desconocido"
            tareas.append(tarea_data)
        
        return jsonify({"exito": True, "tareas": tareas})
    except Exception as error:
        print(f"Error en tareas_lider: {error}")
        return jsonify({"exito": False, "mensaje": str(error)}), 400

# ============================================
# 4. ENTREGAS Y ARCHIVOS
# ============================================

@app.route('/api/entregas/subir', methods=['POST'])
def subir_archivo_entrega():
    try:
        tarea_id = request.form.get('tarea_id')
        alumno_id = request.form.get('alumno_id')
        comentario = request.form.get('comentario', '')
        
        if not tarea_id or not alumno_id:
            return jsonify({"exito": False, "mensaje": "Faltan datos"}), 400
        
        entrega_existente = db.entregas.find_one({"tarea_id": ObjectId(tarea_id), "alumno_id": ObjectId(alumno_id)})
        if entrega_existente:
            return jsonify({"exito": False, "mensaje": "Ya entregaste esta tarea"}), 400
        
        archivo = request.files.get('archivo')
        archivo_id = None
        nombre_archivo = None
        
        if archivo:
            nombre_archivo = secure_filename(archivo.filename)
            archivo_id = fs.put(archivo.read(), filename=nombre_archivo, content_type=archivo.content_type)
        
        nueva_entrega = {
            "tarea_id": ObjectId(tarea_id),
            "alumno_id": ObjectId(alumno_id),
            "comentario": comentario,
            "archivo_id": archivo_id,
            "nombre_archivo": nombre_archivo,
            "calificacion": None,
            "fecha_entrega": datetime.now()
        }
        db.entregas.insert_one(nueva_entrega)
        return jsonify({"exito": True, "mensaje": "Tarea entregada con éxito"})
    except Exception as error:
        return jsonify({"exito": False, "mensaje": str(error)}), 400

@app.route('/api/entregas/calificar', methods=['PUT'])
def calificar_entrega():
    try:
        datos = request.json
        entrega_id = datos.get('entrega_id')
        calificacion = datos.get('calificacion')
        
        if not entrega_id or calificacion is None:
            return jsonify({"exito": False, "mensaje": "ID de entrega y calificación son obligatorios"}), 400
        
        if calificacion < 0 or calificacion > 100:
            return jsonify({"exito": False, "mensaje": "La calificación debe estar entre 0 y 100"}), 400
        
        db.entregas.update_one({"_id": ObjectId(entrega_id)}, {"$set": {"calificacion": calificacion}})
        return jsonify({"exito": True, "mensaje": "Calificación guardada"})
    except Exception as error:
        return jsonify({"exito": False, "mensaje": f"Error: {str(error)}"}), 400

@app.route('/api/archivos/<string:archivo_id>')
def servir_archivo_gridfs(archivo_id):
    try:
        archivo = fs.get(ObjectId(archivo_id))
        return Response(archivo.read(), mimetype=archivo.content_type)
    except Exception as error:
        return jsonify({"error": "Archivo no encontrado"}), 404

# ============================================
# 5. CHAT
# ============================================

@app.route('/api/chat/<string:equipo_id>', methods=['GET'])
def obtener_mensajes(equipo_id):
    try:
        equipo_obj_id = ObjectId(equipo_id)
        cursor = db.mensajes_chat.find({"equipo_id": equipo_obj_id}).sort("fecha_envio", 1).limit(100)
        
        mensajes = []
        for msg in cursor:
            msg['_id'] = str(msg['_id'])
            msg['equipo_id'] = str(msg['equipo_id'])
            msg['usuario_id'] = str(msg['usuario_id'])
            usuario = db.usuarios.find_one({"_id": ObjectId(msg['usuario_id'])})
            msg['usuario_nombre'] = usuario['nombre'] if usuario else "Desconocido"
            msg['rol'] = usuario['rol'] if usuario else "alumno"
            mensajes.append(msg)
        
        return jsonify({"exito": True, "mensajes": mensajes})
    except Exception as error:
        print(f"Error en obtener_mensajes: {error}")
        return jsonify({"exito": False, "mensaje": str(error)}), 400

@app.route('/api/chat/enviar', methods=['POST'])
def enviar_mensaje():
    try:
        datos = request.json
        equipo_id = datos.get('equipo_id')
        usuario_id = datos.get('usuario_id')
        mensaje_texto = datos.get('mensaje', '').strip()
        
        if not mensaje_texto:
            return jsonify({"exito": False, "mensaje": "El mensaje no puede estar vacío"}), 400
        
        nuevo_mensaje = {
            "equipo_id": ObjectId(equipo_id),
            "usuario_id": ObjectId(usuario_id),
            "mensaje": mensaje_texto,
            "fecha_envio": datetime.now()
        }
        db.mensajes_chat.insert_one(nuevo_mensaje)
        return jsonify({"exito": True, "mensaje": "Mensaje enviado"})
    except Exception as error:
        print(f"Error en enviar_mensaje: {error}")
        return jsonify({"exito": False, "mensaje": str(error)}), 400

# ============================================
# 6. ANÁLISIS Y RENDIMIENTO
# ============================================

@app.route('/api/analisis/equipo/<string:equipo_id>', methods=['GET'])
def analisis_equipo(equipo_id):
    try:
        equipo = db.equipos.find_one({"_id": ObjectId(equipo_id)})
        if not equipo:
            return jsonify({"exito": False, "mensaje": "Equipo no encontrado"}), 404
        
        miembros_ids = equipo.get("miembros", [])
        alumnos = []
        for miembro_id in miembros_ids:
            usuario = db.usuarios.find_one({"_id": miembro_id, "rol": "alumno"})
            if usuario:
                entregas = list(db.entregas.find({"alumno_id": usuario["_id"]}))
                calificaciones = [e.get("calificacion") for e in entregas if e.get("calificacion") is not None]
                promedio = sum(calificaciones) / len(calificaciones) if calificaciones else 0
                alumno_data = {
                    "_id": str(usuario["_id"]),
                    "nombre": usuario["nombre"],
                    "email": usuario["email"],
                    "estadisticas": {
                        "promedio": promedio,
                        "tareas_completadas": len([c for c in calificaciones if c >= 60]),
                        "tareas_totales": len(calificaciones),
                        "entregas_tardias": 0
                    },
                    "riesgo": {"bajo_rendimiento": promedio < 70, "reprobacion": promedio < 60}
                }
                alumnos.append(alumno_data)
        
        promedios = [a["estadisticas"]["promedio"] for a in alumnos]
        stats = {
            "total_alumnos": len(alumnos),
            "promedio_general": sum(promedios) / len(promedios) if promedios else 0,
            "alumnos_riesgo": sum(1 for a in alumnos if a["riesgo"]["reprobacion"]),
            "alumnos": alumnos
        }
        return jsonify({"exito": True, "estadisticas": stats})
    except Exception as error:
        return jsonify({"exito": False, "mensaje": str(error)}), 400

@app.route('/api/analisis/graficas/<string:equipo_id>', methods=['GET'])
def graficas_rendimiento(equipo_id):
    try:
        tareas = list(db.tareas.find({"equipo_id": ObjectId(equipo_id)}))
        tareas_data = []
        for tarea in tareas:
            entregas = list(db.entregas.find({"tarea_id": tarea["_id"]}))
            calificaciones = [e.get("calificacion") for e in entregas if e.get("calificacion") is not None]
            promedio_tarea = sum(calificaciones) / len(calificaciones) if calificaciones else 0
            tareas_data.append({"titulo": tarea["titulo"], "promedio": promedio_tarea, "entregas": len(entregas)})
        
        rangos = {"0-59": 0, "60-69": 0, "70-79": 0, "80-89": 0, "90-100": 0}
        todas_calificaciones = []
        for tarea in tareas:
            entregas = list(db.entregas.find({"tarea_id": tarea["_id"]}))
            for e in entregas:
                calif = e.get("calificacion")
                if calif is not None:
                    todas_calificaciones.append(calif)
                    if calif < 60:
                        rangos["0-59"] += 1
                    elif calif < 70:
                        rangos["60-69"] += 1
                    elif calif < 80:
                        rangos["70-79"] += 1
                    elif calif < 90:
                        rangos["80-89"] += 1
                    else:
                        rangos["90-100"] += 1
        
        return jsonify({"exito": True, "tareas": tareas_data, "distribucion": rangos, "total_calificaciones": len(todas_calificaciones)})
    except Exception as error:
        return jsonify({"exito": False, "mensaje": str(error)}), 400

@app.route('/api/analisis/riesgo/<string:equipo_id>', methods=['GET'])
def detectar_riesgo(equipo_id):
    try:
        equipo = db.equipos.find_one({"_id": ObjectId(equipo_id)})
        if not equipo:
            return jsonify({"exito": False, "mensaje": "Equipo no encontrado"}), 404
        
        miembros_ids = equipo.get("miembros", [])
        resultados = []
        for miembro_id in miembros_ids:
            usuario = db.usuarios.find_one({"_id": miembro_id, "rol": "alumno"})
            if not usuario:
                continue
            
            entregas = list(db.entregas.find({"alumno_id": usuario["_id"]}))
            calificaciones = [e.get("calificacion") for e in entregas if e.get("calificacion") is not None]
            promedio = sum(calificaciones) / len(calificaciones) if calificaciones else 0
            tareas_completadas = len([c for c in calificaciones if c >= 60])
            tareas_totales = len(calificaciones)
            
            nivel_riesgo = "Sin riesgo"
            if promedio < 60:
                nivel_riesgo = "Alto"
            elif promedio < 70:
                nivel_riesgo = "Medio"
            elif promedio < 80:
                nivel_riesgo = "Bajo"
            
            resultados.append({
                "_id": str(usuario["_id"]),
                "nombre": usuario["nombre"],
                "promedio": promedio,
                "tareas_completadas": tareas_completadas,
                "tareas_totales": tareas_totales,
                "entregas_tardias": 0,
                "riesgos": {"bajo_rendimiento": promedio < 70, "riesgo_reprobacion": promedio < 60},
                "nivel_riesgo": nivel_riesgo
            })
        
        return jsonify({"exito": True, "alumnos": resultados})
    except Exception as error:
        return jsonify({"exito": False, "mensaje": str(error)}), 400

@app.route('/api/analisis/segmentacion/<string:equipo_id>', methods=['GET'])
def segmentacion_estudiantes(equipo_id):
    try:
        equipo = db.equipos.find_one({"_id": ObjectId(equipo_id)})
        if not equipo:
            return jsonify({"exito": False, "mensaje": "Equipo no encontrado"}), 404
        
        miembros_ids = equipo.get("miembros", [])
        segmentacion = {
            "desempeno": {"alto": [], "regular": [], "bajo": [], "alto_count": 0, "regular_count": 0, "bajo_count": 0},
            "participacion": {"alta": [], "media": [], "baja": [], "alta_count": 0, "media_count": 0, "baja_count": 0},
            "comportamiento": {"positivo": [], "neutro": [], "negativo": [], "positivo_count": 0, "neutro_count": 0, "negativo_count": 0}
        }
        
        for miembro_id in miembros_ids:
            usuario = db.usuarios.find_one({"_id": miembro_id, "rol": "alumno"})
            if not usuario:
                continue
            
            entregas = list(db.entregas.find({"alumno_id": usuario["_id"]}))
            calificaciones = [e.get("calificacion") for e in entregas if e.get("calificacion") is not None]
            promedio = sum(calificaciones) / len(calificaciones) if calificaciones else 0
            tareas_completadas = len([c for c in calificaciones if c >= 60])
            tareas_totales = len(calificaciones) or 1
            porcentaje_participacion = (tareas_completadas / tareas_totales) * 100
            entregas_tardias = 0
            
            alumno_info = {
                "_id": str(usuario["_id"]),
                "nombre": usuario["nombre"],
                "promedio": round(promedio, 1),
                "participacion": round(porcentaje_participacion, 1),
                "entregas_tardias": entregas_tardias
            }
            
            if promedio >= 85:
                segmentacion["desempeno"]["alto"].append(alumno_info)
                segmentacion["desempeno"]["alto_count"] += 1
            elif promedio >= 70:
                segmentacion["desempeno"]["regular"].append(alumno_info)
                segmentacion["desempeno"]["regular_count"] += 1
            else:
                segmentacion["desempeno"]["bajo"].append(alumno_info)
                segmentacion["desempeno"]["bajo_count"] += 1
            
            if porcentaje_participacion >= 80:
                segmentacion["participacion"]["alta"].append(alumno_info)
                segmentacion["participacion"]["alta_count"] += 1
            elif porcentaje_participacion >= 50:
                segmentacion["participacion"]["media"].append(alumno_info)
                segmentacion["participacion"]["media_count"] += 1
            else:
                segmentacion["participacion"]["baja"].append(alumno_info)
                segmentacion["participacion"]["baja_count"] += 1
            
            if entregas_tardias == 0:
                segmentacion["comportamiento"]["positivo"].append(alumno_info)
                segmentacion["comportamiento"]["positivo_count"] += 1
            elif entregas_tardias <= 2:
                segmentacion["comportamiento"]["neutro"].append(alumno_info)
                segmentacion["comportamiento"]["neutro_count"] += 1
            else:
                segmentacion["comportamiento"]["negativo"].append(alumno_info)
                segmentacion["comportamiento"]["negativo_count"] += 1
        
        return jsonify({"exito": True, "segmentacion": segmentacion})
    except Exception as error:
        print(f"Error en segmentacion_estudiantes: {error}")
        return jsonify({"exito": False, "mensaje": str(error)}), 400

@app.route('/api/analisis/abandono/<string:equipo_id>', methods=['GET'])
def detectar_abandono(equipo_id):
    try:
        equipo = db.equipos.find_one({"_id": ObjectId(equipo_id)})
        if not equipo:
            return jsonify({"exito": False, "mensaje": "Equipo no encontrado"}), 404
        
        miembros_ids = equipo.get("miembros", [])
        fecha_limite = datetime.now() - timedelta(days=7)
        fecha_limite_chat = datetime.now() - timedelta(days=30)
        
        resultados = []
        for miembro_id in miembros_ids:
            usuario = db.usuarios.find_one({"_id": miembro_id, "rol": "alumno"})
            if not usuario:
                continue
            
            ultima_actividad = db.actividad.find_one({"usuario_id": usuario["_id"]}, sort=[("fecha", -1)])
            dias_inactivo = (datetime.now() - ultima_actividad["fecha"]).days if ultima_actividad else 99
            actividad_alerta = dias_inactivo > 7
            
            tareas_equipo = list(db.tareas.find({"equipo_id": ObjectId(equipo_id)}))
            entregas_realizadas = list(db.entregas.find({"alumno_id": usuario["_id"]}))
            tareas_entregadas_ids = [e["tarea_id"] for e in entregas_realizadas]
            tareas_no_entregadas = [t for t in tareas_equipo if t["_id"] not in tareas_entregadas_ids]
            tareas_alerta = len(tareas_no_entregadas) > 2
            
            mensajes_recientes = db.mensajes_chat.count_documents({
                "usuario_id": usuario["_id"],
                "fecha_envio": {"$gte": fecha_limite_chat}
            })
            chat_alerta = mensajes_recientes < 3
            
            nivel_riesgo = sum([actividad_alerta, tareas_alerta, chat_alerta])
            nivel = "Alto" if nivel_riesgo >= 2 else "Medio" if nivel_riesgo >= 1 else "Bajo"
            
            resultados.append({
                "_id": str(usuario["_id"]),
                "nombre": usuario["nombre"],
                "dias_inactivo": dias_inactivo,
                "tareas_pendientes": len(tareas_no_entregadas),
                "mensajes_recientes": mensajes_recientes,
                "alertas": {"actividad": actividad_alerta, "tareas": tareas_alerta, "chat": chat_alerta},
                "nivel_riesgo_abandono": nivel
            })
        
        orden = {"Alto": 0, "Medio": 1, "Bajo": 2}
        resultados.sort(key=lambda x: orden.get(x["nivel_riesgo_abandono"], 3))
        
        return jsonify({
            "exito": True,
            "abandono": resultados,
            "resumen": {
                "total_alumnos": len(resultados),
                "alto_riesgo": len([r for r in resultados if r["nivel_riesgo_abandono"] == "Alto"]),
                "medio_riesgo": len([r for r in resultados if r["nivel_riesgo_abandono"] == "Medio"]),
                "bajo_riesgo": len([r for r in resultados if r["nivel_riesgo_abandono"] == "Bajo"])
            }
        })
    except Exception as error:
        print(f"Error en detectar_abandono: {error}")
        return jsonify({"exito": False, "mensaje": str(error)}), 400

@app.route('/api/analisis/alumno/<string:alumno_id>', methods=['GET'])
def reporte_detallado_alumno(alumno_id):
    try:
        alumno = db.usuarios.find_one({"_id": ObjectId(alumno_id)})
        if not alumno:
            return jsonify({"exito": False, "mensaje": "Alumno no encontrado"}), 404
        
        equipos = list(db.equipos.find({"$or": [{"lider_id": ObjectId(alumno_id)}, {"miembros": ObjectId(alumno_id)}]}))
        equipos_info = []
        for equipo in equipos:
            equipos_info.append({
                "_id": str(equipo["_id"]),
                "nombre": equipo["nombre"],
                "rol": "Líder" if str(equipo["lider_id"]) == alumno_id else "Miembro",
                "total_miembros": len(equipo.get("miembros", []))
            })
        
        entregas = list(db.entregas.find({"alumno_id": ObjectId(alumno_id)}))
        tareas_ids = [e["tarea_id"] for e in entregas if e.get("tarea_id")]
        tareas_detalle = []
        for entrega in entregas:
            tarea = db.tareas.find_one({"_id": entrega["tarea_id"]})
            if tarea:
                equipo = db.equipos.find_one({"_id": tarea["equipo_id"]})
                equipo_nombre = equipo["nombre"] if equipo else "Sin equipo"
                estado = "completada"
                if tarea.get("fecha_limite") and not entrega.get("calificacion"):
                    estado = "vencida" if datetime.now() > tarea["fecha_limite"] else "pendiente"
                tareas_detalle.append({
                    "_id": str(tarea["_id"]),
                    "titulo": tarea["titulo"],
                    "equipo_nombre": equipo_nombre,
                    "estado": estado,
                    "calificacion": entrega.get("calificacion"),
                    "fecha_entrega": entrega.get("fecha_entrega"),
                    "fecha_limite": tarea.get("fecha_limite")
                })
        
        equipos_ids = [equipo["_id"] for equipo in equipos]
        if equipos_ids:
            tareas_pendientes = list(db.tareas.find({"equipo_id": {"$in": equipos_ids}, "_id": {"$nin": tareas_ids}}))
            for tarea in tareas_pendientes:
                equipo = db.equipos.find_one({"_id": tarea["equipo_id"]})
                equipo_nombre = equipo["nombre"] if equipo else "Sin equipo"
                estado = "pendiente"
                if tarea.get("fecha_limite") and datetime.now() > tarea["fecha_limite"]:
                    estado = "vencida"
                tareas_detalle.append({
                    "_id": str(tarea["_id"]),
                    "titulo": tarea["titulo"],
                    "equipo_nombre": equipo_nombre,
                    "estado": estado,
                    "calificacion": None,
                    "fecha_entrega": None,
                    "fecha_limite": tarea.get("fecha_limite")
                })
        
        calificaciones = [t["calificacion"] for t in tareas_detalle if t["calificacion"] is not None]
        promedio_general = sum(calificaciones) / len(calificaciones) if calificaciones else 0
        tareas_completadas = len([t for t in tareas_detalle if t["estado"] == "completada"])
        tareas_pendientes = len([t for t in tareas_detalle if t["estado"] == "pendiente"])
        tareas_vencidas = len([t for t in tareas_detalle if t["estado"] == "vencida"])
        entregas_tardias = sum(1 for t in tareas_detalle if t.get("fecha_entrega") and t.get("fecha_limite") and t["fecha_entrega"] > t["fecha_limite"])
        
        rendimiento_equipos = []
        for equipo in equipos:
            tareas_equipo = [t for t in tareas_detalle if t["equipo_nombre"] == equipo["nombre"]]
            calif_equipo = [t["calificacion"] for t in tareas_equipo if t["calificacion"] is not None]
            promedio_equipo = sum(calif_equipo) / len(calif_equipo) if calif_equipo else 0
            rendimiento_equipos.append({
                "equipo_nombre": equipo["nombre"],
                "promedio": promedio_equipo,
                "tareas_completadas": len([t for t in tareas_equipo if t["estado"] == "completada"]),
                "tareas_totales": len(tareas_equipo),
                "entregas_tardias": len([t for t in tareas_equipo if t.get("fecha_entrega") and t.get("fecha_limite") and t["fecha_entrega"] > t["fecha_limite"]])
            })
        
        return jsonify({
            "exito": True,
            "alumno": {
                "_id": str(alumno["_id"]),
                "nombre": alumno["nombre"],
                "email": alumno["email"],
                "foto_url": alumno.get("foto_url"),
                "rol": alumno["rol"],
                "estado": "Activo" if len(tareas_detalle) > 0 else "Inactivo",
                "promedio_general": round(promedio_general, 1),
                "total_tareas": len(tareas_detalle),
                "tareas_completadas": tareas_completadas,
                "tareas_pendientes": tareas_pendientes,
                "tareas_vencidas": tareas_vencidas,
                "entregas_tardias": entregas_tardias,
                "equipos": equipos_info,
                "rendimiento_equipos": rendimiento_equipos,
                "tareas": tareas_detalle
            }
        })
    except Exception as error:
        print(f"❌ Error en reporte_detallado_alumno: {error}")
        import traceback
        traceback.print_exc()
        return jsonify({"exito": False, "mensaje": str(error)}), 400

# ============================================
# 7. ANÁLISIS NO SUPERVISADO - CLUSTER (K-MEANS)
# ============================================

@app.route('/api/analisis/cluster', methods=['POST'])
def analisis_cluster():
    print("🔄 ANALISIS CLUSTER - EJECUTANDO")
    
    try:
        datos = request.json
        equipo_id = datos.get('equipo_id')
        k = datos.get('k', 3)
        features_seleccion = datos.get('features', 'all')
        
        if not equipo_id:
            return jsonify({"exito": False, "mensaje": "Equipo no especificado"}), 400
        
        equipo = db.equipos.find_one({"_id": ObjectId(equipo_id)})
        if not equipo:
            return jsonify({"exito": False, "mensaje": "Equipo no encontrado"}), 404
        
        miembros_ids = equipo.get("miembros", [])
        
        alumnos_data = []
        for miembro_id in miembros_ids:
            usuario = db.usuarios.find_one({"_id": miembro_id, "rol": "alumno"})
            if not usuario:
                continue
            
            entregas = list(db.entregas.find({"alumno_id": usuario["_id"]}))
            calificaciones = [e.get("calificacion") for e in entregas if e.get("calificacion") is not None]
            promedio = sum(calificaciones) / len(calificaciones) if calificaciones else 0
            
            tareas_completadas = len([c for c in calificaciones if c >= 60])
            tareas_totales = len(calificaciones) or 1
            participacion = (tareas_completadas / tareas_totales) * 100
            entregas_tardias = 0
            
            alumnos_data.append({
                "alumno_id": str(usuario["_id"]),
                "nombre": usuario["nombre"],
                "promedio": promedio,
                "tareas_completadas": tareas_completadas,
                "tareas_totales": tareas_totales,
                "participacion": participacion,
                "entregas_tardias": entregas_tardias
            })
        
        if len(alumnos_data) < 3:
            return jsonify({"exito": False, "mensaje": "Se necesitan al menos 3 alumnos para el análisis"}), 400
        
        import numpy as np
        from sklearn.preprocessing import StandardScaler
        from sklearn.decomposition import PCA
        from sklearn.cluster import KMeans
        from sklearn.metrics import silhouette_score
        import time
        
        features_map = {
            'all': ['promedio', 'tareas_completadas', 'tareas_totales', 'participacion', 'entregas_tardias'],
            'academic': ['promedio', 'tareas_completadas'],
            'participation': ['participacion', 'tareas_completadas'],
            'behavior': ['entregas_tardias', 'tareas_completadas']
        }
        
        features_seleccionadas = features_map.get(features_seleccion, features_map['all'])
        X = np.array([[d[f] for f in features_seleccionadas] for d in alumnos_data])
        
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        tiempo_inicio = time.time()
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels_originales = kmeans.fit_predict(X_scaled)
        tiempo_fin = time.time()
        
        inercia = kmeans.inertia_
        centroids = kmeans.cluster_centers_.tolist()
        iteraciones = kmeans.n_iter_
        
        silueta = 0
        if k > 1 and len(set(labels_originales)) > 1:
            try:
                silueta = silhouette_score(X_scaled, labels_originales)
            except:
                silueta = 0
        
        pca = PCA(n_components=2)
        X_pca = pca.fit_transform(X_scaled)
        
        # Reordenar clusters por promedio
        cluster_promedios = []
        for i in range(k):
            indices_cluster = np.where(labels_originales == i)[0]
            prom = np.mean([alumnos_data[idx]["promedio"] for idx in indices_cluster]) if len(indices_cluster) > 0 else 0
            cluster_promedios.append({"cluster_original": i, "promedio": prom, "indices": indices_cluster})
        
        cluster_promedios.sort(key=lambda x: x["promedio"], reverse=True)
        
        labels_reordenados = np.full(len(alumnos_data), -1)
        for nuevo_idx, item in enumerate(cluster_promedios):
            for idx in item["indices"]:
                labels_reordenados[idx] = nuevo_idx
        
        pca_data = []
        for i, (x, y) in enumerate(X_pca):
            pca_data.append({
                "pc1": float(x),
                "pc2": float(y),
                "cluster": int(labels_reordenados[i]),
                "nombre": alumnos_data[i]["nombre"],
                "promedio": alumnos_data[i]["promedio"]
            })
        
        centroids_nombres = []
        for i in range(k):
            centroid_dict = {"cluster": i + 1}
            indices_cluster = np.where(labels_reordenados == i)[0]
            if len(indices_cluster) > 0:
                for feat in features_seleccionadas:
                    centroid_dict[feat] = float(np.mean([alumnos_data[idx][feat] for idx in indices_cluster]))
            else:
                for feat in features_seleccionadas:
                    centroid_dict[feat] = 0.0
            centroids_nombres.append(centroid_dict)
        
        alumnos_clusters = []
        for i, alumno in enumerate(alumnos_data):
            alumnos_clusters.append({
                "alumno": alumno["nombre"],
                "nombre": alumno["nombre"],
                "alumno_id": alumno["alumno_id"],
                "cluster": int(labels_reordenados[i]),
                "promedio": alumno["promedio"]
            })
        
        # Método del codo (Elbow)
        elbow_data = []
        max_k = min(10, len(alumnos_data) - 1)
        for k_test in range(2, max_k + 1):
            kmeans_test = KMeans(n_clusters=k_test, random_state=42, n_init=10)
            kmeans_test.fit(X_scaled)
            elbow_data.append({"k": k_test, "inercia": float(kmeans_test.inertia_)})
        
        # Índice de Silueta
        silueta_data = []
        for k_test in range(2, max_k + 1):
            kmeans_test = KMeans(n_clusters=k_test, random_state=42, n_init=10)
            labels_test = kmeans_test.fit_predict(X_scaled)
            try:
                sil_score = silhouette_score(X_scaled, labels_test)
            except:
                sil_score = 0
            silueta_data.append({"k": k_test, "silueta": float(sil_score)})
        
        mejor_k = 2
        if len(elbow_data) >= 3:
            diff1 = [elbow_data[i]["inercia"] - elbow_data[i+1]["inercia"] for i in range(len(elbow_data)-1)]
            if len(diff1) >= 2:
                diff2 = [diff1[i] - diff1[i+1] for i in range(len(diff1)-1)]
                if diff2:
                    mejor_k = elbow_data[diff2.index(max(diff2)) + 1]["k"] if max(diff2) > 0 else 2
        
        return jsonify({
            "exito": True,
            "k": k,
            "algoritmo": "K-Means",
            "inercia": float(inercia),
            "silueta": float(silueta),
            "mejor_k": mejor_k,
            "iteraciones": iteraciones,
            "tiempo_entrenamiento": f"{tiempo_fin - tiempo_inicio:.3f}s",
            "features_utilizadas": ", ".join(features_seleccionadas),
            "centroids": centroids_nombres,
            "elbow_data": elbow_data,
            "silueta_data": silueta_data,
            "pca_data": pca_data,
            "alumnos_clusters": alumnos_clusters,
            "total_alumnos": len(alumnos_data)
        })
    except Exception as error:
        print(f"❌ Error en analisis_cluster: {error}")
        import traceback
        traceback.print_exc()
        return jsonify({"exito": False, "mensaje": str(error)}), 400

# ============================================
# API: DATOS PARA VISUALIZACION GENERAL
# ============================================
@app.route('/api/analisis/vizualizacion/<string:equipo_id>', methods=['GET'])
def obtener_datos_vizualizacion(equipo_id):
    """
    Devuelve datos estructurados para todas las graficas de visualizacion
    """
    try:
        equipo = db.equipos.find_one({"_id": ObjectId(equipo_id)})
        if not equipo:
            return jsonify({"exito": False, "mensaje": "Equipo no encontrado"}), 404
        
        miembros_ids = equipo.get("miembros", [])
        
        # Obtener datos de alumnos
        alumnos_data = []
        for miembro_id in miembros_ids:
            usuario = db.usuarios.find_one({"_id": miembro_id, "rol": "alumno"})
            if not usuario:
                continue
            
            entregas = list(db.entregas.find({"alumno_id": usuario["_id"]}))
            calificaciones = [e.get("calificacion") for e in entregas if e.get("calificacion") is not None]
            
            promedio = sum(calificaciones) / len(calificaciones) if calificaciones else 0
            tareas_completadas = len([c for c in calificaciones if c >= 60])
            tareas_totales = len(calificaciones)
            participacion = (tareas_completadas / tareas_totales) * 100 if tareas_totales > 0 else 0
            entregas_tardias = len([e for e in entregas if e.get('fecha_entrega') and e.get('fecha_limite') and e['fecha_entrega'] > e['fecha_limite']])
            
            # Determinar nivel de riesgo
            if promedio < 60:
                nivel_riesgo = "Alto"
            elif promedio < 70:
                nivel_riesgo = "Medio"
            elif promedio < 80:
                nivel_riesgo = "Bajo"
            else:
                nivel_riesgo = "Sin riesgo"
            
            alumnos_data.append({
                "alumno_id": str(usuario["_id"]),
                "nombre": usuario["nombre"],
                "promedio": round(promedio, 1),
                "tareas_completadas": tareas_completadas,
                "tareas_totales": tareas_totales,
                "participacion": round(participacion, 1),
                "entregas_tardias": entregas_tardias,
                "nivel_riesgo": nivel_riesgo,
                "calificaciones": calificaciones
            })
        
        # Obtener tareas del equipo
        tareas = list(db.tareas.find({"equipo_id": ObjectId(equipo_id)}))
        tareas_data = []
        for tarea in tareas:
            entregas_tarea = list(db.entregas.find({"tarea_id": tarea["_id"]}))
            calif_tarea = [e.get("calificacion") for e in entregas_tarea if e.get("calificacion") is not None]
            tareas_data.append({
                "tarea_id": str(tarea["_id"]),
                "titulo": tarea["titulo"],
                "promedio": sum(calif_tarea) / len(calif_tarea) if calif_tarea else 0,
                "entregas": len(entregas_tarea),
                "calificaciones": calif_tarea
            })
        
        # Distribucion de calificaciones
        todas_calificaciones = []
        for alumno in alumnos_data:
            todas_calificaciones.extend(alumno["calificaciones"])
        
        rangos = {"0-59": 0, "60-69": 0, "70-79": 0, "80-89": 0, "90-100": 0}
        for c in todas_calificaciones:
            if c < 60:
                rangos["0-59"] += 1
            elif c < 70:
                rangos["60-69"] += 1
            elif c < 80:
                rangos["70-79"] += 1
            elif c < 90:
                rangos["80-89"] += 1
            else:
                rangos["90-100"] += 1
        
        # Matriz de calificaciones (alumno x tarea)
        matriz_calificaciones = []
        for alumno in alumnos_data:
            fila = []
            for tarea in tareas:
                entrega = db.entregas.find_one({
                    "tarea_id": tarea["_id"],
                    "alumno_id": ObjectId(alumno["alumno_id"])
                })
                fila.append(entrega.get("calificacion") if entrega else None)
            matriz_calificaciones.append(fila)
        
        return jsonify({
            "exito": True,
            "equipo": {
                "id": str(equipo["_id"]),
                "nombre": equipo.get("nombre", "Equipo sin nombre")
            },
            "alumnos": alumnos_data,
            "tareas": tareas_data,
            "distribucion": rangos,
            "total_calificaciones": len(todas_calificaciones),
            "matriz_calificaciones": matriz_calificaciones,
            "total_alumnos": len(alumnos_data)
        })
        
    except Exception as error:
        print(f"Error en obtener_datos_vizualizacion: {error}")
        return jsonify({"exito": False, "mensaje": str(error)}), 400

# ============================================
# 8. DUALES
# ============================================

def calcular_estado_dual(dual):
    asignaciones = dual.get('asignaciones', [])
    if not asignaciones:
        return 'pendiente'
    
    total_asignaciones = len(asignaciones)
    firmadas = sum(1 for a in asignaciones if a.get('firmado', False))
    fecha_fin = dual.get('fecha_fin')
    
    if fecha_fin and fecha_fin < datetime.now():
        return 'inactivo'
    if firmadas == total_asignaciones and total_asignaciones > 0:
        return 'activo'
    return 'pendiente'

@app.route('/api/duales/crear', methods=['POST'])
def crear_dual():
    try:
        datos = request.json
        usuario_id = datos.get('usuario_id')
        if not usuario_id:
            return jsonify({"exito": False, "mensaje": "Usuario no identificado"}), 400
        
        usuario = db.usuarios.find_one({"_id": ObjectId(usuario_id)})
        if not usuario:
            return jsonify({"exito": False, "mensaje": "Usuario no encontrado"}), 404
        
        alumno_email = datos.get('alumno_email')
        alumno = None
        if alumno_email:
            alumno = db.usuarios.find_one({"email": alumno_email.lower()})
            if not alumno:
                return jsonify({"exito": False, "mensaje": "El correo del alumno no está registrado"}), 400
        
        if not datos.get('titulo') or not datos.get('empresa'):
            return jsonify({"exito": False, "mensaje": "Título y empresa son obligatorios"}), 400
        
        nuevo_dual = {
            "usuario_id": ObjectId(usuario_id),
            "alumno_id": ObjectId(alumno["_id"]) if alumno else None,
            "alumno_email": alumno_email,
            "titulo": datos.get('titulo'),
            "empresa": datos.get('empresa'),
            "descripcion": datos.get('descripcion', ''),
            "cuatrimestre": datos.get('cuatrimestre'),
            "curso": datos.get('curso'),
            "carrera": datos.get('carrera'),
            "fecha_inicio": datetime.strptime(datos.get('fecha_inicio'), '%Y-%m-%d') if datos.get('fecha_inicio') else None,
            "fecha_fin": datetime.strptime(datos.get('fecha_fin'), '%Y-%m-%d') if datos.get('fecha_fin') else None,
            "horas": int(datos.get('horas', 0)),
            "tutor": datos.get('tutor', ''),
            "asignaciones": datos.get('asignaciones', []),
            "fecha_creacion": datetime.now()
        }
        resultado = db.duales.insert_one(nuevo_dual)
        return jsonify({"exito": True, "mensaje": "Dual registrado correctamente", "dual_id": str(resultado.inserted_id)})
    except Exception as error:
        print(f"Error en crear_dual: {error}")
        return jsonify({"exito": False, "mensaje": str(error)}), 400

@app.route('/api/duales/<string:usuario_id>', methods=['GET'])
def listar_duales(usuario_id):
    try:
        usuario = db.usuarios.find_one({"_id": ObjectId(usuario_id)})
        if not usuario:
            return jsonify({"exito": False, "mensaje": "Usuario no encontrado"}), 404
        
        cursor = db.duales.find({
            "$or": [
                {"usuario_id": ObjectId(usuario_id)},
                {"alumno_id": ObjectId(usuario_id)},
                {"asignaciones.maestro_email": usuario['email']}
            ]
        }).sort("fecha_creacion", -1)
        
        duales = []
        for dual in cursor:
            estado_automatico = calcular_estado_dual(dual)
            alumno_info = None
            if dual.get("alumno_id"):
                alumno = db.usuarios.find_one({"_id": dual["alumno_id"]})
                if alumno:
                    alumno_info = {"_id": str(alumno["_id"]), "nombre": alumno["nombre"], "email": alumno["email"]}
            elif dual.get("alumno_email"):
                alumno = db.usuarios.find_one({"email": dual["alumno_email"]})
                if alumno:
                    alumno_info = {"_id": str(alumno["_id"]), "nombre": alumno["nombre"], "email": alumno["email"]}
            
            duales.append({
                "_id": str(dual["_id"]),
                "usuario_id": str(dual["usuario_id"]),
                "titulo": dual.get("titulo", ""),
                "empresa": dual.get("empresa", ""),
                "descripcion": dual.get("descripcion", ""),
                "cuatrimestre": dual.get("cuatrimestre"),
                "curso": dual.get("curso"),
                "carrera": dual.get("carrera"),
                "fecha_inicio": dual["fecha_inicio"].strftime('%Y-%m-%d') if dual.get("fecha_inicio") else None,
                "fecha_fin": dual["fecha_fin"].strftime('%Y-%m-%d') if dual.get("fecha_fin") else None,
                "horas": dual.get("horas", 0),
                "tutor": dual.get("tutor", ""),
                "estado": estado_automatico,
                "fecha_creacion": dual["fecha_creacion"].strftime('%Y-%m-%d %H:%M:%S') if dual.get("fecha_creacion") else None,
                "asignaciones": dual.get("asignaciones", []),
                "alumno": alumno_info
            })
        
        return jsonify({"exito": True, "duales": duales})
    except Exception as error:
        print(f"Error en listar_duales: {error}")
        return jsonify({"exito": False, "mensaje": str(error)}), 400

@app.route('/api/duales/detalle/<string:dual_id>', methods=['GET'])
def detalle_dual(dual_id):
    try:
        dual = db.duales.find_one({"_id": ObjectId(dual_id)})
        if not dual:
            return jsonify({"exito": False, "mensaje": "Dual no encontrado"}), 404
        
        estado_automatico = calcular_estado_dual(dual)
        dual_data = {
            "_id": str(dual["_id"]),
            "usuario_id": str(dual["usuario_id"]),
            "titulo": dual.get("titulo", ""),
            "empresa": dual.get("empresa", ""),
            "descripcion": dual.get("descripcion", ""),
            "cuatrimestre": dual.get("cuatrimestre"),
            "curso": dual.get("curso"),
            "carrera": dual.get("carrera"),
            "fecha_inicio": dual["fecha_inicio"].strftime('%Y-%m-%d') if dual.get("fecha_inicio") else None,
            "fecha_fin": dual["fecha_fin"].strftime('%Y-%m-%d') if dual.get("fecha_fin") else None,
            "horas": dual.get("horas", 0),
            "tutor": dual.get("tutor", ""),
            "estado": estado_automatico,
            "fecha_creacion": dual["fecha_creacion"].strftime('%Y-%m-%d %H:%M:%S') if dual.get("fecha_creacion") else None,
            "asignaciones": dual.get("asignaciones", [])
        }
        
        if dual.get("alumno_id"):
            alumno = db.usuarios.find_one({"_id": dual["alumno_id"]})
            if alumno:
                dual_data["alumno"] = {"_id": str(alumno["_id"]), "nombre": alumno["nombre"], "email": alumno["email"]}
        elif dual.get("alumno_email"):
            alumno = db.usuarios.find_one({"email": dual["alumno_email"]})
            if alumno:
                dual_data["alumno"] = {"_id": str(alumno["_id"]), "nombre": alumno["nombre"], "email": alumno["email"]}
        
        return jsonify({"exito": True, "dual": dual_data})
    except Exception as error:
        print(f"Error en detalle_dual: {error}")
        return jsonify({"exito": False, "mensaje": str(error)}), 400

@app.route('/api/duales/actualizar/<string:dual_id>', methods=['PUT'])
def actualizar_dual(dual_id):
    try:
        datos = request.json
        dual_existente = db.duales.find_one({"_id": ObjectId(dual_id)})
        if not dual_existente:
            return jsonify({"exito": False, "mensaje": "Dual no encontrado"}), 404
        
        actualizacion = {}
        campos_permitidos = ["titulo", "empresa", "descripcion", "cuatrimestre", "curso", "carrera", "horas", "tutor", "asignaciones", "alumno_email"]
        for campo in campos_permitidos:
            if campo in datos:
                actualizacion[campo] = datos[campo]
        
        if "fecha_inicio" in datos and datos["fecha_inicio"]:
            actualizacion["fecha_inicio"] = datetime.strptime(datos["fecha_inicio"], '%Y-%m-%d')
        if "fecha_fin" in datos and datos["fecha_fin"]:
            actualizacion["fecha_fin"] = datetime.strptime(datos["fecha_fin"], '%Y-%m-%d')
        
        if "alumno_email" in actualizacion:
            alumno = db.usuarios.find_one({"email": actualizacion["alumno_email"].lower()})
            if alumno:
                actualizacion["alumno_id"] = alumno["_id"]
            else:
                return jsonify({"exito": False, "mensaje": "El correo del alumno no está registrado"}), 400
        
        if actualizacion:
            db.duales.update_one({"_id": ObjectId(dual_id)}, {"$set": actualizacion})
        
        return jsonify({"exito": True, "mensaje": "Dual actualizado correctamente"})
    except Exception as error:
        print(f"Error en actualizar_dual: {error}")
        return jsonify({"exito": False, "mensaje": str(error)}), 400

@app.route('/api/duales/eliminar/<string:dual_id>', methods=['DELETE'])
def eliminar_dual(dual_id):
    try:
        resultado = db.duales.delete_one({"_id": ObjectId(dual_id)})
        if resultado.deleted_count == 0:
            return jsonify({"exito": False, "mensaje": "Dual no encontrado"}), 404
        return jsonify({"exito": True, "mensaje": "Dual eliminado correctamente"})
    except Exception as error:
        print(f"Error en eliminar_dual: {error}")
        return jsonify({"exito": False, "mensaje": str(error)}), 400

@app.route('/api/duales/firmar', methods=['POST'])
def firmar_dual():
    try:
        datos = request.json
        dual_id = datos.get('dual_id')
        asignacion_index = datos.get('asignacion_index')
        usuario_id = datos.get('usuario_id')
        firma = datos.get('firma')
        
        if not dual_id or asignacion_index is None or not usuario_id:
            return jsonify({"exito": False, "mensaje": "Datos incompletos"}), 400
        
        usuario = db.usuarios.find_one({"_id": ObjectId(usuario_id)})
        if not usuario:
            return jsonify({"exito": False, "mensaje": "Usuario no encontrado"}), 404
        
        dual = db.duales.find_one({"_id": ObjectId(dual_id)})
        if not dual:
            return jsonify({"exito": False, "mensaje": "Dual no encontrado"}), 404
        
        asignaciones = dual.get('asignaciones', [])
        if asignacion_index >= len(asignaciones):
            return jsonify({"exito": False, "mensaje": "Asignación no encontrada"}), 404
        
        asignacion = asignaciones[asignacion_index]
        
        if asignacion.get('maestro_email') != usuario['email'] and str(dual['usuario_id']) != usuario_id:
            return jsonify({"exito": False, "mensaje": "No tienes permiso para firmar este dual"}), 403
        
        asignaciones[asignacion_index]['firmado'] = True
        asignaciones[asignacion_index]['firma_data'] = firma
        asignaciones[asignacion_index]['fecha_firma'] = datetime.now().isoformat()
        
        db.duales.update_one({"_id": ObjectId(dual_id)}, {"$set": {"asignaciones": asignaciones}})
        return jsonify({"exito": True, "mensaje": "Firma registrada correctamente"})
    except Exception as error:
        print(f"❌ Error en firmar_dual: {error}")
        import traceback
        traceback.print_exc()
        return jsonify({"exito": False, "mensaje": str(error)}), 400

# ============================================
# 9. ESTADÍAS
# ============================================

@app.route('/api/estadias/crear', methods=['POST'])
def crear_estadia():
    try:
        datos = request.json
        usuario_id = datos.get('usuario_id')
        if not usuario_id:
            return jsonify({"exito": False, "mensaje": "Usuario no identificado"}), 400
        
        usuario = db.usuarios.find_one({"_id": ObjectId(usuario_id)})
        if not usuario:
            return jsonify({"exito": False, "mensaje": "Usuario no encontrado"}), 404
        
        if not datos.get('nombre') or not datos.get('empresa'):
            return jsonify({"exito": False, "mensaje": "Nombre y empresa son obligatorios"}), 400
        
        nombre_completo = f"{datos.get('nombre', '').strip()} {datos.get('apellidos', '').strip()}".strip()
        
        nueva_estadia = {
            "usuario_id": ObjectId(usuario_id),
            # Datos del alumno
            "nombre": datos.get('nombre', '').strip(),
            "apellidos": datos.get('apellidos', '').strip(),
            "titulo": nombre_completo,
            "carrera": datos.get('carrera', '').strip(),
            "grupo": datos.get('grupo', '').strip(),
            # Empresa
            "empresa": datos.get('empresa', '').strip(),
            "ubicacion": datos.get('lugar_estadia', datos.get('ubicacion', '')).strip(),
            "asesor_academico": datos.get('asesor_academico', '').strip(),
            "asesor_externo": datos.get('asesor_externo', '').strip(),
            # Proyecto
            "proyecto": datos.get('proyecto', '').strip(),
            "equipo": datos.get('equipo', '').strip(),
            "descripcion": datos.get('descripcion', '').strip(),
            # Periodo
            "periodo": datos.get('periodo', '').strip(),
            "fecha_inicio": datetime.strptime(datos.get('fecha_inicio'), '%Y-%m-%d') if datos.get('fecha_inicio') else None,
            "fecha_fin": datetime.strptime(datos.get('fecha_fin'), '%Y-%m-%d') if datos.get('fecha_fin') else None,
            "horas": int(datos.get('horas', 0)) if datos.get('horas') else 0,
            "estado": "pendiente",
            "fecha_creacion": datetime.now()
        }
        
        resultado = db.estadias.insert_one(nueva_estadia)
        
        return jsonify({
            "exito": True,
            "mensaje": "Estadía registrada correctamente",
            "estadia_id": str(resultado.inserted_id)
        })
    except Exception as error:
        print(f"Error en crear_estadia: {error}")
        return jsonify({"exito": False, "mensaje": str(error)}), 400

@app.route('/api/estadias/<string:usuario_id>', methods=['GET'])
def listar_estadias(usuario_id):
    try:
        usuario = db.usuarios.find_one({"_id": ObjectId(usuario_id)})
        if not usuario:
            return jsonify({"exito": False, "mensaje": "Usuario no encontrado"}), 404
        
        estadias = []
        
        if usuario['rol'] == 'maestro':
            # MAESTRO: buscar estadías de los alumnos que están en SUS equipos
            
            # 1. Obtener los equipos donde el maestro es líder
            equipos = list(db.equipos.find({"lider_id": ObjectId(usuario_id)}))
            
            # 2. Recolectar IDs de todos los alumnos miembros de esos equipos
            alumnos_ids = []
            for eq in equipos:
                for m in eq.get("miembros", []):
                    if m not in alumnos_ids:
                        alumnos_ids.append(m)
            
            print(f"👨‍🏫 Maestro {usuario['nombre']}: equipos={len(equipos)}, alumnos={len(alumnos_ids)}")
            
            # 3. Buscar estadías creadas por esos alumnos
            if alumnos_ids:
                cursor = db.estadias.find({
                    "usuario_id": {"$in": alumnos_ids}
                }).sort("fecha_creacion", -1)
            else:
                cursor = []
            
        else:
            # ✅ ALUMNO: solo sus estadías
            cursor = db.estadias.find({
                "usuario_id": ObjectId(usuario_id)
            }).sort("fecha_creacion", -1)
        
        for estadia in cursor:
            alumno_creador = db.usuarios.find_one({"_id": estadia["usuario_id"]})
            
            estadias.append({
                "_id": str(estadia["_id"]),
                "usuario_id": str(estadia["usuario_id"]),
                "alumno_creador_nombre": alumno_creador["nombre"] if alumno_creador else "Desconocido",
                "alumno_creador_email": alumno_creador["email"] if alumno_creador else "",
                "nombre": estadia.get("nombre", ""),
                "apellidos": estadia.get("apellidos", ""),
                "titulo": estadia.get("titulo", ""),
                "carrera": estadia.get("carrera", ""),
                "grupo": estadia.get("grupo", ""),
                "empresa": estadia.get("empresa", ""),
                "ubicacion": estadia.get("ubicacion", ""),
                "asesor_academico": estadia.get("asesor_academico", ""),
                "asesor_externo": estadia.get("asesor_externo", ""),
                "proyecto": estadia.get("proyecto", ""),
                "equipo": estadia.get("equipo", ""),
                "descripcion": estadia.get("descripcion", ""),
                "periodo": estadia.get("periodo", ""),
                "fecha_inicio": estadia["fecha_inicio"].strftime('%Y-%m-%d') if estadia.get("fecha_inicio") else None,
                "fecha_fin": estadia["fecha_fin"].strftime('%Y-%m-%d') if estadia.get("fecha_fin") else None,
                "horas": estadia.get("horas", 0),
                "estado": estadia.get("estado", "pendiente"),
                "fecha_creacion": estadia["fecha_creacion"].strftime('%Y-%m-%d %H:%M:%S') if estadia.get("fecha_creacion") else None
            })
        
        print(f"📊 {usuario['rol']} {usuario['nombre']}: {len(estadias)} estadías encontradas")
        
        return jsonify({"exito": True, "estadias": estadias})
    except Exception as error:
        print(f"Error en listar_estadias: {error}")
        import traceback
        traceback.print_exc()
        return jsonify({"exito": False, "mensaje": str(error)}), 400
    
@app.route('/api/estadias/detalle/<string:estadia_id>', methods=['GET'])
def detalle_estadia(estadia_id):
    try:
        estadia = db.estadias.find_one({"_id": ObjectId(estadia_id)})
        if not estadia:
            return jsonify({"exito": False, "mensaje": "Estadía no encontrada"}), 404
        
        return jsonify({
            "exito": True,
            "estadia": {
                "_id": str(estadia["_id"]),
                "usuario_id": str(estadia["usuario_id"]),
                "nombre": estadia.get("nombre", ""),
                "apellidos": estadia.get("apellidos", ""),
                "titulo": estadia.get("titulo", ""),
                "carrera": estadia.get("carrera", ""),
                "grupo": estadia.get("grupo", ""),
                "empresa": estadia.get("empresa", ""),
                "ubicacion": estadia.get("ubicacion", ""),
                "asesor_academico": estadia.get("asesor_academico", ""),
                "asesor_externo": estadia.get("asesor_externo", ""),
                "proyecto": estadia.get("proyecto", ""),
                "equipo": estadia.get("equipo", ""),
                "descripcion": estadia.get("descripcion", ""),
                "periodo": estadia.get("periodo", ""),
                "fecha_inicio": estadia["fecha_inicio"].strftime('%Y-%m-%d') if estadia.get("fecha_inicio") else None,
                "fecha_fin": estadia["fecha_fin"].strftime('%Y-%m-%d') if estadia.get("fecha_fin") else None,
                "horas": estadia.get("horas", 0),
                "estado": estadia.get("estado", "pendiente"),
                "fecha_creacion": estadia["fecha_creacion"].strftime('%Y-%m-%d %H:%M:%S') if estadia.get("fecha_creacion") else None
            }
        })
    except Exception as error:
        print(f"Error en detalle_estadia: {error}")
        return jsonify({"exito": False, "mensaje": str(error)}), 400

@app.route('/api/estadias/actualizar/<string:estadia_id>', methods=['PUT'])
def actualizar_estadia(estadia_id):
    try:
        datos = request.json
        
        estadia_existente = db.estadias.find_one({"_id": ObjectId(estadia_id)})
        if not estadia_existente:
            return jsonify({"exito": False, "mensaje": "Estadía no encontrada"}), 404
        
        actualizacion = {}
        # ✅ Permitir todos los campos, incluyendo "estado"
        campos_permitidos = [
            "nombre", "apellidos", "carrera", "grupo",
            "empresa", "ubicacion", "asesor_academico", "asesor_externo",
            "proyecto", "equipo", "descripcion", "periodo",
            "horas", "estado", "titulo"
        ]
        for campo in campos_permitidos:
            if campo in datos:
                actualizacion[campo] = datos[campo]
        
        # Actualizar el titulo (nombre completo) si cambia
        if "nombre" in datos or "apellidos" in datos:
            nombre = datos.get("nombre", estadia_existente.get("nombre", ""))
            apellidos = datos.get("apellidos", estadia_existente.get("apellidos", ""))
            actualizacion["titulo"] = f"{nombre} {apellidos}".strip()
        
        if "fecha_inicio" in datos and datos["fecha_inicio"]:
            actualizacion["fecha_inicio"] = datetime.strptime(datos["fecha_inicio"], '%Y-%m-%d')
        if "fecha_fin" in datos and datos["fecha_fin"]:
            actualizacion["fecha_fin"] = datetime.strptime(datos["fecha_fin"], '%Y-%m-%d')
        
        actualizacion["fecha_actualizacion"] = datetime.now()
        
        if actualizacion:
            db.estadias.update_one({"_id": ObjectId(estadia_id)}, {"$set": actualizacion})
        
        return jsonify({"exito": True, "mensaje": "Estadía actualizada correctamente"})
    except Exception as error:
        print(f"Error en actualizar_estadia: {error}")
        return jsonify({"exito": False, "mensaje": str(error)}), 400

@app.route('/api/estadias/eliminar/<string:estadia_id>', methods=['DELETE'])
def eliminar_estadia(estadia_id):
    try:
        resultado = db.estadias.delete_one({"_id": ObjectId(estadia_id)})
        if resultado.deleted_count == 0:
            return jsonify({"exito": False, "mensaje": "Estadía no encontrada"}), 404
        return jsonify({"exito": True, "mensaje": "Estadía eliminada correctamente"})
    except Exception as error:
        print(f"Error en eliminar_estadia: {error}")
        return jsonify({"exito": False, "mensaje": str(error)}), 400

# ============================================
# 10. VIDEOLLAMADA (JITSI MEET)
# ============================================

@app.route('/api/jitsi/crear-sala', methods=['POST'])
def crear_sala_jitsi():
    try:
        datos = request.json
        usuario_id = datos.get('usuario_id')
        usuario_nombre = datos.get('usuario_nombre', 'Usuario')
        
        if not usuario_id:
            return jsonify({"exito": False, "mensaje": "Usuario no identificado"}), 400
        
        room_name = 'learnify-' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=10))
        sala_url = f'https://meet.jit.si/{room_name}'
        
        db.salas_jitsi.insert_one({
            "sala_id": room_name,
            "sala_name": room_name,
            "sala_url": sala_url,
            "creador_id": ObjectId(usuario_id),
            "creador_nombre": usuario_nombre,
            "fecha_creacion": datetime.now(),
            "activa": True
        })
        
        registrar_actividad(usuario_id, "jitsi_crear_sala", f"Sala Jitsi creada: {room_name}")
        return jsonify({"exito": True, "sala_url": sala_url, "sala_id": room_name, "sala_name": room_name, "mensaje": "Sala creada correctamente en Jitsi Meet"})
    except Exception as error:
        print(f"❌ Error al crear sala Jitsi: {error}")
        return jsonify({"exito": False, "mensaje": str(error)}), 400

@app.route('/api/jitsi/salas/<string:usuario_id>', methods=['GET'])
def listar_salas_jitsi(usuario_id):
    try:
        salas = list(db.salas_jitsi.find({"creador_id": ObjectId(usuario_id), "activa": True}).sort("fecha_creacion", -1))
        resultado = []
        for sala in salas:
            resultado.append({
                "sala_id": sala.get("sala_id"),
                "sala_name": sala.get("sala_name"),
                "sala_url": sala.get("sala_url"),
                "fecha_creacion": sala.get("fecha_creacion").strftime('%Y-%m-%d %H:%M:%S') if sala.get("fecha_creacion") else None
            })
        return jsonify({"exito": True, "salas": resultado})
    except Exception as error:
        print(f"❌ Error al listar salas Jitsi: {error}")
        return jsonify({"exito": False, "mensaje": str(error)}), 400

@app.route('/api/jitsi/eliminar-sala/<string:sala_id>', methods=['DELETE'])
def eliminar_sala_jitsi(sala_id):
    try:
        db.salas_jitsi.update_one({"sala_id": sala_id}, {"$set": {"activa": False}})
        return jsonify({"exito": True, "mensaje": "Sala eliminada correctamente"})
    except Exception as error:
        return jsonify({"exito": False, "mensaje": str(error)}), 400

# ============================================
# 11. IMPORTACIÓN Y LIMPIEZA DE DATOS
# ============================================

@app.route('/api/importar/alumnos', methods=['POST'])
def importar_alumnos():
    try:
        equipo_id = request.form.get('equipo_id')
        usuario_id = request.form.get('usuario_id')
        archivo = request.files.get('archivo')
        
        usuario = db.usuarios.find_one({"_id": ObjectId(usuario_id)})
        if not usuario or usuario['rol'] != 'maestro':
            return jsonify({"exito": False, "mensaje": "No autorizado"}), 403
        
        equipo = db.equipos.find_one({"_id": ObjectId(equipo_id)})
        if not equipo or str(equipo["lider_id"]) != usuario_id:
            return jsonify({"exito": False, "mensaje": "No eres líder de este equipo"}), 403
        
        filename = archivo.filename.lower()
        content = archivo.read().decode('utf-8')
        
        resultados = {"creados": 0, "ya_existentes": 0, "errores": 0, "alumnos": []}
        
        def procesar_alumno(nombre, email, resultados):
            alumno = db.usuarios.find_one({"email": email})
            if not alumno:
                nuevo_alumno = {"nombre": nombre, "email": email, "password": "123456", "rol": "alumno", "fecha_registro": datetime.now()}
                resultado = db.usuarios.insert_one(nuevo_alumno)
                resultados["creados"] += 1
                resultados["alumnos"].append({"nombre": nombre, "email": email, "creado": True})
                return resultado.inserted_id
            else:
                resultados["ya_existentes"] += 1
                resultados["alumnos"].append({"nombre": nombre, "email": email, "creado": False})
                return alumno["_id"]
        
        if filename.endswith('.csv'):
            import csv
            import io
            csv_reader = csv.DictReader(io.StringIO(content))
            for row in csv_reader:
                nombre = row.get('nombre', '').strip()
                email = row.get('email', '').strip().lower()
                if not nombre or not email:
                    resultados["errores"] += 1
                    continue
                alumno_id = procesar_alumno(nombre, email, resultados)
                if alumno_id:
                    db.equipos.update_one({"_id": ObjectId(equipo_id)}, {"$addToSet": {"miembros": alumno_id}})
        
        elif filename.endswith('.json'):
            import json
            data = json.loads(content)
            if isinstance(data, dict) and 'alumnos' in data:
                alumnos_data = data['alumnos']
            elif isinstance(data, list):
                alumnos_data = data
            else:
                return jsonify({"exito": False, "mensaje": "Formato JSON no válido"}), 400
            
            for item in alumnos_data:
                nombre = item.get('nombre', '').strip()
                email = item.get('email', '').strip().lower()
                if not nombre or not email:
                    resultados["errores"] += 1
                    continue
                alumno_id = procesar_alumno(nombre, email, resultados)
                if alumno_id:
                    db.equipos.update_one({"_id": ObjectId(equipo_id)}, {"$addToSet": {"miembros": alumno_id}})
        else:
            return jsonify({"exito": False, "mensaje": "Formato no soportado. Usa CSV o JSON"}), 400
        
        return jsonify({
            "exito": True,
            "mensaje": f"Importación completada: {resultados['creados']} creados, {resultados['ya_existentes']} ya existían, {resultados['errores']} errores",
            "resultados": resultados
        })
    except Exception as error:
        return jsonify({"exito": False, "mensaje": str(error)}), 400

@app.route('/api/limpieza', methods=['POST'])
def limpieza_datos():
    try:
        datos = request.json
        usuario_id = datos.get('usuario_id')
        
        usuario = db.usuarios.find_one({"_id": ObjectId(usuario_id)})
        if not usuario or usuario['rol'] != 'maestro':
            return jsonify({"exito": False, "mensaje": "No autorizado"}), 403
        
        resultados = {}
        
        resultado = db.entregas.update_many({"calificacion": {"$lt": 0}}, {"$set": {"calificacion": 0}})
        resultados["calificaciones_negativas"] = resultado.modified_count
        
        resultado = db.entregas.update_many({"calificacion": {"$gt": 100}}, {"$set": {"calificacion": 100}})
        resultados["calificaciones_altas"] = resultado.modified_count
        
        pipeline = [{"$group": {"_id": {"tarea_id": "$tarea_id", "alumno_id": "$alumno_id"}, "ids": {"$push": "$_id"}, "count": {"$sum": 1}}}, {"$match": {"count": {"$gt": 1}}}]
        duplicados = list(db.entregas.aggregate(pipeline))
        eliminados = 0
        for dup in duplicados:
            for _id in dup["ids"][1:]:
                db.entregas.delete_one({"_id": _id})
                eliminados += 1
        resultados["entregas_duplicadas"] = eliminados
        
        resultado = db.entregas.update_many({"fecha_entrega": {"$exists": False}}, {"$set": {"fecha_entrega": datetime.now()}})
        resultados["entregas_sin_fecha"] = resultado.modified_count
        
        return jsonify({"exito": True, "mensaje": "Limpieza completada", "resultados": resultados})
    except Exception as error:
        return jsonify({"exito": False, "mensaje": str(error)}), 400

# ============================================
# 12. WEBSOCKET - VIDEOLLAMADA
# ============================================

@socketio.on('join_room')
def handle_join_room(data):
    sala_id = data.get('sala_id')
    usuario_id = data.get('usuario_id')
    usuario_nombre = data.get('usuario_nombre', 'Anónimo')
    
    if not sala_id or not usuario_id:
        return
    
    join_room(sala_id)
    sala = db.salas_videollamada.find_one({"sala_id": sala_id})
    
    if not sala:
        nueva_sala = {
            "sala_id": sala_id,
            "fecha_creacion": datetime.now(),
            "estado": "activa",
            "participantes": [{"usuario_id": ObjectId(usuario_id), "nombre": usuario_nombre, "fecha_ingreso": datetime.now(), "socket_id": request.sid}]
        }
        db.salas_videollamada.insert_one(nueva_sala)
        es_creador = True
    else:
        existe = False
        for p in sala.get("participantes", []):
            if str(p["usuario_id"]) == usuario_id:
                existe = True
                db.salas_videollamada.update_one({"sala_id": sala_id, "participantes.usuario_id": ObjectId(usuario_id)}, {"$set": {"participantes.$.socket_id": request.sid}})
                break
        if not existe:
            db.salas_videollamada.update_one({"sala_id": sala_id}, {"$push": {"participantes": {"usuario_id": ObjectId(usuario_id), "nombre": usuario_nombre, "fecha_ingreso": datetime.now(), "socket_id": request.sid}}})
        es_creador = False
    
    sala_actualizada = db.salas_videollamada.find_one({"sala_id": sala_id})
    participantes = [{"usuario_id": str(p["usuario_id"]), "nombre": p["nombre"]} for p in sala_actualizada.get("participantes", [])]
    
    emit('participantes_actualizados', {'participantes': participantes, 'total': len(participantes)}, room=sala_id)
    if es_creador:
        emit('esperando_participante', {'mensaje': 'Esperando que alguien se una...'}, room=request.sid)
    
    print(f"📥 {usuario_nombre} se unió a la sala {sala_id} (Creador: {es_creador})")

@socketio.on('signal')
def handle_signal(data):
    sala_id = data.get('sala_id')
    signal = data.get('signal')
    from_id = data.get('from_id')
    if not sala_id or not signal:
        return
    emit('signal', {'signal': signal, 'from_id': from_id}, room=sala_id, skip_sid=request.sid)

@socketio.on('leave_room')
def handle_leave_room(data):
    sala_id = data.get('sala_id')
    usuario_id = data.get('usuario_id')
    if not sala_id or not usuario_id:
        return
    
    leave_room(sala_id)
    db.salas_videollamada.update_one({"sala_id": sala_id}, {"$pull": {"participantes": {"usuario_id": ObjectId(usuario_id)}}})
    
    sala = db.salas_videollamada.find_one({"sala_id": sala_id})
    if sala and len(sala.get("participantes", [])) == 0:
        db.salas_videollamada.delete_one({"sala_id": sala_id})
        emit('sala_cerrada', {'mensaje': 'La sala se ha cerrado'}, room=sala_id)
    else:
        participantes = [{"usuario_id": str(p["usuario_id"]), "nombre": p["nombre"]} for p in sala.get("participantes", [])]
        emit('participantes_actualizados', {'participantes': participantes, 'total': len(participantes)}, room=sala_id)
    
    print(f"📤 Usuario {usuario_id} salió de la sala {sala_id}")

@socketio.on('disconnect')
def handle_disconnect():
    salas = db.salas_videollamada.find({"participantes.socket_id": request.sid})
    for sala in salas:
        sala_id = sala["sala_id"]
        db.salas_videollamada.update_one({"sala_id": sala_id}, {"$pull": {"participantes": {"socket_id": request.sid}}})
        sala_actualizada = db.salas_videollamada.find_one({"sala_id": sala_id})
        if sala_actualizada and len(sala_actualizada.get("participantes", [])) == 0:
            db.salas_videollamada.delete_one({"sala_id": sala_id})
        else:
            participantes = [{"usuario_id": str(p["usuario_id"]), "nombre": p["nombre"]} for p in sala_actualizada.get("participantes", [])]
            emit('participantes_actualizados', {'participantes': participantes, 'total': len(participantes)}, room=sala_id)

# ============================================
# INICIAR SERVIDOR
# ============================================
if __name__ == '__main__':
    print("\n" + "="*50)
    print("🚀 SERVIDOR INICIADO CON MONGODB + WEBSOCKET")
    print("="*50)
    print("📁 Base de datos: MongoDB")
    print("📁 Archivos: GridFS")
    print("🔌 WebSocket: Activado para videollamadas")
    print("📹 Jitsi Meet: Integrado para videollamadas (Gratis)")
    print("🔒 Seguridad: Bloqueo por intentos fallidos activo")
    print("🌐 Rutas disponibles:")
    print("   • http://localhost:5000/api/test  (para probar)")
    print("   • http://localhost:5000/api/jitsi/crear-sala (Jitsi)")
    print("   • http://localhost:5000/api/estado-intentos (Estado de bloqueo)")
    print("\n🔧 Presiona CTRL+C para detener el servidor")
    print("="*50 + "\n")
    
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, use_reloader=False)