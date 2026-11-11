import pytest
import sys
import os
import mongomock
import gridfs

# 1. Configurar el path para importar app.py y los tests viejos
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend/tests')))

# 2. Parchear GridFS para que no falle con mongomock
_OriginalGridFS = gridfs.GridFS
class MockGridFS(_OriginalGridFS):
    def __init__(self, database, *args, **kwargs):
        self._database = database
        self._files = database['fs.files']
        self._chunks = database['fs.chunks']
        self._collection = self._files 
    def put(self, data, **kwargs):
        return mongomock.ObjectId()
gridfs.GridFS = MockGridFS

# 3. Parchear mongo_config para usar mongomock
import mongo_config
mongo_config.get_mongo_connection = lambda: mongomock.MongoClient().learnify_test_db

# 4. Importar la app
import app as app_module

@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(app_module, "ARCHIVO_INTENTOS", str(tmp_path / "intentos.json"))
    app_module.app.config["TESTING"] = True
    with app_module.app.test_client() as c:
        yield c

@pytest.fixture
def db():
    return app_module.db