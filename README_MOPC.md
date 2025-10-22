# MOPC Dashboard

Dashboard web para el Ministerio de Obras Públicas y Comunicaciones (MOPC) desarrollado con React y TypeScript.

## Características

- 📊 Dashboard principal con métricas y estadísticas
- 🗺️ Visualización de mapas con Google Maps y Leaflet
- 📝 Sistema de reportes y formularios
- 👥 Gestión de usuarios
- 📊 Página de exportación de datos
- 📱 Diseño responsive

## Tecnologías

- **Frontend**: React 18 con TypeScript
- **Mapas**: Google Maps API y Leaflet
- **Estilos**: CSS3 con diseño modular
- **Build**: Create React App

## Instalación

1. Clona el repositorio:
```bash
git clone [URL_DEL_REPOSITORIO]
cd mopc-dashboard
```

2. Instala las dependencias:
```bash
npm install
```

3. Inicia el servidor de desarrollo:
```bash
npm start
```

## Scripts Disponibles

### `npm start`
Ejecuta la aplicación en modo desarrollo.\
Abre [http://localhost:3000](http://localhost:3000) para verla en el navegador.

### `npm test`
Ejecuta las pruebas en modo interactivo.

### `npm run build`
Construye la aplicación para producción en la carpeta `build`.

### `npm run eject`
**Nota: esta es una operación irreversible.**

## Estructura del Proyecto

```
src/
├── components/          # Componentes React
│   ├── Dashboard.tsx    # Componente principal del dashboard
│   ├── GoogleMapView.tsx # Vista de Google Maps
│   ├── LeafletMapView.tsx # Vista de Leaflet
│   ├── ReportForm.tsx   # Formulario de reportes
│   ├── ReportsPage.tsx  # Página de reportes
│   ├── UsersPage.tsx    # Página de usuarios
│   └── ExportPage.tsx   # Página de exportación
├── config/              # Configuraciones
│   └── googleMapsConfig.ts
└── App.tsx             # Componente principal
```

## Configuración

### Google Maps
Configura tu API key de Google Maps en `src/config/googleMapsConfig.ts`

## Codespaces

Este proyecto está preparado para funcionar en GitHub Codespaces. Simplemente:

1. Abre el repositorio en GitHub
2. Haz clic en "Code" > "Codespaces" > "Create codespace on main"
3. Una vez que el entorno esté listo, ejecuta `npm install` y `npm start`

## Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.