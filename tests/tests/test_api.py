# tests/test_api.py
# ============================================
# PRUEBAS UNITARIAS: Endpoint /api/test de Flask
# ============================================

import pytest
import sys
import os

# Agregar el directorio backend al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app import app


@pytest.fixture
def cliente():
    """Crea un cliente de pruebas para Flask"""
    app.config['TESTING'] = True
    with app.test_client() as cliente:
        yield cliente


def test_endpoint_test_responde_ok(cliente):
    """El endpoint /api/test debe responder con estado 200"""
    respuesta = cliente.get('/api/test')
    assert respuesta.status_code == 200, f"Se esperaba 200 pero se obtuvo {respuesta.status_code}"


def test_endpoint_test_devuelve_json_correcto(cliente):
    """El endpoint /api/test debe devolver el JSON esperado"""
    respuesta = cliente.get('/api/test')
    datos = respuesta.get_json()
    
    assert datos['estado'] == 'ok', f"Se esperaba 'ok' pero se obtuvo '{datos.get('estado')}'"
    assert datos['base_datos'] == 'MongoDB', f"Se esperaba 'MongoDB' pero se obtuvo '{datos.get('base_datos')}'"
    assert 'mensaje' in datos, "La respuesta debe incluir un mensaje"