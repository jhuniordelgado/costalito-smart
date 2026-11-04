IF DB_ID(N'CostalitoSmart') IS NULL
BEGIN
    CREATE DATABASE CostalitoSmart;
END;
GO

USE CostalitoSmart;
GO

IF OBJECT_ID(N'dbo.Categorias', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Categorias (
        CategoriaId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Categorias PRIMARY KEY,
        Nombre NVARCHAR(80) NOT NULL CONSTRAINT UQ_Categorias_Nombre UNIQUE,
        Activa BIT NOT NULL CONSTRAINT DF_Categorias_Activa DEFAULT (1)
    );
END;
GO

IF OBJECT_ID(N'dbo.Productos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Productos (
        ProductoId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Productos PRIMARY KEY,
        Codigo NVARCHAR(30) NOT NULL CONSTRAINT UQ_Productos_Codigo UNIQUE,
        Nombre NVARCHAR(120) NOT NULL,
        CategoriaId INT NOT NULL,
        Presentacion NVARCHAR(80) NOT NULL,
        UnidadMedida NVARCHAR(30) NOT NULL,
        Existencias DECIMAL(12,3) NOT NULL CONSTRAINT DF_Productos_Existencias DEFAULT (0),
        StockMinimo DECIMAL(12,3) NOT NULL CONSTRAINT DF_Productos_StockMinimo DEFAULT (0),
        PrecioCompra DECIMAL(12,2) NOT NULL,
        PrecioVenta DECIMAL(12,2) NOT NULL,
        PrecioMayorista DECIMAL(12,2) NOT NULL,
        Activo BIT NOT NULL CONSTRAINT DF_Productos_Activo DEFAULT (1),
        CONSTRAINT FK_Productos_Categorias FOREIGN KEY (CategoriaId) REFERENCES dbo.Categorias(CategoriaId),
        CONSTRAINT CK_Productos_Existencias CHECK (Existencias >= 0),
        CONSTRAINT CK_Productos_StockMinimo CHECK (StockMinimo >= 0),
        CONSTRAINT CK_Productos_Precios CHECK (PrecioCompra > 0 AND PrecioVenta > 0 AND PrecioMayorista > 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.Clientes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Clientes (
        ClienteId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Clientes PRIMARY KEY,
        Nombre NVARCHAR(120) NOT NULL,
        Cedula NVARCHAR(30) NULL,
        Telefono NVARCHAR(30) NOT NULL,
        LimiteFiado DECIMAL(12,2) NOT NULL CONSTRAINT DF_Clientes_LimiteFiado DEFAULT (0),
        SaldoInicial DECIMAL(12,2) NOT NULL CONSTRAINT DF_Clientes_SaldoInicial DEFAULT (0),
        Activo BIT NOT NULL CONSTRAINT DF_Clientes_Activo DEFAULT (1),
        CONSTRAINT CK_Clientes_Limite CHECK (LimiteFiado >= 0),
        CONSTRAINT CK_Clientes_Saldo CHECK (SaldoInicial >= 0)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_Clientes_Cedula' AND object_id = OBJECT_ID(N'dbo.Clientes'))
    CREATE UNIQUE INDEX UX_Clientes_Cedula ON dbo.Clientes(Cedula) WHERE Cedula IS NOT NULL;
GO

IF OBJECT_ID(N'dbo.Proveedores', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Proveedores (
        ProveedorId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Proveedores PRIMARY KEY,
        Nombre NVARCHAR(120) NOT NULL CONSTRAINT UQ_Proveedores_Nombre UNIQUE,
        Contacto NVARCHAR(120) NOT NULL,
        Telefono NVARCHAR(30) NOT NULL,
        ProductosQueSurte NVARCHAR(300) NOT NULL,
        Activo BIT NOT NULL CONSTRAINT DF_Proveedores_Activo DEFAULT (1)
    );
END;
GO

IF OBJECT_ID(N'dbo.Ventas', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Ventas (
        VentaId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Ventas PRIMARY KEY,
        Codigo NVARCHAR(30) NOT NULL CONSTRAINT UQ_Ventas_Codigo UNIQUE,
        ClienteId INT NULL,
        FechaHora DATETIME2(0) NOT NULL CONSTRAINT DF_Ventas_FechaHora DEFAULT (SYSDATETIME()),
        MedioPago NVARCHAR(20) NOT NULL,
        Total DECIMAL(12,2) NOT NULL,
        Estado NVARCHAR(20) NOT NULL CONSTRAINT DF_Ventas_Estado DEFAULT (N'Vigente'),
        CONSTRAINT FK_Ventas_Clientes FOREIGN KEY (ClienteId) REFERENCES dbo.Clientes(ClienteId),
        CONSTRAINT CK_Ventas_MedioPago CHECK (MedioPago IN (N'Efectivo', N'Nequi', N'Fiado')),
        CONSTRAINT CK_Ventas_Total CHECK (Total >= 0),
        CONSTRAINT CK_Ventas_Estado CHECK (Estado IN (N'Vigente', N'Anulada')),
        CONSTRAINT CK_Ventas_FiadoConCliente CHECK (MedioPago <> N'Fiado' OR ClienteId IS NOT NULL)
    );
END;
GO

IF OBJECT_ID(N'dbo.DetallesVenta', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DetallesVenta (
        DetalleVentaId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DetallesVenta PRIMARY KEY,
        VentaId INT NOT NULL,
        ProductoId INT NOT NULL,
        Cantidad DECIMAL(12,3) NOT NULL,
        PrecioUnitario DECIMAL(12,2) NOT NULL,
        TotalLinea AS CONVERT(DECIMAL(12,2), Cantidad * PrecioUnitario) PERSISTED,
        CONSTRAINT FK_DetallesVenta_Ventas FOREIGN KEY (VentaId) REFERENCES dbo.Ventas(VentaId),
        CONSTRAINT FK_DetallesVenta_Productos FOREIGN KEY (ProductoId) REFERENCES dbo.Productos(ProductoId),
        CONSTRAINT CK_DetallesVenta_Cantidad CHECK (Cantidad > 0),
        CONSTRAINT CK_DetallesVenta_Precio CHECK (PrecioUnitario > 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.Compras', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Compras (
        CompraId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Compras PRIMARY KEY,
        Codigo NVARCHAR(40) NOT NULL,
        ProveedorId INT NOT NULL,
        FechaFactura DATE NOT NULL,
        FechaRecepcion DATE NULL,
        Estado NVARCHAR(20) NOT NULL,
        Total DECIMAL(12,2) NOT NULL,
        CONSTRAINT FK_Compras_Proveedores FOREIGN KEY (ProveedorId) REFERENCES dbo.Proveedores(ProveedorId),
        CONSTRAINT CK_Compras_Estado CHECK (Estado IN (N'En camino', N'Recibida', N'Pendiente de pago')),
        CONSTRAINT CK_Compras_Total CHECK (Total >= 0),
        CONSTRAINT UQ_Compras_Proveedor_Codigo UNIQUE (ProveedorId, Codigo)
    );
END;
GO

IF OBJECT_ID(N'dbo.DetallesCompra', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DetallesCompra (
        DetalleCompraId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DetallesCompra PRIMARY KEY,
        CompraId INT NOT NULL,
        ProductoId INT NOT NULL,
        Cantidad DECIMAL(12,3) NOT NULL,
        CostoUnitario DECIMAL(12,2) NOT NULL,
        FechaVencimiento DATE NULL,
        TotalLinea AS CONVERT(DECIMAL(12,2), Cantidad * CostoUnitario) PERSISTED,
        CONSTRAINT FK_DetallesCompra_Compras FOREIGN KEY (CompraId) REFERENCES dbo.Compras(CompraId),
        CONSTRAINT FK_DetallesCompra_Productos FOREIGN KEY (ProductoId) REFERENCES dbo.Productos(ProductoId),
        CONSTRAINT CK_DetallesCompra_Cantidad CHECK (Cantidad > 0),
        CONSTRAINT CK_DetallesCompra_Costo CHECK (CostoUnitario > 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.AbonosClientes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AbonosClientes (
        AbonoClienteId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AbonosClientes PRIMARY KEY,
        ClienteId INT NOT NULL,
        VentaId INT NULL,
        FechaHora DATETIME2(0) NOT NULL CONSTRAINT DF_AbonosClientes_Fecha DEFAULT (SYSDATETIME()),
        Monto DECIMAL(12,2) NOT NULL,
        CONSTRAINT FK_AbonosClientes_Clientes FOREIGN KEY (ClienteId) REFERENCES dbo.Clientes(ClienteId),
        CONSTRAINT FK_AbonosClientes_Ventas FOREIGN KEY (VentaId) REFERENCES dbo.Ventas(VentaId),
        CONSTRAINT CK_AbonosClientes_Monto CHECK (Monto > 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.AbonosProveedores', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AbonosProveedores (
        AbonoProveedorId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AbonosProveedores PRIMARY KEY,
        ProveedorId INT NOT NULL,
        CompraId INT NULL,
        FechaHora DATETIME2(0) NOT NULL CONSTRAINT DF_AbonosProveedores_Fecha DEFAULT (SYSDATETIME()),
        Monto DECIMAL(12,2) NOT NULL,
        CONSTRAINT FK_AbonosProveedores_Proveedores FOREIGN KEY (ProveedorId) REFERENCES dbo.Proveedores(ProveedorId),
        CONSTRAINT FK_AbonosProveedores_Compras FOREIGN KEY (CompraId) REFERENCES dbo.Compras(CompraId),
        CONSTRAINT CK_AbonosProveedores_Monto CHECK (Monto > 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.Gastos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Gastos (
        GastoId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Gastos PRIMARY KEY,
        Concepto NVARCHAR(120) NOT NULL,
        Categoria NVARCHAR(60) NOT NULL,
        FechaHora DATETIME2(0) NOT NULL CONSTRAINT DF_Gastos_Fecha DEFAULT (SYSDATETIME()),
        Monto DECIMAL(12,2) NOT NULL,
        Observacion NVARCHAR(300) NULL,
        CONSTRAINT CK_Gastos_Monto CHECK (Monto > 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.AjustesInventario', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AjustesInventario (
        AjusteInventarioId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AjustesInventario PRIMARY KEY,
        ProductoId INT NOT NULL,
        FechaHora DATETIME2(0) NOT NULL CONSTRAINT DF_AjustesInventario_Fecha DEFAULT (SYSDATETIME()),
        Tipo NVARCHAR(20) NOT NULL,
        Cantidad DECIMAL(12,3) NOT NULL,
        Motivo NVARCHAR(200) NOT NULL,
        CONSTRAINT FK_AjustesInventario_Productos FOREIGN KEY (ProductoId) REFERENCES dbo.Productos(ProductoId),
        CONSTRAINT CK_AjustesInventario_Tipo CHECK (Tipo IN (N'Entrada', N'Pérdida', N'Corrección')),
        CONSTRAINT CK_AjustesInventario_Cantidad CHECK (Cantidad > 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.ConfiguracionNegocio', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ConfiguracionNegocio (
        ConfiguracionId TINYINT NOT NULL CONSTRAINT PK_ConfiguracionNegocio PRIMARY KEY,
        Nombre NVARCHAR(120) NOT NULL,
        Direccion NVARCHAR(200) NOT NULL,
        Telefono NVARCHAR(30) NOT NULL CONSTRAINT DF_Configuracion_Telefono DEFAULT (N''),
        HoraApertura TIME(0) NOT NULL,
        HoraCierre TIME(0) NOT NULL,
        CONSTRAINT CK_Configuracion_Unico CHECK (ConfiguracionId = 1)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Ventas_FechaHora' AND object_id = OBJECT_ID(N'dbo.Ventas'))
    CREATE INDEX IX_Ventas_FechaHora ON dbo.Ventas(FechaHora);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Compras_FechaFactura' AND object_id = OBJECT_ID(N'dbo.Compras'))
    CREATE INDEX IX_Compras_FechaFactura ON dbo.Compras(FechaFactura);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DetallesCompra_Vencimiento' AND object_id = OBJECT_ID(N'dbo.DetallesCompra'))
    CREATE INDEX IX_DetallesCompra_Vencimiento ON dbo.DetallesCompra(FechaVencimiento) WHERE FechaVencimiento IS NOT NULL;
GO
