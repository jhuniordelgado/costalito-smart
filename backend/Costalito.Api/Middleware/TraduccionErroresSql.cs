using System.Text.RegularExpressions;
using Microsoft.Data.SqlClient;

namespace Costalito.Api.Middleware;

public sealed record ErrorSqlTraducido(int Status, string Mensaje);

/// <summary>
/// Convierte los rechazos de SQL Server que causa el usuario (datos repetidos, valores
/// fuera de regla, textos largos) en 400/409 con un mensaje entendible. Lo que no se
/// reconoce queda como 500, porque entonces el problema es del servidor.
/// </summary>
public static partial class TraduccionErroresSql
{
    // Números de error de SQL Server
    private const int FilaDuplicadaIndiceUnico = 2601;
    private const int ViolacionRestriccionUnica = 2627;
    private const int ViolacionCheckOClaveForanea = 547;
    private const int ValorNuloNoPermitido = 515;
    private const int TextoTruncado = 2628;
    private const int TextoTruncadoAntiguo = 8152;
    private const int InterbloqueoElegidoVictima = 1205;

    /// <summary>
    /// Mensajes para las restricciones de 01_crear_estructura.sql donde el usuario puede
    /// corregir algo concreto. Las demás reciben un mensaje genérico según su tipo.
    /// </summary>
    private static readonly Dictionary<string, string> MensajesPorRestriccion = new(StringComparer.OrdinalIgnoreCase)
    {
        ["UQ_Categorias_Nombre"] = "Ya existe una categoría con ese nombre.",
        ["UQ_Productos_Codigo"] = "Ya existe un producto con ese código.",
        ["UX_Clientes_Cedula"] = "Ya existe un cliente con esa cédula.",
        ["UQ_Proveedores_Nombre"] = "Ya existe un proveedor con ese nombre.",
        ["UQ_Ventas_Codigo"] = "Se generó un código de venta repetido. Registra la venta de nuevo.",
        ["UQ_Compras_Proveedor_Codigo"] = "Ese proveedor ya tiene una factura con ese número.",
        ["UQ_Usuarios_Cedula"] = "Ya existe un usuario con esa cédula.",
        ["CK_Productos_Existencias"] = "No hay suficientes existencias para completar la operación.",
        ["CK_Productos_StockMinimo"] = "El stock mínimo no puede ser negativo.",
        ["CK_Productos_Precios"] = "Los precios de compra, venta y mayorista deben ser mayores que cero.",
        ["CK_Clientes_Limite"] = "El límite de fiado no puede ser negativo.",
        ["CK_Clientes_Saldo"] = "El saldo inicial no puede ser negativo.",
        ["CK_Ventas_MedioPago"] = "El medio de pago no es válido.",
        ["CK_Ventas_FiadoConCliente"] = "Elige a qué cliente se le fía.",
        ["CK_DetallesVenta_Cantidad"] = "La cantidad vendida debe ser mayor que cero.",
        ["CK_DetallesCompra_Cantidad"] = "La cantidad comprada debe ser mayor que cero.",
        ["CK_DetallesCompra_Costo"] = "El costo unitario debe ser mayor que cero.",
        ["CK_Compras_Estado"] = "El estado de la compra no es válido.",
        ["CK_AbonosClientes_Monto"] = "El abono debe ser mayor que cero.",
    };

    public static ErrorSqlTraducido? Traducir(SqlException excepcion)
    {
        foreach (SqlError error in excepcion.Errors)
        {
            var traducido = Traducir(error.Number, error.Message);
            if (traducido is not null)
                return traducido;
        }
        return null;
    }

    /// <summary>Separado de SqlException (que no se puede construir) para poder probarlo.</summary>
    public static ErrorSqlTraducido? Traducir(int numero, string mensajeSql)
    {
        var restriccion = NombreRestriccion().Match(mensajeSql) is { Success: true } coincidencia
            ? coincidencia.Groups[1].Value
            : null;
        var mensajeConocido = restriccion is not null && MensajesPorRestriccion.TryGetValue(restriccion, out var texto)
            ? texto
            : null;

        return numero switch
        {
            FilaDuplicadaIndiceUnico or ViolacionRestriccionUnica => new(
                StatusCodes.Status409Conflict,
                mensajeConocido ?? "Ya existe un registro con esos datos."),
            ViolacionCheckOClaveForanea when restriccion?.StartsWith("FK_", StringComparison.OrdinalIgnoreCase) == true => new(
                StatusCodes.Status409Conflict,
                mensajeConocido ?? "El registro depende de otro que no existe o que todavía está en uso."),
            ViolacionCheckOClaveForanea => new(
                StatusCodes.Status400BadRequest,
                mensajeConocido ?? "Los datos no cumplen las reglas del granero. Revísalos e intenta de nuevo."),
            ValorNuloNoPermitido => new(
                StatusCodes.Status400BadRequest, "Falta un dato obligatorio."),
            TextoTruncado or TextoTruncadoAntiguo => new(
                StatusCodes.Status400BadRequest, "Uno de los textos es demasiado largo."),
            InterbloqueoElegidoVictima => new(
                StatusCodes.Status409Conflict, "La base de datos estaba ocupada con otra operación. Intenta de nuevo."),
            _ => null,
        };
    }

    // SQL Server pone el nombre entre comillas simples (unicidad) o dobles (CHECK y FK),
    // en inglés y en español; las columnas no usan estos prefijos.
    [GeneratedRegex("""['"]((?:UQ|UX|CK|FK|PK|IX)_[^'"]+)['"]""", RegexOptions.IgnoreCase)]
    private static partial Regex NombreRestriccion();
}
