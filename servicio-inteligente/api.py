"""
API del servicio inteligente de Costalito Smart.

    uvicorn api:app --reload
    Documentación interactiva: http://127.0.0.1:8000/docs

Basada en el api.py de la guía (ver tutorial_original/). Cambios:
  * Predice la demanda de la próxima semana y recomienda cuándo y cuánto comprar.
  * Lee las ventas, compras e inventario directamente de la base CostalitoSmart (SQL Server).
  * Carga el modelo con ruta absoluta (funciona desde cualquier carpeta).
  * Sin modelo entrenado (o si la red no superó la línea base) predice con el promedio
    de las últimas 4 semanas, y lo dice en el campo "metodo". TensorFlow solo se carga
    cuando hay un modelo que usar.
"""
import json
from datetime import date, timedelta
from pathlib import Path

import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from demanda import (
    DIAS_ENTREGA_POR_DEFECTO, SEMANAS_MINIMAS, VENTANA, caracteristicas, fecha_para_entrenar, lunes_de, primera_semana_completa,
    promedio_movil, recomendar_compra, semanas_completas, series_semanales,
)
from fuente_sql import leer_datos

CARPETA = Path(__file__).parent
RUTA_MODELO = CARPETA / "modelo_demanda.keras"
RUTA_METADATA = CARPETA / "modelo_metadata.json"

app = FastAPI(
    title="Servicio inteligente de Costalito Smart",
    description="Predice las ventas semanales de cada producto con los datos de la base del granero "
                "y sugiere cuándo y cuánto comprar.",
    version="2.0.0",
)

modelo = None
metadata: dict = {}
motivo_sin_red = ""


def cargar_modelo() -> None:
    """Se puede volver a llamar después de reentrenar (POST /modelo/recargar)."""
    global modelo, metadata, motivo_sin_red
    modelo, metadata = None, {}
    if not (RUTA_MODELO.exists() and RUTA_METADATA.exists()):
        motivo_sin_red = "todavía no hay un modelo entrenado con los datos de la base"
        return
    try:
        import tensorflow as tf
    except ImportError:
        motivo_sin_red = "TensorFlow no está instalado en este entorno"
        return
    modelo = tf.keras.models.load_model(RUTA_MODELO)
    metadata = json.loads(RUTA_METADATA.read_text(encoding="utf-8"))
    motivo_sin_red = "" if metadata.get("usar_red", True) else "la red no superó la línea base al entrenar"


cargar_modelo()


def leer_base():
    try:
        return leer_datos()
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


# ----------------------------------------------------------------------------
# Entradas y salidas
# ----------------------------------------------------------------------------

class SolicitudDemanda(BaseModel):
    ventas_semanales: list[float] = Field(
        min_length=VENTANA,
        description=f"Unidades vendidas por semana, de la más antigua a la más reciente. "
                    f"Se usan las últimas {VENTANA}.",
        examples=[[52, 58, 55, 61]],
    )
    semana_a_predecir: date | None = Field(
        default=None,
        description="Cualquier día de la semana que se quiere predecir. Por defecto, la semana en curso "
                    "(las ventas enviadas deben ser las de las semanas inmediatamente anteriores).",
    )


class SolicitudCompra(SolicitudDemanda):
    codigo: str | None = Field(default=None, examples=["ABA-001"],
                               description="Si se envía, los días de entrega se aprenden de las compras de la base")
    producto: str | None = Field(default=None, examples=["Arroz Diana 500 g"])
    existencias: float = Field(ge=0, examples=[40], description="Unidades en la tienda ahora")
    en_camino: float = Field(default=0, ge=0, description="Unidades pedidas que todavía no llegan")
    stock_minimo: float = Field(default=0, ge=0, examples=[30], description="Colchón de seguridad")
    dias_entrega: int | None = Field(default=None, ge=0, le=60,
                                     description="Días que tarda el proveedor. Si no se envía, se aprende de la base o se usan 7")
    semanas_cobertura: int = Field(default=1, ge=1, le=8, description="Para cuántas semanas debe alcanzar el pedido")


def validar_ventas(ventas: list[float]) -> None:
    if any(valor < 0 or not np.isfinite(valor) for valor in ventas):
        raise HTTPException(status_code=422, detail="Las ventas semanales deben ser números mayores o iguales a 0.")


def predecir_semana(ventas: list[float], semana: date | None = None) -> tuple[float, str]:
    """Devuelve (unidades previstas para la semana indicada, método usado)."""
    ventana = [float(valor) for valor in ventas[-VENTANA:]]
    if modelo is None or motivo_sin_red:
        return promedio_movil(ventana), f"promedio de 4 semanas ({motivo_sin_red})"
    objetivo = lunes_de(semana or date.today())
    lunes_ventana = [objetivo - timedelta(days=7 * (VENTANA - i)) for i in range(VENTANA)]
    entrada, escala = caracteristicas(ventana, lunes_ventana, objetivo)
    salida = float(modelo(np.array([entrada], dtype=np.float32), training=False)[0][0])
    return max(0.0, salida * escala), "red neuronal"


# ----------------------------------------------------------------------------
# Rutas
# ----------------------------------------------------------------------------

@app.get("/")
def inicio():
    return {"mensaje": "Servicio inteligente activo", "modelo_cargado": modelo is not None,
            "metodo": "red neuronal" if modelo is not None and not motivo_sin_red else
                      f"promedio de 4 semanas ({motivo_sin_red})"}


@app.get("/estado-datos", summary="Cuántas semanas de ventas hay en la base y cuándo se podrá entrenar")
def estado_datos():
    datos = leer_base()
    dias = [dia for producto in datos.productos.values() for dia in producto.ventas]
    if not dias:
        return {"semanas_completas": 0, "semanas_necesarias": SEMANAS_MINIMAS,
                "mensaje": "La base no tiene ventas registradas todavía."}
    semanas = semanas_completas(datos.productos)
    primera = primera_semana_completa(datos.productos)
    puede = semanas >= SEMANAS_MINIMAS
    return {
        "primera_venta": min(dias).isoformat(),
        "ultima_venta": max(dias).isoformat(),
        "productos_con_ventas": len(datos.productos),
        "semanas_completas": semanas,
        "primera_semana_completa": primera.isoformat(),
        "semanas_necesarias": SEMANAS_MINIMAS,
        "se_puede_entrenar": puede,
        "entrenamiento_posible_desde": fecha_para_entrenar(datos.productos).isoformat(),
        "mensaje": "Hay datos suficientes: ejecuta 'python entrenar_modelo.py'." if puede else
                   "Mientras no haya semanas suficientes, las predicciones usan el promedio de las últimas 4 semanas.",
    }


@app.get("/modelo", summary="Métricas y datos del modelo entrenado")
def ver_modelo():
    if modelo is None:
        raise HTTPException(status_code=503, detail=f"No hay modelo cargado: {motivo_sin_red}.")
    return metadata


@app.post("/modelo/recargar", summary="Vuelve a cargar el modelo después de reentrenar")
def recargar_modelo():
    cargar_modelo()
    return {"modelo_cargado": modelo is not None, "version": metadata.get("version"),
            "motivo_sin_red": motivo_sin_red or None}


@app.post("/predecir", summary="Ventas previstas para la próxima semana")
def predecir(solicitud: SolicitudDemanda):
    validar_ventas(solicitud.ventas_semanales)
    demanda, metodo = predecir_semana(solicitud.ventas_semanales, solicitud.semana_a_predecir)
    return {
        "demanda_semanal_prevista": round(demanda, 1),
        "metodo": metodo,
        "nota": "Estimación de apoyo; la decisión final de compra es del encargado.",
    }


@app.post("/recomendar-compra", summary="Cuándo y cuánto comprar de un producto")
def recomendar(solicitud: SolicitudCompra):
    validar_ventas(solicitud.ventas_semanales)
    demanda, metodo = predecir_semana(solicitud.ventas_semanales, solicitud.semana_a_predecir)
    dias = solicitud.dias_entrega
    if dias is None:
        dias = DIAS_ENTREGA_POR_DEFECTO
        if solicitud.codigo:
            dias = leer_base().dias_entrega.get(solicitud.codigo, DIAS_ENTREGA_POR_DEFECTO)
    return {
        "codigo": solicitud.codigo,
        "producto": solicitud.producto,
        "metodo": metodo,
        "dias_entrega": dias,
        **recomendar_compra(demanda, solicitud.existencias, solicitud.en_camino,
                            solicitud.stock_minimo, dias, solicitud.semanas_cobertura),
    }


ORDEN_URGENCIA = {"agotado": 0, "alta": 1, "media": 2, "baja": 3, "sin movimiento": 4}


@app.get("/recomendaciones", summary="Sugerencias de compra para todos los productos, con los datos de la base")
def recomendaciones(semanas_cobertura: int = 1):
    """
    Toma de SQL Server las ventas vigentes, el inventario de hoy, lo que está en camino y los
    días que tarda cada proveedor, y devuelve una sugerencia por producto ordenada por urgencia.
    """
    if not 1 <= semanas_cobertura <= 8:
        raise HTTPException(status_code=422, detail="semanas_cobertura debe estar entre 1 y 8.")
    datos = leer_base()
    series = series_semanales(datos.productos)

    resultado, sin_datos = [], []
    for codigo, estado in sorted(datos.inventario.items()):
        serie = series.get(codigo)
        if serie is None or len(serie) < VENTANA:
            sin_datos.append(estado["nombre"])
            continue
        # la semana a predecir es la que sigue a la última semana completa (la actual)
        demanda, metodo = predecir_semana(serie.valores, serie.lunes(len(serie)))
        dias = datos.dias_entrega.get(codigo, DIAS_ENTREGA_POR_DEFECTO)
        resultado.append({
            "codigo": codigo,
            "producto": estado["nombre"],
            "metodo": metodo,
            "ultimas_semanas": serie.valores[-VENTANA:],
            "semanas_desde": serie.lunes(len(serie) - VENTANA).isoformat(),
            "existencias": estado["existencias"],
            "en_camino": datos.en_camino.get(codigo, 0.0),
            "dias_entrega": dias,
            **recomendar_compra(demanda, estado["existencias"], datos.en_camino.get(codigo, 0.0),
                                estado["stock_minimo"], dias, semanas_cobertura),
        })
    resultado.sort(key=lambda r: (ORDEN_URGENCIA[r["urgencia"]], r["dias_para_agotarse"] or 0))
    return {"fecha": date.today().isoformat(), "fuente": "SQL Server (CostalitoSmart)",
            "recomendaciones": resultado, "sin_datos_suficientes": sin_datos}
