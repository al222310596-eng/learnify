import io
from werkzeug.datastructures import FileStorage
from openpyxl import Workbook

def test_importacion_equipos_excel(client, db):
    """Prueba que la importación de Excel no se haya roto."""
    res_reg = client.post("/api/registro", json={"nombre": "Maestro Import", "email": "imp@test.com", "password": "123456", "rol": "maestro"})
    maestro_id = res_reg.get_json()["usuario_id"]

    wb = Workbook()
    ws = wb.active
    ws.title = "Equipos"
    ws.append(["nombre", "descripcion"])
    ws.append(["Equipo Importado", "Desde Excel"])
    
    excel_bytes = io.BytesIO()
    wb.save(excel_bytes)
    excel_bytes.seek(0)

    archivo_falso = FileStorage(
        stream=excel_bytes, filename="equipos.xlsx", content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

    res = client.post('/api/equipos/importar', 
        data={"usuario_id": maestro_id, "archivo": archivo_falso},
        content_type='multipart/form-data'
    )

    assert res.status_code == 200
    assert res.get_json()['resumen']['exitosos'] == 1
    assert db.equipos.count_documents({"nombre": "Equipo Importado"}) == 1