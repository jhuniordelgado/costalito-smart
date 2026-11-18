# Costalito Smart

Prototipo de gestión comercial para un granero familiar — Arquitectura de Software, Universidad Manuela Beltrán.

## Descripción

Costalito Smart reúne módulos de inventario, ventas, compras, clientes, proveedores, créditos y reportes en una aplicación web. La Fase 4 integra la interfaz Angular con una API REST en ASP.NET Core y una base de datos SQL Server.

## Navegación

- [Requisitos y pasos para ejecutar la aplicación](#requisitos)
- [Arquitectura](#arquitectura)
- [Funcionalidades integradas](#funcionalidades-integradas)
- [Levantamiento de información](#levantamiento-de-información)
- [Pruebas de integración](#pruebas-de-integración)

## Levantamiento de información

El análisis de necesidades se basa en una entrevista al propietario de Granero Genith, registrada en 52 notas de voz de WhatsApp y organizada en un cuestionario de 50 preguntas.

Las respuestas se transcribieron con Whisper y se organizaron por pregunta. El documento de levantamiento identifica los audios relacionados con cada respuesta para contrastar la transcripción con la fuente original.

Hallazgos principales: registrar cantidades, códigos, presentaciones, precios y vencimientos; documentar pérdidas y devoluciones; gestionar facturas de compra, proveedores, abonos y saldos; calcular ventas con varios productos; consultar los fiados por cliente; registrar gastos y consultar movimientos por período. La entrevista indicó márgenes habituales del 10 % por unidad y 5 % al por mayor. El prototipo cubre una parte de estos requisitos; gastos, devoluciones y reportes completos quedan pendientes.

El documento con las preguntas, las respuestas registradas, las referencias de audio y la síntesis de necesidades está en [docs/levantamiento-informacion.md](docs/levantamiento-informacion.md). La carpeta destinada a conservar los audios originales es [evidencias/audios](evidencias/audios/README.md).

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

La conexión local predeterminada del frontend apunta a `http://localhost:5257/api`. Para cambiarla, edita `API_URL` en `frontend/src/app/core/api.ts`.

## Inicio de sesión

Todas las pantallas del granero exigen sesión. La ruta `/entrar` muestra el formulario de cédula y contraseña; las demás rutas cuelgan del marco `Principal`, protegido por la guarda `requiereSesion`.

- **Primer arranque:** si la tabla `Usuarios` está vacía, la pantalla de entrada muestra "Crea el administrador". La API (`POST /api/setup/admin`) solo acepta esa creación mientras no exista ningún usuario; después responde 409.
- **Entrar y salir:** `POST /api/auth/login` valida la cédula y la contraseña y devuelve una cookie `HttpOnly` (`costalito.sesion`, 12 horas, renovable). `GET /api/auth/me` restaura la sesión al recargar la página y `POST /api/auth/logout` la cierra desde el botón **Salir** del menú.
- **Protección de la API:** todas las rutas exigen sesión salvo `/api/health`, `/api/setup` y `/api/auth/login`. Sin sesión responden 401 y Angular vuelve a `/entrar`.
- **Validación Fail-Fast:** el formulario revisa los datos en el navegador antes de enviarlos (`core/validaciones.ts`) y la API repite las mismas reglas (`AutenticacionService`). Las contraseñas se guardan con el hash de ASP.NET Core Identity (PBKDF2) y los intentos de entrada se limitan a 10 por minuto por IP.

## Requisitos

- Windows con SQL Server Express LocalDB instalado (la configuración predeterminada usa LocalDB).
- .NET SDK 10.
- Node.js y npm.
- Git, para clonar el repositorio.

Puedes comprobar las herramientas desde PowerShell:

```powershell
dotnet --list-sdks
node --version
npm --version
sqllocaldb info MSSQLLocalDB
```

## Preparación y ejecución

> **Importante:** `appsettings.Development.json` no viene en el repositorio porque está excluido de Git. Cada desarrollador crea su copia local a partir de `appsettings.Example.json`.

Abre PowerShell en la carpeta raíz del repositorio (`costalito-smart`) y ejecuta:

1. Crear el archivo local de configuración (el comando conserva el archivo si ya existe):

   ```powershell
   if (-not (Test-Path backend/Costalito.Api/appsettings.Development.json)) {
       Copy-Item backend/Costalito.Api/appsettings.Example.json backend/Costalito.Api/appsettings.Development.json
   }
   ```

   La configuración de ejemplo usa SQL Server LocalDB. Si usas otro SQL Server, ajusta `ConnectionStrings:Costalito` en el archivo local. Este archivo está ignorado por Git y no se comparte al clonar.

2. Iniciar LocalDB:

   ```powershell
   sqllocaldb start MSSQLLocalDB
   ```

3. Desde esa misma raíz, iniciar la API:

   ```powershell
   dotnet run --project backend/Costalito.Api --launch-profile http
   ```

   El perfil `http` activa el entorno `Development`. En ese entorno, al iniciar la API se ejecutan los scripts SQL: se crea `CostalitoSmart` y las tablas que falten, y se insertan los datos de demostración que no existan. Si los archivos de una base local están desconectados, la API intenta asociarlos. La inicialización es idempotente y no borra los archivos de datos. La API queda disponible en `http://localhost:5257` y Swagger en `http://localhost:5257/swagger`. Si la terminal ya está dentro de `backend`, usa `dotnet run --project Costalito.Api --launch-profile http`.

4. Con la API aún ejecutándose, abre **otra terminal** en la raíz e inicia Angular:

   ```powershell
   cd frontend
   npm install
   npm start
   ```

5. Abrir la dirección que muestre Angular. Si el puerto 4200 está ocupado y aceptas otro, la dirección será distinta; no cambia el puerto de la API.

   `npm install` solo es necesario la primera vez o cuando cambien las dependencias. Angular mostrará en la terminal la URL local, normalmente `http://localhost:4200`.

### Arrancar en otro computador

Cada computador necesita sus propias herramientas y su propia base LocalDB. Instala los requisitos anteriores, clona el repositorio y ejecuta los pasos de configuración y arranque de esta sección. En el primer inicio, la API crea una base nueva con datos de demostración.

Los registros creados en un computador no se copian al otro: LocalDB guarda los datos localmente. Para trasladar datos reales, realiza un respaldo de SQL Server y restáuralo en el otro equipo; cambiar o copiar `appsettings.Development.json` por sí solo no transfiere la base.

Para detener la base local, ejecuta `sqllocaldb stop MSSQLLocalDB`. Para volver a iniciarla, usa `sqllocaldb start MSSQLLocalDB`.

### Compilar

Desde la raíz del repositorio:

```powershell
dotnet build backend/Costalito.Api/Costalito.Api.csproj
```

Desde `frontend/`:

```powershell
npm run build
```

## Pruebas de integración

Los escenarios y su estado están documentados en [`docs/pruebas-integracion.md`](docs/pruebas-integracion.md). Para ejecutar las pruebas de persistencia, SQL Server debe estar iniciado y accesible.

## Seguridad y datos

No guardar credenciales reales en el repositorio. `appsettings.Development.json`, secretos, `bin/` y `obj/` están excluidos por `.gitignore`. Los datos del script SQL son únicamente para demostración. El script no crea usuarios: el administrador se crea desde la pantalla de entrada en el primer arranque.

## Equipo

- John Alejandro Celis
- Sebastián Cabanzo
- Jhunior Estiven Delgado

Universidad Manuela Beltrán — Ingeniería de Sistemas
