# Instrucciones para subir el proyecto MOPC Dashboard a GitHub Codespaces

## 📋 Pasos para preparar el repositorio

### 1. Instalar Git (si no está instalado)
```bash
# Descargar Git desde: https://git-scm.com/downloads
# O usar chocolatey en Windows:
choco install git
```

### 2. Inicializar el repositorio Git
```bash
# Navegar al directorio del proyecto
cd "c:\Users\Local.MOPC-32379\Documents\MOPC Dashboard\MOPC Dashboard"

# Inicializar Git
git init

# Configurar usuario (reemplazar con tus datos)
git config user.name "Tu Nombre"
git config user.email "tu.email@ejemplo.com"
```

### 3. Preparar archivos para commit
```bash
# Agregar todos los archivos (respetando .gitignore)
git add .

# Hacer el primer commit
git commit -m "Initial commit: MOPC Dashboard project setup"
```

### 4. Crear repositorio en GitHub
1. Ve a [GitHub](https://github.com)
2. Haz clic en "New repository"
3. Nombra el repositorio: `mopc-dashboard`
4. Marca como público o privado según necesites
5. NO agregues README, .gitignore o licencia (ya los tenemos)
6. Haz clic en "Create repository"

### 5. Conectar con GitHub
```bash
# Conectar con el repositorio remoto (reemplazar con tu URL)
git remote add origin https://github.com/TU_USUARIO/mopc-dashboard.git

# Subir el código
git branch -M main
git push -u origin main
```

### 6. Abrir en Codespaces
1. Ve al repositorio en GitHub
2. Haz clic en el botón verde "Code"
3. Selecciona la pestaña "Codespaces"
4. Haz clic en "Create codespace on main"

## 🚀 Lo que sucederá en Codespaces

1. **Configuración automática**: El archivo `.devcontainer/devcontainer.json` configurará:
   - Node.js 18
   - Extensiones de VS Code necesarias
   - Puerto 3000 para el desarrollo

2. **Instalación automática**: Se ejecutará `npm install` automáticamente

3. **Listo para desarrollar**: Podrás ejecutar:
   ```bash
   npm start
   ```

## 📁 Archivos importantes creados

- ✅ `.gitignore` - Actualizado para excluir archivos innecesarios
- ✅ `.devcontainer/devcontainer.json` - Configuración de Codespaces
- ✅ `README_MOPC.md` - Documentación del proyecto
- ✅ `LICENSE` - Licencia MIT
- ✅ `scripts.json` - Scripts de utilidad

## 🔧 Comandos útiles una vez en Codespaces

```bash
# Instalar dependencias
npm install

# Iniciar desarrollo
npm start

# Construir para producción
npm run build

# Ejecutar tests
npm test

# Ver scripts personalizados
cat scripts.json
```

## 📝 Notas importantes

1. **Archivos excluidos**: Los archivos de backup, .bat y documentación temporal están en .gitignore
2. **Estructura limpia**: Solo el código fuente y configuraciones necesarias se suben
3. **Codespaces listo**: El proyecto está preconfigurado para funcionar inmediatamente
4. **Puerto forwarding**: El puerto 3000 se forwarding automáticamente

## 🛠️ Próximos pasos recomendados

1. Configurar variables de entorno para APIs (Google Maps, etc.)
2. Agregar tests adicionales
3. Configurar CI/CD con GitHub Actions
4. Documentar APIs y componentes

¡Tu proyecto MOPC Dashboard está listo para Codespaces! 🎉