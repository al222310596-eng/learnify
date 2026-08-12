
# Este archivo maneja la conexión a MySQL
import mysql.connector

def obtener_conexion():
    """
    Crea y devuelve una conexión a la base de datos MySQL
    """
    conexion = mysql.connector.connect(
        host="localhost",      
        user="root",        
        password="",           
        database="learnify_db"  
    )
    return conexion

