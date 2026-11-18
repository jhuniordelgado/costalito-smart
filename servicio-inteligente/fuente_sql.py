"""
Lee de SQL Server los datos que necesita el servicio inteligente: la misma base
CostalitoSmart que usa la API de ASP.NET Core.

La conexión se configura con la variable de entorno COSTALITO_SQL (cadena ODBC).
Si no existe, se usa la base LocalDB de desarrollo con el driver ODBC más nuevo
que tenga instalado el equipo:

    set COSTALITO_SQL=Driver={ODBC Driver 18 for SQL Server};Server=...;Database=CostalitoSmart;...

Solo hace consultas de lectura.
"""
from __future__ import annotations

import os
import re
from dataclasses import dataclass
from datetime import date

import pyodbc

from demanda import Producto, compras_desde_filas, ventas_desde_filas

VARIABLE_CONEXION = "COSTALITO_SQL"


def cadena_conexion() -> str:
    configurada = os.environ.get(VARIABLE_CONEXION, "").strip()
    if configurada:
        return configurada
    drivers = sorted(
        (d for d in pyodbc.drivers() if re.fullmatch(r"ODBC Driver \d+ for SQL Server", d)),
        key=lambda d: int(re.search(r"\d+", d).group()),
    )
    if not drivers:
        raise RuntimeError(
            "No hay un driver ODBC de SQL Server instalado. Instala 'ODBC Driver 18 for SQL Server' "
            f"o define {VARIABLE_CONEXION} con la cadena de conexión.")
    return (f"Driver={{{drivers[-1]}}};Server=(localdb)\\MSSQLLocalDB;Database=CostalitoSmart;"
            "Trusted_Connection=yes;TrustServerCertificate=yes;")


def conectar() -> pyodbc.Connection:
    try:
        return pyodbc.connect(cadena_conexion(), timeout=10, readonly=True)
    except pyodbc.Error as error:
        raise RuntimeError(
            "No fue posible conectar con SQL Server. Revisa que LocalDB esté iniciado "
            f"('sqllocaldb start MSSQLLocalDB') o la variable {VARIABLE_CONEXION}. Detalle: {error}") from error


# @hasta lleva tipo date: pyodbc manda None como entero y SQL Server no lo compararía con una fecha

# Ventas vigentes por producto y día (una venta anulada no cuenta como demanda)
SQL_VENTAS = """
DECLARE @hasta date = ?;
SELECT CONVERT(date, v.FechaHora) AS fecha, p.Codigo, p.Nombre, SUM(d.Cantidad) AS cantidad
FROM dbo.DetallesVenta d
JOIN dbo.Ventas v    ON v.VentaId = d.VentaId
JOIN dbo.Productos p ON p.ProductoId = d.ProductoId
WHERE v.Estado = N'Vigente' AND (@hasta IS NULL OR CONVERT(date, v.FechaHora) <= @hasta)
GROUP BY CONVERT(date, v.FechaHora), p.Codigo, p.Nombre
ORDER BY fecha
"""

# Compras: sirven para aprender cuánto tarda cada proveedor y qué está en camino
SQL_COMPRAS = """
DECLARE @hasta date = ?;
SELECT p.Codigo, c.FechaFactura, c.FechaRecepcion, d.Cantidad
FROM dbo.DetallesCompra d
JOIN dbo.Compras c   ON c.CompraId = d.CompraId
JOIN dbo.Productos p ON p.ProductoId = d.ProductoId
WHERE (@hasta IS NULL OR c.FechaFactura <= @hasta)
"""

SQL_PRODUCTOS = """
SELECT Codigo, Nombre, Existencias, StockMinimo
FROM dbo.Productos
WHERE Activo = 1
"""


@dataclass
class DatosGranero:
    productos: dict[str, Producto]          # ventas diarias por producto
    dias_entrega: dict[str, int]            # mediana por producto
    en_camino: dict[str, float]             # unidades pedidas que no han llegado
    inventario: dict[str, dict]             # existencias y stock mínimo de hoy


def leer_datos(hasta: date | None = None) -> DatosGranero:
    """
    hasta: fecha de corte (incluida) para entrenar "como si fuera" ese día.
    El inventario y lo que está en camino son siempre los de hoy.
    """
    with conectar() as conexion:
        cursor = conexion.cursor()
        productos = ventas_desde_filas(
            (fila.fecha, fila.Codigo, fila.Nombre, fila.cantidad)
            for fila in cursor.execute(SQL_VENTAS, hasta).fetchall())
        compras = cursor.execute(SQL_COMPRAS, hasta).fetchall()
        dias_entrega, _ = compras_desde_filas(
            (fila.Codigo, fila.FechaFactura, fila.FechaRecepcion, fila.Cantidad) for fila in compras)
        _, en_camino = compras_desde_filas(
            (fila.Codigo, fila.FechaFactura, fila.FechaRecepcion, fila.Cantidad)
            for fila in cursor.execute(SQL_COMPRAS, None).fetchall())
        inventario = {
            fila.Codigo: {"nombre": fila.Nombre, "existencias": float(fila.Existencias),
                          "stock_minimo": float(fila.StockMinimo)}
            for fila in cursor.execute(SQL_PRODUCTOS).fetchall()
        }
    return DatosGranero(productos, dias_entrega, en_camino, inventario)
