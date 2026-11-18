using System.Data;
using Costalito.Api.Data;
using Costalito.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Costalito.Api.Repositories;

public sealed class UsuarioRepository(CostalitoDbContext db) : IUsuarioRepository
{
    public Task<bool> ExisteAlgunoAsync(CancellationToken cancellationToken) =>
        db.Usuarios.AnyAsync(cancellationToken);

    public Task<Usuario?> BuscarPorCedulaAsync(string cedula, CancellationToken cancellationToken) =>
        db.Usuarios.AsNoTracking()
            .FirstOrDefaultAsync(usuario => usuario.Cedula == cedula, cancellationToken);

    public Task<Usuario?> BuscarPorIdAsync(int usuarioId, CancellationToken cancellationToken) =>
        db.Usuarios.AsNoTracking()
            .FirstOrDefaultAsync(usuario => usuario.UsuarioId == usuarioId, cancellationToken);

    /// <summary>
    /// Inserta el usuario solo si la tabla sigue vacía. La transacción serializable evita
    /// que dos navegadores creen cada uno "el primer" administrador al mismo tiempo.
    /// Devuelve null si ya existía alguien.
    /// </summary>
    public async Task<Usuario?> CrearPrimerAdministradorAsync(Usuario usuario, CancellationToken cancellationToken)
    {
        await using var transaccion = await db.Database.BeginTransactionAsync(
            IsolationLevel.Serializable, cancellationToken);

        if (await db.Usuarios.AnyAsync(cancellationToken))
            return null;

        db.Usuarios.Add(usuario);
        await db.SaveChangesAsync(cancellationToken);
        await transaccion.CommitAsync(cancellationToken);
        return usuario;
    }
}
