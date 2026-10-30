# UX Contract

## Product context

- **Audience:** Administradores de un granero familiar.
- **Primary jobs:** Consultar operación diaria, registrar información y priorizar existencias, ventas y fiados.
- **Active locale:** Español de Colombia (`es-CO`).
- **Accessibility target:** WCAG 2.2 AA como objetivo para la integración posterior.

## Visual contract

- **Project design context:** `DESIGN.md`.
- **Runtime token source:** `frontend/src/styles.css`.
- **Navigation owner:** `frontend/src/app/shared/sidebar/`.
- **Route owner:** `frontend/src/app/app.routes.ts`.

## Canonical UI Map

| Capability | Canonical owner | Decisión para integración |
|---|---|---|
| Navegación | `shared/sidebar` | Una sola barra compartida en todas las rutas |
| Tablas | `.data-table` y `.table-wrapper` | Tabla semántica con scroll horizontal móvil |
| Select | Control nativo | Válido mientras el backend no exija búsqueda avanzada |
| Formularios | Páginas por módulo | Angular Reactive Forms y mensajes en línea al integrar API |
| CRUD | Rutas de módulo | Resultado del servidor antes de actualizar la vista |
| Notificaciones | Pendiente de componente compartido | Crear servicio de avisos al llegar el backend |

## Integration behavior

- Los registros monetarios, inventario y fiados esperan respuesta exitosa del backend antes de mostrar éxito.
- Los errores del servidor se muestran junto al formulario o tabla que inició la acción; no se descartan los datos ya escritos.
- Las búsquedas remotas cancelan o ignoran respuestas antiguas y ofrecen una acción para limpiar el filtro.
- Crear o editar un registro vuelve al listado dueño y muestra el resultado de la operación.
- El frontend no asume permisos, límites de crédito ni reglas de negocio: el backend los valida y devuelve mensajes seguros para mostrar.

## Backend handoff

1. Reemplazar los datos de prueba por servicios Angular por módulo: inventario, ventas, clientes, proveedores y créditos.
2. Definir contratos de respuesta para carga, lista vacía, error de conexión y validación de servidor.
3. Conectar botones de registro a formularios reactivos; no exponer credenciales ni cadenas de conexión en el frontend.
4. Mantener rutas y clases de presentación para no romper navegación ni identidad visual durante la integración.
