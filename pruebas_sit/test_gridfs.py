import io
from werkzeug.datastructures import FileStorage

def test_subida_archivo_gridfs(client):
    """Verifica que se pueda subir un archivo y se guarde en GridFS (simulado)."""
    from app import db

    # 1. Insertamos un usuario en la BD falsa para tener un ID válido
    usuario_id = db.usuarios.insert_one({
        "nombre": "Test GridFS", "email": "gridfs@test.com", "password": "123", "rol": "alumno"
    }).inserted_id

    # 2. Creamos un archivo falso
    archivo_falso = FileStorage(
        stream=io.BytesIO(b"contenido de imagen de prueba"),
        filename="foto_perfil.jpg",
        content_type="image/jpeg"
    )

    # 3. Hacemos la petición POST
    response = client.post('/api/usuarios/subir-foto',
        data={
            "usuario_id": str(usuario_id),
            "foto": archivo_falso
        },
        content_type='multipart/form-data'
    )

    # 4. Si falla, imprimimos el JSON de error real para saber por qué
    if response.status_code != 200:
        print("\n\n=== ERROR DEVUELTO POR APP.PY ===")
        print(response.json)
        print("=================================\n\n")

    assert response.status_code == 200
    assert response.json['exito'] is True
    assert "foto_url" in response.json