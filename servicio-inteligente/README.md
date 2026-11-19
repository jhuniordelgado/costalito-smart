# Servicio inteligente — Costalito Smart

Red neuronal pequeña (TensorFlow) expuesta como API (FastAPI) que **predice cuánto se venderá cada producto la próxima semana** y, con eso, **sugiere cuándo y cuánto comprar**.

Parte de la *Guía paso a paso: servicio inteligente con TensorFlow* (UMB, Ing. Fernando Benavides). El ejemplo original de la guía está intacto en `tutorial_original/`.

---

## 1. Diseño funcional

```text
datos/ventas.csv ─┐
datos/compras.csv ├─> entrenar_modelo.py ──> modelo_demanda.keras + modelo_metadata.json
                  │                                     │
                  │                                     ▼
Cliente (Swagger / Costalito) ──JSON──> api.py ──> red neuronal ──> demanda de la próxima semana
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
| **Predicción** | La red neuronal | ¿Cuántas unidades se venderán la próxima semana? |
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
| Datos | 20 filas escritas a mano, con su etiqueta sacada de un `if` | Ventas semanales reales o simuladas |
| Normalización | Dividir entre 10 y entre 100 | Dividir entre el promedio de cada producto |

**Las 9 entradas:**
1. Las ventas de las **últimas 4 semanas**, divididas entre su promedio. Así un solo modelo sirve para el arroz (60 por semana) y para el jabón (6 por semana).
2. Si cada una de esas 4 semanas tuvo **quincena** (el día 15 o el fin de mes), con 1 o 0.
3. Si la **semana que se predice** tiene quincena (1 o 0).

La quincena es el dato que el promedio simple no tiene: la gente cobra y hace el mercado grande. Es lo que permite que la red le gane al promedio.

**Salida:** las ventas de la próxima semana, divididas entre el mismo promedio. La API las vuelve a multiplicar para obtener unidades.

El sesgo inicial de la última capa arranca en 1.0, que equivale a "se venderá lo mismo que el promedio". La red empieza en la línea base y aprende a **corregirla**.

### 1.2 Reglas de compra

Variables:
- `d` = demanda semanal que predice la red (demanda diaria = `d / 7`)
- `L` = días que tarda el proveedor. Se aprende de `compras.csv` (mediana de `fecha_recepcion − fecha_factura`) y, si no hay datos, se usan 7.
- `S` = stock mínimo del producto (el colchón de seguridad del granero)

```text
disponible   = existencias + unidades en camino
punto_pedido = (d / 7) × L + S

¿CUÁNDO?  días para pedir = (disponible − punto_pedido) / (d / 7)
          ≤ 0  → "ahora"
          > 0  → fecha = hoy + días   (urgencia media si es en ≤ 7 días, baja si es después)

¿CUÁNTO?  (d / 7) × (L + 7 × semanas_cobertura) + S − lo que habrá al momento de pedir
          redondeado hacia arriba
```

Cada respuesta incluye un campo `explicacion` con el porqué en palabras.

### 1.3 Mejoras respecto a la guía (paso 9, "Validar y mejorar el modelo")

- **Datos separados por tiempo:** 70 % más antiguo para entrenar, 15 % para validar y el 15 % más reciente para la prueba. No se mezclan al azar, porque en la vida real se predice el futuro con el pasado.
- **Comparación con una línea base:** el promedio de las últimas 4 semanas. Si la red no lo supera en la prueba, la API usa el promedio y lo dice en el campo `metodo`.
- **`EarlyStopping`:** detiene el entrenamiento cuando el error de validación deja de bajar y conserva los mejores pesos.
- **Modelo versionado:** `modelo_metadata.json` guarda la fecha, las métricas y los días de entrega aprendidos.
- **API más robusta:**
  - carga el modelo con ruta absoluta;
  - responde 503 con un mensaje claro si falta el modelo;
  - rechaza datos inválidos con 422;
  - nunca devuelve ventas negativas.
- **Pruebas automáticas** de la lógica en `pruebas/`.
- **Versiones fijas** en `requirements.txt`.

---

## 2. Estructura

```text
servicio_Inteligente/
├── demanda.py              Lógica compartida: leer CSV, semanas, quincena, reglas de compra
├── entrenar_modelo.py      Entrena la red y guarda el modelo (reemplaza al de la guía)
├── api.py                  API FastAPI (reemplaza al de la guía)
├── generar_datos_demo.py   Crea datos SIMULADOS para practicar
├── requirements.txt
├── datos/
│   ├── ventas.csv          Ventas (una fila por producto vendido)
│   ├── compras.csv         Compras a proveedores
│   └── productos.csv       Inventario actual
├── modelo_demanda.keras    (se genera al entrenar)
├── modelo_metadata.json    (se genera al entrenar)
├── pruebas/test_demanda.py
└── tutorial_original/      El ejemplo de la guía sin cambios
```

---

## 3. Formato de los datos

Los archivos van en `datos/`, en formato CSV UTF-8 con encabezado. Las fechas se escriben `AAAA-MM-DD`; también se acepta `AAAA-MM-DD HH:MM:SS`.

**`ventas.csv`** (obligatorio): una fila por cada producto de cada venta.
```csv
fecha,codigo,producto,cantidad
2026-11-03,ABA-001,Arroz Diana 500 g,2
2026-11-03,LAC-001,Leche entera 1 L,1
```

**`compras.csv`** (opcional): sirve para aprender cuántos días tarda cada proveedor y qué mercancía está en camino. Si `fecha_recepcion` está vacía, esa mercancía todavía no ha llegado.
```csv
fecha_factura,fecha_recepcion,codigo,cantidad
2026-11-02,2026-11-04,ABA-001,120
2026-11-16,,LAC-001,140
```

**`productos.csv`** (para `GET /recomendaciones`): el inventario de hoy.
```csv
codigo,nombre,existencias,stock_minimo
ABA-001,Arroz Diana 500 g,86,30
```

### 3.1 Exportar los datos reales desde Costalito Smart

Ejecuta estas consultas en SQL Server Management Studio (o en Visual Studio) sobre la base `CostalitoSmart`. Para cada una, usa **Resultados → Guardar resultados como… → CSV** y escribe el encabezado tal como aparece en la sección anterior.

```sql
-- ventas.csv (solo ventas vigentes)
SELECT CONVERT(date, v.FechaHora) AS fecha, p.Codigo AS codigo, p.Nombre AS producto, d.Cantidad AS cantidad
FROM dbo.DetallesVenta d
JOIN dbo.Ventas v    ON v.VentaId = d.VentaId
JOIN dbo.Productos p ON p.ProductoId = d.ProductoId
WHERE v.Estado = N'Vigente'
ORDER BY fecha;

-- compras.csv
SELECT c.FechaFactura AS fecha_factura, c.FechaRecepcion AS fecha_recepcion, p.Codigo AS codigo, d.Cantidad AS cantidad
FROM dbo.DetallesCompra d
JOIN dbo.Compras c   ON c.CompraId = d.CompraId
JOIN dbo.Productos p ON p.ProductoId = d.ProductoId
ORDER BY fecha_factura;

-- productos.csv
SELECT Codigo AS codigo, Nombre AS nombre, Existencias AS existencias, StockMinimo AS stock_minimo
FROM dbo.Productos WHERE Activo = 1;
```

**¿Cuántos datos hacen falta?**
- Cada producto necesita **al menos 8 semanas completas** de ventas para entrar al entrenamiento; los que tengan menos se omiten y se avisa.
- Para que la red **le gane al promedio** hace falta más historial. Con los datos simulados se vio así:

| Historial | Red neuronal (MAE) | Promedio 4 semanas (MAE) | Qué usa la API |
|---|---|---|---|
| 26 semanas | 5,84 | 5,67 | Promedio |
| 52 semanas | **5,15** | 5,77 | Red (10,7 % mejor) |
| 78 semanas | **6,92** | 7,74 | Red (10,6 % mejor) |

MAE es el error medio, en unidades por semana, sobre semanas que la red nunca vio durante el entrenamiento.

---

## 4. Instructivo: entrenar la red

Todos los comandos se ejecutan en **CMD**, dentro de la carpeta del servicio.

### Paso 1 — Abrir la carpeta y activar el entorno virtual
```bat
cd "C:\Users\ALEJO CELIS\Documents\Tareas Univsidad\servicio_Inteligente"
.venv\Scripts\activate
```
Al inicio de la línea debe aparecer `(.venv)`.

### Paso 2 — Instalar las dependencias (solo la primera vez)
```bat
python -m pip install -r requirements.txt
```

### Paso 3 — Preparar los datos
- **Para practicar, mientras no tienes los datos reales:**
  ```bat
  python generar_datos_demo.py
  ```
  Crea un año de ventas simuladas de los 14 productos de Costalito. **Reemplaza** lo que haya en `datos/`.
- **Con datos reales:** copia tus `ventas.csv`, `compras.csv` y `productos.csv` (sección 3.1) en `datos/`. En ese caso **no** vuelvas a ejecutar `generar_datos_demo.py`, porque los borraría.

### Paso 4 — Entrenar
```bat
python entrenar_modelo.py
```
Tarda unos segundos. La salida se ve así:
```text
Modelo entrenado y guardado en modelo_demanda.keras
  Productos: 14 | ejemplos entrenamiento/validación/prueba: 476/98/98 | épocas: 69
  Error medio en la prueba (MAE, unidades por semana):
    Red neuronal ............   5.15
    Promedio 4 semanas ......   5.77
  La red mejora la línea base en 10.7 %: la API usará la red neuronal.
```
**Cómo leerla:**
- Un **MAE de 5,15** significa que, en promedio, la predicción se equivoca en unas 5 unidades por semana.
- Si la red **no** mejora la línea base, no es un error del programa: faltan datos. La API usará el promedio hasta que vuelvas a entrenar con más semanas.

Opciones útiles:
```bat
python entrenar_modelo.py --datos otra_carpeta
python entrenar_modelo.py --hoy 2026-06-30
python entrenar_modelo.py --epocas 500
```
- `--datos`: entrena con los CSV de otra carpeta.
- `--hoy`: entrena como si fuera esa fecha; solo usa las semanas completas anteriores.
- `--epocas`: cambia el máximo de épocas (por defecto 300; `EarlyStopping` suele parar antes).

### Paso 5 — Probar que la lógica funciona
```bat
python -m unittest discover pruebas -v
```
Deben pasar las 10 pruebas.

### Paso 6 — Iniciar la API
```bat
uvicorn api:app --reload
```
Abre http://127.0.0.1:8000/docs. Igual que en la guía, ahí se prueba cada ruta con **Try it out**.

### Paso 7 — Volver a entrenar cuando haya más ventas
Lo ideal es una vez por semana:
1. Exporta de nuevo los CSV (sección 3.1).
2. Ejecuta `python entrenar_modelo.py`.
3. Recarga el modelo sin detener la API: en `/docs`, ejecuta `POST /modelo/recargar`.

---

## 5. Rutas de la API

| Método | Ruta | Para qué |
|---|---|---|
| GET | `/` | Indica si el servicio está activo y si hay un modelo cargado |
| GET | `/modelo` | Muestra las métricas, la fecha y los días de entrega del modelo entrenado |
| POST | `/modelo/recargar` | Carga el modelo nuevo después de reentrenar |
| POST | `/predecir` | Devuelve las ventas previstas para la próxima semana |
| POST | `/recomendar-compra` | Dice cuándo y cuánto comprar de **un** producto |
| GET | `/recomendaciones` | Da sugerencias para **todos** los productos de `datos/`, ordenadas por urgencia |

**Ejemplo — `POST /recomendar-compra`**
```json
{
  "codigo": "ABA-001",
  "producto": "Arroz Diana 500 g",
  "ventas_semanales": [52, 58, 55, 61],
  "existencias": 40,
  "stock_minimo": 30
}
```
Respuesta (resumida):
```json
{
  "metodo": "red neuronal",
  "demanda_semanal_prevista": 55.5,
  "comprar_ahora": true,
  "cuando": "ahora",
  "cantidad_sugerida": 62,
  "urgencia": "alta",
  "explicacion": "Se esperan unas 56 unidades por semana (~7.9 al día). Hay 40 disponibles y el proveedor tarda 2 días. Ya se alcanzó el punto de pedido: compra hoy unas 62 unidades para cubrir 1 semana más el mínimo de 30."
}
```
Campos opcionales:
- `en_camino`: unidades pedidas que no han llegado.
- `dias_entrega`: si no se envía, se usa lo aprendido de las compras o 7.
- `semanas_cobertura`: de 1 a 8.
- `semana_a_predecir`: por defecto, la semana actual.

**Urgencias:** `agotado` > `alta` (comprar ahora) > `media` (comprar en 7 días o menos) > `baja` > `sin movimiento`.

---

## 6. Problemas frecuentes

| Problema | Solución |
|---|---|
| `No se encontró datos\ventas.csv` | Ejecuta `python generar_datos_demo.py` o copia tus ventas en `datos/` |
| `Faltan datos: cada producto necesita al menos 8 semanas` | Reúne más historial; los productos nuevos se omiten hasta tener 8 semanas |
| La API responde 503 "No hay modelo entrenado" | Ejecuta `python entrenar_modelo.py` y luego `POST /modelo/recargar` |
| `metodo` dice "promedio de 4 semanas" | La red no superó la línea base: entrena con más semanas de ventas |
| `No module named tensorflow` | Activa el entorno: `.venv\Scripts\activate` |
| El puerto 8000 está ocupado | `uvicorn api:app --reload --port 8001` |

---

## 7. Limitaciones

- **Datos simulados:** los que crea `generar_datos_demo.py` traen un efecto de quincena **inventado** para practicar. Con las ventas reales de Costalito se verá si ese efecto existe de verdad; si no existe, la red no le ganará al promedio y la API lo indicará.
- **Productos agotados:** una semana en que el producto estuvo agotado aparece con 0 ventas aunque sí había clientes. Eso hace que la red subestime la demanda de ese producto.
- **Productos nuevos:** hasta tener 4 semanas de ventas no se pueden predecir, y hasta 8 no entran al entrenamiento.
- **Es apoyo, no decisión:** la sugerencia ayuda, pero la compra final la decide el encargado. Por ejemplo, la red no sabe de festivos ni de promociones del proveedor.

---

## 8. Integración futura con Costalito Smart

1. La API de ASP.NET Core arma las ventas semanales de cada producto, llama a `POST /recomendar-compra` y entrega el resultado a Angular. Angular **no** llama a Python directamente.
2. En Angular, la sección "Señales del negocio" muestra una tabla de sugerencias de compra con la urgencia y la explicación de cada producto.
3. Antes de un despliegue real (paso 8 de la guía): proteger la API de Python con una clave compartida, servirla solo en `127.0.0.1` y registrar las solicitudes.
