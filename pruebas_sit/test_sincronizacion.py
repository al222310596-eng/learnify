def test_sincronizacion_web_movil(client):
    """Verifica que un dato creado en Web se vea inmediatamente en la consulta Móvil."""
    from app import db
    
    # 1. Creamos un usuario maestro en la BD falsa
    usuario_id = db.usuarios.insert_one({
        "nombre": "Profesor Web", "email": "profe@test.com", "password": "123", "rol": "maestro"
    }).inserted_id

    # 2. El "cliente Web" crea una minuta
    response_crear = client.post('/api/minutas/crear', json={
        "usuario_id": str(usuario_id),
        "asunto": "Minuta de prueba SIT",
        "fecha": "2026-11-10",
        "hora": "10:00",
        "area_carrera": "Sistemas"
    })
    
    assert response_crear.status_code == 200
    assert response_crear.json['exito'] is True

    # 3. El "cliente Móvil" consulta las minutas del usuario
    response_consultar = client.get(f'/api/minutas/{str(usuario_id)}')
    
    assert response_consultar.status_code == 200
    minutas = response_consultar.json['minutas']
    
    # 4. Verificamos que la minuta esté ahí (Sincronización exitosa)
    assert len(minutas) > 0
    assert minutas[0]['asunto'] == "Minuta de prueba SIT"