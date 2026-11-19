using Costalito.Api.DTOs;

namespace Costalito.Api.Services;

public interface IAutenticacionService
{
    Task<EstadoInstalacionDto> ObtenerEstadoInstalacionAsync(CancellationToken cancellationToken);
    Task<UsuarioDto> CrearAdministradorAsync(CrearAdministradorDto datos, CancellationToken cancellationToken);
    Task<UsuarioDto> ValidarCredencialesAsync(IniciarSesionDto datos, CancellationToken cancellationToken);
    Task<UsuarioDto?> ObtenerUsuarioActivoAsync(int usuarioId, CancellationToken cancellationToken);
}
