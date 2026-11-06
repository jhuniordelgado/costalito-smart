using Costalito.Api.DTOs;
using Costalito.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Costalito.Api.Controllers;

[ApiController]
[Route("api/sales")]
public sealed class VentasController(IGraneroService service) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<VentaDto>>(StatusCodes.Status200OK)]
    public Task<IReadOnlyList<VentaDto>> Get(CancellationToken cancellationToken) =>
        service.ObtenerVentasAsync(cancellationToken);

    [HttpPost]
    [ProducesResponseType<VentaDto>(StatusCodes.Status201Created)]
    public async Task<IActionResult> Post(CrearVentaDto datos, CancellationToken cancellationToken)
    {
        var venta = await service.RegistrarVentaAsync(datos, cancellationToken);
        return Created("/api/sales", venta);
    }
}
