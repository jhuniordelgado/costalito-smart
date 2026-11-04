using System.ComponentModel.DataAnnotations;

namespace Costalito.Api.DTOs;

public sealed record CrearAbonoDto(
    [property: Range(1, int.MaxValue)] int ClienteId,
    [property: Range(typeof(decimal), "0.01", "999999999")] decimal Monto);

public sealed record AbonoDto(int Id, int ClienteId, decimal Monto, DateTime Fecha);
