"""API local de Costalito Smart, implementada con la biblioteca estándar."""

from __future__ import annotations

import json
import os
import sqlite3
from datetime import datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parent
DB_PATH = Path(os.environ.get("COSTALITO_DB", ROOT / "costalito.sqlite3"))
PORT = int(os.environ.get("PORT", "8000"))

PAYMENT_METHODS = {"Efectivo", "Nequi", "Fiado"}
PURCHASE_STATES = {"En camino", "Recibida", "Pendiente de pago"}


class ApiError(Exception):
    """Error esperado que la API puede devolver directamente al cliente."""

    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.message = message
        self.status = status


def connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB_PATH, timeout=10)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")
    return db


def timestamp() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


def initialize() -> None:
    with connect() as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL COLLATE NOCASE UNIQUE,
                categoria TEXT NOT NULL,
                unidad TEXT NOT NULL,
                existencias REAL NOT NULL CHECK (existencias >= 0),
                minimo REAL NOT NULL CHECK (minimo >= 0),
                precio INTEGER NOT NULL CHECK (precio >= 0)
            );
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL COLLATE NOCASE UNIQUE,
                telefono TEXT NOT NULL,
                limite INTEGER NOT NULL CHECK (limite >= 0),
                saldo_inicial INTEGER NOT NULL DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS suppliers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL COLLATE NOCASE UNIQUE,
                contacto TEXT NOT NULL,
                telefono TEXT NOT NULL,
                surte TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                codigo TEXT NOT NULL UNIQUE,
                cliente_id INTEGER REFERENCES customers(id),
                hora TEXT NOT NULL,
                total INTEGER NOT NULL CHECK (total >= 0),
                pago TEXT NOT NULL CHECK (pago IN ('Efectivo', 'Nequi', 'Fiado'))
            );
            CREATE TABLE IF NOT EXISTS sale_lines (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                venta_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
                producto_id INTEGER NOT NULL REFERENCES products(id),
                nombre TEXT NOT NULL,
                cantidad REAL NOT NULL CHECK (cantidad > 0),
                precio INTEGER NOT NULL CHECK (precio >= 0)
            );
            CREATE TABLE IF NOT EXISTS purchases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                codigo TEXT NOT NULL UNIQUE,
                proveedor_id INTEGER NOT NULL REFERENCES suppliers(id),
                fecha TEXT NOT NULL,
                total INTEGER NOT NULL CHECK (total >= 0),
                estado TEXT NOT NULL,
                detalle TEXT NOT NULL,
                producto_id INTEGER REFERENCES products(id),
                cantidad REAL
            );
            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cliente_id INTEGER NOT NULL REFERENCES customers(id),
                monto INTEGER NOT NULL CHECK (monto > 0),
                fecha TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                nombre TEXT NOT NULL,
                direccion TEXT NOT NULL,
                apertura TEXT NOT NULL,
                cierre TEXT NOT NULL
            );
            """
        )

        # No repoblamos una base que ya tenga productos: así reiniciar la API
        # no pisa inventario ni movimientos que el tendero haya registrado.
        if db.execute("SELECT 1 FROM products LIMIT 1").fetchone():
            return

        seed_data(db)


def seed_data(db: sqlite3.Connection) -> None:
    products = [
        ("Arroz Diana 500 g", "Granos y abarrotes", "unidades", 86, 30, 3400),
        ("Frijol cargamanto 500 g", "Granos y abarrotes", "unidades", 33, 12, 6900),
        ("Panela cuadrada", "Granos y abarrotes", "unidades", 40, 15, 2800),
        ("Sal 500 g", "Granos y abarrotes", "unidades", 50, 15, 1800),
        ("Aceite vegetal 1 L", "Granos y abarrotes", "unidades", 24, 18, 11900),
        ("Café de Huila 250 g", "Granos y abarrotes", "unidades", 28, 12, 9500),
        ("Leche entera 1 L", "Lácteos", "unidades", 8, 10, 4800),
        ("Queso campesino 500 g", "Lácteos", "unidades", 14, 6, 12500),
        ("Huevos AA x 30", "Alimentos", "cubetas", 35, 15, 21500),
        ("Pan tajado", "Alimentos", "unidades", 12, 6, 5200),
        ("Gaseosa 1,5 L", "Bebidas", "unidades", 30, 12, 6200),
        ("Jugo de naranja 1 L", "Bebidas", "unidades", 22, 10, 4500),
        ("Jabón líquido 1 L", "Aseo", "unidades", 17, 8, 10900),
        ("Papel higiénico x 4", "Aseo", "unidades", 20, 8, 7800),
    ]
    db.executemany(
        """INSERT INTO products
           (nombre, categoria, unidad, existencias, minimo, precio)
           VALUES (?, ?, ?, ?, ?, ?)""",
        products,
    )

    customers = [
        ("María Gómez", "310 555 0148", 200000, 236000),
        ("Carlos Rojas", "311 555 0193", 150000, 64000),
        ("Luz Marina Pérez", "312 555 0127", 120000, 92500),
        ("Hernán Cuéllar", "314 555 0166", 100000, 0),
        ("Rosalba Trujillo", "315 555 0182", 80000, 0),
    ]
    db.executemany(
        """INSERT INTO customers (nombre, telefono, limite, saldo_inicial)
           VALUES (?, ?, ?, ?)""",
        customers,
    )

    suppliers = [
        ("Distribuciones La 14", "Jorge Salazar", "310 555 0172", "Arroz, frijol, sal y aceite"),
        ("Lácteos del Valle", "Marcela Ortiz", "311 555 0129", "Leche y queso"),
        ("Aseo Total", "Andrés Cabrera", "312 555 0186", "Jabón y papel higiénico"),
        ("Granos del Sur", "Yamile Perdomo", "314 555 0113", "Café, panela y huevos"),
        ("Bebidas El Paso", "Camilo Díaz", "315 555 0155", "Gaseosas y jugos"),
    ]
    db.executemany(
        "INSERT INTO suppliers (nombre, contacto, telefono, surte) VALUES (?, ?, ?, ?)",
        suppliers,
    )
    db.execute(
        "INSERT INTO settings VALUES (1, ?, ?, ?, ?)",
        ("Granero Costalito", "Barrio Los Pinos, Neiva", "06:00", "20:00"),
    )

    purchases = [
        (205, 5, 2, 190000, "En camino", "Gaseosa 1,5 L × 24", 11, 24),
        (204, 1, 14, 840000, "Recibida", "Arroz y aceite", None, None),
        (203, 2, 16, 426500, "Recibida", "Leche y queso", None, None),
        (202, 3, 19, 318000, "Pendiente de pago", "Jabón y papel higiénico", None, None),
        (201, 4, 23, 520000, "Recibida", "Café y panela", None, None),
        (200, 1, 28, 655500, "Recibida", "Arroz, frijol y sal", None, None),
    ]
    for purchase_id, supplier_id, days_ago, total, state, detail, product_id, quantity in purchases:
        date = datetime.now().astimezone() - timedelta(days=days_ago)
        db.execute(
            """INSERT INTO purchases
               (id, codigo, proveedor_id, fecha, total, estado, detalle, producto_id, cantidad)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                purchase_id,
                f"#C-{purchase_id}",
                supplier_id,
                date.isoformat(timespec="seconds"),
                total,
                state,
                detail,
                product_id,
                quantity,
            ),
        )

    payment_date = datetime.now().astimezone() - timedelta(days=3)
    db.execute(
        "INSERT INTO payments (cliente_id, monto, fecha) VALUES (?, ?, ?)",
        (3, 30000, payment_date.isoformat(timespec="seconds")),
    )


def fetch_rows(
    db: sqlite3.Connection, query: str, params: tuple = ()
) -> list[dict]:
    return [dict(row) for row in db.execute(query, params).fetchall()]


def customer_balance(db: sqlite3.Connection, customer_id: int) -> int:
    row = db.execute(
        """SELECT c.saldo_inicial
                  + COALESCE((SELECT SUM(s.total) FROM sales s
                              WHERE s.cliente_id = c.id AND s.pago = 'Fiado'), 0)
                  - COALESCE((SELECT SUM(p.monto) FROM payments p
                              WHERE p.cliente_id = c.id), 0) AS saldo
           FROM customers c WHERE c.id = ?""",
        (customer_id,),
    ).fetchone()
    if row is None:
        raise ApiError("No encontramos ese cliente.", 404)
    return row["saldo"]


def product_response(row: dict) -> dict:
    return {
        "id": row["id"],
        "nombre": row["nombre"],
        "categoria": row["categoria"],
        "unidad": row["unidad"],
        "existencias": row["existencias"],
        "minimo": row["minimo"],
        "precio": row["precio"],
    }


def bootstrap_data(db: sqlite3.Connection) -> dict:
    sales = fetch_rows(
        db,
        """SELECT id, codigo, cliente_id AS clienteId, hora, total, pago
           FROM sales ORDER BY id DESC""",
    )
    for sale in sales:
        if sale["clienteId"]:
            customer = db.execute(
                "SELECT nombre FROM customers WHERE id = ?", (sale["clienteId"],)
            ).fetchone()
            sale["cliente"] = customer["nombre"] if customer else "Cliente mostrador"
        else:
            sale["cliente"] = "Cliente mostrador"

        sale["lineas"] = fetch_rows(
            db,
            """SELECT producto_id AS productoId, nombre, cantidad, precio
               FROM sale_lines WHERE venta_id = ?""",
            (sale["id"],),
        )

    settings = db.execute(
        "SELECT nombre, direccion, apertura, cierre FROM settings WHERE id = 1"
    ).fetchone()
    if settings is None:
        raise ApiError("Faltan los datos iniciales del granero.", 500)

    return {
        "granero": dict(settings),
        "productos": [
            product_response(product)
            for product in fetch_rows(db, "SELECT * FROM products ORDER BY id")
        ],
        "clientes": fetch_rows(
            db,
            """SELECT id, nombre, telefono, limite,
                      saldo_inicial AS saldoInicial
               FROM customers ORDER BY id""",
        ),
        "proveedores": fetch_rows(
            db, "SELECT id, nombre, contacto, telefono, surte FROM suppliers ORDER BY id"
        ),
        "ventas": sales,
        "compras": fetch_rows(
            db,
            """SELECT id, codigo, proveedor_id AS proveedorId, fecha, total,
                      estado, detalle, producto_id AS productoId, cantidad
               FROM purchases ORDER BY id DESC""",
        ),
        "abonos": fetch_rows(
            db,
            """SELECT id, cliente_id AS clienteId, monto, fecha
               FROM payments ORDER BY id""",
        ),
    }


class Handler(BaseHTTPRequestHandler):
    server_version = "CostalitoAPI/1.0"

    def log_message(self, fmt: str, *args) -> None:
        print(f"[{self.log_date_time_string()}] {self.address_string()} {fmt % args}")

    def send_json(self, status: int, data: dict | list) -> None:
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def send_cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "http://localhost:4200")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_cors_headers()
        self.end_headers()

    def request_body(self) -> dict:
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size > 1_000_000:
                raise ApiError("La solicitud es demasiado grande.", 413)

            body = json.loads(self.rfile.read(size) or b"{}")
            if not isinstance(body, dict):
                raise ApiError("El cuerpo debe ser un objeto JSON.")
            return body
        except (json.JSONDecodeError, UnicodeDecodeError):
            raise ApiError("El cuerpo no contiene JSON válido.") from None

    def do_GET(self) -> None:
        path = urlparse(self.path).path.rstrip("/") or "/"
        with connect() as db:
            if path == "/api/health":
                return self.send_json(
                    200, {"status": "ok", "service": "costalito-smart-api"}
                )
            if path == "/api/bootstrap":
                return self.send_json(200, bootstrap_data(db))
            if path == "/api/sales":
                return self.send_json(200, bootstrap_data(db)["ventas"])
            if path == "/api/settings":
                settings = db.execute(
                    "SELECT nombre, direccion, apertura, cierre FROM settings WHERE id = 1"
                ).fetchone()
                return self.send_json(200, dict(settings) if settings else {})

            queries = {
                "/api/products": (
                    "SELECT * FROM products ORDER BY id",
                    product_response,
                ),
                "/api/customers": (
                    """SELECT id, nombre, telefono, limite,
                              saldo_inicial AS saldoInicial
                       FROM customers ORDER BY id""",
                    dict,
                ),
                "/api/suppliers": (
                    "SELECT * FROM suppliers ORDER BY id",
                    dict,
                ),
                "/api/purchases": (
                    """SELECT id, codigo, proveedor_id AS proveedorId, fecha,
                              total, estado, detalle, producto_id AS productoId, cantidad
                       FROM purchases ORDER BY id DESC""",
                    dict,
                ),
                "/api/payments": (
                    """SELECT id, cliente_id AS clienteId, monto, fecha
                       FROM payments ORDER BY id DESC""",
                    dict,
                ),
            }
            if path in queries:
                query, convert = queries[path]
                return self.send_json(
                    200, [convert(row) for row in fetch_rows(db, query)]
                )

        self.send_json(404, {"error": "Ruta no encontrada."})

    def do_POST(self) -> None:
        path = urlparse(self.path).path.rstrip("/")
        try:
            data = self.request_body()
            with connect() as db:
                if path == "/api/products":
                    result = self.create_product(db, data)
                elif path == "/api/customers":
                    result = self.create_customer(db, data)
                elif path == "/api/suppliers":
                    result = self.create_supplier(db, data)
                elif path == "/api/sales":
                    result = self.create_sale(db, data)
                elif path == "/api/purchases":
                    result = self.create_purchase(db, data)
                elif path == "/api/payments":
                    result = self.create_payment(db, data)
                else:
                    return self.send_json(404, {"error": "Ruta no encontrada."})

            self.send_json(201, result)
        except sqlite3.IntegrityError as error:
            message = (
                "Ya existe un registro con ese nombre."
                if "UNIQUE" in str(error)
                else "La operación referencia datos inexistentes o no cumple las reglas del sistema."
            )
            self.send_json(409, {"error": message})
        except ApiError as error:
            self.send_json(error.status, {"error": error.message})

    def create_product(self, db: sqlite3.Connection, data: dict) -> dict:
        values = (
            required_text(data, "nombre"),
            required_text(data, "categoria"),
            required_text(data, "unidad"),
            number(data, "existencias", minimum=0),
            number(data, "minimo", minimum=0),
            integer(data, "precio", minimum=0),
        )
        db.execute(
            """INSERT INTO products
               (nombre, categoria, unidad, existencias, minimo, precio)
               VALUES (?, ?, ?, ?, ?, ?)""",
            values,
        )
        row = db.execute(
            "SELECT * FROM products WHERE id = last_insert_rowid()"
        ).fetchone()
        return product_response(dict(row))

    def create_customer(self, db: sqlite3.Connection, data: dict) -> dict:
        values = (
            required_text(data, "nombre"),
            required_text(data, "telefono"),
            integer(data, "limite", minimum=0),
        )
        db.execute(
            "INSERT INTO customers (nombre, telefono, limite) VALUES (?, ?, ?)",
            values,
        )
        return dict(
            db.execute(
                """SELECT id, nombre, telefono, limite,
                          saldo_inicial AS saldoInicial
                   FROM customers WHERE id = last_insert_rowid()"""
            ).fetchone()
        )

    def create_supplier(self, db: sqlite3.Connection, data: dict) -> dict:
        values = tuple(
            required_text(data, key)
            for key in ("nombre", "contacto", "telefono", "surte")
        )
        db.execute(
            "INSERT INTO suppliers (nombre, contacto, telefono, surte) VALUES (?, ?, ?, ?)",
            values,
        )
        return dict(
            db.execute(
                "SELECT * FROM suppliers WHERE id = last_insert_rowid()"
            ).fetchone()
        )

    def create_sale(self, db: sqlite3.Connection, data: dict) -> dict:
        payment_method = data.get("pago")
        lines = data.get("lineas")
        if not isinstance(payment_method, str) or payment_method not in PAYMENT_METHODS:
            raise ApiError("El medio de pago no es válido.")
        if not isinstance(lines, list) or not lines:
            raise ApiError("Agrega al menos un producto a la cuenta.")

        # El precio viene del catálogo; nunca confiamos en el precio enviado por el navegador.
        sale_lines = {}
        total = 0
        for line in lines:
            if not isinstance(line, dict):
                raise ApiError("Una línea de venta no es válida.")

            product_id = integer(line, "productoId", minimum=1)
            quantity = number(line, "cantidad", minimum=0.000001)
            product = db.execute(
                "SELECT * FROM products WHERE id = ?", (product_id,)
            ).fetchone()
            if product is None:
                raise ApiError("No encontramos uno de los productos.", 404)

            previous = sale_lines.get(product_id)
            combined_quantity = quantity + (previous[1] if previous else 0)
            sale_lines[product_id] = (product, combined_quantity)
            total += int(round(product["precio"] * quantity))

        for product_id, (product, quantity) in sale_lines.items():
            if product["existencias"] < quantity:
                raise ApiError(f"No hay suficientes existencias de {product['nombre']}.")

        customer_id = data.get("clienteId")
        customer = None
        if payment_method == "Fiado":
            if isinstance(customer_id, bool) or not isinstance(customer_id, int):
                raise ApiError("Elige a qué cliente se le fía.")
            customer = db.execute(
                "SELECT * FROM customers WHERE id = ?", (customer_id,)
            ).fetchone()
            if customer is None:
                raise ApiError("No encontramos ese cliente.", 404)
            if customer_balance(db, customer_id) + total > customer["limite"]:
                raise ApiError(f"{customer['nombre']} superaría su límite de fiado.")
        else:
            customer_id = None

        sale_id = db.execute(
            "SELECT COALESCE(MAX(id), 1000) + 1 FROM sales"
        ).fetchone()[0]
        code = f"#V-{sale_id}"
        sale_time = timestamp()
        db.execute(
            """INSERT INTO sales (id, codigo, cliente_id, hora, total, pago)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (sale_id, code, customer_id, sale_time, total, payment_method),
        )

        response_lines = []
        for product_id, (product, quantity) in sale_lines.items():
            db.execute(
                """INSERT INTO sale_lines
                   (venta_id, producto_id, nombre, cantidad, precio)
                   VALUES (?, ?, ?, ?, ?)""",
                (sale_id, product_id, product["nombre"], quantity, product["precio"]),
            )
            db.execute(
                "UPDATE products SET existencias = existencias - ? WHERE id = ?",
                (quantity, product_id),
            )
            response_lines.append(
                {
                    "productoId": product_id,
                    "nombre": product["nombre"],
                    "cantidad": quantity,
                    "precio": product["precio"],
                }
            )

        return {
            "id": sale_id,
            "codigo": code,
            "cliente": customer["nombre"] if customer else "Cliente mostrador",
            "clienteId": customer_id,
            "hora": sale_time,
            "total": total,
            "pago": payment_method,
            "lineas": response_lines,
        }

    def create_purchase(self, db: sqlite3.Connection, data: dict) -> dict:
        supplier_id = integer(data, "proveedorId", minimum=1)
        product_id = integer(data, "productoId", minimum=1)
        quantity = number(data, "cantidad", minimum=0.000001)
        unit_cost = integer(data, "costoUnitario", minimum=0)
        state = data.get("estado")
        if not isinstance(state, str) or state not in PURCHASE_STATES:
            raise ApiError("El estado de la compra no es válido.")

        product = db.execute(
            "SELECT * FROM products WHERE id = ?", (product_id,)
        ).fetchone()
        if product is None:
            raise ApiError("Elige un producto válido.", 404)
        supplier_exists = db.execute(
            "SELECT 1 FROM suppliers WHERE id = ?", (supplier_id,)
        ).fetchone()
        if supplier_exists is None:
            raise ApiError("Elige un proveedor válido.", 404)

        purchase_id = db.execute(
            "SELECT COALESCE(MAX(id), 199) + 1 FROM purchases"
        ).fetchone()[0]
        code = f"#C-{purchase_id}"
        total = int(round(quantity * unit_cost))
        detail = f"{product['nombre']} × {quantity:g}"
        purchase_date = timestamp()
        db.execute(
            """INSERT INTO purchases
               (id, codigo, proveedor_id, fecha, total, estado, detalle, producto_id, cantidad)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                purchase_id,
                code,
                supplier_id,
                purchase_date,
                total,
                state,
                detail,
                product_id,
                quantity,
            ),
        )

        if state != "En camino":
            db.execute(
                "UPDATE products SET existencias = existencias + ? WHERE id = ?",
                (quantity, product_id),
            )

        return {
            "id": purchase_id,
            "codigo": code,
            "proveedorId": supplier_id,
            "fecha": purchase_date,
            "total": total,
            "estado": state,
            "detalle": detail,
            "productoId": product_id,
            "cantidad": quantity,
        }

    def create_payment(self, db: sqlite3.Connection, data: dict) -> dict:
        customer_id = integer(data, "clienteId", minimum=1)
        amount = integer(data, "monto", minimum=1)
        balance = customer_balance(db, customer_id)
        if amount > balance:
            raise ApiError(f"El abono no puede pasar del saldo ({balance}).")

        payment_date = timestamp()
        db.execute(
            "INSERT INTO payments (cliente_id, monto, fecha) VALUES (?, ?, ?)",
            (customer_id, amount, payment_date),
        )
        payment_id = db.execute("SELECT last_insert_rowid()").fetchone()[0]
        return {
            "id": payment_id,
            "clienteId": customer_id,
            "monto": amount,
            "fecha": payment_date,
        }

    def do_PATCH(self) -> None:
        path = urlparse(self.path).path.rstrip("/")
        try:
            data = self.request_body()
            parts = path.split("/")
            if len(parts) != 4 or parts[1:3] != ["api", "purchases"]:
                raise ApiError("Ruta no encontrada.", 404)
            if not parts[3].isdigit():
                raise ApiError("El identificador de compra no es válido.")

            state = data.get("estado")
            if not isinstance(state, str) or state not in PURCHASE_STATES:
                raise ApiError("El estado de la compra no es válido.")

            with connect() as db:
                self.update_purchase_state(db, int(parts[3]), state)
            self.send_json(200, {"ok": True})
        except ApiError as error:
            self.send_json(error.status, {"error": error.message})

    def update_purchase_state(
        self, db: sqlite3.Connection, purchase_id: int, state: str
    ) -> None:
        purchase = db.execute(
            "SELECT * FROM purchases WHERE id = ?", (purchase_id,)
        ).fetchone()
        if purchase is None:
            raise ApiError("No encontramos esa compra.", 404)

        if purchase["estado"] != "En camino" and state == "En camino":
            raise ApiError("Una compra cerrada no puede volver a estar en camino.")

        # Solo se suma el inventario al salir de “En camino”; repetir la actualización
        # de una compra ya recibida no debe volver a agregar las mismas unidades.
        if (
            purchase["estado"] == "En camino"
            and state != "En camino"
            and purchase["producto_id"]
            and purchase["cantidad"]
        ):
            db.execute(
                "UPDATE products SET existencias = existencias + ? WHERE id = ?",
                (purchase["cantidad"], purchase["producto_id"]),
            )

        db.execute(
            "UPDATE purchases SET estado = ? WHERE id = ?", (state, purchase_id)
        )

    def do_PUT(self) -> None:
        if urlparse(self.path).path.rstrip("/") != "/api/settings":
            return self.send_json(404, {"error": "Ruta no encontrada."})

        try:
            data = self.request_body()
            settings = {
                key: required_text(data, key)
                for key in ("nombre", "direccion", "apertura", "cierre")
            }
            with connect() as db:
                db.execute(
                    """UPDATE settings
                       SET nombre = ?, direccion = ?, apertura = ?, cierre = ?
                       WHERE id = 1""",
                    tuple(settings.values()),
                )
            self.send_json(200, settings)
        except ApiError as error:
            self.send_json(error.status, {"error": error.message})


def required_text(data: dict, key: str) -> str:
    value = data.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ApiError(f"El campo {key} es obligatorio.")
    return value.strip()


def number(data: dict, key: str, minimum: float) -> float:
    value = data.get(key)
    if (
        isinstance(value, bool)
        or not isinstance(value, (int, float))
        or value < minimum
    ):
        raise ApiError(f"El campo {key} debe ser un número mayor o igual a {minimum}.")
    return value


def integer(data: dict, key: str, minimum: int) -> int:
    value = number(data, key, minimum)
    if int(value) != value:
        raise ApiError(f"El campo {key} debe ser un número entero.")
    return int(value)


if __name__ == "__main__":
    initialize()
    print(f"Costalito Smart API en http://localhost:{PORT} (SQLite: {DB_PATH})")
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
