using System.ComponentModel.DataAnnotations;

namespace Costalito.Api.DTOs;

public sealed record CrearProveedorDto(
    [property: Required, StringLength(120)] string Nombre,
    [property: Required, StringLength(120)] string Contacto,
    [property: Required, StringLength(30)] string Telefono,
    [property: Required, StringLength(300)] string ProductosQueSurte);

public sealed record ProveedorDto(
    int Id, string Nombre, string Contacto, string Telefono, string Surte);
