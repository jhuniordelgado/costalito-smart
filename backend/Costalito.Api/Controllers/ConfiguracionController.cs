using Costalito.Api.DTOs;
using Costalito.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Costalito.Api.Controllers;

[ApiController]
[Route("api/settings")]
public sealed class ConfiguracionController(IGraneroService service) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<GraneroDto>(StatusCodes.Status200OK)]
    public Task<GraneroDto> Get(CancellationToken cancellationToken) =>
        service.ObtenerGraneroAsync(cancellationToken);

    [HttpPut]
    [ProducesResponseType<GraneroDto>(StatusCodes.Status200OK)]
    public Task<GraneroDto> Put(GraneroDto datos, CancellationToken cancellationToken) =>
        service.ActualizarGraneroAsync(datos, cancellationToken);
}
