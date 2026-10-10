"""Pruebas FUNCIONALES de Learnify: flujos completos como los haria un usuario.

Cada prueba recorre varios pasos seguidos (registro, login, equipos, tareas)
usando solo la API, igual que lo haria el frontend.
"""


def registrar(client, nombre, email, rol):
    respuesta = client.post(
        "/api/registro",
        json={"nombre": nombre, "email": email, "password": "123456", "rol": rol},
    )
    assert respuesta.status_code == 200
    return respuesta.get_json()["usuario_id"]


def iniciar_sesion(client, email):
    respuesta = client.post(
        "/api/iniciar-sesion", json={"email": email, "password": "123456"}
    )
    assert respuesta.status_code == 200
    return respuesta.get_json()["usuario"]


def test_flujo_maestro_crea_equipo_y_tarea(client, db):
    # 1. El maestro se registra e inicia sesión
    registrar(client, "Maria Torres", "maria@correo.com", "maestro")
    maestro = iniciar_sesion(client, "maria@correo.com")
    assert maestro["rol"] == "maestro"

    # 2. Crea un equipo
    equipo = client.post(
        "/api/equipos/crear",
        json={"nombre": "Programacion Web", "lider_id": maestro["_id"]},
    ).get_json()
    assert equipo["exito"] is True

    # 3. Crea una tarea para ese equipo
    tarea = client.post(
        "/api/tareas/crear",
        json={
            "titulo": "Practica 1",
            "equipo_id": equipo["equipo_id"],
            "creador_id": maestro["_id"],
            "fecha_limite": "2026-12-01",
        },
    ).get_json()
    assert tarea["exito"] is True

    # 4. Ve su equipo y su tarea en los listados
    equipos = client.get(f"/api/equipos/{maestro['_id']}").get_json()["equipos"]
    assert [e["nombre"] for e in equipos] == ["Programacion Web"]

    tareas = client.get(f"/api/tareas/equipo/{equipo['equipo_id']}").get_json()["tareas"]
    assert [t["titulo"] for t in tareas] == ["Practica 1"]


def test_flujo_alumno_se_une_a_equipo_y_ve_tareas(client, db):
    # El maestro prepara un equipo con una tarea
    maestro_id = registrar(client, "Maria Torres", "maria@correo.com", "maestro")
    equipo_id = client.post(
        "/api/equipos/crear", json={"nombre": "Base de Datos", "lider_id": maestro_id}
    ).get_json()["equipo_id"]
    client.post(
        "/api/tareas/crear",
        json={"titulo": "Practica 1", "equipo_id": equipo_id, "creador_id": maestro_id},
    )

    # El alumno se registra, inicia sesión y se une al equipo
    registrar(client, "Pedro Ruiz", "pedro@correo.com", "alumno")
    alumno = iniciar_sesion(client, "pedro@correo.com")

    unirse = client.post(
        "/api/equipos/unirse", json={"equipo_id": equipo_id, "usuario_id": alumno["_id"]}
    )
    assert unirse.get_json()["exito"] is True

    # Ahora el equipo aparece en su lista y puede ver la tarea
    equipos = client.get(f"/api/equipos/{alumno['_id']}").get_json()["equipos"]
    assert [e["nombre"] for e in equipos] == ["Base de Datos"]

    tareas = client.get(f"/api/tareas/equipo/{equipo_id}").get_json()["tareas"]
    assert tareas[0]["titulo"] == "Practica 1"


def test_alumno_no_puede_unirse_dos_veces_al_mismo_equipo(client, db):
    maestro_id = registrar(client, "Maria Torres", "maria@correo.com", "maestro")
    equipo_id = client.post(
        "/api/equipos/crear", json={"nombre": "Redes", "lider_id": maestro_id}
    ).get_json()["equipo_id"]
    alumno_id = registrar(client, "Pedro Ruiz", "pedro@correo.com", "alumno")

    datos = {"equipo_id": equipo_id, "usuario_id": alumno_id}
    primera = client.post("/api/equipos/unirse", json=datos)
    segunda = client.post("/api/equipos/unirse", json=datos)

    assert primera.status_code == 200
    assert segunda.status_code == 400
    assert "Ya eres miembro" in segunda.get_json()["mensaje"]