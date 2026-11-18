"""
Entrena la red neuronal que predice las ventas de la próxima semana de cada producto.

    python entrenar_modelo.py

Lee datos/ventas.csv (y datos/compras.csv si existe) y guarda:
  - modelo_demanda.keras   : la red entrenada
  - modelo_metadata.json   : métricas, fecha, productos y días de entrega

Basado en el entrenar_modelo.py de la guía (ver tutorial_original/). Cambios:
  * Datos de ventas reales/simulados en vez de 20 filas escritas a mano.
  * La salida es una CANTIDAD (regresión): última capa sin sigmoide, pérdida Huber.
  * Datos separados en entrenamiento / validación / prueba POR TIEMPO.
  * Se compara contra una línea base (promedio de las últimas 4 semanas).
"""
import argparse
import json
from datetime import date, datetime
from pathlib import Path

import numpy as np
import tensorflow as tf

from demanda import ENTRADAS, VENTANA, crear_ejemplos, leer_compras, leer_ventas, promedio_movil, series_semanales

CARPETA = Path(__file__).parent
RUTA_MODELO = CARPETA / "modelo_demanda.keras"
RUTA_METADATA = CARPETA / "modelo_metadata.json"
# Semanas mínimas por producto: VENTANA para la entrada + al menos 4 para aprender y evaluar
SEMANAS_MINIMAS = VENTANA + 4


def separar_por_tiempo(ejemplos: list) -> tuple[list, list, list]:
    """
    70 % más antiguo para entrenar, 15 % para validar y el 15 % más reciente para la prueba.
    No se mezcla al azar: en la vida real se predice el futuro con el pasado, y así se mide.
    """
    n = len(ejemplos)
    fin_entrenamiento = max(1, round(n * 0.70))
    # con pocas semanas, se garantiza al menos 1 ejemplo de validación y 1 de prueba
    fin_validacion = min(max(fin_entrenamiento + 1, round(n * 0.85)), n - 1)
    fin_entrenamiento = min(fin_entrenamiento, fin_validacion - 1)
    return ejemplos[:fin_entrenamiento], ejemplos[fin_entrenamiento:fin_validacion], ejemplos[fin_validacion:]


def a_matrices(ejemplos: list) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    x = np.array([entrada for entrada, _, _ in ejemplos], dtype=np.float32).reshape(-1, ENTRADAS)
    y = np.array([salida for _, salida, _ in ejemplos], dtype=np.float32)
    escalas = np.array([escala for _, _, escala in ejemplos], dtype=np.float32)
    return x, y, escalas


def crear_modelo() -> tf.keras.Model:
    # La misma red pequeña de la guía (8 -> 4 -> 1); solo cambian la entrada y la salida
    modelo = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(ENTRADAS,)),
        tf.keras.layers.Dense(8, activation="relu"),
        tf.keras.layers.Dense(4, activation="relu"),
        # Sin sigmoide: la salida es una cantidad, no una probabilidad.
        # El sesgo arranca en 1.0 = "la próxima semana se vende lo mismo que el promedio".
        # Así la red parte de la línea base y solo aprende a CORREGIRLA (tendencia, caídas...).
        tf.keras.layers.Dense(1, bias_initializer=tf.keras.initializers.Constant(1.0)),
    ])
    modelo.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=0.003), loss="huber", metrics=["mae"])
    return modelo


def main() -> None:
    parser = argparse.ArgumentParser(description="Entrena el modelo de demanda semanal.")
    parser.add_argument("--datos", type=Path, default=CARPETA / "datos", help="carpeta con ventas.csv y compras.csv")
    parser.add_argument("--epocas", type=int, default=300)
    parser.add_argument("--hoy", type=date.fromisoformat, default=None,
                        help="fecha de corte AAAA-MM-DD (por defecto hoy); solo se usan semanas completas anteriores")
    args = parser.parse_args()

    ruta_ventas = args.datos / "ventas.csv"
    if not ruta_ventas.exists():
        raise SystemExit(f"No se encontró {ruta_ventas}. Ejecuta 'python generar_datos_demo.py' o copia tus ventas ahí.")

    productos = leer_ventas(ruta_ventas)
    series = series_semanales(productos, args.hoy)
    dias_entrega, _ = leer_compras(args.datos / "compras.csv")

    # 1. Ventanas por producto, separadas por tiempo
    entrenamiento, validacion, prueba, omitidos = [], [], [], []
    for codigo, serie in series.items():
        if len(serie) < SEMANAS_MINIMAS:
            omitidos.append(f"{productos[codigo].nombre} ({len(serie)} semanas)")
            continue
        a, b, c = separar_por_tiempo(crear_ejemplos(serie))
        entrenamiento += a
        validacion += b
        prueba += [(entrada, salida, escala, codigo) for entrada, salida, escala in c]

    if not entrenamiento or not prueba:
        raise SystemExit(f"Faltan datos: cada producto necesita al menos {SEMANAS_MINIMAS} semanas completas de ventas.")

    # 2. Entrenar (paso 4 de la guía, con validación y parada temprana)
    tf.keras.utils.set_random_seed(42)
    x_ent, y_ent, _ = a_matrices(entrenamiento)
    x_val, y_val, _ = a_matrices(validacion)
    modelo = crear_modelo()
    historial = modelo.fit(
        x_ent, y_ent,
        validation_data=(x_val, y_val),
        epochs=args.epocas,
        batch_size=16,
        verbose=0,
        callbacks=[tf.keras.callbacks.EarlyStopping(monitor="val_loss", patience=50, restore_best_weights=True)],
    )

    # 3. Evaluar con datos que la red nunca vio, en UNIDADES, contra la línea base
    x_pru, y_pru, escalas = a_matrices([(e, s, k) for e, s, k, _ in prueba])
    real = y_pru * escalas
    pred_red = np.maximum(0, modelo.predict(x_pru, verbose=0).reshape(-1)) * escalas
    pred_base = np.array([promedio_movil(list(e[:VENTANA])) for e in x_pru]) * escalas
    mae_red = float(np.mean(np.abs(pred_red - real)))
    mae_base = float(np.mean(np.abs(pred_base - real)))
    usar_red = mae_red <= mae_base

    # 4. Guardar el modelo y su ficha (paso 9 de la guía: versionar y documentar)
    modelo.save(RUTA_MODELO)
    metadata = {
        "version": datetime.now().strftime("%Y%m%d-%H%M%S"),
        "entrenado": datetime.now().isoformat(timespec="seconds"),
        "ventana_semanas": VENTANA,
        "entradas": ["ventas normalizadas x4", "quincena en cada semana x4", "quincena en la semana a predecir"],
        "productos_usados": len(series) - len(omitidos),
        "productos_omitidos": omitidos,
        "ejemplos": {"entrenamiento": len(entrenamiento), "validacion": len(validacion), "prueba": len(prueba)},
        "epocas_entrenadas": len(historial.history["loss"]),
        "mae_red_neuronal": round(mae_red, 2),
        "mae_promedio_movil": round(mae_base, 2),
        "usar_red": usar_red,
        "dias_entrega": dias_entrega,
    }
    RUTA_METADATA.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")

    # 5. Resumen
    print(f"Modelo entrenado y guardado en {RUTA_MODELO.name}")
    print(f"  Productos: {metadata['productos_usados']} | ejemplos entrenamiento/validación/prueba: "
          f"{len(entrenamiento)}/{len(validacion)}/{len(prueba)} | épocas: {metadata['epocas_entrenadas']}")
    if omitidos:
        print(f"  Omitidos por pocas semanas: {', '.join(omitidos)}")
    print(f"  Error medio en la prueba (MAE, unidades por semana):")
    print(f"    Red neuronal ............ {mae_red:6.2f}")
    print(f"    Promedio 4 semanas ...... {mae_base:6.2f}")
    if usar_red:
        mejora = (1 - mae_red / mae_base) * 100 if mae_base else 0
        print(f"  La red mejora la línea base en {mejora:.1f} %: la API usará la red neuronal.")
    else:
        print("  La red NO mejora la línea base: la API usará el promedio de 4 semanas.")
        print("  (Suele pasar con pocos datos. Agrega más semanas de ventas y vuelve a entrenar.)")


if __name__ == "__main__":
    main()
