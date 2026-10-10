import os
import pytest
import mongomock
from unittest.mock import patch, MagicMock


@pytest.fixture
def mock_db():
    client = mongomock.MongoClient()
    return client["learnify_test"]


@pytest.fixture
def app(mock_db):
    # Mockeamos GridFS completo porque pymongo no acepta mongomock
    fake_fs = MagicMock()

    with patch("mongo_config.get_mongo_connection", return_value=mock_db), \
         patch("gridfs.GridFS", return_value=fake_fs):

        import app as app_module
        app_module.db = mock_db
        app_module.fs = fake_fs
        app_module.app.config["TESTING"] = True
        yield app_module.app


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture(autouse=True)
def limpiar_intentos():
    archivo = "intentos_fallidos.json"
    if os.path.exists(archivo):
        os.remove(archivo)
    yield
    if os.path.exists(archivo):
        os.remove(archivo)