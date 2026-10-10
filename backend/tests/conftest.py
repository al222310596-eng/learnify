import os
import sys

import pytest

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, BACKEND_DIR)
os.chdir(BACKEND_DIR)

os.environ.setdefault(
    "MONGO_URI", "mongodb://localhost:27017/?serverSelectionTimeoutMS=3000"
)
os.environ["MONGO_DB_NAME"] = "learnify_test"


@pytest.fixture
def client(tmp_path, monkeypatch):
    import app as app_module
    monkeypatch.setattr(app_module, "ARCHIVO_INTENTOS", str(tmp_path / "intentos.json"))
    app_module.app.config["TESTING"] = True
    with app_module.app.test_client() as c:
        yield c


@pytest.fixture
def db():
    import app as app_module
    try:
        app_module.db.client.admin.command("ping")
    except Exception:
        pytest.skip("MongoDB no está disponible para las pruebas de integración")

    app_module.db.client.drop_database("learnify_test")
    yield app_module.db
    app_module.db.client.drop_database("learnify_test")