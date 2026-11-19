using Costalito.Api.Models;

namespace Costalito.Api.Repositories;

public interface IUsuarioRepository
{
    Task<bool> ExisteAlgunoAsync(CancellationToken cancellationToken);
    Task<Usuario?> BuscarPorCedulaAsync(string cedula, CancellationToken cancellationToken);
    Task<Usuario?> BuscarPorIdAsync(int usuarioId, CancellationToken cancellationToken);
    Task<Usuario?> CrearPrimerAdministradorAsync(Usuario usuario, CancellationToken cancellationToken);
}
