import pytest
import sys
import os
import mongomock
import gridfs

# 1. Agregamos la carpeta backend al path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))

# 2. PARCHE 1: GridFS Falso (para que no falle con mongomock)
_OriginalGridFS = gridfs.GridFS

class MockGridFS(_OriginalGridFS):
    def __init__(self, database, *args, **kwargs):
        self._database = database
        self._files = database['fs.files']
        self._chunks = database['fs.chunks']
        # Agregamos la propiedad que faltaba
        self._collection = self._files 
    
    # Simulamos la función put() directamente para que no falle
    def put(self, data, **kwargs):
        return mongomock.ObjectId()

gridfs.GridFS = MockGridFS

# 3. PARCHE 2: Simulamos la conexión a MongoDB
import mongo_config
mongo_config.get_mongo_connection = lambda: mongomock.MongoClient().learnify_test_db

# 4. Ahora importamos tu app.py
from app import app as flask_app

@pytest.fixture
def client():
    flask_app.config['TESTING'] = True
    with flask_app.test_client() as client:
        yield client