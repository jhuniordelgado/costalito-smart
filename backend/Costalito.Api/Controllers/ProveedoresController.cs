using Costalito.Api.DTOs;
using Costalito.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Costalito.Api.Controllers;

[ApiController]
[Route("api/suppliers")]
public sealed class ProveedoresController(IGraneroService service) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<ProveedorDto>>(StatusCodes.Status200OK)]
    public Task<IReadOnlyList<ProveedorDto>> Get(CancellationToken cancellationToken) =>
        service.ObtenerProveedoresAsync(cancellationToken);

    [HttpPost]
    [ProducesResponseType<ProveedorDto>(StatusCodes.Status201Created)]
    public async Task<IActionResult> Post(CrearProveedorDto datos, CancellationToken cancellationToken)
    {
        var proveedor = await service.RegistrarProveedorAsync(datos, cancellationToken);
        return Created("/api/suppliers", proveedor);
    }
}
