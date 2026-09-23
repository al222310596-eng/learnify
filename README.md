LEARNIFY 

PROYECTO UNIVERSITARIO

Cómo trabajan tus compañeros por primera vez
Esto es lo que cada compañero debe hacer UNA vez en su computadora:

A) Si NO tienen el proyecto en su computadora:
powershell
# Clonan el repositorio
git clone https://github.com/al222310596-eng/learnify.git
cd learnify

# Se cambian a la rama develop
git checkout develop

# Instalan dependencias
npm install

B) Si YA tienen el proyecto pero desactualizado:
powershell
git fetch origin
git checkout develop
git pull origin develop
⚠️ Importante:NO trabajen en main, siempre en develop o en una rama personal.

Paso 3 (continuación): Flujo diario para cada tarea
Este es el ciclo que todos deben repetir por cada funcionalidad nueva:

1️⃣ Actualizar develop local antes de empezar
powershell
git checkout develop
git pull origin develop
Esto trae los últimos cambios que subieron los demás.

2️⃣ Crear una rama para TU tarea
Usa nombres descriptivos sin espacios:
powershell
git checkout -b pantalla-login
# o
git checkout -b fix-error-firma

3️⃣ Trabajar y subir tu rama
powershell
git add .
git commit -m "Agrego pantalla de login"
git push origin pantalla-login
