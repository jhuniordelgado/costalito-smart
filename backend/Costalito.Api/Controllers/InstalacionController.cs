using Costalito.Api.DTOs;
using Costalito.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Costalito.Api.Controllers;

/// <summary>
/// Primer arranque: mientras la tabla Usuarios esté vacía, cualquiera puede crear el
/// administrador. En cuanto existe un usuario, la creación responde 409.
/// </summary>
[ApiController]
[Route("api/setup")]
[AllowAnonymous]
public sealed class InstalacionController(IAutenticacionService service) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<EstadoInstalacionDto>(StatusCodes.Status200OK)]
    public Task<EstadoInstalacionDto> Get(CancellationToken cancellationToken) =>
        service.ObtenerEstadoInstalacionAsync(cancellationToken);

    [HttpPost("admin")]
    [EnableRateLimiting(PoliticasApi.InicioSesion)]
    [ProducesResponseType<UsuarioDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ErrorDto>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CrearAdministrador(CrearAdministradorDto datos, CancellationToken cancellationToken)
    {
        var usuario = await service.CrearAdministradorAsync(datos, cancellationToken);
        return Created("/api/auth/me", usuario);
    }
}
