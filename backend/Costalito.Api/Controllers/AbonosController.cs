using Costalito.Api.DTOs;
using Costalito.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Costalito.Api.Controllers;

[ApiController]
[Route("api/payments")]
public sealed class AbonosController(IGraneroService service) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<AbonoDto>>(StatusCodes.Status200OK)]
    public Task<IReadOnlyList<AbonoDto>> Get(CancellationToken cancellationToken) =>
        service.ObtenerAbonosAsync(cancellationToken);

    [HttpPost]
    [ProducesResponseType<AbonoDto>(StatusCodes.Status201Created)]
    public async Task<IActionResult> Post(CrearAbonoDto datos, CancellationToken cancellationToken)
    {
        var abono = await service.RegistrarAbonoAsync(datos, cancellationToken);
        return Created("/api/payments", abono);
    }
}
