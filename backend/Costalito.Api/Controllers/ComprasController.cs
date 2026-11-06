using Costalito.Api.DTOs;
using Costalito.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Costalito.Api.Controllers;

[ApiController]
[Route("api/purchases")]
public sealed class ComprasController(IGraneroService service) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<CompraDto>>(StatusCodes.Status200OK)]
    public Task<IReadOnlyList<CompraDto>> Get(CancellationToken cancellationToken) =>
        service.ObtenerComprasAsync(cancellationToken);

    [HttpPost]
    [ProducesResponseType<CompraDto>(StatusCodes.Status201Created)]
    public async Task<IActionResult> Post(CrearCompraDto datos, CancellationToken cancellationToken)
    {
        var compra = await service.RegistrarCompraAsync(datos, cancellationToken);
        return Created("/api/purchases", compra);
    }

    [HttpPatch("{id:int}")]
    public async Task<IActionResult> Patch(
        int id, CambiarEstadoCompraDto datos, CancellationToken cancellationToken)
    {
        await service.CambiarEstadoCompraAsync(id, datos.Estado, cancellationToken);
        return NoContent();
    }
}
