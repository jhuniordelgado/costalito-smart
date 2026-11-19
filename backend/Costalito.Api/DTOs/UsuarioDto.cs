namespace Costalito.Api.DTOs;

public sealed record IniciarSesionDto(string? Cedula, string? Contrasena);

public sealed record CrearAdministradorDto(string? Cedula, string? Nombre, string? Contrasena);

public sealed record UsuarioDto(int Id, string Cedula, string Nombre, string Rol);

public sealed record EstadoInstalacionDto(bool NecesitaAdministrador);
