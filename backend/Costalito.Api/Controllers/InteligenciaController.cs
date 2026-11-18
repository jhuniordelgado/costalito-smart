using Costalito.Api.DTOs;
using Costalito.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Costalito.Api.Controllers;

/// <summary>
/// Predicciones de demanda y sugerencias de compra del servicio inteligente (Python).
/// Siempre responde 200: si Python no está disponible, Disponible = false y Mensaje dice por qué.
/// </summary>
[ApiController]
[Route("api/intelligence")]
public sealed class InteligenciaController(IServicioInteligente servicio) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<PrediccionesDto>(StatusCodes.Status200OK)]
    public Task<PrediccionesDto> Get(CancellationToken cancellationToken) =>
        servicio.ObtenerPrediccionesAsync(cancellationToken);
}
