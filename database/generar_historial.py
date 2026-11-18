"""
Genera database/03_historial_ventas_compras.sql: el historial de demostración de
Costalito Smart (ventas por ticket y compras a proveedores) desde el 10 de septiembre de 2026.

    python database/generar_historial.py
    python database/generar_historial.py --hasta 2026-12-15   # extender el historial

Es lo que usa el servicio inteligente para entrenar y predecir: lee estas tablas
directamente de SQL Server. Los datos son de demostración pero siguen el comportamiento
de un granero de barrio:
  * más clientes el fin de semana y en quincena (el 15 y el último día del mes);
  * tickets con 1 a 3 productos, con hora entre la apertura y el cierre;
  * cada producto se vende al ritmo que tiene en el granero (la leche más que el jabón);
  * cuando las existencias bajan, se pide al proveedor y la mercancía llega después de
    sus días de entrega; si se agota, ese día no se vende.

La semilla es fija: el mismo rango de fechas produce siempre el mismo archivo.
"""
from __future__ import annotations

import argparse
import math
import random
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from pathlib import Path

CARPETA = Path(__file__).parent
ARCHIVO = CARPETA / "03_historial_ventas_compras.sql"

# Proveedores de 02_datos_prueba.sql y los días que tardan en entregar
PROVEEDORES = {
    "Distribuciones La 14": 2,
    "Lácteos del Valle": 1,
    "Aseo Total": 4,
    "Granos del Sur": 3,
    "Bebidas El Paso": 2,
}

# codigo, unidades por semana, stock mínimo (02_datos_prueba.sql), proveedor, días de vencimiento
PRODUCTOS = [
    ("ABA-001", 60, 30, "Distribuciones La 14", 365),
    ("ABA-002", 18, 12, "Distribuciones La 14", 365),
    ("ABA-003", 25, 15, "Granos del Sur", 180),
    ("ABA-004", 12, 15, "Distribuciones La 14", 720),
    ("ABA-005", 20, 18, "Distribuciones La 14", 365),
    ("ABA-006", 14, 12, "Granos del Sur", 270),
    ("LAC-001", 70, 10, "Lácteos del Valle", 7),
    ("LAC-002", 10, 6, "Lácteos del Valle", 15),
    ("ALI-001", 22, 15, "Granos del Sur", 21),
    # El pan no tiene proveedor propio en los datos de prueba: lo surte el distribuidor
    ("ALI-002", 30, 6, "Distribuciones La 14", 6),
    ("BEB-001", 35, 12, "Bebidas El Paso", 180),
    ("BEB-002", 15, 10, "Bebidas El Paso", 120),
    ("ASE-001", 6, 8, "Aseo Total", 720),
    ("ASE-002", 16, 8, "Aseo Total", 720),
]

# lunes ... domingo: en el granero se vende más el viernes y el fin de semana
FACTOR_DIA = [0.85, 0.90, 0.92, 0.95, 1.12, 1.40, 1.16]
FACTOR_QUINCENA = 1.35
# Clientes por hora entre las 6:00 y las 19:59 (desayuno, almuerzo y salida del trabajo)
PESO_HORA = {6: 4, 7: 9, 8: 8, 9: 5, 10: 4, 11: 6, 12: 7, 13: 5, 14: 3, 15: 4, 16: 5, 17: 8, 18: 9, 19: 6}
MEDIOS_PAGO = [("Efectivo", 0.62), ("Nequi", 0.38)]
LINEAS_POR_TICKET = [(1, 0.50), (2, 0.33), (3, 0.17)]
CANTIDAD_POR_LINEA = [(1, 0.68), (2, 0.24), (3, 0.08)]


def es_quincena(dia: date) -> bool:
    """Días de pago y el siguiente: el 15, el 16, el último del mes y el 1."""
    ultimo = (dia + timedelta(days=1)).month != dia.month
    return dia.day in (1, 15, 16) or ultimo


def elegir(opciones: list[tuple], azar: random.Random):
    return azar.choices([valor for valor, _ in opciones], [peso for _, peso in opciones])[0]


def poisson(media: float, azar: random.Random) -> int:
    # Knuth: suficiente para medias pequeñas como las de un granero
    limite, k, p = math.exp(-media), 0, 1.0
    while True:
        p *= azar.random()
        if p <= limite:
            return k
        k += 1


@dataclass
class Compra:
    codigo: str
    proveedor: str
    factura: date
    recepcion: date | None
    lineas: list[tuple[str, int, date]] = field(default_factory=list)  # codigo, cantidad, vencimiento


def simular(desde: date, hasta: date, semilla: int) -> tuple[list, list[Compra]]:
    azar = random.Random(semilla)
    ritmo = {codigo: semana / 7 for codigo, semana, *_ in PRODUCTOS}  # unidades por día
    datos = {codigo: (minimo, proveedor, vence) for codigo, _, minimo, proveedor, vence in PRODUCTOS}
    # Cada línea vende en promedio 1,4 unidades: así salen los clientes que hacen falta por día
    unidades_dia = sum(ritmo.values())
    lineas_promedio = sum(v * p for v, p in LINEAS_POR_TICKET)
    cantidad_promedio = sum(v * p for v, p in CANTIDAD_POR_LINEA)
    tickets_base = unidades_dia / (lineas_promedio * cantidad_promedio)

    # Existencias al empezar: el mínimo más lo que se vende mientras llega un pedido y una semana
    existencias = {
        codigo: math.ceil(datos[codigo][0] + ritmo[codigo] * (PROVEEDORES[datos[codigo][1]] + 7))
        for codigo in ritmo
    }
    en_camino: dict[str, list[tuple[date, int]]] = {codigo: [] for codigo in ritmo}
    ventas, compras = [], []
    codigos = list(ritmo)
    pesos = [ritmo[c] for c in codigos]

    dia = desde
    while dia <= hasta:
        # 1. Llega la mercancía pedida
        for codigo in codigos:
            llegan = [cantidad for llegada, cantidad in en_camino[codigo] if llegada == dia]
            existencias[codigo] += sum(llegan)
            en_camino[codigo] = [(f, c) for f, c in en_camino[codigo] if f != dia]

        # 2. Ventas del día, ticket por ticket
        factor = FACTOR_DIA[dia.weekday()] * (FACTOR_QUINCENA if es_quincena(dia) else 1.0)
        horas = sorted(
            datetime(dia.year, dia.month, dia.day, azar.choices(list(PESO_HORA), list(PESO_HORA.values()))[0],
                     azar.randrange(60), azar.randrange(60))
            for _ in range(poisson(tickets_base * factor, azar))
        )
        numero = 0
        for hora in horas:
            elegidos: list[str] = []
            for _ in range(elegir(LINEAS_POR_TICKET, azar)):
                codigo = azar.choices(codigos, pesos)[0]
                if codigo not in elegidos:
                    elegidos.append(codigo)
            lineas = []
            for codigo in elegidos:
                cantidad = min(elegir(CANTIDAD_POR_LINEA, azar), existencias[codigo])
                if cantidad > 0:  # agotado: ese cliente se va sin el producto
                    existencias[codigo] -= cantidad
                    lineas.append((codigo, cantidad))
            if lineas:
                numero += 1
                ventas.append((f"H-{dia:%Y%m%d}-{numero:03d}", hora, elegir(MEDIOS_PAGO, azar), lineas))

        # 3. Al cerrar, se pide lo que va a faltar (un pedido por proveedor)
        pedidos: dict[str, list[tuple[str, int]]] = {}
        for codigo in codigos:
            minimo, proveedor, _ = datos[codigo]
            demora = PROVEEDORES[proveedor]
            disponible = existencias[codigo] + sum(c for _, c in en_camino[codigo])
            punto_pedido = minimo + ritmo[codigo] * (demora + 2)
            if disponible <= punto_pedido:
                objetivo = minimo + ritmo[codigo] * (demora + 10)
                pedir = math.ceil((objetivo - disponible) / 6) * 6  # se pide por paquetes de 6
                pedidos.setdefault(proveedor, []).append((codigo, pedir))
        for proveedor, lineas in sorted(pedidos.items()):
            # a veces el proveedor se demora un día más
            demora = PROVEEDORES[proveedor] + (1 if azar.random() < 0.2 else 0)
            llegada = dia + timedelta(days=demora)
            compra = Compra(f"HC-{dia:%Y%m%d}-{len(compras) + 1:03d}", proveedor, dia,
                            llegada if llegada <= hasta else None)
            for codigo, cantidad in lineas:
                en_camino[codigo].append((llegada, cantidad))
                compra.lineas.append((codigo, cantidad, llegada + timedelta(days=datos[codigo][2])))
            compras.append(compra)

        dia += timedelta(days=1)
    return ventas, compras


def texto_sql(valor: str) -> str:
    """N'...' solo con ASCII: las tildes van como NCHAR() y el archivo se lee igual en cualquier editor."""
    partes, actual = [], ""
    for letra in valor.replace("'", "''"):
        if ord(letra) < 128:
            actual += letra
        else:
            partes.append(f"N'{actual}'")
            partes.append(f"NCHAR({ord(letra)})")
            actual = ""
    partes.append(f"N'{actual}'")
    return " + ".join(parte for parte in partes if parte != "N''") or "N''"


def en_bloques(filas: list[str], tabla: str, columnas: str) -> list[str]:
    # SQL Server admite hasta 1000 filas por INSERT ... VALUES
    return [
        f"    INSERT INTO {tabla} ({columnas}) VALUES\n" + ",\n".join(filas[i:i + 1000]) + ";"
        for i in range(0, len(filas), 1000)
    ]


def generar_sql(desde: date, hasta: date, semilla: int) -> tuple[str, dict]:
    ventas, compras = simular(desde, hasta, semilla)
    filas_ventas = [f"        (N'{c}', '{h:%Y-%m-%dT%H:%M:%S}', N'{m}')" for c, h, m, _ in ventas]
    filas_detalle = [f"        (N'{c}', N'{p}', {q})" for c, _, _, lineas in ventas for p, q in lineas]
    filas_compras = [
        f"        (N'{c.codigo}', {texto_sql(c.proveedor)}, '{c.factura:%Y-%m-%d}', "
        + (f"'{c.recepcion:%Y-%m-%d}'" if c.recepcion else "NULL")
        + f", N'{'Recibida' if c.recepcion else 'En camino'}')"
        for c in compras
    ]
    filas_det_compras = [
        f"        (N'{c.codigo}', N'{p}', {q}, '{v:%Y-%m-%d}')" for c in compras for p, q, v in c.lineas
    ]
    resumen = {
        "ventas": len(ventas), "lineas_venta": len(filas_detalle),
        "compras": len(compras), "lineas_compra": len(filas_det_compras),
        "en_camino": sum(1 for c in compras if c.recepcion is None),
    }

    codigos = ", ".join(f"N'{codigo}'" for codigo, *_ in PRODUCTOS)
    proveedores = ", ".join(texto_sql(nombre) for nombre in PROVEEDORES)
    sql = f"""-- =============================================================================
-- Historial de demostración: ventas y compras del {desde:%d/%m/%Y} al {hasta:%d/%m/%Y}.
-- {resumen['ventas']} ventas ({resumen['lineas_venta']} líneas) y {resumen['compras']} compras ({resumen['lineas_compra']} líneas).
--
-- ARCHIVO GENERADO: no lo edites a mano. Se crea con
--     python database/generar_historial.py --desde {desde} --hasta {hasta}
--
-- Las ventas usan códigos H-AAAAMMDD-NNN y las compras HC-AAAAMMDD-NNN. Si ya existe
-- alguna venta H-, el script no hace nada (es idempotente). Los precios son los de
-- Productos. Las existencias actuales de Productos NO se modifican: son la foto de hoy
-- que dejan 01 y 02.
-- =============================================================================
USE CostalitoSmart;
GO

SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET QUOTED_IDENTIFIER ON;
SET NUMERIC_ROUNDABORT OFF;
SET NOCOUNT ON;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Ventas WHERE Codigo LIKE N'H-%')
BEGIN
    SET XACT_ABORT ON;
    BEGIN TRY
    BEGIN TRANSACTION;

    IF (SELECT COUNT(*) FROM dbo.Productos WHERE Codigo IN ({codigos})) <> {len(PRODUCTOS)}
        THROW 50001, N'Faltan productos de 02_datos_prueba.sql: no se carga el historial.', 1;
    IF (SELECT COUNT(*) FROM dbo.Proveedores WHERE Nombre IN ({proveedores})) <> {len(PROVEEDORES)}
        THROW 50002, N'Faltan proveedores de 02_datos_prueba.sql: no se carga el historial.', 1;

    CREATE TABLE #Ventas (Codigo NVARCHAR(30) NOT NULL PRIMARY KEY, FechaHora DATETIME2(0) NOT NULL, MedioPago NVARCHAR(20) NOT NULL);
    CREATE TABLE #DetallesVenta (CodigoVenta NVARCHAR(30) NOT NULL, CodigoProducto NVARCHAR(30) NOT NULL, Cantidad DECIMAL(12,3) NOT NULL);
    CREATE TABLE #Compras (Codigo NVARCHAR(40) NOT NULL PRIMARY KEY, Proveedor NVARCHAR(120) NOT NULL, FechaFactura DATE NOT NULL, FechaRecepcion DATE NULL, Estado NVARCHAR(20) NOT NULL);
    CREATE TABLE #DetallesCompra (CodigoCompra NVARCHAR(40) NOT NULL, CodigoProducto NVARCHAR(30) NOT NULL, Cantidad DECIMAL(12,3) NOT NULL, FechaVencimiento DATE NOT NULL);

{chr(10).join(en_bloques(filas_ventas, "#Ventas", "Codigo, FechaHora, MedioPago"))}

{chr(10).join(en_bloques(filas_detalle, "#DetallesVenta", "CodigoVenta, CodigoProducto, Cantidad"))}

{chr(10).join(en_bloques(filas_compras, "#Compras", "Codigo, Proveedor, FechaFactura, FechaRecepcion, Estado"))}

{chr(10).join(en_bloques(filas_det_compras, "#DetallesCompra", "CodigoCompra, CodigoProducto, Cantidad, FechaVencimiento"))}

    -- Ventas: el total se calcula después a partir de las líneas
    INSERT INTO dbo.Ventas (Codigo, ClienteId, FechaHora, MedioPago, Total)
    SELECT Codigo, NULL, FechaHora, MedioPago, 0 FROM #Ventas;

    INSERT INTO dbo.DetallesVenta (VentaId, ProductoId, Cantidad, PrecioUnitario)
    SELECT venta.VentaId, producto.ProductoId, detalle.Cantidad, producto.PrecioVenta
    FROM #DetallesVenta detalle
    INNER JOIN dbo.Ventas venta ON venta.Codigo = detalle.CodigoVenta
    INNER JOIN dbo.Productos producto ON producto.Codigo = detalle.CodigoProducto;

    UPDATE venta SET Total = lineas.Total
    FROM dbo.Ventas venta
    INNER JOIN (SELECT VentaId, SUM(TotalLinea) AS Total FROM dbo.DetallesVenta GROUP BY VentaId) lineas
        ON lineas.VentaId = venta.VentaId
    WHERE venta.Codigo LIKE N'H-%';

    -- Compras: una por proveedor y día de pedido, al costo de compra del producto
    INSERT INTO dbo.Compras (Codigo, ProveedorId, FechaFactura, FechaRecepcion, Estado, Total)
    SELECT compra.Codigo, proveedor.ProveedorId, compra.FechaFactura, compra.FechaRecepcion, compra.Estado, 0
    FROM #Compras compra
    INNER JOIN dbo.Proveedores proveedor ON proveedor.Nombre = compra.Proveedor;

    INSERT INTO dbo.DetallesCompra (CompraId, ProductoId, Cantidad, CostoUnitario, FechaVencimiento)
    SELECT compra.CompraId, producto.ProductoId, detalle.Cantidad, producto.PrecioCompra, detalle.FechaVencimiento
    FROM #DetallesCompra detalle
    INNER JOIN #Compras origen ON origen.Codigo = detalle.CodigoCompra
    INNER JOIN dbo.Proveedores proveedor ON proveedor.Nombre = origen.Proveedor
    INNER JOIN dbo.Compras compra ON compra.Codigo = origen.Codigo AND compra.ProveedorId = proveedor.ProveedorId
    INNER JOIN dbo.Productos producto ON producto.Codigo = detalle.CodigoProducto;

    UPDATE compra SET Total = lineas.Total
    FROM dbo.Compras compra
    INNER JOIN (SELECT CompraId, SUM(TotalLinea) AS Total FROM dbo.DetallesCompra GROUP BY CompraId) lineas
        ON lineas.CompraId = compra.CompraId
    WHERE compra.Codigo LIKE N'HC-%';

    DROP TABLE #Ventas;
    DROP TABLE #DetallesVenta;
    DROP TABLE #Compras;
    DROP TABLE #DetallesCompra;

    COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO
"""
    return sql, resumen


def main() -> None:
    parser = argparse.ArgumentParser(description="Genera el historial de demostración en SQL.")
    # Desde el jueves 10 de septiembre: la primera semana completa es la del lunes 14 y al
    # 17 de noviembre hay 9 semanas completas, una más de las 8 que pide el entrenamiento
    parser.add_argument("--desde", type=date.fromisoformat, default=date(2026, 9, 10))
    parser.add_argument("--hasta", type=date.fromisoformat, default=date(2026, 11, 17),
                        help="último día con ventas (por defecto 17/11/2026)")
    parser.add_argument("--semilla", type=int, default=2026)
    parser.add_argument("--salida", type=Path, default=ARCHIVO,
                        help="archivo a escribir (por defecto database/03_historial_ventas_compras.sql)")
    args = parser.parse_args()
    if args.desde > args.hasta:
        raise SystemExit("--desde no puede ser posterior a --hasta")

    sql, resumen = generar_sql(args.desde, args.hasta, args.semilla)
    args.salida.write_text(sql, encoding="utf-8")
    print(f"{args.salida.name}: {resumen['ventas']} ventas ({resumen['lineas_venta']} líneas), "
          f"{resumen['compras']} compras ({resumen['lineas_compra']} líneas, {resumen['en_camino']} en camino).")


if __name__ == "__main__":
    main()
