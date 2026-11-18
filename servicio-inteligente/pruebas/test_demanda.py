"""
Pruebas de la lógica del servicio (sin TensorFlow, corren en segundos).

    python -m unittest discover pruebas -v
"""
import sys
import unittest
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from demanda import (  # noqa: E402
    ENTRADAS, SEMANAS_MINIMAS, VENTANA, Producto, compras_desde_filas, crear_ejemplos, fecha_para_entrenar,
    primera_semana_completa, recomendar_compra, semanas_completas, series_semanales, tiene_quincena,
    ventas_desde_filas,
)

HOY = date(2026, 11, 18)  # miércoles; la última semana completa es la del lunes 9 de noviembre


class SeriesSemanales(unittest.TestCase):
    def test_suma_por_semana_y_rellena_con_ceros(self):
        producto = Producto("A", "Arroz", {
            date(2026, 10, 19): 3, date(2026, 10, 21): 2,  # semana del 19 oct: 5
            # semana del 26 oct: sin ventas -> 0
            date(2026, 11, 2): 4,                          # semana del 2 nov: 4
            date(2026, 11, 15): 1,                         # domingo, semana del 9 nov: 1
        })
        serie = series_semanales({"A": producto}, HOY)["A"]
        self.assertEqual(serie.inicio, date(2026, 10, 19))
        self.assertEqual(serie.valores, [5, 0, 4, 1])

    def test_deja_por_fuera_la_semana_en_curso(self):
        producto = Producto("A", "Arroz", {date(2026, 11, 9): 2, date(2026, 11, 17): 50})
        self.assertEqual(series_semanales({"A": producto}, HOY)["A"].valores, [2])


class Quincena(unittest.TestCase):
    def test_semanas_con_dia_de_pago(self):
        self.assertTrue(tiene_quincena(date(2026, 11, 9)))    # incluye el 15
        self.assertTrue(tiene_quincena(date(2026, 11, 30)))   # 30 de noviembre, fin de mes
        self.assertTrue(tiene_quincena(date(2026, 2, 23)))    # 28 de febrero, fin de mes
        self.assertFalse(tiene_quincena(date(2026, 11, 2)))   # del 2 al 8


class Ejemplos(unittest.TestCase):
    def test_ventanas_deslizantes_normalizadas(self):
        producto = Producto("A", "Arroz", {date(2026, 9, 7) + timedelta(weeks=i): v for i, v in enumerate([10, 10, 10, 10, 20, 10])})
        serie = series_semanales({"A": producto}, HOY)["A"]
        ejemplos = crear_ejemplos(serie)
        self.assertGreater(len(ejemplos), 0)
        entrada, salida, escala = ejemplos[0]
        self.assertEqual(len(entrada), ENTRADAS)
        self.assertEqual(entrada[:VENTANA], [1.0, 1.0, 1.0, 1.0])  # 10 / promedio 10
        self.assertEqual((salida, escala), (2.0, 10.0))           # la semana siguiente vendió 20


class RecomendarCompra(unittest.TestCase):
    def test_bajo_el_punto_de_pedido_compra_ahora(self):
        r = recomendar_compra(demanda_semanal=70, existencias=15, stock_minimo=10, dias_entrega=2, hoy=HOY)
        # 10 al día; punto de pedido = 10*2 + 10 = 30 > 15 disponibles
        self.assertTrue(r["comprar_ahora"])
        self.assertEqual(r["cuando"], "ahora")
        # (2 días de entrega + 7 de cobertura) * 10 + 10 de mínimo - 15 que hay = 85
        self.assertEqual(r["cantidad_sugerida"], 85)

    def test_con_existencias_de_sobra_compra_mas_adelante(self):
        r = recomendar_compra(demanda_semanal=70, existencias=100, stock_minimo=10, dias_entrega=2, hoy=HOY)
        # (100 - 30) / 10 = 7 días
        self.assertFalse(r["comprar_ahora"])
        self.assertEqual(r["cuando"], "en 7 días")
        self.assertEqual(r["fecha_compra"], "2026-11-25")
        # al pedir quedarán 30 (el punto de pedido): (2 + 7) * 10 + 10 - 30 = 70
        self.assertEqual(r["cantidad_sugerida"], 70)
        self.assertEqual(r["urgencia"], "media")

    def test_lo_que_esta_en_camino_cuenta_como_disponible(self):
        sin = recomendar_compra(70, existencias=15, stock_minimo=10, dias_entrega=2, hoy=HOY)
        con = recomendar_compra(70, existencias=15, en_camino=60, stock_minimo=10, dias_entrega=2, hoy=HOY)
        self.assertTrue(sin["comprar_ahora"])
        self.assertFalse(con["comprar_ahora"])

    def test_agotado(self):
        r = recomendar_compra(14, existencias=0, hoy=HOY)
        self.assertEqual(r["urgencia"], "agotado")
        self.assertTrue(r["comprar_ahora"])

    def test_sin_ventas_no_compra(self):
        r = recomendar_compra(0, existencias=5, hoy=HOY)
        self.assertFalse(r["comprar_ahora"])
        self.assertEqual(r["cantidad_sugerida"], 0)

    def test_mas_semanas_de_cobertura_piden_mas(self):
        una = recomendar_compra(70, existencias=0, hoy=HOY)["cantidad_sugerida"]
        dos = recomendar_compra(70, existencias=0, semanas_cobertura=2, hoy=HOY)["cantidad_sugerida"]
        self.assertEqual(dos - una, 70)


class DatosDeLaBase(unittest.TestCase):
    def test_ventas_desde_filas_suma_el_mismo_dia(self):
        productos = ventas_desde_filas([
            (date(2026, 10, 1), "A", "Arroz", 2), (date(2026, 10, 1), "A", "Arroz", 3),
            (date(2026, 10, 2), "L", "Leche", 1),
        ])
        self.assertEqual(productos["A"].ventas, {date(2026, 10, 1): 5.0})
        self.assertEqual(productos["L"].nombre, "Leche")

    def test_cantidad_negativa_es_un_error(self):
        with self.assertRaises(ValueError):
            ventas_desde_filas([(date(2026, 10, 1), "A", "Arroz", -1)])

    def test_compras_aprenden_demora_y_lo_que_esta_en_camino(self):
        dias, en_camino = compras_desde_filas([
            ("A", date(2026, 10, 1), date(2026, 10, 3), 12),
            ("A", date(2026, 10, 8), date(2026, 10, 10), 12),
            ("A", date(2026, 10, 15), date(2026, 10, 19), 12),
            ("A", date(2026, 11, 16), None, 24),
        ])
        self.assertEqual(dias, {"A": 2})          # mediana de 2, 2 y 4 días
        self.assertEqual(en_camino, {"A": 24.0})


class SemanasCompletas(unittest.TestCase):
    # El historial de la base empieza el jueves 1 de octubre de 2026
    PRODUCTOS = {"A": Producto("A", "Arroz", {
        date(2026, 10, 1) + timedelta(days=i): 1 for i in range(48)  # 1 oct .. 17 nov
    })}

    def test_la_primera_semana_parcial_no_cuenta(self):
        self.assertEqual(primera_semana_completa(self.PRODUCTOS), date(2026, 10, 5))
        serie = series_semanales(self.PRODUCTOS, HOY)["A"]
        self.assertEqual(serie.inicio, date(2026, 10, 5))
        self.assertEqual(serie.valores, [7] * 6)  # nada de la semana del 28 sep con solo 4 días

    def test_cuenta_semanas_y_cuando_alcanzan(self):
        self.assertEqual(semanas_completas(self.PRODUCTOS, HOY), 6)
        self.assertEqual(SEMANAS_MINIMAS, 8)
        # faltan 2 semanas: con ventas todos los días, el lunes 30 de noviembre
        self.assertEqual(fecha_para_entrenar(self.PRODUCTOS, HOY), date(2026, 11, 30))

    def test_las_semanas_sin_registro_no_cuentan_como_cero(self):
        # el 30 de noviembre, sin ventas registradas después del 17, siguen siendo 6 semanas
        self.assertEqual(semanas_completas(self.PRODUCTOS, date(2026, 11, 30)), 6)
        self.assertEqual(len(series_semanales(self.PRODUCTOS, date(2026, 11, 30))["A"]), 6)

    def test_si_el_historial_empieza_en_lunes_esa_semana_si_cuenta(self):
        productos = {"A": Producto("A", "Arroz", {date(2026, 10, 5): 1})}
        self.assertEqual(primera_semana_completa(productos), date(2026, 10, 5))


if __name__ == "__main__":
    unittest.main()
