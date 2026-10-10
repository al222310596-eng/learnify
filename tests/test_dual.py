# tests/test_dual.py
# ============================================
# PRUEBAS UNITARIAS: Cálculo del estado de un Dual
# ============================================

import pytest
from datetime import datetime, timedelta
import sys
import os

# Agregar el directorio backend al path para importar app.py
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app import calcular_estado_dual


def test_dual_pendiente_por_faltar_firmas():
    """Un dual con firmas incompletas y fecha vigente debe ser 'pendiente'"""
    dual = {
        'asignaciones': [
            {'materia': 'Matemáticas', 'firmado': True},
            {'materia': 'Física', 'firmado': False},
        ],
        'fecha_fin': datetime.now() + timedelta(days=30)
    }
    resultado = calcular_estado_dual(dual)
    assert resultado == 'pendiente', f"Se esperaba 'pendiente' pero se obtuvo '{resultado}'"


def test_dual_activo_por_todas_firmas():
    """Un dual con todas las firmas y fecha vigente debe ser 'activo'"""
    dual = {
        'asignaciones': [
            {'materia': 'Matemáticas', 'firmado': True},
            {'materia': 'Física', 'firmado': True},
            {'materia': 'Programación', 'firmado': True},
        ],
        'fecha_fin': datetime.now() + timedelta(days=30)
    }
    resultado = calcular_estado_dual(dual)
    assert resultado == 'activo', f"Se esperaba 'activo' pero se obtuvo '{resultado}'"


def test_dual_inactivo_por_fecha_pasada():
    """Un dual con fecha de fin pasada debe ser 'inactivo'"""
    dual = {
        'asignaciones': [
            {'materia': 'Matemáticas', 'firmado': True},
            {'materia': 'Física', 'firmado': True},
        ],
        'fecha_fin': datetime.now() - timedelta(days=1)
    }
    resultado = calcular_estado_dual(dual)
    assert resultado == 'inactivo', f"Se esperaba 'inactivo' pero se obtuvo '{resultado}'"


def test_dual_sin_asignaciones_es_pendiente():
    """Un dual sin asignaciones debe ser 'pendiente'"""
    dual = {
        'asignaciones': [],
        'fecha_fin': datetime.now() + timedelta(days=30)
    }
    resultado = calcular_estado_dual(dual)
    assert resultado == 'pendiente', f"Se esperaba 'pendiente' pero se obtuvo '{resultado}'"