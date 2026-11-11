import pytest
import sys
import os
import mongomock
import gridfs

# 1. Configurar el path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend/tests')))

# 2. Parchear GridFS
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

# 3. Parchear mongo_config
import mongo_config
mongo_config.get_mongo_connection = lambda: mongomock.MongoClient().learnify_test_db

import app as app_module

@pytest.fixture
def client(tmp_path, monkeypatch):
    # --- LIMPIEZA MANUAL ---
    db_conn = app_module.db
    db_conn.usuarios.delete_many({})
    db_conn.equipos.delete_many({})
    db_conn.tareas.delete_many({})
    db_conn.entregas.delete_many({})
    
    # Aislamos archivo de intentos
    intentos_tmp = str(tmp_path / "intentos.json")
    monkeypatch.setattr(app_module, "ARCHIVO_INTENTOS", intentos_tmp)
    monkeypatch.setattr(app_module, "verificar_bloqueo", lambda x: (False, 0, 0))
    
    app_module.app.config["TESTING"] = True
    with app_module.app.test_client() as c:
        yield c

@pytest.fixture
def db():
    return app_module.db