# Servicio inteligente — Costalito Smart

Red neuronal pequeña (TensorFlow) expuesta como API (FastAPI) que **predice cuánto se venderá cada producto la próxima semana** y, con eso, **sugiere cuándo y cuánto comprar**. Los datos salen **directamente de la base `CostalitoSmart` de SQL Server**, la misma que usa la aplicación.

Parte de la *Guía paso a paso: servicio inteligente con TensorFlow* (UMB, Ing. Fernando Benavides). El ejemplo original de la guía está intacto en `tutorial_original/`.

---

## 1. Diseño funcional

```text
SQL Server (CostalitoSmart)
  Ventas + DetallesVenta ─┐
  Compras + DetallesCompra├─> fuente_sql.py ──> entrenar_modelo.py ──> modelo_demanda.keras + modelo_metadata.json
  Productos ──────────────┘          │                                         │
                                     ▼                                         ▼
Cliente (Swagger / Costalito) ──JSON──> api.py ──> red neuronal (o promedio de 4 semanas)
                                                        │
                                                        ▼
                                           reglas de compra (demanda.py)
                                                        │
                                                        ▼
                                  { cuándo comprar, cuánto comprar, por qué }
```

El trabajo se reparte en dos partes:

| Parte | Quién la hace | Qué responde |
|---|---|---|
| **Predicción** | La red neuronal, o el promedio de las últimas 4 semanas mientras no haya modelo | ¿Cuántas unidades se venderán la próxima semana? |
| **Decisión** | Reglas claras en `demanda.py` | ¿Cuándo pedir? ¿Cuántas unidades? |

La red solo predice. Las reglas que deciden la compra se pueden explicar ("se venden 56 por semana, quedan 40 y el proveedor tarda 2 días"), probar y ajustar sin volver a entrenar.

### 1.1 La red neuronal

Es **la misma red de la guía** (`Dense 8 → Dense 4 → Dense 1`). Cambian la entrada y la salida:

| | Guía (`tutorial_original/`) | Costalito Smart |
|---|---|---|
| Problema | Clasificar: prioridad alta o normal | Regresión: unidades de la próxima semana |
| Entrada | 2 números (urgencia, usuarios afectados) | 9 números (ver abajo) |
| Última capa | `sigmoid` (probabilidad 0–1) | Lineal (una cantidad), con el sesgo inicial en 1.0 |
| Pérdida | `binary_crossentropy` | `huber` (aguanta mejor las semanas raras) |
| Datos | 20 filas escritas a mano | Ventas semanales registradas en SQL Server |
| Normalización | Dividir entre 10 y entre 100 | Dividir entre el promedio de cada producto |

**Las 9 entradas:**
1. Las ventas de las **últimas 4 semanas**, divididas entre su promedio. Así un solo modelo sirve para el arroz (60 por semana) y para el jabón (6 por semana).
2. Si cada una de esas 4 semanas tuvo **quincena** (el día 15 o el fin de mes), con 1 o 0.
3. Si la **semana que se predice** tiene quincena (1 o 0).

**Salida:** las ventas de la próxima semana, divididas entre el mismo promedio. La API las vuelve a multiplicar para obtener unidades.

### 1.2 Semanas que cuentan

Las ventas se agrupan por semana de lunes a domingo, y solo se usan **semanas completas**:

- La semana en curso no cuenta, porque sus ventas todavía no terminan.
- La primera semana del registro no cuenta si no empieza en lunes. El historial empieza el jueves 10 de septiembre de 2026, así que la primera semana completa es la del **lunes 14 de septiembre**.
- Las semanas posteriores a la última venta registrada no cuentan como "se vendió 0": faltan datos.

Cada producto necesita **8 semanas completas** para entrenar: 4 de entrada y al menos 4 para aprender y evaluar. Con 4 semanas ya se puede **predecir** con el promedio.

### 1.3 Reglas de compra

Variables:
- `d` = demanda semanal prevista (demanda diaria = `d / 7`)
- `L` = días que tarda el proveedor. Se aprende de las compras de la base (mediana de `FechaRecepcion − FechaFactura`) y, si no hay datos, se usan 7.
- `S` = stock mínimo del producto (columna `StockMinimo`)

```text
disponible   = existencias + unidades en camino (compras "En camino")
punto_pedido = (d / 7) × L + S

¿CUÁNDO?  días para pedir = (disponible − punto_pedido) / (d / 7)
          ≤ 0  → "ahora"
          > 0  → fecha = hoy + días   (urgencia media si es en ≤ 7 días, baja si es después)

¿CUÁNTO?  (d / 7) × (L + 7 × semanas_cobertura) + S − lo que habrá al momento de pedir
          redondeado hacia arriba
```

Cada respuesta incluye un campo `explicacion` con el porqué en palabras.

### 1.4 Validación del modelo (paso 9 de la guía)

- **Datos separados por tiempo:** 70 % más antiguo para entrenar, 15 % para validar y el 15 % más reciente para la prueba.
- **Comparación con una línea base:** el promedio de las últimas 4 semanas. Si la red no lo supera en la prueba, la API usa el promedio y lo dice en el campo `metodo`.
- **`EarlyStopping`:** detiene el entrenamiento cuando el error de validación deja de bajar y conserva los mejores pesos.
- **Modelo versionado:** `modelo_metadata.json` guarda la fecha, las métricas y los días de entrega aprendidos.

---

## 2. Estructura

```text
servicio-inteligente/
├── demanda.py              Lógica sin TensorFlow: semanas, quincena, reglas de compra
├── fuente_sql.py           Consultas de lectura a SQL Server
├── entrenar_modelo.py      Entrena la red con los datos de la base
├── api.py                  API FastAPI
├── requirements.txt
├── modelo_demanda.keras    (se genera al entrenar)
├── modelo_metadata.json    (se genera al entrenar)
├── pruebas/test_demanda.py
└── tutorial_original/      El ejemplo de la guía sin cambios
```

---

## 3. Los datos

El servicio solo **lee** de estas tablas:

| Tabla | Para qué |
|---|---|
| `Ventas` + `DetallesVenta` | Unidades vendidas por producto y día (solo ventas `Vigente`) |
| `Compras` + `DetallesCompra` | Días de entrega de cada proveedor y unidades en camino |
| `Productos` | Existencias y stock mínimo de hoy |

**Historial de demostración.** `database/03_historial_ventas_compras.sql` carga ventas y compras del **10 de septiembre al 17 de noviembre de 2026**: 1.632 ventas por ticket (2.589 líneas) y 98 compras a los 5 proveedores. Son **9 semanas completas** (del 14 de septiembre al 15 de noviembre), una más de las 8 que pide el entrenamiento. Siguen el comportamiento de un granero de barrio:
- más clientes el fin de semana y en quincena;
- picos a las 7 a. m., al mediodía y a las 5 p. m.;
- se pide al proveedor cuando las existencias bajan y la mercancía llega según sus días de entrega.

La API de ASP.NET Core lo aplica al arrancar en Development. Para extender el historial a otra fecha:

```bat
python database\generar_historial.py --hasta 2026-12-15
```

Las ventas de demostración usan códigos `H-AAAAMMDD-NNN` y las compras `HC-AAAAMMDD-NNN`. El script no hace nada si ya existe alguna venta `H-`; para recargarlo con otro rango, borra antes esas ventas y compras.

### 3.1 Conexión

Por defecto se conecta a `(localdb)\MSSQLLocalDB`, base `CostalitoSmart`, con el driver *ODBC Driver for SQL Server* más nuevo instalado. Para otra base, define la variable `COSTALITO_SQL` con una cadena ODBC:

```bat
set COSTALITO_SQL=Driver={ODBC Driver 18 for SQL Server};Server=MI-SERVIDOR;Database=CostalitoSmart;Trusted_Connection=yes;TrustServerCertificate=yes;
```

---

## 4. Instructivo

Todos los comandos se ejecutan en **CMD**, dentro de `servicio-inteligente`.

### Paso 1: entorno virtual

```bat
python -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
```

> **TensorFlow 2.21 requiere Python 3.13 o anterior.** Con Python 3.14 `pip` no encuentra TensorFlow. Si el equipo tiene 3.14 como predeterminado, instala 3.13 con el Python Install Manager y crea el entorno con él:
>
> ```bat
> pymanager install 3.13
> python3.13 -m venv .venv
> ```
>
> Sin TensorFlow la API funciona igual con el promedio de 4 semanas, pero no se puede entrenar la red.

### Paso 2: revisar si ya hay datos suficientes

```bat
python entrenar_modelo.py --revisar
```

Con el historial de demostración, al 18 de noviembre de 2026:

```text
Ventas en la base desde el 10/09/2026: 9 semanas completas (desde el lunes 14/09/2026); se necesitan 8.
Hay datos suficientes: ejecuta 'python entrenar_modelo.py' para entrenar.
```

### Paso 3: entrenar (cuando haya 8 semanas)

```bat
python entrenar_modelo.py
```

Resultado con el historial de demostración (18/11/2026):

```text
Productos: 14 | ejemplos entrenamiento/validación/prueba: 42/14/14 | épocas: 55
Error medio en la prueba (MAE, unidades por semana):
  Red neuronal ............   7.12
  Promedio 4 semanas ......   6.04
La red NO mejora la línea base: la API usará el promedio de 4 semanas.
```

La red entrena, pero todavía no le gana al promedio: con 9 semanas hay solo 42 ejemplos para aprender, y las ventas de un granero varían bastante de una semana a otra. La API lo detecta y predice con el promedio. Cada semana nueva de ventas registradas agrega 14 ejemplos (uno por producto); vale la pena reentrenar una vez por semana.

Opciones:
- `--hoy AAAA-MM-DD`: entrena como si fuera esa fecha; solo usa semanas completas anteriores.
- `--epocas N`: cambia el máximo de épocas (por defecto 300; `EarlyStopping` suele parar antes).

Si la red **no** mejora la línea base, no es un error del programa: faltan datos. La API usará el promedio hasta que vuelvas a entrenar con más semanas.

### Paso 4: pruebas de la lógica

```bat
python -m unittest discover pruebas -v
```

### Paso 5: iniciar la API

```bat
uvicorn api:app --reload
```

Abre http://127.0.0.1:8000/docs y prueba cada ruta con **Try it out**. Después de reentrenar, ejecuta `POST /modelo/recargar` para usar el modelo nuevo sin detener la API.

---

## 5. Rutas de la API

| Método | Ruta | Para qué |
|---|---|---|
| GET | `/` | Indica si el servicio está activo y qué método predice |
| GET | `/estado-datos` | Semanas completas en la base y desde cuándo se puede entrenar |
| GET | `/modelo` | Métricas, fecha y días de entrega del modelo entrenado |
| POST | `/modelo/recargar` | Carga el modelo nuevo después de reentrenar |
| POST | `/predecir` | Ventas previstas para la próxima semana a partir de 4 semanas enviadas |
| POST | `/recomendar-compra` | Cuándo y cuánto comprar de **un** producto |
| GET | `/recomendaciones` | Sugerencias para **todos** los productos con los datos de la base, ordenadas por urgencia |

**Ejemplo: `POST /recomendar-compra`**
```json
{
  "codigo": "LAC-001",
  "ventas_semanales": [77, 84, 67, 71],
  "existencias": 8,
  "stock_minimo": 10
}
```
Respuesta (resumida), con los días de entrega aprendidos de las compras de la base:
```json
{
  "metodo": "promedio de 4 semanas (todavía no hay un modelo entrenado con los datos de la base)",
  "dias_entrega": 1,
  "comprar_ahora": true,
  "cantidad_sugerida": 88,
  "urgencia": "alta",
  "explicacion": "Se esperan unas 75 unidades por semana (~10.7 al día). Hay 8 disponibles y el proveedor tarda 1 día. Ya se alcanzó el punto de pedido: compra hoy unas 88 unidades para cubrir 1 semana más el mínimo de 10."
}
```

**Urgencias:** `agotado` > `alta` (comprar ahora) > `media` (comprar en 7 días o menos) > `baja` > `sin movimiento`.

---

## 6. Problemas frecuentes

| Problema | Solución |
|---|---|
| `No fue posible conectar con SQL Server` | Inicia LocalDB (`sqllocaldb start MSSQLLocalDB`) y arranca una vez la API de ASP.NET Core para crear la base, o revisa `COSTALITO_SQL` |
| `No hay un driver ODBC de SQL Server instalado` | Instala *ODBC Driver 18 for SQL Server* |
| `Todavía no hay datos suficientes` | Faltan semanas completas; el mensaje dice desde qué lunes se podrá entrenar |
| `No matching distribution found for tensorflow` | El entorno usa Python 3.14; crea el `.venv` con Python 3.13 (`pymanager install 3.13`) |
| `metodo` dice "promedio de 4 semanas" | No hay modelo entrenado o la red no superó la línea base |
| El puerto 8000 está ocupado | `uvicorn api:app --reload --port 8001` |

---

## 7. Limitaciones

- **Historial corto:** desde el 10 de septiembre hay 9 semanas completas. Alcanzan para entrenar, pero no para que la red le gane al promedio; mientras no lo supere, la API predice con el promedio de 4 semanas.
- **Poco patrón en los datos de demostración:** el efecto quincena del historial generado sube una semana en torno a un 7 %, menos que la variación normal entre semanas. Incluso con 24 semanas de prueba la red no superó al promedio. Con las ventas reales se verá si el granero tiene patrones más marcados.
- **Datos de demostración:** el historial de `03_historial_ventas_compras.sql` sigue un patrón realista, pero no son ventas reales del granero. Las ventas que se registren desde la aplicación se suman al entrenamiento.
- **Productos agotados:** una semana en que el producto estuvo agotado aparece con menos ventas aunque sí había clientes. Eso hace que se subestime la demanda.
- **Es apoyo, no decisión:** la sugerencia ayuda, pero la compra final la decide el encargado. El servicio no sabe de festivos ni de promociones del proveedor.

---

## 8. Integración con Costalito Smart

1. La API de ASP.NET Core expone `GET /api/intelligence` (`InteligenciaController` → `ServicioInteligente.cs`). Consulta en paralelo `/`, `/recomendaciones`, `/estado-datos` y `/modelo` de este servicio y responde a Angular en un solo formato. Angular **no** llama a Python directamente. La dirección se configura en `ServicioInteligente:Url` de `appsettings.json` (por defecto `http://127.0.0.1:8000`).
2. Si este servicio está apagado o no puede leer SQL Server, la API responde igual con `disponible: false` y un mensaje con qué hacer; la aplicación sigue funcionando.
3. En Angular, **Señales del negocio** muestra:
   - una señal "Predicción de compra" cuando hay productos para pedir hoy o esta semana (también sale en *Mi jornada*);
   - el tablero "Qué comprar y cuándo": un renglón por producto con sello de urgencia, la acción concreta, las ventas de las últimas 4 semanas frente a la prevista y la explicación.
4. Las predicciones se vuelven a pedir al entrar a la página, con el botón **Actualizar** y después de registrar una venta o una compra, porque cambian las existencias.
5. Antes de un despliegue real (paso 8 de la guía): proteger la API de Python con una clave compartida, servirla solo en `127.0.0.1` y usar un usuario de SQL Server con permiso solo de lectura.
