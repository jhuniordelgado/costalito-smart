"""
Lógica compartida del servicio inteligente de Costalito Smart.

La usan entrenar_modelo.py (para preparar los datos) y api.py (para predecir y
recomendar). Aquí NO hay TensorFlow: son funciones de Python puro, fáciles de probar.

Idea general
------------
1. Las ventas (una fila por producto vendido) se agrupan en ventas por SEMANA.
2. La red neuronal mira las últimas VENTANA semanas y predice la semana siguiente.
3. Con esa predicción, las existencias y los días que tarda el proveedor, unas
   reglas simples deciden CUÁNDO y CUÁNTO comprar.
"""
from __future__ import annotations

import math
from collections.abc import Iterable
from dataclasses import dataclass, field
from datetime import date, timedelta
from statistics import median

# Semanas de historial que recibe la red para predecir la siguiente
VENTANA = 4
# Lo que recibe la red: las VENTANA ventas normalizadas + si cada una de esas semanas
# tuvo quincena + si la semana que se predice tiene quincena
ENTRADAS = VENTANA + VENTANA + 1
# Si un producto no tiene datos de compras, se supone que el proveedor tarda esto
DIAS_ENTREGA_POR_DEFECTO = 7
# Semanas completas que necesita cada producto para entrenar: VENTANA para la entrada
# + al menos 4 para aprender y evaluar
SEMANAS_MINIMAS = VENTANA + 4


# ----------------------------------------------------------------------------
# Datos de entrada (vienen de SQL Server, ver fuente_sql.py)
# ----------------------------------------------------------------------------

@dataclass
class Producto:
    codigo: str
    nombre: str
    ventas: dict[date, float] = field(default_factory=dict)  # día -> unidades


def ventas_desde_filas(filas: Iterable[tuple[date, str, str, float]]) -> dict[str, Producto]:
    """
    Una fila por producto y día: (fecha, codigo, nombre, cantidad).
    Si llegan varias filas del mismo producto y día, se suman.
    """
    productos: dict[str, Producto] = {}
    for dia, codigo, nombre, cantidad in filas:
        cantidad = float(cantidad)
        if cantidad < 0:
            raise ValueError(f"{codigo} el {dia}: la cantidad vendida no puede ser negativa")
        producto = productos.setdefault(codigo, Producto(codigo, nombre))
        producto.ventas[dia] = producto.ventas.get(dia, 0.0) + cantidad
    return productos


def compras_desde_filas(
    filas: Iterable[tuple[str, date, date | None, float]],
) -> tuple[dict[str, int], dict[str, float]]:
    """
    Una fila por producto comprado: (codigo, fecha_factura, fecha_recepcion, cantidad).
    fecha_recepcion None = la mercancía todavía no llega (está "en camino").

    Devuelve:
      - días de entrega por producto (mediana de fecha_recepcion - fecha_factura)
      - unidades en camino por producto
    """
    demoras: dict[str, list[int]] = {}
    en_camino: dict[str, float] = {}
    for codigo, factura, recepcion, cantidad in filas:
        if recepcion is not None:
            demoras.setdefault(codigo, []).append(max(0, (recepcion - factura).days))
        else:
            en_camino[codigo] = en_camino.get(codigo, 0.0) + float(cantidad)
    return {codigo: round(median(dias)) for codigo, dias in demoras.items()}, en_camino


# ----------------------------------------------------------------------------
# De ventas diarias a ventas semanales
# ----------------------------------------------------------------------------

def lunes_de(dia: date) -> date:
    return dia - timedelta(days=dia.weekday())


def tiene_quincena(lunes: date) -> bool:
    """
    ¿La semana que empieza ese lunes incluye un día de pago (el 15 o el último del mes)?
    En los barrios mucha gente cobra por quincena y ese día hace el mercado grande.
    Este dato NO lo tiene el promedio simple: es lo que la red puede aprovechar.
    """
    for i in range(7):
        dia = lunes + timedelta(days=i)
        if dia.day == 15 or (dia + timedelta(days=1)).month != dia.month:
            return True
    return False


@dataclass
class Serie:
    inicio: date          # lunes de la primera semana
    valores: list[float]  # unidades vendidas por semana

    def lunes(self, indice: int) -> date:
        return self.inicio + timedelta(days=7 * indice)

    def __len__(self) -> int:
        return len(self.valores)


def primera_semana_completa(productos: dict[str, Producto]) -> date:
    """Lunes de la primera semana que el registro de ventas cubre entera."""
    dias = [dia for producto in productos.values() for dia in producto.ventas]
    if not dias:
        return date.min
    inicio = min(dias)
    return inicio if inicio.weekday() == 0 else lunes_de(inicio) + timedelta(days=7)


def ultima_semana_completa(productos: dict[str, Producto], hoy: date | None = None) -> date:
    """
    Lunes de la última semana terminada que el registro cubre entera. Si después de cierto
    día no hay ninguna venta registrada, esas semanas no se toman como "se vendió 0": faltan datos.
    """
    ultima = lunes_de(hoy or date.today()) - timedelta(days=7)
    dias = [dia for producto in productos.values() for dia in producto.ventas]
    if dias:
        ultima = min(ultima, lunes_de(max(dias) + timedelta(days=1)) - timedelta(days=7))
    return ultima


def semanas_completas(productos: dict[str, Producto], hoy: date | None = None) -> int:
    """Cuántas semanas completas (lunes a domingo) cubre el registro de ventas."""
    primera = primera_semana_completa(productos)
    if primera == date.min:
        return 0
    return max(0, (ultima_semana_completa(productos, hoy) - primera).days // 7 + 1)


def fecha_para_entrenar(productos: dict[str, Producto], hoy: date | None = None) -> date:
    """Lunes en que habrá SEMANAS_MINIMAS completas, si se registran ventas todos los días desde hoy."""
    hoy = hoy or date.today()
    faltan = max(0, SEMANAS_MINIMAS - semanas_completas(productos, hoy))
    return lunes_de(hoy) + timedelta(days=7 * faltan) if faltan else hoy


def series_semanales(productos: dict[str, Producto], hoy: date | None = None) -> dict[str, Serie]:
    """
    Unidades vendidas por semana (lunes a domingo) de cada producto.

    - Solo semanas COMPLETAS: la semana en curso se deja por fuera porque sus
      ventas todavía no terminan y la red aprendería que "se vende poco". Tampoco
      cuentan las semanas posteriores a la última venta registrada (faltan datos).
    - Las semanas sin ventas cuentan como 0 (si no, la serie saltaría semanas).
    - Cada serie empieza en la primera semana con ventas de ese producto.
    - La primera semana del REGISTRO también se descarta si no empieza en lunes: si el
      historial arranca un jueves, esa semana solo tiene 4 días y parecería una caída.
    """
    ultima_completa = ultima_semana_completa(productos, hoy)
    primera_completa = primera_semana_completa(productos)
    series: dict[str, Serie] = {}
    for codigo, producto in productos.items():
        por_semana: dict[date, float] = {}
        for dia, cantidad in producto.ventas.items():
            semana = lunes_de(dia)
            if primera_completa <= semana <= ultima_completa:
                por_semana[semana] = por_semana.get(semana, 0.0) + cantidad
        if not por_semana:
            continue
        inicio = semana = min(por_semana)
        valores = []
        while semana <= ultima_completa:
            valores.append(por_semana.get(semana, 0.0))
            semana += timedelta(days=7)
        series[codigo] = Serie(inicio, valores)
    return series


# ----------------------------------------------------------------------------
# Preparación para la red neuronal
# ----------------------------------------------------------------------------

def escala_de(ventana: list[float]) -> float:
    """
    La red trabaja con valores relativos, no con unidades. Así el mismo modelo sirve
    para un producto que vende 5 por semana y otro que vende 200. Es la misma idea que
    la normalización de la guía (dividir entre 10 o entre 100), pero por producto.
    """
    promedio = sum(ventana) / len(ventana)
    return promedio if promedio > 0 else 1.0


def normalizar(ventana: list[float]) -> tuple[list[float], float]:
    escala = escala_de(ventana)
    return [valor / escala for valor in ventana], escala


def caracteristicas(ventana: list[float], lunes_ventana: list[date], lunes_objetivo: date) -> tuple[list[float], float]:
    """
    Arma la entrada de la red (ENTRADAS números) y devuelve también la escala para
    convertir la respuesta de vuelta a unidades.
        [ventas normalizadas x4, quincena en cada una x4, quincena la próxima semana]
    """
    normalizadas, escala = normalizar(ventana)
    quincenas = [1.0 if tiene_quincena(lunes) else 0.0 for lunes in lunes_ventana]
    return normalizadas + quincenas + [1.0 if tiene_quincena(lunes_objetivo) else 0.0], escala


def crear_ejemplos(serie: Serie) -> list[tuple[list[float], float, float]]:
    """
    Ventanas deslizantes. Con la serie [10, 12, 11, 13, 14, 12] y VENTANA = 4 salen:
        [10, 12, 11, 13] -> 14
        [12, 11, 13, 14] -> 12
    Cada ejemplo es (entrada de la red, salida normalizada, escala).
    """
    ejemplos = []
    for inicio in range(len(serie) - VENTANA):
        ventana = serie.valores[inicio:inicio + VENTANA]
        lunes_ventana = [serie.lunes(i) for i in range(inicio, inicio + VENTANA)]
        entrada, escala = caracteristicas(ventana, lunes_ventana, serie.lunes(inicio + VENTANA))
        ejemplos.append((entrada, serie.valores[inicio + VENTANA] / escala, escala))
    return ejemplos


def promedio_movil(ventana: list[float]) -> float:
    """Línea base (paso 9 de la guía): la red solo se usa si predice mejor que esto."""
    return sum(ventana) / len(ventana)


# ----------------------------------------------------------------------------
# Reglas de compra: CUÁNDO y CUÁNTO
# ----------------------------------------------------------------------------

def recomendar_compra(
    demanda_semanal: float,
    existencias: float,
    en_camino: float = 0.0,
    stock_minimo: float = 0.0,
    dias_entrega: int = DIAS_ENTREGA_POR_DEFECTO,
    semanas_cobertura: int = 1,
    hoy: date | None = None,
) -> dict:
    """
    demanda_semanal   : lo que la red predice que se venderá la próxima semana
    existencias       : unidades en la tienda ahora
    en_camino         : unidades ya pedidas que todavía no llegan
    stock_minimo      : colchón de seguridad (el mínimo que el granero quiere tener)
    dias_entrega      : días que tarda el proveedor desde el pedido hasta la entrega
    semanas_cobertura : para cuántas semanas debe alcanzar el pedido

    Regla:
      disponible     = existencias + en_camino
      punto_pedido   = demanda_diaria * dias_entrega + stock_minimo
      ¿Cuándo?  cuando disponible baje al punto de pedido
      ¿Cuánto?  lo que se venderá mientras llega el pedido y durante la cobertura,
                más el colchón, menos lo que habrá en ese momento.
    """
    hoy = hoy or date.today()
    disponible = existencias + en_camino
    base = {
        "demanda_semanal_prevista": round(demanda_semanal, 1),
        "disponible": disponible,
        "punto_de_pedido": None,
        "dias_para_agotarse": None,
    }

    if demanda_semanal <= 0:
        return {**base, "comprar_ahora": False, "cuando": "no hace falta", "fecha_compra": None,
                "cantidad_sugerida": 0, "urgencia": "sin movimiento",
                "explicacion": "No se esperan ventas la próxima semana; no hace falta comprar."}

    demanda_diaria = demanda_semanal / 7
    punto_pedido = demanda_diaria * dias_entrega + stock_minimo
    dias_para_pedir = (disponible - punto_pedido) / demanda_diaria
    dias_para_agotarse = disponible / demanda_diaria
    base["punto_de_pedido"] = round(punto_pedido, 1)
    base["dias_para_agotarse"] = round(dias_para_agotarse, 1)

    pedir_ya = dias_para_pedir <= 0
    # Lo que habrá en la tienda en el momento de hacer el pedido
    stock_al_pedir = disponible if pedir_ya else punto_pedido
    necesario = demanda_diaria * (dias_entrega + 7 * semanas_cobertura) + stock_minimo
    cantidad = max(0, math.ceil(necesario - stock_al_pedir))

    if pedir_ya:
        fecha, cuando = hoy, "ahora"
        urgencia = "agotado" if existencias <= 0 else "alta"
    else:
        dias = math.floor(dias_para_pedir)
        fecha = hoy + timedelta(days=dias)
        cuando = "hoy" if dias == 0 else f"en {dias} {'día' if dias == 1 else 'días'}"
        urgencia = "media" if dias <= 7 else "baja"

    explicacion = (
        f"Se esperan unas {demanda_semanal:.0f} unidades por semana (~{demanda_diaria:.1f} al día). "
        f"Hay {disponible:.0f} disponibles"
        + (f" ({en_camino:.0f} en camino)" if en_camino else "")
        + f" y el proveedor tarda {dias_entrega} {'día' if dias_entrega == 1 else 'días'}. "
        + ("Ya se alcanzó el punto de pedido: compra hoy " if pedir_ya
           else f"Alcanza para unos {dias_para_agotarse:.0f} días: haz el pedido {cuando} ")
        + f"unas {cantidad} unidades para cubrir {semanas_cobertura} "
        + f"{'semana' if semanas_cobertura == 1 else 'semanas'} más el mínimo de {stock_minimo:.0f}."
    )
    return {**base, "comprar_ahora": pedir_ya, "cuando": cuando, "fecha_compra": fecha.isoformat(),
            "cantidad_sugerida": cantidad, "urgencia": urgencia, "explicacion": explicacion}
