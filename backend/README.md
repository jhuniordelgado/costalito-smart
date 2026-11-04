# Backend de Costalito Smart

API REST en Python 3 y SQLite, sin paquetes externos. La base de datos se crea como `backend/costalito.sqlite3` al primer inicio y conserva los cambios entre ejecuciones.

## Iniciar

Desde la raíz del repositorio:

```powershell
python backend/app.py
```

La API queda en `http://localhost:8000`. Variables opcionales: `PORT` y `COSTALITO_DB` (ruta alternativa para el archivo SQLite).

## Rutas

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/health` | Estado del servicio |
| GET | `/api/bootstrap` | Datos iniciales de todos los módulos |
| GET | `/api/products`, `/api/customers`, `/api/suppliers` | Catálogos |
| GET | `/api/sales`, `/api/purchases`, `/api/payments` | Movimientos |
| GET / PUT | `/api/settings` | Consultar y guardar datos del granero |
| POST | `/api/products`, `/api/customers`, `/api/suppliers` | Crear registros |
| POST | `/api/sales` | Registrar venta y descontar inventario |
| POST | `/api/purchases` | Registrar compra; recibe inventario salvo “En camino” |
| PATCH | `/api/purchases/{id}` | Actualizar estado de compra |
| POST | `/api/payments` | Registrar abono a un cliente |

Las operaciones financieras se ejecutan en transacciones SQLite. Los errores se devuelven como JSON `{ "error": "..." }` con el código HTTP correspondiente. La API habilita CORS para `http://localhost:4200`.

## Límites actuales

Esta entrega cubre persistencia y reglas de negocio del prototipo. No incorpora autenticación, autorización por roles, despliegue ni copias de seguridad; antes de exponerla fuera del equipo local se deben agregar esas capacidades y configurar CORS para el dominio real.
