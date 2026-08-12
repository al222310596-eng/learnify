
from mongo_config import get_mongo_connection

def setup_collections():
    """Crea las colecciones necesarias en MongoDB"""
    db = get_mongo_connection()
    
    # Lista de colecciones a crear
    collections = [
        "usuarios",
        "equipos", 
        "equipo_miembros",
        "tareas",
        "entregas",
        "mensajes_chat"
    ]
    
    # Crear cada colección
    for collection_name in collections:
        if collection_name not in db.list_collection_names():
            db.create_collection(collection_name)
            print(f" Colección '{collection_name}' creada")
        else:
            print(f" Colección '{collection_name}' ya existe")
    
    print("\n Configuración completada")
    
    # Mostrar todas las colecciones
    print("\n Colecciones en la base de datos:")
    for col in db.list_collection_names():
        print(f"   - {col}")

if __name__ == "__main__":
    setup_collections()