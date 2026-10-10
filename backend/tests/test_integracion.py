# ============================================
# PRUEBA 1: Flujo completo de autenticación
# Registro -> Login exitoso -> Login fallido -> Bloqueo
# ============================================
def test_flujo_autenticacion_y_bloqueo(client):
    # 1. Registro de usuario
    resp = client.post("/api/registro", json={
        "nombre": "Ana Lopez",
        "email": "ana@test.com",
        "password": "123456",
        "rol": "alumno"
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["exito"] is True
    assert data["usuario_id"]

    # 2. Login exitoso
    resp = client.post("/api/iniciar-sesion", json={
        "email": "ana@test.com",
        "password": "123456"
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["exito"] is True
    assert data["usuario"]["email"] == "ana@test.com"
    assert "password" not in data["usuario"]

    # 3. Tres intentos fallidos
    for _ in range(3):
        resp = client.post("/api/iniciar-sesion", json={
            "email": "ana@test.com",
            "password": "incorrecta"
        })
        assert resp.status_code == 401

    # 4. Cuarto intento: bloqueado (incluso con password correcta)
    resp = client.post("/api/iniciar-sesion", json={
        "email": "ana@test.com",
        "password": "123456"
    })
    assert resp.status_code == 403
    data = resp.get_json()
    assert data["bloqueado"] is True
    assert data["minutos_restantes"] >= 1


# ============================================
# PRUEBA 2: Flujo de equipo y tareas
# Maestro crea equipo -> Alumno se une -> Maestro crea tarea
# -> Alumno ve la tarea pendiente
# ============================================
def test_flujo_equipo_y_tarea(client):
    # 1. Crear maestro y alumno
    maestro_id = client.post("/api/registro", json={
        "nombre": "Profe Juan",
        "email": "profe@test.com",
        "password": "123456",
        "rol": "maestro"
    }).get_json()["usuario_id"]

    alumno_id = client.post("/api/registro", json={
        "nombre": "Alumno Pepe",
        "email": "pepe@test.com",
        "password": "123456",
        "rol": "alumno"
    }).get_json()["usuario_id"]

    # 2. Maestro crea equipo
    resp = client.post("/api/equipos/crear", json={
        "nombre": "Equipo Alpha",
        "descripcion": "Equipo de prueba",
        "lider_id": maestro_id
    })
    assert resp.status_code == 200
    equipo_id = resp.get_json()["equipo_id"]

    # 3. Alumno se une al equipo
    resp = client.post("/api/equipos/unirse", json={
        "equipo_id": equipo_id,
        "usuario_id": alumno_id
    })
    assert resp.get_json()["exito"] is True

    # 4. Detalle del equipo
    resp = client.get(f"/api/equipos/detalle/{equipo_id}")
    equipo = resp.get_json()["equipo"]
    assert equipo["total_miembros"] == 1
    assert equipo["miembros"][0]["email"] == "pepe@test.com"

    # 5. Maestro crea tarea
    resp = client.post("/api/tareas/crear", json={
        "titulo": "Tarea 1",
        "descripcion": "Hacer el reporte",
        "equipo_id": equipo_id,
        "creador_id": maestro_id
    })
    assert resp.status_code == 200
    tarea_id = resp.get_json()["tarea_id"]

    # 6. Alumno ve su tarea pendiente
    resp = client.get(f"/api/tareas/alumno/{alumno_id}")
    tareas = resp.get_json()["tareas"]
    assert len(tareas) == 1
    assert tareas[0]["_id"] == tarea_id
    assert tareas[0]["titulo"] == "Tarea 1"