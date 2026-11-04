# Pruebas de integración — Fase 4

La guía solicita registrar, consultar, validar información inválida y comprobar el manejo de un error de conexión. Resultado actual de verificación en el entorno de desarrollo:

| # | Escenario | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|
| 1 | Registrar un cliente desde Angular y consultar la fila en SQL Server. | La API responde éxito y el registro queda persistido. | Pendiente: no hay una instancia SQL Server accesible en `localhost` en este entorno. | No ejecutada |
| 2 | Consultar `/api/bootstrap` y visualizar productos y clientes en la interfaz. | La API devuelve los registros de SQL Server y Angular los presenta. | Pendiente: requiere SQL Server y los scripts de `database/`. La compilación de Angular sí finalizó correctamente. | No ejecutada |
| 3 | Enviar una venta con cantidad cero o un producto inexistente. | La API rechaza la solicitud con error de validación y no cambia el inventario. | Pendiente: requiere ejecutar la API conectada a SQL Server. | No ejecutada |
| 4 | Abrir la interfaz con la API detenida y volver a intentar la carga. | La interfaz informa que no hay conexión y permite reintentar. | Pendiente de comprobación en navegador; el cliente HTTP maneja el error de conexión y ofrece reintento. | No ejecutada |

## Cómo completar la evidencia

1. Inicia SQL Server, crea la base con `database/01_crear_estructura.sql` y carga `database/02_datos_prueba.sql`.
2. Configura la cadena local y ejecuta la API y Angular según el README raíz.
3. Ejecuta cada escenario y reemplaza el resultado y estado de la tabla por lo observado. Adjunta capturas de la interfaz, Swagger y las filas consultadas en SQL Server para la entrega.
