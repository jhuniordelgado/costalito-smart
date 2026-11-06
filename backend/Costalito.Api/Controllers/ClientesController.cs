using Costalito.Api.DTOs;
using Costalito.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Costalito.Api.Controllers;

[ApiController]
[Route("api/customers")]
public sealed class ClientesController(IGraneroService service) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<ClienteDto>>(StatusCodes.Status200OK)]
    public Task<IReadOnlyList<ClienteDto>> Get(CancellationToken cancellationToken) =>
        service.ObtenerClientesAsync(cancellationToken);

    [HttpPost]
    [ProducesResponseType<ClienteDto>(StatusCodes.Status201Created)]
    public async Task<IActionResult> Post(CrearClienteDto datos, CancellationToken cancellationToken)
    {
        var cliente = await service.RegistrarClienteAsync(datos, cancellationToken);
        return Created("/api/customers", cliente);
    }
}
