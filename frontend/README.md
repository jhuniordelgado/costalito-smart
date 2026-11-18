# Frontend de Costalito Smart

Interfaz web desarrollada con Angular 22. Se conecta a la API de Costalito Smart.

## Requisitos

- Node.js y npm.
- API en ejecución en `http://localhost:5257` (consulta las instrucciones de la raíz del repositorio).

## Instalación y ejecución

Desde la carpeta `frontend`, instala las dependencias la primera vez y levanta el servidor:

```powershell
npm install
npm start
```

Abre la URL que indique Angular, normalmente `http://localhost:4200`. Deja esta terminal abierta mientras usas la aplicación. Si el puerto está ocupado, Angular puede elegir otro; la API continúa en el puerto 5257.

## Compilación

```powershell
npm run build
```

Los archivos compilados se generan en `dist/`.

## Pruebas unitarias

```powershell
npm test
```
