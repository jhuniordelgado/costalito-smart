using Costalito.Api.DTOs;
using Costalito.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Costalito.Api.Controllers;

[ApiController]
[Route("api/products")]
public sealed class ProductosController(IGraneroService service) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<ProductoDto>>(StatusCodes.Status200OK)]
    public Task<IReadOnlyList<ProductoDto>> Get(CancellationToken cancellationToken) =>
        service.ObtenerProductosAsync(cancellationToken);

    [HttpPost]
    [ProducesResponseType<ProductoDto>(StatusCodes.Status201Created)]
    public async Task<IActionResult> Post(CrearProductoDto datos, CancellationToken cancellationToken)
    {
        var producto = await service.RegistrarProductoAsync(datos, cancellationToken);
        return Created("/api/products", producto);
    }
}
