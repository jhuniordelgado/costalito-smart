# Costalito Smart

Prototipo de gestión comercial para un granero familiar — Arquitectura de Software, Universidad Manuela Beltrán.

## Descripción

Costalito Smart reúne módulos de inventario, ventas, compras, clientes, proveedores, créditos y reportes en una aplicación web. La versión final integra la interfaz Angular con una API REST en ASP.NET Core, una base de datos SQL Server y un **servicio de Inteligencia Artificial** (Python, FastAPI y TensorFlow) que predice la demanda de cada producto y sugiere cuándo y cuánto comprar.

## Navegación

- [Requisitos y pasos para ejecutar la aplicación](#requisitos)
- [Arquitectura](#arquitectura)
- [Funcionalidades integradas](#funcionalidades-integradas)
- [Servicio de Inteligencia Artificial](#servicio-de-inteligencia-artificial)
- [Levantamiento de información](#levantamiento-de-información)
- [Pruebas](#pruebas)

## Levantamiento de información

El análisis de necesidades se basa en una entrevista al propietario de Granero Genith, registrada en 52 notas de voz de WhatsApp y organizada en un cuestionario de 50 preguntas.

Las respuestas se transcribieron con Whisper y se organizaron por pregunta. El documento de levantamiento identifica los audios relacionados con cada respuesta para contrastar la transcripción con la fuente original.

Hallazgos principales: registrar cantidades, códigos, presentaciones, precios y vencimientos; documentar pérdidas y devoluciones; gestionar facturas de compra, proveedores, abonos y saldos; calcular ventas con varios productos; consultar los fiados por cliente; registrar gastos y consultar movimientos por período. La entrevista indicó márgenes habituales del 10 % por unidad y 5 % al por mayor. El prototipo cubre una parte de estos requisitos; gastos, devoluciones y reportes completos quedan pendientes.

El documento con las preguntas, las respuestas registradas, las referencias de audio y la síntesis de necesidades está en [docs/levantamiento-informacion.md](docs/levantamiento-informacion.md). La carpeta destinada a conservar los audios originales es [evidencias/audios](evidencias/audios/README.md).

## Arquitectura

```text
frontend (Angular) ── HTTP/JSON ──> backend (ASP.NET Core Web API) ── HTTP/JSON ──> servicio-inteligente (FastAPI)
   :4200                                  :5257          │                                :8000          │
                                                          ▼                                               ▼
                                                  EF Core / SQL Server  <──────── lectura (pyodbc) ───────┘
```

- `frontend/`: pantallas, navegación, validaciones básicas y cliente HTTP.
- `backend/Costalito.Api/Controllers/`: rutas y códigos HTTP.
- `backend/Costalito.Api/Services/`: reglas de negocio, validación y el cliente del servicio de IA (`ServicioInteligente.cs`).
- `backend/Costalito.Api/Repositories/`: consultas y escrituras con Entity Framework Core.
- `backend/Costalito.Api/Data/`: contexto y mapeo de las entidades.
- `database/`: scripts SQL de estructura, datos de demostración e historial de ventas y compras.
- `servicio-inteligente/`: servicio de IA (predicción de demanda y reglas de compra), con sus pruebas.
- `docs/`: levantamiento de información, pruebas de integración y evidencias de la integración con IA.
- `DESIGN.md`: identidad visual y criterios de interfaz.

La separación corresponde a una arquitectura por capas: la interfaz presenta los datos, la API valida y aplica reglas, y SQL Server conserva la información. La API centraliza las decisiones de stock, ventas y saldos para que las pantallas no sean la fuente de verdad.

## Funcionalidades integradas

La interfaz carga el estado inicial desde `/api/bootstrap` y envía operaciones de ventas, productos, clientes, proveedores, compras, abonos y configuración a la API. Las respuestas exitosas actualizan la vista; los errores de validación o conexión se muestran al usuario. La API documenta sus rutas en Swagger.

La conexión local predeterminada del frontend apunta a `http://localhost:5257/api`. Para cambiarla, edita `API_URL` en `frontend/src/app/core/api.ts`.

**Reportes** calcula los indicadores con las ventas registradas (ventas y unidades del mes frente al mismo periodo del mes anterior, producto destacado, promedio por día de la semana) y **Exportar reporte** descarga un archivo CSV que abre en Excel con ese resumen y las predicciones de compra del servicio de IA.

## Servicio de Inteligencia Artificial

### Qué hace

Predice cuántas unidades de cada producto se venderán en la semana y, con esa predicción, **sugiere cuándo y cuánto comprar**: compara lo previsto con las existencias, lo que ya está en camino y los días que tarda cada proveedor. Responde la pregunta diaria del granero: *¿qué tengo que pedir hoy para no quedarme sin mercancía?*

| | |
|---|---|
| **Tecnología** | Python 3.13, FastAPI, TensorFlow/Keras (red `Dense 8 → 4 → 1`), pyodbc |
| **Ubicación** | [`servicio-inteligente/`](servicio-inteligente/README.md) |
| **Datos** | Lee las ventas, compras e inventario directamente de la base `CostalitoSmart` |
| **Componente que lo consume** | La API de ASP.NET Core: `ServicioInteligente.cs` (cliente HTTP) e `InteligenciaController` (`GET /api/intelligence`) |
| **Dónde se usa el resultado** | Angular: **Señales del negocio**, **Mi jornada** y **Reportes** |

La red neuronal se entrena con las ventas semanales de la base. Si al evaluarla no supera al promedio de las últimas 4 semanas, el servicio usa ese promedio y lo informa en el campo `metodo`. Con el historial actual (9 semanas) la red se equivoca en 7,12 unidades por semana y el promedio en 6,04, así que hoy predice con el promedio. El detalle está en [servicio-inteligente/README.md](servicio-inteligente/README.md).

### Cómo se comunica

```text
Angular ──GET /api/intelligence──> API .NET ──GET /, /recomendaciones, /estado-datos, /modelo──> FastAPI ──consulta──> SQL Server
   ▲                                  │                                                            │
   └──── señales y tablero ◄── JSON (camelCase) ◄──────────── JSON (snake_case) ◄── predicción + reglas de compra
```

1. **Angular** (`core/predicciones-ia.ts`) pide `GET /api/intelligence` al abrir la aplicación, al entrar a Señales del negocio o Reportes, con el botón **Actualizar** y después de registrar una venta o compra. Angular nunca llama a Python: la sesión, el CORS y los errores se manejan en la API.
2. **La API .NET** consulta en paralelo el servicio de IA por HTTP y une las respuestas. Si el servicio no responde o no puede leer SQL Server, igual responde `200` con `disponible: false` y un mensaje con qué hacer; la aplicación sigue funcionando.
3. **El servicio de IA** lee de SQL Server, arma las ventas por semana de cada producto, predice la demanda y aplica las reglas de compra.

**Qué información recibe:** las ventas vigentes por producto y día, las compras (fecha de factura y de recepción) y las existencias y el stock mínimo de cada producto, todo leído de la base. La ruta `POST /recomendar-compra` también acepta los datos de un producto en el cuerpo de la petición.

**Qué responde** (un producto, resumido):

```json
{
  "codigo": "LAC-001",
  "producto": "Leche entera 1 L",
  "metodo": "promedio de 4 semanas (la red no superó la línea base al entrenar)",
  "ultimas_semanas": [74, 73, 61, 79],
  "demanda_semanal_prevista": 71.8,
  "existencias": 7,
  "dias_entrega": 1,
  "urgencia": "alta",
  "comprar_ahora": true,
  "cantidad_sugerida": 85,
  "explicacion": "Se esperan unas 72 unidades por semana (~10.2 al día). Hay 7 disponibles y el proveedor tarda 1 día. Ya se alcanzó el punto de pedido: compra hoy unas 85 unidades para cubrir 1 semana más el mínimo de 10."
}
```

**Cómo usa la aplicación el resultado:**
- **Señales del negocio** agrega la señal *"Predicción de compra"* (también aparece en **Mi jornada**) y muestra el tablero **Qué comprar y cuándo**: un renglón por producto con sello de urgencia (*Agotado*, *Comprar hoy*, *Esta semana*, *Más adelante*), la acción concreta, las ventas de las últimas 4 semanas frente a la prevista y la explicación.
- **Reportes** resume cuántos productos hay que pedir hoy, y el CSV exportado incluye la tabla completa de predicciones.

Las evidencias de funcionamiento (peticiones y respuestas reales, registro de la API y comparación antes/después) están en [docs/integracion-ia.md](docs/integracion-ia.md).

### Configuración

| Dónde | Clave | Valor por defecto |
|---|---|---|
| `backend/Costalito.Api/appsettings.json` | `ServicioInteligente:Url` | `http://127.0.0.1:8000` |
| `backend/Costalito.Api/appsettings.json` | `ServicioInteligente:TiempoEsperaSegundos` | `30` (la primera consulta carga TensorFlow) |
| Variable de entorno del servicio de IA | `COSTALITO_SQL` | LocalDB `CostalitoSmart` con el driver ODBC más nuevo instalado |

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
- Python 3.13 para el servicio de IA (TensorFlow 2.21 todavía no tiene versión para 3.14).
- ODBC Driver 18 (o 17) for SQL Server, para que el servicio de IA lea la base.
- Git, para clonar el repositorio.

Puedes comprobar las herramientas desde PowerShell:

```powershell
dotnet --list-sdks
node --version
npm --version
sqllocaldb info MSSQLLocalDB
py -3.13 --version
Get-OdbcDriver | Where-Object Name -like '*SQL Server*'
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

5. En **una tercera terminal**, iniciar el servicio de IA (la primera vez crea el entorno e instala las dependencias):

   ```powershell
   cd servicio-inteligente
   py -3.13 -m venv .venv
   .venv\Scripts\python.exe -m pip install -r requirements.txt
   .venv\Scripts\python.exe -m uvicorn api:app --host 127.0.0.1 --port 8000
   ```

   La documentación interactiva queda en `http://127.0.0.1:8000/docs`. Las siguientes veces basta con la última línea. Para reentrenar la red con las ventas de la base: `.venv\Scripts\python.exe entrenar_modelo.py`. Sin este servicio la aplicación funciona igual, y Señales del negocio indica que la IA no está disponible.

6. Abrir la dirección que muestre Angular. Si el puerto 4200 está ocupado y aceptas otro, la dirección será distinta; no cambia el puerto de la API.

   `npm install` solo es necesario la primera vez o cuando cambien las dependencias. Angular mostrará en la terminal la URL local, normalmente `http://localhost:4200`.

   Para ver la IA en funcionamiento: entra con tu usuario y abre **Señales del negocio**; la sección **Qué comprar y cuándo** muestra las predicciones.

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

## Pruebas

Pruebas automáticas:

```powershell
cd frontend; npm test -- --watch=false        # Angular: validaciones, inicio de sesión y reportes
cd servicio-inteligente; .venv\Scripts\python.exe -m unittest discover pruebas -v   # IA: semanas, quincena y reglas de compra
```

Los escenarios de integración y su estado están documentados en [`docs/pruebas-integracion.md`](docs/pruebas-integracion.md), y la verificación de la comunicación con el servicio de IA en [`docs/integracion-ia.md`](docs/integracion-ia.md). Para ejecutar las pruebas de persistencia, SQL Server debe estar iniciado y accesible.

## Seguridad y datos

No guardar credenciales reales en el repositorio. `appsettings.Development.json`, secretos, `bin/` y `obj/` están excluidos por `.gitignore`. Los datos del script SQL son únicamente para demostración. El script no crea usuarios: el administrador se crea desde la pantalla de entrada en el primer arranque.

## Equipo

- John Alejandro Celis
- Sebastián Cabanzo
- Jhunior Estiven Delgado

Universidad Manuela Beltrán — Ingeniería de Sistemas
