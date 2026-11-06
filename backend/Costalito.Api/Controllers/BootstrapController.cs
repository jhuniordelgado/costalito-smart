using Costalito.Api.DTOs;
using Costalito.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Costalito.Api.Controllers;

[ApiController]
[Route("api/bootstrap")]
public sealed class BootstrapController(IGraneroService service) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<DatosInicialesDto>(StatusCodes.Status200OK)]
    public Task<DatosInicialesDto> Get(CancellationToken cancellationToken) =>
        service.ObtenerDatosInicialesAsync(cancellationToken);
}
