import os
import sys

import pytest

# Permite hacer "from app import app" desde la carpeta tests
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, BACKEND_DIR)
os.chdir(BACKEND_DIR)

# IMPORTANTE: las pruebas usan una base de datos propia, nunca la real.
# Esto debe ir ANTES de importar app.py.
os.environ.setdefault(
    "MONGO_URI", "mongodb://localhost:27017/?serverSelectionTimeoutMS=3000"
)
os.environ["MONGO_DB_NAME"] = "learnify_test"


@pytest.fixture
def client(tmp_path, monkeypatch):
    import app as app_module

    # El registro de intentos fallidos se guarda en una carpeta temporal
    # para no modificar el archivo intentos_fallidos.json del proyecto.
    monkeypatch.setattr(app_module, "ARCHIVO_INTENTOS", str(tmp_path / "intentos.json"))

    app_module.app.config["TESTING"] = True
    with app_module.app.test_client() as c:
        yield c


@pytest.fixture
def db():
    """Base de datos de pruebas, limpia antes y después de cada prueba."""
    import app as app_module

    try:
        app_module.db.client.admin.command("ping")
    except Exception:
        pytest.skip("MongoDB no está disponible para las pruebas de integración")

    app_module.db.client.drop_database("learnify_test")
    yield app_module.db
    app_module.db.client.drop_database("learnify_test")