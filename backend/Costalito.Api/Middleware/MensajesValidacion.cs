using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.ModelBinding.Metadata;

namespace Costalito.Api.Middleware;

/// <summary>
/// Pone en español los mensajes de las validaciones de los DTO ([Required], [Range]...).
/// Sin esto, ASP.NET Core responde en inglés: "The field Cantidad must be between 0,001 and 999999999.".
/// Se registra una sola vez en Program.cs y aplica a todos los DTO, sin repetir ErrorMessage en cada atributo.
/// </summary>
public sealed class MensajesValidacion : IValidationMetadataProvider
{
    /// <summary>Cómo se nombra cada campo en un mensaje para el usuario.</summary>
    private static readonly Dictionary<string, string> Campos = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Nombre"] = "el nombre",
        ["Cedula"] = "la cédula",
        ["Telefono"] = "el teléfono",
        ["LimiteFiado"] = "el límite de fiado",
        ["ClienteId"] = "el cliente",
        ["Monto"] = "el monto",
        ["ProveedorId"] = "el proveedor",
        ["ProductoId"] = "el producto",
        ["Cantidad"] = "la cantidad",
        ["CostoUnitario"] = "el costo unitario",
        ["Estado"] = "el estado",
        ["Codigo"] = "el código",
        ["Direccion"] = "la dirección",
        ["Apertura"] = "la hora de apertura",
        ["Cierre"] = "la hora de cierre",
        ["Categoria"] = "la categoría",
        ["Presentacion"] = "la presentación",
        ["UnidadMedida"] = "la unidad de medida",
        ["Existencias"] = "las existencias",
        ["StockMinimo"] = "el stock mínimo",
        ["PrecioCompra"] = "el precio de compra",
        ["PrecioVenta"] = "el precio de venta",
        ["PrecioMayorista"] = "el precio mayorista",
        ["Contacto"] = "el contacto",
        ["ProductosQueSurte"] = "los productos que surte",
        ["Pago"] = "el medio de pago",
        ["Lineas"] = "los productos de la venta",
    };

    public void CreateValidationMetadata(ValidationMetadataProviderContext context)
    {
        if (context.Key.MetadataKind != ModelMetadataKind.Property || context.Key.Name is null)
            return;

        var campo = NombreCampo(context.Key.Name);
        foreach (var atributo in context.ValidationMetadata.ValidatorMetadata.OfType<ValidationAttribute>())
        {
            // Respeta los mensajes que alguien haya escrito a mano en el DTO
            if (!string.IsNullOrEmpty(atributo.ErrorMessage) || atributo.ErrorMessageResourceType is not null)
                continue;
            var mensaje = Mensaje(atributo, campo);
            if (mensaje is not null)
                atributo.ErrorMessage = mensaje.Replace("{", "{{").Replace("}", "}}");
        }
    }

    public static string NombreCampo(string propiedad) =>
        Campos.TryGetValue(propiedad, out var nombre) ? nombre : propiedad.ToLowerInvariant();

    private static string? Mensaje(ValidationAttribute atributo, string campo) => atributo switch
    {
        MinLengthAttribute when campo == Campos["Lineas"] => "Agrega al menos un producto a la venta.",
        RequiredAttribute => $"Falta {campo}.",
        StringLengthAttribute largo => $"{Mayuscula(campo)} admite máximo {largo.MaximumLength} caracteres.",
        MinLengthAttribute minimo => $"{Mayuscula(campo)} debe tener al menos {minimo.Length} elemento(s).",
        RangeAttribute rango => MensajeRango(rango, campo),
        _ => null,
    };

    private static string MensajeRango(RangeAttribute rango, string campo)
    {
        // Los identificadores (ProductoId, ClienteId...) van de 1 al máximo: el usuario no eligió nada
        if (rango.OperandType == typeof(int) && Convert.ToInt32(rango.Minimum) == 1)
            return $"Selecciona {campo}.";
        var minimo = Convert.ToDecimal(rango.Minimum, System.Globalization.CultureInfo.InvariantCulture);
        return minimo > 0
            ? $"{Mayuscula(campo)} debe ser mayor que cero."
            : $"{Mayuscula(campo)} no puede ser un valor negativo.";
    }

    private static string Mayuscula(string texto) => char.ToUpperInvariant(texto[0]) + texto[1..];

    /// <summary>
    /// Respuesta 400 cuando el cuerpo no se pudo leer o no cumple las validaciones. Los errores
    /// del lector de JSON (llaves "$..." o el parámetro vacío) también se explican en español.
    /// </summary>
    public static string PrimerMensaje(ModelStateDictionary estado)
    {
        foreach (var (clave, entrada) in estado)
        {
            if (entrada.Errors.Count == 0)
                continue;
            // "$.lineas[0].cantidad": el JSON trae un valor que no es del tipo esperado
            if (clave.StartsWith('$'))
            {
                var propiedad = Regex.Match(clave, @"([A-Za-z]+)(?:\[\d+\])?$").Groups[1].Value;
                return string.IsNullOrEmpty(propiedad) || clave == "$"
                    ? "Los datos enviados no tienen un formato válido."
                    : $"Revisa {NombreCampo(propiedad)}: el valor enviado no tiene el formato esperado.";
            }
        }

        var mensajes = estado
            .Where(par => !par.Key.StartsWith('$'))
            .SelectMany(par => par.Value!.Errors.Select(error => (par.Key, error.ErrorMessage)))
            .ToList();
        // El parámetro completo vino vacío (cuerpo ausente o ilegible): "The datos field is required."
        if (mensajes.Any(m => m.Key is "datos" or ""))
            return "Faltan los datos de la operación o no tienen un formato válido.";
        return mensajes.Select(m => m.ErrorMessage).FirstOrDefault(m => !string.IsNullOrWhiteSpace(m))
            ?? "Revisa los datos enviados.";
    }

    /// <summary>Registra el traductor en MVC.</summary>
    public static void Registrar(MvcOptions opciones) =>
        opciones.ModelMetadataDetailsProviders.Add(new MensajesValidacion());
}
