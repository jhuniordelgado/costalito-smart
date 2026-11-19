# Pruebas de integración — versión final

Pruebas ejecutadas el **18/11/2026** por HTTP contra la API real (ASP.NET Core), SQL Server LocalDB y el servicio de IA (FastAPI), con las mismas rutas y cuerpos JSON que envía Angular. Los resultados de esta tabla son lo que se observó, no lo esperado.

**Entorno.** Para no tocar la base de trabajo se usó una base desechable, `CostalitoSmart_Pruebas`. Se creó con los mismos scripts `01`, `02` y `03` del repositorio (14 productos, 5 clientes, 5 proveedores y 1.632 ventas del historial). Corrían una copia de la API en el puerto 5300 y una del servicio de IA en el puerto 8001, apuntadas a esa base. Se creó un administrador de prueba desde `POST /api/setup/admin` y todas las peticiones se hicieron con su cookie de sesión. Al terminar, la base se eliminó.

## Resultados

| # | Escenario | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|
| 1 | Registrar un cliente (`POST /api/customers`) y consultar la fila en SQL Server. Luego repetir la cédula. | `201`, la fila queda guardada; la cédula repetida se rechaza. | `201` con `{"id":7,"nombre":"Doña Prueba Integración","cedula":"66554433","limite":80000,"saldo":0}`. En SQL: `7 · Doña Prueba Integración · 66554433 · 3005550101 · 80000.00` (la `ñ` se guardó como Unicode 241). Repetir la cédula: `409 "Ya existe un cliente con esa cédula."` y sigue habiendo 1 sola fila. | Aprobada |
| 2 | Consultar `GET /api/bootstrap` desde el origen de Angular. | `200` con los datos de SQL Server y CORS habilitado para `http://localhost:4200` con credenciales. | `200`, `Access-Control-Allow-Origin: http://localhost:4200` y `Access-Control-Allow-Credentials: true`. Granero Costalito, 14 productos, 7 clientes, 5 proveedores, 100 compras y 1.632 ventas (`historialDesde` 2026-08-21: las ventas de los últimos 90 días). `GET /api/sales?desde=2026-09-10&hasta=2026-09-12` devolvió 86 ventas de ese periodo. | Aprobada |
| 3 | Enviar ventas inválidas y comprobar que el inventario no cambia. | Cada una se rechaza y las existencias siguen iguales. | Arroz con 86 unidades y 1.632 ventas antes. a) cantidad 0: `400 "La cantidad debe ser mayor que cero."`. b) producto inexistente: `404 "No encontramos uno de los productos."`. c) 100.000 unidades: `400 "No hay suficientes existencias de Arroz Diana 500 g."`. d) pago "Bitcoin": `400 "El medio de pago no es válido."`. e) fiado sin cliente: `400 "Elige a qué cliente se le fía."`. Después: **86 unidades y 1.632 ventas**. Una venta válida de 2 unidades respondió `201` y dejó 84. | Aprobada |
| 4 | Abrir la interfaz con la API detenida y volver a intentar. | La interfaz informa que no hay conexión y permite reintentar. | No se ejecutó en esta sesión porque requiere detener la API de trabajo. En el código: sin servidor, la pantalla de entrada muestra *"No hay conexión con el servidor. Revisa que el backend esté iniciado e inténtalo de nuevo."* al intentar entrar (`core/formato.ts`). Con sesión iniciada, el marco principal muestra el aviso con el botón **Reintentar** (`shared/principal/principal.html`). | Pendiente de captura |
| 5 | Usar la API sin sesión y después de cerrar sesión. | `401` en las rutas del negocio. | Sin sesión, `GET /api/customers`: `401 "Inicia sesión para continuar."`. `POST /api/auth/login`: `200` con cookie `costalito.sesion`. `POST /api/auth/logout`: `204`, y luego `GET /api/intelligence`: `401`. | Aprobada |
| 6 | Registrar un producto con un código existente (`aba-001` en minúsculas). | `409` con un mensaje claro. | `409 "Ya existe un producto con ese código."` (el código se normaliza a mayúsculas antes de comparar). | Aprobada |
| 7 | **Concurrencia:** 8 ventas simultáneas de 1 unidad de un producto con 3 existencias. | Se venden exactamente 3, el resto se rechaza y el inventario no queda negativo ni descuadrado. | 3 respuestas `201` y 5 respuestas `400 "No hay suficientes existencias de Café de Huila 250 g."`. Existencias finales: **0**. Ventas registradas: **3**. Ningún error 500. | Aprobada |
| 8 | **IA:** la aplicación pide las predicciones (`GET /api/intelligence`). | La API consulta el servicio de IA y devuelve una recomendación por producto. | `200`, `disponible: true`, 14 productos (1 agotado, 3 alta, 5 media, 5 baja), 9 semanas completas, modelo `20261118-140836`, método "promedio de 4 semanas (la red no superó la línea base al entrenar)". El registro de la API muestra las peticiones `GET http://127.0.0.1:8001/...` con respuesta `200` en 2 a 233 ms. | Aprobada |
| 9 | **IA:** una venta cambia la predicción. | Las existencias que ve la IA bajan y la sugerencia se ajusta. | Leche antes: 8 existencias, sugerencia 84 unidades, 0,8 días para agotarse. Venta de 5 leches: `201`. Leche después: **3** existencias, sugerencia **89** unidades, **0,3** días. Además, el café agotado en el escenario 7 apareció con urgencia **"agotado"**. | Aprobada |
| 10 | **IA apagada:** detener el servicio de IA y pedir las predicciones. | La aplicación sigue funcionando y explica qué hacer. | `GET /api/intelligence`: `200` en 2,1 s con `disponible: false` y *"El servicio inteligente no responde en http://127.0.0.1:8001. Inícialo desde la carpeta servicio-inteligente con 'uvicorn api:app' y vuelve a consultar."*. `GET /api/bootstrap` siguió respondiendo `200`. | Aprobada |

**Resumen:** 9 escenarios aprobados y 1 pendiente de captura en navegador (el 4).

## Pruebas automáticas

| Suite | Comando | Resultado |
|---|---|---|
| Angular (validaciones, inicio de sesión y reportes) | `cd frontend; npm test -- --watch=false` | 39 de 39 aprobadas |
| Servicio de IA (semanas completas, quincena, reglas de compra, lectura de filas) | `cd servicio-inteligente; .venv\Scripts\python.exe -m unittest discover pruebas -v` | 17 de 17 aprobadas |
| API .NET | `dotnet build backend/Costalito.Api/Costalito.Api.csproj` | Compila sin errores ni advertencias |

Durante el desarrollo también se ejecutaron pruebas de carrera directamente contra el servicio de ventas (fiados y abonos simultáneos, una compra recibida 5 veces a la vez) y la traducción de errores de SQL Server (`409` por duplicados, `400` por reglas CHECK y textos largos). Todas pasaron.

## Observaciones

- **Mensajes en inglés (corregido):** en la primera ejecución, las validaciones automáticas respondían en inglés (*"The field Cantidad must be between 0,001 and 999999999."*, *"The datos field is required."*). Se agregó `Middleware/MensajesValidacion.cs`, que pone en español los mensajes de todos los DTO. Al repetir 13 casos por HTTP, todos respondieron en español: *"La cantidad debe ser mayor que cero."*, *"Agrega al menos un producto a la venta."*, *"Falta el medio de pago."*, *"El límite de fiado no puede ser un valor negativo."*, *"El nombre admite máximo 120 caracteres."*, *"Los datos enviados no tienen un formato válido."*, entre otros.
- **Codificación en consola:** al probar con `curl` desde la consola de Windows hay que enviar el cuerpo desde un archivo UTF-8 (`--data-binary @archivo.json`). Si no, las tildes llegan mal y la API responde `400`. Angular siempre envía UTF-8.

## Cómo completar el escenario 4 y las capturas

1. Con la aplicación abierta y la sesión iniciada, detén la API (`Ctrl+C` en su terminal).
2. Recarga la página: debe aparecer la pantalla de entrada. Intenta entrar y toma la captura del mensaje *"No hay conexión con el servidor…"*.
3. Vuelve a iniciar la API, entra y toma la captura de **Mi jornada** funcionando. Cambia el estado del escenario 4 a "Aprobada".
4. Para la entrega, adjunta además las capturas que lista [integracion-ia.md](integracion-ia.md#8-lista-de-evidencias-para-canvas).

## Cómo repetir estas pruebas

1. Inicia LocalDB, la API y el servicio de IA como indica el [README](../README.md#preparación-y-ejecución).
2. Abre `http://localhost:5257/swagger`, ejecuta `POST /api/auth/login` con tu usuario y prueba las rutas de cada escenario. Swagger conserva la cookie de sesión.
3. Consulta las filas en SQL Server (por ejemplo, `SELECT * FROM Clientes WHERE Cedula = '...'`) para comprobar que se guardaron.
4. Para el escenario 10, detén el servicio de IA (`Ctrl+C` en su terminal) y vuelve a ejecutar `GET /api/intelligence`.
