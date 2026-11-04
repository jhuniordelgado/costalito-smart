# Backend de Costalito Smart

API REST en ASP.NET Core 10 con EF Core y SQL Server. La solución separa controladores, servicios, repositorios, DTOs, entidades y acceso a datos para que cada capa tenga una responsabilidad clara.

## Configuración local

1. Ejecuta `database/01_crear_estructura.sql` y `database/02_datos_prueba.sql` en SQL Server.
2. Ejecuta `database/03_reparar_nombres_seed.sql` para normalizar los acentos de los datos de ejemplo si la herramienta SQL alteró la codificación.
3. Copia `Costalito.Api/appsettings.Example.json` como `Costalito.Api/appsettings.Development.json` y ajusta el servidor si hace falta. Ese archivo local está excluido de Git.
4. Desde la raíz del repositorio, inicia la API:

```powershell
dotnet run --project backend/Costalito.Api
```

La documentación interactiva se publica en `/swagger`. Angular corre en `http://localhost:4200`; ese origen está habilitado en CORS.

También puedes configurar la cadena sin archivo local con la variable de entorno `ConnectionStrings__Costalito`.

## Capas

- `Controllers/`: rutas HTTP y códigos de respuesta.
- `Services/`: reglas del negocio y conversión entre DTOs y entidades.
- `Repositories/`: consultas y escrituras con EF Core.
- `Models/`: entidades que corresponden a las tablas.
- `DTOs/`: contratos de entrada y salida de la API.
- `Data/`: `DbContext` y mapeo SQL Server.
- `Middleware/`: errores uniformes y registro de excepciones.
