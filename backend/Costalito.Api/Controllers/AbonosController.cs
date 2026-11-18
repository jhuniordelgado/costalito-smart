using Costalito.Api.DTOs;
using Costalito.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Costalito.Api.Controllers;

[ApiController]
[Route("api/payments")]
public sealed class AbonosController(IGraneroService service) : ControllerBase
{
    /// <summary>Abonos de un periodo (días incluidos, formato AAAA-MM-DD). Sin fechas, todos.</summary>
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<AbonoDto>>(StatusCodes.Status200OK)]
    public Task<IReadOnlyList<AbonoDto>> Get(
        [FromQuery] DateOnly? desde, [FromQuery] DateOnly? hasta, CancellationToken cancellationToken) =>
        service.ObtenerAbonosAsync(desde, hasta, cancellationToken);

    [HttpPost]
    [ProducesResponseType<AbonoDto>(StatusCodes.Status201Created)]
    public async Task<IActionResult> Post(CrearAbonoDto datos, CancellationToken cancellationToken)
    {
        var abono = await service.RegistrarAbonoAsync(datos, cancellationToken);
        return Created("/api/payments", abono);
    }
}
