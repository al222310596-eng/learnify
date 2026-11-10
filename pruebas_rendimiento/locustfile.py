"""
HU40 - Pruebas de rendimiento de Learnify (Locust)

Cada "usuario virtual":
  1) inicia sesión con una cuenta de prueba (on_start)
  2) repite consultas como lo haría la app (estadías, minutas, duales, equipos)

Cambia estas dos líneas por una cuenta REAL de tu base de datos de pruebas:
"""
import os
from locust import HttpUser, task, between

EMAIL_PRUEBA = os.getenv("LEARNIFY_EMAIL", "anderson@gmail.com")
PASSWORD_PRUEBA = os.getenv("LEARNIFY_PASSWORD", "123456")


class UsuarioLearnify(HttpUser):
    # Pausa de 1 a 3 segundos entre acciones (como una persona real)
    wait_time = between(1, 3)

    def on_start(self):
        """Se ejecuta una vez por usuario virtual: hace login y guarda el id."""
        self.usuario_id = None
        with self.client.post(
            "/api/iniciar-sesion",
            json={"email": EMAIL_PRUEBA, "password": PASSWORD_PRUEBA},
            name="POST /api/iniciar-sesion",
            catch_response=True,
        ) as r:
            try:
                datos = r.json()
            except Exception:
                datos = {}
            if r.status_code == 200 and datos.get("exito"):
                self.usuario_id = datos["usuario"]["_id"]
                r.success()
            else:
                r.failure(f"Login falló ({r.status_code}): revisa la cuenta de prueba")

    # El número es el "peso": más alto = se ejecuta más seguido
    @task(1)
    def ping(self):
        self.client.get("/api/test", name="GET /api/test")

    @task(5)
    def listar_estadias(self):
        if self.usuario_id:
            self.client.get(f"/api/estadias/{self.usuario_id}",
                            name="GET /api/estadias/[usuario]")

    @task(3)
    def listar_minutas(self):
        if self.usuario_id:
            self.client.get(f"/api/minutas/{self.usuario_id}",
                            name="GET /api/minutas/[usuario]")

    @task(3)
    def listar_duales(self):
        if self.usuario_id:
            self.client.get(f"/api/duales/{self.usuario_id}",
                            name="GET /api/duales/[usuario]")

    @task(2)
    def listar_equipos(self):
        if self.usuario_id:
            self.client.get(f"/api/equipos/{self.usuario_id}",
                            name="GET /api/equipos/[usuario]")