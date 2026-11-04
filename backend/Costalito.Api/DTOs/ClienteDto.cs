using System.ComponentModel.DataAnnotations;

namespace Costalito.Api.DTOs;

public sealed record CrearClienteDto(
    [property: Required, StringLength(120)] string Nombre,
    [property: StringLength(30)] string? Cedula,
    [property: Required, StringLength(30)] string Telefono,
    [property: Range(typeof(decimal), "0", "999999999")] decimal LimiteFiado);

public sealed record ClienteDto(
    int Id,
    string Nombre,
    string? Cedula,
    string Telefono,
    decimal Limite,
    decimal SaldoInicial,
    decimal Saldo);
