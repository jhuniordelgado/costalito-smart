using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Costalito.Api.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/health")]
public sealed class SaludController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(new { status = "ok", service = "costalito-smart-api" });
}
