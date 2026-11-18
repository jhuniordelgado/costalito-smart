using Microsoft.Extensions.Options;

namespace Costalito.Api.Services;

/// <summary>Sección "Granero" de appsettings.json.</summary>
public sealed class OpcionesGranero
{
    public const string Seccion = "Granero";

    /// <summary>Zona horaria del local (IANA). Las fechas se guardan en esta hora.</summary>
    public string ZonaHoraria { get; set; } = "America/Bogota";

    /// <summary>Días de ventas y abonos que se envían a Angular al abrir la aplicación.</summary>
    public int DiasHistorialInicial { get; set; } = 90;
}

/// <summary>
/// Única fuente de "ahora" para la API. Todas las fechas (ventas, abonos, compras, códigos)
/// se toman de aquí en la hora del granero, así no dependen de la zona horaria del
/// servidor donde se despliegue.
/// </summary>
public interface IRelojGranero
{
    /// <summary>Fecha y hora local del granero, sin zona (Kind = Unspecified), como se guarda en SQL.</summary>
    DateTime Ahora { get; }
    DateOnly Hoy { get; }
}

public sealed class RelojGranero : IRelojGranero
{
    private readonly TimeProvider tiempo;
    private readonly TimeZoneInfo zona;

    public RelojGranero(TimeProvider tiempo, IOptions<OpcionesGranero> opciones)
    {
        this.tiempo = tiempo;
        try
        {
            zona = TimeZoneInfo.FindSystemTimeZoneById(opciones.Value.ZonaHoraria);
        }
        catch (Exception error) when (error is TimeZoneNotFoundException or InvalidTimeZoneException)
        {
            throw new InvalidOperationException(
                $"La zona horaria '{opciones.Value.ZonaHoraria}' de Granero:ZonaHoraria no existe.", error);
        }
    }

    // DateTimeOffset.DateTime devuelve Kind = Unspecified: se serializa sin desfase, igual
    // que las fechas que vienen de SQL Server, y el navegador la lee como hora local.
    public DateTime Ahora => TimeZoneInfo.ConvertTime(tiempo.GetUtcNow(), zona).DateTime;

    public DateOnly Hoy => DateOnly.FromDateTime(Ahora);
}
