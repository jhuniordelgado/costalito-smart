using System.ComponentModel.DataAnnotations;

namespace Costalito.Api.DTOs;

public sealed class CrearClienteDto
{
    [Required, StringLength(120)]
    public string Nombre { get; init; } = string.Empty;

    [StringLength(30)]
    public string? Cedula { get; init; }

    [Required, StringLength(30)]
    public string Telefono { get; init; } = string.Empty;

    [Range(typeof(decimal), "0", "999999999",
        ParseLimitsInInvariantCulture = true,
        ConvertValueInInvariantCulture = true)]
    public decimal LimiteFiado { get; init; }
}

public sealed record ClienteDto(
    int Id,
    string Nombre,
    string? Cedula,
    string Telefono,
    decimal Limite,
    decimal SaldoInicial,
    decimal Saldo);
