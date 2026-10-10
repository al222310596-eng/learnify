"""Pruebas de INTEGRACION de Learnify: API (Flask) + base de datos (MongoDB).

A diferencia de las pruebas basicas, aqui SI se usa MongoDB para comprobar
que lo que hace la API realmente queda guardado (o se rechaza) en la BD.
"""


def registrar(client, nombre="Ana Lopez", email="ana@correo.com", rol="alumno"):
    return client.post(
        "/api/registro",
        json={"nombre": nombre, "email": email, "password": "123456", "rol": rol},
    )


def test_registro_guarda_usuario_en_bd(client, db):
    respuesta = registrar(client)

    assert respuesta.status_code == 200
    assert respuesta.get_json()["exito"] is True

    usuario = db.usuarios.find_one({"email": "ana@correo.com"})
    assert usuario is not None
    assert usuario["nombre"] == "Ana Lopez"
    assert usuario["rol"] == "alumno"


def test_registro_rechaza_correo_duplicado(client, db):
    registrar(client)
    respuesta = registrar(client)

    assert respuesta.status_code == 400
    assert "registrado" in respuesta.get_json()["mensaje"]
    assert db.usuarios.count_documents({"email": "ana@correo.com"}) == 1


def test_login_correcto_no_devuelve_password(client, db):
    registrar(client)

    respuesta = client.post(
        "/api/iniciar-sesion", json={"email": "ana@correo.com", "password": "123456"}
    )

    datos = respuesta.get_json()
    assert respuesta.status_code == 200
    assert datos["exito"] is True
    assert datos["usuario"]["email"] == "ana@correo.com"
    assert "password" not in datos["usuario"]


def test_login_con_password_incorrecta(client, db):
    registrar(client)

    respuesta = client.post(
        "/api/iniciar-sesion", json={"email": "ana@correo.com", "password": "incorrecta"}
    )

    assert respuesta.status_code == 401
    assert respuesta.get_json()["exito"] is False


def test_crear_equipo_se_guarda_en_bd(client, db):
    lider_id = registrar(client, rol="maestro").get_json()["usuario_id"]

    respuesta = client.post(
        "/api/equipos/crear", json={"nombre": "Equipo Alfa", "lider_id": lider_id}
    )

    assert respuesta.status_code == 200
    assert db.equipos.count_documents({"nombre": "Equipo Alfa"}) == 1


def test_solo_el_lider_puede_crear_tareas(client, db):
    lider_id = registrar(client, rol="maestro").get_json()["usuario_id"]
    otro_id = registrar(client, nombre="Luis Perez", email="luis@correo.com").get_json()["usuario_id"]
    equipo_id = client.post(
        "/api/equipos/crear", json={"nombre": "Equipo Alfa", "lider_id": lider_id}
    ).get_json()["equipo_id"]

    tarea = {"titulo": "Tarea 1", "equipo_id": equipo_id}

    # Un usuario que NO es líder es rechazado
    rechazada = client.post("/api/tareas/crear", json={**tarea, "creador_id": otro_id})
    assert rechazada.status_code == 403
    assert db.tareas.count_documents({}) == 0

    # El líder sí puede
    aceptada = client.post("/api/tareas/crear", json={**tarea, "creador_id": lider_id})
    assert aceptada.status_code == 200
    assert db.tareas.count_documents({"titulo": "Tarea 1"}) == 1