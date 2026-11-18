"""
Genera datos SIMULADOS para practicar el entrenamiento mientras se reúnen las
ventas reales de Costalito Smart. Usa los 14 productos de 02_datos_prueba.sql.

    python generar_datos_demo.py              # 52 semanas (un año)
    python generar_datos_demo.py --semanas 26   # medio año

Crea datos/ventas.csv, datos/compras.csv y datos/productos.csv.
ATENCIÓN: reemplaza los archivos que ya existan en datos/. Cuando tengas los datos
reales, no vuelvas a ejecutar este script (o usa --carpeta para guardar en otra parte).
"""
import argparse
import csv
from datetime import date, timedelta
from pathlib import Path

import numpy as np

from demanda import lunes_de

# codigo, nombre, existencias, stock mínimo, ventas por semana al inicio,
# tendencia semanal (+3 % = crece), días que tarda el proveedor
PRODUCTOS = [
    ("ABA-001", "Arroz Diana 500 g", 86, 30, 60, 0.010, 2),
    ("ABA-002", "Frijol cargamanto 500 g", 33, 12, 18, 0.000, 3),
    ("ABA-003", "Panela cuadrada", 40, 15, 25, 0.005, 2),
    ("ABA-004", "Sal 500 g", 50, 15, 12, 0.000, 3),
    ("ABA-005", "Aceite vegetal 1 L", 24, 18, 20, 0.015, 3),
    ("ABA-006", "Café de Huila 250 g", 28, 12, 14, 0.020, 4),
    ("LAC-001", "Leche entera 1 L", 8, 10, 70, 0.005, 1),
    ("LAC-002", "Queso campesino 500 g", 14, 6, 10, -0.010, 1),
    ("ALI-001", "Huevos AA x 30", 35, 15, 22, 0.008, 2),
    ("ALI-002", "Pan tajado", 12, 6, 30, 0.000, 1),
    ("BEB-001", "Gaseosa 1,5 L", 30, 12, 35, 0.025, 2),
    ("BEB-002", "Jugo de naranja 1 L", 22, 10, 15, -0.015, 2),
    ("ASE-001", "Jabón líquido 1 L", 17, 8, 6, 0.000, 5),
    ("ASE-002", "Papel higiénico x 4", 20, 8, 16, 0.005, 4),
]

# En un granero se vende más el fin de semana (lunes ... domingo)
PESO_DIA = np.array([0.8, 0.8, 0.9, 0.9, 1.1, 1.4, 1.1])


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--semanas", type=int, default=52)
    parser.add_argument("--carpeta", type=Path, default=Path(__file__).parent / "datos")
    args = parser.parse_args()

    rng = np.random.default_rng(42)
    args.carpeta.mkdir(parents=True, exist_ok=True)
    # Termina el domingo pasado: así todas las semanas generadas están completas
    fin = lunes_de(date.today()) - timedelta(days=1)
    inicio = fin - timedelta(days=7 * args.semanas - 1)

    ventas, compras = [], []
    for codigo, nombre, _, _, base, tendencia, entrega in PRODUCTOS:
        dia = inicio
        while dia <= fin:
            semana = (dia - inicio).days // 7
            esperado = base * (1 + tendencia) ** semana / 7 * PESO_DIA[dia.weekday()] / PESO_DIA.mean()
            # Quincena (días 15 y 30 o los que siguen): la gente cobra y compra más
            if dia.day in (15, 16, 30, 31, 1):
                esperado *= 1.35
            cantidad = int(rng.poisson(esperado))
            if cantidad:
                ventas.append((dia.isoformat(), codigo, nombre, cantidad))
            # Un pedido al proveedor cada 2 semanas, los lunes
            if dia.weekday() == 0 and semana % 2 == 0:
                demora = max(1, entrega + int(rng.integers(-1, 2)))
                recepcion = dia + timedelta(days=demora)
                compras.append((dia.isoformat(), recepcion.isoformat() if recepcion <= fin else "",
                                codigo, int(base * 2)))
            dia += timedelta(days=1)

    escribir(args.carpeta / "ventas.csv", ["fecha", "codigo", "producto", "cantidad"], ventas)
    escribir(args.carpeta / "compras.csv", ["fecha_factura", "fecha_recepcion", "codigo", "cantidad"], compras)
    escribir(args.carpeta / "productos.csv", ["codigo", "nombre", "existencias", "stock_minimo"],
             [(c, n, e, m) for c, n, e, m, *_ in PRODUCTOS])
    print(f"Datos SIMULADOS de {args.semanas} semanas ({inicio} a {fin}) guardados en {args.carpeta}")
    print(f"  ventas.csv: {len(ventas)} filas | compras.csv: {len(compras)} filas | productos.csv: {len(PRODUCTOS)} filas")


def escribir(ruta: Path, encabezado: list[str], filas: list) -> None:
    with open(ruta, "w", encoding="utf-8", newline="") as archivo:
        escritor = csv.writer(archivo)
        escritor.writerow(encabezado)
        escritor.writerows(filas)


if __name__ == "__main__":
    main()
