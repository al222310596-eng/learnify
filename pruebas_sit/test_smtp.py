from unittest.mock import patch

def test_envio_correo_smtp_simulado(client):
    """Verifica que el backend intente usar SMTP sin lanzar error."""
    # Simulamos la librería smtplib para que no envíe correos reales
    with patch('smtplib.SMTP') as mock_smtp:
        from app import enviar_codigo_email
        
        # Simulamos que las variables de entorno tienen credenciales
        with patch('app.MAIL_USER', 'test@learnify.com'), patch('app.MAIL_PASSWORD', 'password'):
            resultado = enviar_codigo_email(
                destinatario="alumno@test.com", 
                codigo="123456", 
                nombre_usuario="Alumno Prueba"
            )
            
            # Verificamos que se intentó conectar al servidor SMTP
            mock_smtp.assert_called_once()
            assert resultado is True