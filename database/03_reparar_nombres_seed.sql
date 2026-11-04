USE CostalitoSmart;
GO

-- NCHAR evita depender de la página de códigos que use sqlcmd en Windows.

SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET QUOTED_IDENTIFIER ON;
SET NUMERIC_ROUNDABORT OFF;
GO

SET XACT_ABORT ON;
BEGIN TRANSACTION;

UPDATE dbo.Categorias
SET Nombre = N'L' + NCHAR(225) + N'cteos'
WHERE Nombre = N'L' + NCHAR(195) + NCHAR(161) + N'cteos';

UPDATE dbo.Productos
SET Nombre = N'Caf' + NCHAR(233) + N' de Huila 250 g'
WHERE Codigo = N'ABA-006' AND Nombre LIKE N'%' + NCHAR(195) + N'%';

UPDATE dbo.Productos
SET Nombre = N'Jab' + NCHAR(243) + N'n l' + NCHAR(237) + N'quido 1 L'
WHERE Codigo = N'ASE-001' AND Nombre LIKE N'%' + NCHAR(195) + N'%';

UPDATE dbo.Productos
SET Nombre = N'Papel higi' + NCHAR(233) + N'nico x 4'
WHERE Codigo = N'ASE-002' AND Nombre LIKE N'%' + NCHAR(195) + N'%';

UPDATE dbo.Clientes
SET Nombre = N'Mar' + NCHAR(237) + N'a G' + NCHAR(243) + N'mez'
WHERE Nombre = N'Mar' + NCHAR(195) + NCHAR(173) + N'a G' + NCHAR(195) + NCHAR(179) + N'mez';

UPDATE dbo.Clientes
SET Nombre = N'Luz Marina P' + NCHAR(233) + N'rez'
WHERE Nombre = N'Luz Marina P' + NCHAR(195) + NCHAR(169) + N'rez';

UPDATE dbo.Clientes
SET Nombre = N'Hern' + NCHAR(225) + N'n Cu' + NCHAR(233) + N'llar'
WHERE Nombre = N'Hern' + NCHAR(195) + NCHAR(161) + N'n Cu' + NCHAR(195) + NCHAR(169) + N'llar';

UPDATE dbo.Proveedores
SET Nombre = N'L' + NCHAR(225) + N'cteos del Valle'
WHERE Nombre = N'L' + NCHAR(195) + NCHAR(161) + N'cteos del Valle';

UPDATE dbo.Proveedores
SET Contacto = N'Andr' + NCHAR(233) + N's Cabrera',
    ProductosQueSurte = N'Jab' + NCHAR(243) + N'n y papel higi' + NCHAR(233) + N'nico'
WHERE Nombre = N'Aseo Total';

UPDATE dbo.Proveedores
SET ProductosQueSurte = N'Caf' + NCHAR(233) + N', panela y huevos'
WHERE Nombre = N'Granos del Sur';

UPDATE dbo.Proveedores
SET Contacto = N'Camilo D' + NCHAR(237) + N'az'
WHERE Nombre = N'Bebidas El Paso';

COMMIT TRANSACTION;
GO
