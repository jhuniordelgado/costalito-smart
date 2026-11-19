using System.Globalization;
using System.Text.RegularExpressions;
using Costalito.Api.DTOs;
using Costalito.Api.Models;
using Costalito.Api.Repositories;
using Microsoft.AspNetCore.Identity;

namespace Costalito.Api.Services;

/// <summary>
/// Reglas de las cuentas de usuario. Repite las mismas validaciones que hace el
/// formulario de entrada en Angular: el navegador frena rápido, pero la API decide.
/// </summary>
public sealed partial class AutenticacionService(
    IUsuarioRepository repositorio,
    IPasswordHasher<Usuario> hasher) : IAutenticacionService
{
    public const int CedulaMinima = 5;
    public const int CedulaMaxima = 20;
    public const int NombreMaximo = 100;
    public const int ContrasenaMinima = 8;
    public const int ContrasenaMaxima = 128;

    private const string CredencialesIncorrectas = "Cédula o contraseña incorrectos";

    public async Task<EstadoInstalacionDto> ObtenerEstadoInstalacionAsync(CancellationToken cancellationToken) =>
        new(!await repositorio.ExisteAlgunoAsync(cancellationToken));

    public async Task<UsuarioDto> CrearAdministradorAsync(CrearAdministradorDto datos, CancellationToken cancellationToken)
    {
        var cedula = ValidarCedula(datos.Cedula);
        // Igual que lim() en Angular: Trim(), un solo espacio entre palabras y MAYÚSCULAS
        var nombre = EspaciosRepetidos().Replace((datos.Nombre ?? string.Empty).Trim(), " ")
            .ToUpper(CultureInfo.GetCultureInfo("es-CO"));
        if (nombre.Length == 0)
            throw new ApiException("Escribe el nombre completo.", StatusCodes.Status400BadRequest);
        if (!SoloLetras().IsMatch(nombre))
            throw new ApiException("El nombre solo lleva letras, sin números ni símbolos.", StatusCodes.Status400BadRequest);
        if (nombre.Length > NombreMaximo)
            throw new ApiException($"El nombre admite máximo {NombreMaximo} caracteres.", StatusCodes.Status400BadRequest);

        var contrasena = datos.Contrasena ?? string.Empty;
        if (contrasena.Length < ContrasenaMinima)
            throw new ApiException($"La contraseña debe tener mínimo {ContrasenaMinima} caracteres.", StatusCodes.Status400BadRequest);
        if (contrasena.Length > ContrasenaMaxima)
            throw new ApiException($"La contraseña admite máximo {ContrasenaMaxima} caracteres.", StatusCodes.Status400BadRequest);

        var usuario = new Usuario { Cedula = cedula, Nombre = nombre, Rol = "ADMIN" };
        usuario.ContrasenaHash = hasher.HashPassword(usuario, contrasena);

        var creado = await repositorio.CrearPrimerAdministradorAsync(usuario, cancellationToken)
            ?? throw new ApiException("El sistema ya tiene usuarios: inicia sesión", StatusCodes.Status409Conflict);
        return ADto(creado);
    }

    public async Task<UsuarioDto> ValidarCredencialesAsync(IniciarSesionDto datos, CancellationToken cancellationToken)
    {
        var cedula = ValidarCedula(datos.Cedula);
        var contrasena = datos.Contrasena ?? string.Empty;
        if (contrasena.Length == 0)
            throw new ApiException("Escribe tu contraseña.", StatusCodes.Status400BadRequest);

        var usuario = await repositorio.BuscarPorCedulaAsync(cedula, cancellationToken);
        if (usuario is null || !usuario.Activo)
            throw new ApiException(CredencialesIncorrectas, StatusCodes.Status401Unauthorized);

        var resultado = hasher.VerifyHashedPassword(usuario, usuario.ContrasenaHash, contrasena);
        if (resultado == PasswordVerificationResult.Failed)
            throw new ApiException(CredencialesIncorrectas, StatusCodes.Status401Unauthorized);

        return ADto(usuario);
    }

    public async Task<UsuarioDto?> ObtenerUsuarioActivoAsync(int usuarioId, CancellationToken cancellationToken)
    {
        var usuario = await repositorio.BuscarPorIdAsync(usuarioId, cancellationToken);
        return usuario is { Activo: true } ? ADto(usuario) : null;
    }

    private static string ValidarCedula(string? valor)
    {
        var cedula = (valor ?? string.Empty).Trim();
        if (cedula.Length == 0)
            throw new ApiException("Escribe tu cédula.", StatusCodes.Status400BadRequest);
        if (!cedula.All(char.IsAsciiDigit))
            throw new ApiException("La cédula solo lleva números, sin puntos ni espacios.", StatusCodes.Status400BadRequest);
        if (cedula.Length is < CedulaMinima or > CedulaMaxima)
            throw new ApiException($"La cédula debe tener entre {CedulaMinima} y {CedulaMaxima} dígitos.", StatusCodes.Status400BadRequest);
        return cedula;
    }

    private static UsuarioDto ADto(Usuario usuario) =>
        new(usuario.UsuarioId, usuario.Cedula, usuario.Nombre, usuario.Rol);

    // Letras de cualquier idioma (tildes y ñ incluidas) con un espacio entre palabras
    [GeneratedRegex(@"^\p{L}+( \p{L}+)*$")]
    private static partial Regex SoloLetras();

    [GeneratedRegex(@"\s+")]
    private static partial Regex EspaciosRepetidos();
}
