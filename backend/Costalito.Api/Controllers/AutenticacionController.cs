using System.Security.Claims;
using Costalito.Api.DTOs;
using Costalito.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Costalito.Api.Controllers;

/// <summary>
/// Inicio y cierre de sesión. La sesión viaja en una cookie HttpOnly: Angular no la
/// puede leer ni guardar en localStorage, solo la reenvía con cada petición.
/// </summary>
[ApiController]
[Route("api/auth")]
public sealed class AutenticacionController(IAutenticacionService service) : ControllerBase
{
    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting(PoliticasApi.InicioSesion)]
    [ProducesResponseType<UsuarioDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorDto>(StatusCodes.Status401Unauthorized)]
    public async Task<UsuarioDto> Login(IniciarSesionDto datos, CancellationToken cancellationToken)
    {
        var usuario = await service.ValidarCredencialesAsync(datos, cancellationToken);
        await IniciarSesionAsync(HttpContext, usuario);
        return usuario;
    }

    [HttpGet("me")]
    [ProducesResponseType<UsuarioDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorDto>(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Yo(CancellationToken cancellationToken)
    {
        // Se consulta la base en vez de confiar solo en la cookie: si el usuario fue
        // desactivado, su sesión deja de servir.
        if (int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id)
            && await service.ObtenerUsuarioActivoAsync(id, cancellationToken) is { } usuario)
        {
            return Ok(usuario);
        }

        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return Unauthorized(new ErrorDto("Inicia sesión para continuar.", StatusCodes.Status401Unauthorized, HttpContext.TraceIdentifier));
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    private static Task IniciarSesionAsync(HttpContext contexto, UsuarioDto usuario)
    {
        var identidad = new ClaimsIdentity(
            [
                new Claim(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
                new Claim(ClaimTypes.Name, usuario.Nombre),
                new Claim(ClaimTypes.Role, usuario.Rol),
            ],
            CookieAuthenticationDefaults.AuthenticationScheme);
        return contexto.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme, new ClaimsPrincipal(identidad));
    }
}
