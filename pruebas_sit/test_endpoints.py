def test_api_test_endpoint(client):
    """Valida que el endpoint de estado responda OK."""
    response = client.get('/api/test')
    assert response.status_code == 200
    assert response.json['estado'] == 'ok'

def test_login_endpoint_fallido(client):
    """Valida que el login falle correctamente con credenciales falsas."""
    response = client.post('/api/iniciar-sesion', json={
        "email": "noexiste@test.com", 
        "password": "123456"
    })
    # Tu código devuelve 401 si falla el login
    assert response.status_code == 401
    assert response.json['exito'] is False