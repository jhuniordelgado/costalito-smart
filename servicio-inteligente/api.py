"""
API del servicio inteligente de Costalito Smart.

    uvicorn api:app --reload
    Documentación interactiva: http://127.0.0.1:8000/docs

Basada en el api.py de la guía (ver tutorial_original/). Cambios:
  * Predice la demanda de la próxima semana y recomienda cuándo y cuánto comprar.
  * Carga el modelo con ruta absoluta (funciona desde cualquier carpeta).
  * Si no hay modelo entrenado responde 503 con un mensaje claro, en vez de caerse.
  * Si la red no superó la línea base al entrenar, usa el promedio de 4 semanas.
"""
import json
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import tensorflow as tf
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from demanda import (
    DIAS_ENTREGA_POR_DEFECTO, VENTANA, caracteristicas, leer_compras, leer_productos,
    leer_ventas, lunes_de, promedio_movil, recomendar_compra, series_semanales,
)

CARPETA = Path(__file__).parent
RUTA_MODELO = CARPETA / "modelo_demanda.keras"
RUTA_METADATA = CARPETA / "modelo_metadata.json"
CARPETA_DATOS = CARPETA / "datos"

app = FastAPI(
    title="Servicio inteligente de Costalito Smart",
    description="Predice las ventas semanales de cada producto con TensorFlow y sugiere cuándo y cuánto comprar.",
    version="1.0.0",
)

modelo: tf.keras.Model | None = None
metadata: dict = {}


def cargar_modelo() -> None:
    """Se puede volver a llamar después de reentrenar (POST /modelo/recargar)."""
    global modelo, metadata
    if RUTA_MODELO.exists() and RUTA_METADATA.exists():
        modelo = tf.keras.models.load_model(RUTA_MODELO)
        metadata = json.loads(RUTA_METADATA.read_text(encoding="utf-8"))
    else:
        modelo, metadata = None, {}


cargar_modelo()


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
        description="Cualquier día de la semana que se quiere predecir. Por defecto, la semana actual "
                    "(las ventas enviadas deben ser las de las semanas inmediatamente anteriores).",
    )


class SolicitudCompra(SolicitudDemanda):
    codigo: str | None = Field(default=None, examples=["ABA-001"],
                               description="Si se envía, se usan los días de entrega aprendidos de las compras")
    producto: str | None = Field(default=None, examples=["Arroz Diana 500 g"])
    existencias: float = Field(ge=0, examples=[40], description="Unidades en la tienda ahora")
    en_camino: float = Field(default=0, ge=0, description="Unidades pedidas que todavía no llegan")
    stock_minimo: float = Field(default=0, ge=0, examples=[30], description="Colchón de seguridad")
    dias_entrega: int | None = Field(default=None, ge=0, le=60,
                                     description="Días que tarda el proveedor. Si no se envía, se usa lo aprendido o 7")
    semanas_cobertura: int = Field(default=1, ge=1, le=8, description="Para cuántas semanas debe alcanzar el pedido")


def validar_ventas(ventas: list[float]) -> None:
    if any(valor < 0 or not np.isfinite(valor) for valor in ventas):
        raise HTTPException(status_code=422, detail="Las ventas semanales deben ser números mayores o iguales a 0.")


def predecir_semana(ventas: list[float], semana: date | None = None) -> tuple[float, str]:
    """Devuelve (unidades previstas para la semana indicada, método usado)."""
    if modelo is None:
        raise HTTPException(status_code=503,
                            detail="No hay modelo entrenado. Ejecuta 'python entrenar_modelo.py' y reinicia la API.")
    ventana = [float(valor) for valor in ventas[-VENTANA:]]
    if not metadata.get("usar_red", True):
        return promedio_movil(ventana), "promedio de 4 semanas (la red no superó la línea base al entrenar)"
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
    return {"mensaje": "Servicio inteligente activo", "modelo_cargado": modelo is not None}


@app.get("/modelo", summary="Métricas y datos del modelo entrenado")
def ver_modelo():
    if modelo is None:
        raise HTTPException(status_code=503, detail="No hay modelo entrenado.")
    return metadata


@app.post("/modelo/recargar", summary="Vuelve a cargar el modelo después de reentrenar")
def recargar_modelo():
    cargar_modelo()
    return {"modelo_cargado": modelo is not None, "version": metadata.get("version")}


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
        dias = metadata.get("dias_entrega", {}).get(solicitud.codigo or "", DIAS_ENTREGA_POR_DEFECTO)
    return {
        "codigo": solicitud.codigo,
        "producto": solicitud.producto,
        "metodo": metodo,
        "dias_entrega": dias,
        **recomendar_compra(demanda, solicitud.existencias, solicitud.en_camino,
                            solicitud.stock_minimo, dias, solicitud.semanas_cobertura),
    }


ORDEN_URGENCIA = {"agotado": 0, "alta": 1, "media": 2, "baja": 3, "sin movimiento": 4}


@app.get("/recomendaciones", summary="Sugerencias de compra para todos los productos (usa la carpeta datos/)")
def recomendaciones(semanas_cobertura: int = 1):
    """
    Para probar sin Costalito: toma las ventas de datos/ventas.csv, el inventario de
    datos/productos.csv y lo que está en camino en datos/compras.csv.
    """
    if not 1 <= semanas_cobertura <= 8:
        raise HTTPException(status_code=422, detail="semanas_cobertura debe estar entre 1 y 8.")
    ruta_ventas = CARPETA_DATOS / "ventas.csv"
    if not ruta_ventas.exists():
        raise HTTPException(status_code=404, detail="No existe datos/ventas.csv.")
    productos = leer_ventas(ruta_ventas)
    series = series_semanales(productos)
    inventario = leer_productos(CARPETA_DATOS / "productos.csv")
    dias_entrega, en_camino = leer_compras(CARPETA_DATOS / "compras.csv")

    resultado, sin_datos = [], []
    for codigo, serie in series.items():
        estado = inventario.get(codigo)
        if estado is None or len(serie) < VENTANA:
            sin_datos.append(productos[codigo].nombre)
            continue
        # la semana a predecir es la que sigue a la última semana completa (la actual)
        demanda, metodo = predecir_semana(serie.valores, serie.lunes(len(serie)))
        dias = dias_entrega.get(codigo, metadata.get("dias_entrega", {}).get(codigo, DIAS_ENTREGA_POR_DEFECTO))
        resultado.append({
            "codigo": codigo,
            "producto": estado["nombre"],
            "metodo": metodo,
            "ultimas_semanas": serie.valores[-VENTANA:],
            "existencias": estado["existencias"],
            "dias_entrega": dias,
            **recomendar_compra(demanda, estado["existencias"], en_camino.get(codigo, 0.0),
                                estado["stock_minimo"], dias, semanas_cobertura),
        })
    resultado.sort(key=lambda r: (ORDEN_URGENCIA[r["urgencia"]], r["dias_para_agotarse"] or 0))
    return {"fecha": date.today().isoformat(), "recomendaciones": resultado,
            "sin_datos_suficientes": sin_datos}
