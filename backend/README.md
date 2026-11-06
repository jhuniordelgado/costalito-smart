# Backend de Costalito Smart

API REST en ASP.NET Core 10 con EF Core y SQL Server. La solución separa controladores, servicios, repositorios, DTOs, entidades y acceso a datos para que cada capa tenga una responsabilidad clara.

## Configuración local

1. Copia `Costalito.Api/appsettings.Example.json` como `Costalito.Api/appsettings.Development.json` si el archivo local no existe. La conexión de ejemplo usa LocalDB; el archivo local está excluido de Git.
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
