# Costalito Smart

Prototipo de gestión comercial para un granero familiar — Arquitectura de Software, Universidad Manuela Beltrán.

## Descripción

Costalito Smart reúne módulos de inventario, ventas, compras, clientes, proveedores, créditos y reportes en una aplicación web. La Fase 4 integra la interfaz Angular con una API REST en ASP.NET Core y una base de datos SQL Server.

## Levantamiento de información

Los requisitos iniciales se recogieron del propietario del negocio mediante **52 notas de voz de WhatsApp**, grabadas el **19 de octubre de 2026 entre las 6:12 p. m. y las 7:09 p. m.**. Las notas responden a un cuestionario de 50 preguntas distribuidas en nueve temas: productos, existencias, precios, compras, proveedores y pagos, ventas, clientes y fiados, gastos y reportes, y datos de los comprobantes.

Las respuestas se transcribieron con Whisper y se organizaron por pregunta. El documento de levantamiento identifica los audios relacionados con cada respuesta para contrastar la transcripción con la fuente original. La carpeta prevista para conservar esos audios es `evidencias/audios`.

Hallazgos principales: registrar cantidades, códigos, presentaciones, precios y vencimientos; documentar pérdidas y devoluciones; gestionar facturas de compra, proveedores, abonos y saldos; calcular ventas con varios productos; consultar los fiados por cliente; registrar gastos y consultar movimientos por período. La entrevista indicó márgenes habituales del 10 % por unidad y 5 % al por mayor. El prototipo cubre una parte de estos requisitos; gastos, devoluciones y reportes completos quedan pendientes.

> **Datos por completar:** el material fuente conserva `[nombre del negocio]` y `[nombre del propietario]` como marcadores. Deben reemplazarse antes de entregar el documento final.

## Arquitectura

```text
frontend (Angular) ── HTTP/JSON ──> backend (ASP.NET Core Web API)
                                           │
                                    EF Core / SQL Server
```

- `frontend/`: pantallas, navegación, validaciones básicas y cliente HTTP.
- `backend/Costalito.Api/Controllers/`: rutas y códigos HTTP.
- `backend/Costalito.Api/Services/`: reglas de negocio y validación.
- `backend/Costalito.Api/Repositories/`: consultas y escrituras con Entity Framework Core.
- `backend/Costalito.Api/Data/`: contexto y mapeo de las entidades.
- `database/`: scripts SQL de estructura y datos de demostración.
- `DESIGN.md`: identidad visual y criterios de interfaz.

La separación corresponde a una arquitectura por capas: la interfaz presenta los datos, la API valida y aplica reglas, y SQL Server conserva la información. La API centraliza las decisiones de stock, ventas y saldos para que las pantallas no sean la fuente de verdad.

## Funcionalidades integradas

La interfaz carga el estado inicial desde `/api/bootstrap` y envía operaciones de ventas, productos, clientes, proveedores, compras, abonos y configuración a la API. Las respuestas exitosas actualizan la vista; los errores de validación o conexión se muestran al usuario. La API documenta sus rutas en Swagger.

La conexión local predeterminada del frontend apunta a `http://localhost:5256/api`. Para cambiarla, edita `API_URL` en `frontend/src/app/core/datos-granero.ts`.

## Requisitos

- .NET SDK 10
- Node.js y npm
- SQL Server accesible desde la máquina

## Preparación y ejecución

1. Crear la base y sus tablas ejecutando `database/01_crear_estructura.sql` en SQL Server.
2. Cargar los datos de demostración con `database/02_datos_prueba.sql`.
3. Copiar `backend/Costalito.Api/appsettings.Example.json` a `backend/Costalito.Api/appsettings.Development.json` y ajustar el servidor/credenciales. El archivo de desarrollo está excluido de Git. También se puede configurar `ConnectionStrings__Costalito` como variable de entorno.
4. Desde la raíz, iniciar la API:

   ```powershell
   dotnet run --project backend/Costalito.Api
   ```

   Swagger queda disponible en `http://localhost:5256/swagger`.

5. En otra terminal:

   ```powershell
   cd frontend
   npm install
   npm start
   ```

6. Abrir `http://localhost:4200`.

Para comprobar la compilación Angular: `cd frontend; npm run build`. Para compilar la API: `dotnet build backend/Costalito.Api/Costalito.Api.csproj`.

## Pruebas de integración

Los escenarios solicitados y el estado de verificación están en [`docs/pruebas-integracion.md`](docs/pruebas-integracion.md). La compilación de Angular se verificó. Para ejecutar y documentar las pruebas completas de persistencia es necesario tener SQL Server iniciado y accesible.

## Seguridad y datos

No guardar credenciales reales en el repositorio. `appsettings.Development.json`, secretos, `bin/` y `obj/` están excluidos por `.gitignore`. Los datos del script SQL son únicamente para demostración.

## Equipo

- John Alejandro Celis
- Sebastián Cabanzo
- Jhunior Estiven Delgado

Universidad Manuela Beltrán — Ingeniería de Sistemas
