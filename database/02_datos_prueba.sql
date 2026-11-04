USE CostalitoSmart;
GO

SET XACT_ABORT ON;
BEGIN TRY
    BEGIN TRANSACTION;

    INSERT INTO dbo.Categorias (Nombre)
    SELECT datos.Nombre
    FROM (VALUES
        (N'Granos y abarrotes'),
        (N'Lácteos'),
        (N'Alimentos'),
        (N'Bebidas'),
        (N'Aseo')
    ) AS datos(Nombre)
    WHERE NOT EXISTS (
        SELECT 1 FROM dbo.Categorias categoria WHERE categoria.Nombre = datos.Nombre
    );

    INSERT INTO dbo.Productos
        (Codigo, Nombre, CategoriaId, Presentacion, UnidadMedida,
         Existencias, StockMinimo, PrecioCompra, PrecioVenta, PrecioMayorista)
    SELECT datos.Codigo, datos.Nombre, categoria.CategoriaId, datos.Presentacion,
           datos.UnidadMedida, datos.Existencias, datos.StockMinimo,
           datos.PrecioCompra, datos.PrecioVenta, datos.PrecioMayorista
    FROM (VALUES
        (N'ABA-001', N'Arroz Diana 500 g', N'Granos y abarrotes', N'Bolsa 500 g', N'unidades', 86, 30, 3091, 3400, 3246),
        (N'ABA-002', N'Frijol cargamanto 500 g', N'Granos y abarrotes', N'Bolsa 500 g', N'unidades', 33, 12, 6273, 6900, 6587),
        (N'ABA-003', N'Panela cuadrada', N'Granos y abarrotes', N'Unidad', N'unidades', 40, 15, 2545, 2800, 2672),
        (N'ABA-004', N'Sal 500 g', N'Granos y abarrotes', N'Bolsa 500 g', N'unidades', 50, 15, 1636, 1800, 1718),
        (N'ABA-005', N'Aceite vegetal 1 L', N'Granos y abarrotes', N'Botella 1 L', N'unidades', 24, 18, 10818, 11900, 11359),
        (N'ABA-006', N'Café de Huila 250 g', N'Granos y abarrotes', N'Bolsa 250 g', N'unidades', 28, 12, 8636, 9500, 9068),
        (N'LAC-001', N'Leche entera 1 L', N'Lácteos', N'Bolsa 1 L', N'unidades', 8, 10, 4364, 4800, 4582),
        (N'LAC-002', N'Queso campesino 500 g', N'Lácteos', N'Paquete 500 g', N'unidades', 14, 6, 11364, 12500, 11932),
        (N'ALI-001', N'Huevos AA x 30', N'Alimentos', N'Cubeta x 30', N'cubetas', 35, 15, 19545, 21500, 20522),
        (N'ALI-002', N'Pan tajado', N'Alimentos', N'Paquete', N'unidades', 12, 6, 4727, 5200, 4964),
        (N'BEB-001', N'Gaseosa 1,5 L', N'Bebidas', N'Botella 1,5 L', N'unidades', 30, 12, 5636, 6200, 5918),
        (N'BEB-002', N'Jugo de naranja 1 L', N'Bebidas', N'Caja 1 L', N'unidades', 22, 10, 4091, 4500, 4296),
        (N'ASE-001', N'Jabón líquido 1 L', N'Aseo', N'Botella 1 L', N'unidades', 17, 8, 9909, 10900, 10405),
        (N'ASE-002', N'Papel higiénico x 4', N'Aseo', N'Paquete x 4', N'unidades', 20, 8, 7091, 7800, 7446)
    ) AS datos(Codigo, Nombre, Categoria, Presentacion, UnidadMedida,
               Existencias, StockMinimo, PrecioCompra, PrecioVenta, PrecioMayorista)
    INNER JOIN dbo.Categorias categoria ON categoria.Nombre = datos.Categoria
    WHERE NOT EXISTS (
        SELECT 1 FROM dbo.Productos producto WHERE producto.Codigo = datos.Codigo
    );

    INSERT INTO dbo.Clientes (Nombre, Telefono, LimiteFiado, SaldoInicial)
    SELECT datos.Nombre, datos.Telefono, datos.LimiteFiado, datos.SaldoInicial
    FROM (VALUES
        (N'María Gómez', N'310 555 0148', 200000, 236000),
        (N'Carlos Rojas', N'311 555 0193', 150000, 64000),
        (N'Luz Marina Pérez', N'312 555 0127', 120000, 92500),
        (N'Hernán Cuéllar', N'314 555 0166', 100000, 0),
        (N'Rosalba Trujillo', N'315 555 0182', 80000, 0)
    ) AS datos(Nombre, Telefono, LimiteFiado, SaldoInicial)
    WHERE NOT EXISTS (
        SELECT 1 FROM dbo.Clientes cliente WHERE cliente.Nombre = datos.Nombre
    );

    INSERT INTO dbo.Proveedores (Nombre, Contacto, Telefono, ProductosQueSurte)
    SELECT datos.Nombre, datos.Contacto, datos.Telefono, datos.ProductosQueSurte
    FROM (VALUES
        (N'Distribuciones La 14', N'Jorge Salazar', N'310 555 0172', N'Arroz, frijol, sal y aceite'),
        (N'Lácteos del Valle', N'Marcela Ortiz', N'311 555 0129', N'Leche y queso'),
        (N'Aseo Total', N'Andrés Cabrera', N'312 555 0186', N'Jabón y papel higiénico'),
        (N'Granos del Sur', N'Yamile Perdomo', N'314 555 0113', N'Café, panela y huevos'),
        (N'Bebidas El Paso', N'Camilo Díaz', N'315 555 0155', N'Gaseosas y jugos')
    ) AS datos(Nombre, Contacto, Telefono, ProductosQueSurte)
    WHERE NOT EXISTS (
        SELECT 1 FROM dbo.Proveedores proveedor WHERE proveedor.Nombre = datos.Nombre
    );

    IF NOT EXISTS (SELECT 1 FROM dbo.ConfiguracionNegocio WHERE ConfiguracionId = 1)
    BEGIN
        INSERT INTO dbo.ConfiguracionNegocio
            (ConfiguracionId, Nombre, Direccion, Telefono, HoraApertura, HoraCierre)
        VALUES
            (1, N'Granero Costalito', N'Barrio Los Pinos, Neiva', N'', '06:00', '20:00');
    END;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.Compras
        WHERE ProveedorId = (SELECT ProveedorId FROM dbo.Proveedores WHERE Nombre = N'Bebidas El Paso')
          AND Codigo = N'FC-205'
    )
    BEGIN
        DECLARE @ProveedorBebidas INT = (
            SELECT ProveedorId FROM dbo.Proveedores WHERE Nombre = N'Bebidas El Paso'
        );
        DECLARE @Gaseosa INT = (
            SELECT ProductoId FROM dbo.Productos WHERE Codigo = N'BEB-001'
        );
        DECLARE @CompraBebidas INT;

        INSERT INTO dbo.Compras
            (Codigo, ProveedorId, FechaFactura, Estado, Total)
        VALUES (N'FC-205', @ProveedorBebidas, DATEADD(DAY, -2, CONVERT(DATE, GETDATE())), N'En camino', 135264);

        SET @CompraBebidas = SCOPE_IDENTITY();
        INSERT INTO dbo.DetallesCompra
            (CompraId, ProductoId, Cantidad, CostoUnitario, FechaVencimiento)
        VALUES (@CompraBebidas, @Gaseosa, 24, 5636, DATEADD(MONTH, 8, CONVERT(DATE, GETDATE())));
    END;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.Compras
        WHERE ProveedorId = (SELECT ProveedorId FROM dbo.Proveedores WHERE Nombre = N'Lácteos del Valle')
          AND Codigo = N'FC-204'
    )
    BEGIN
        DECLARE @ProveedorLacteos INT = (
            SELECT ProveedorId FROM dbo.Proveedores WHERE Nombre = N'Lácteos del Valle'
        );
        DECLARE @Leche INT = (
            SELECT ProductoId FROM dbo.Productos WHERE Codigo = N'LAC-001'
        );
        DECLARE @CompraLacteos INT;

        INSERT INTO dbo.Compras
            (Codigo, ProveedorId, FechaFactura, FechaRecepcion, Estado, Total)
        VALUES (N'FC-204', @ProveedorLacteos, DATEADD(DAY, -8, CONVERT(DATE, GETDATE())),
                DATEADD(DAY, -7, CONVERT(DATE, GETDATE())), N'Pendiente de pago', 104736);

        SET @CompraLacteos = SCOPE_IDENTITY();
        INSERT INTO dbo.DetallesCompra
            (CompraId, ProductoId, Cantidad, CostoUnitario, FechaVencimiento)
        VALUES (@CompraLacteos, @Leche, 24, 4364, DATEADD(DAY, 14, CONVERT(DATE, GETDATE())));
    END;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.Gastos
        WHERE Concepto = N'Compra de bolsas para despacho'
          AND CONVERT(DATE, FechaHora) = CONVERT(DATE, GETDATE())
    )
    BEGIN
        INSERT INTO dbo.Gastos (Concepto, Categoria, Monto, Observacion)
        VALUES (N'Compra de bolsas para despacho', N'Empaque', 18000, N'Dato de prueba');
    END;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
