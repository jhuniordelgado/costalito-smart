# Backend de Costalito Smart

API REST en ASP.NET Core 10 con EF Core y SQL Server. La solución separa controladores, servicios, repositorios, DTOs, entidades y acceso a datos para que cada capa tenga una responsabilidad clara.

## Configuración local

`Costalito.Api/appsettings.Development.json` no se incluye en Git: cada desarrollador lo crea localmente. Abre PowerShell en la raíz del repositorio (`costalito-smart`) y ejecuta:

1. Crear la configuración local, sin sobrescribir una que ya exista:

```powershell
if (-not (Test-Path backend/Costalito.Api/appsettings.Development.json)) {
    Copy-Item backend/Costalito.Api/appsettings.Example.json backend/Costalito.Api/appsettings.Development.json
}
```

La cadena del ejemplo usa SQL Server LocalDB. Si tu instalación usa otro servidor, cambia `ConnectionStrings:Costalito` en `appsettings.Development.json`.
2. Inicia LocalDB:

```powershell
sqllocaldb start MSSQLLocalDB
```

3. Desde la raíz del repositorio, inicia la API:

```powershell
dotnet run --project backend/Costalito.Api --launch-profile http
```

Al iniciar en Development, la API vuelve a asociar los archivos de una base local desconectada si están presentes, crea las tablas que falten y carga los datos de ejemplo. El proceso es idempotente y no borra los archivos de datos. Si la terminal ya está dentro de `backend`, usa `dotnet run --project Costalito.Api --launch-profile http`. La API queda en `http://localhost:5257` y Swagger en `/swagger`. Angular puede usar otro puerto local si 4200 está ocupado; los orígenes localhost de desarrollo están habilitados en CORS.

También puedes configurar la cadena sin archivo local con la variable de entorno `ConnectionStrings__Costalito`.

## Capas

- `Controllers/`: rutas HTTP y códigos de respuesta.
- `Services/`: reglas del negocio y conversión entre DTOs y entidades.
- `Repositories/`: consultas y escrituras con EF Core.
- `Models/`: entidades que corresponden a las tablas.
- `DTOs/`: contratos de entrada y salida de la API.
- `Data/`: `DbContext` y mapeo SQL Server.
- `Middleware/`: errores uniformes y registro de excepciones.
