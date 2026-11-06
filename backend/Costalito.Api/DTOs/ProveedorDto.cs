using System.ComponentModel.DataAnnotations;

namespace Costalito.Api.DTOs;

public sealed class CrearProveedorDto
{
    [Required, StringLength(120)]
    public string Nombre { get; init; } = string.Empty;

    [Required, StringLength(120)]
    public string Contacto { get; init; } = string.Empty;

    [Required, StringLength(30)]
    public string Telefono { get; init; } = string.Empty;

    [Required, StringLength(300)]
    public string ProductosQueSurte { get; init; } = string.Empty;
}

public sealed record ProveedorDto(
    int Id, string Nombre, string Contacto, string Telefono, string Surte);
