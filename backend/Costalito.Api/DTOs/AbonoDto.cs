using System.ComponentModel.DataAnnotations;

namespace Costalito.Api.DTOs;

public sealed class CrearAbonoDto
{
    [Range(1, int.MaxValue)]
    public int ClienteId { get; init; }

    [Range(typeof(decimal), "0.01", "999999999",
        ParseLimitsInInvariantCulture = true,
        ConvertValueInInvariantCulture = true)]
    public decimal Monto { get; init; }
}

public sealed record AbonoDto(int Id, int ClienteId, decimal Monto, DateTime Fecha);
