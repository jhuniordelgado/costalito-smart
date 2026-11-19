using System.Threading.RateLimiting;
using Costalito.Api.Controllers;
using Costalito.Api.Data;
using Costalito.Api.DTOs;
using Costalito.Api.Middleware;
using Costalito.Api.Models;
using Costalito.Api.Repositories;
using Costalito.Api.Services;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
var connectionString = builder.Configuration.GetConnectionString("Costalito");
if (string.IsNullOrWhiteSpace(connectionString))
    throw new InvalidOperationException("Configura ConnectionStrings:Costalito antes de iniciar la API.");

builder.Services.AddDbContext<CostalitoDbContext>(options => options.UseSqlServer(connectionString));
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
// Sesión con cookie HttpOnly. Como es una API, en vez de redirigir a una página de
// login se responde 401/403 en JSON, igual que los demás errores.
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "costalito.sesion";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
        options.ExpireTimeSpan = TimeSpan.FromHours(12);
        options.SlidingExpiration = true;
        options.Events.OnRedirectToLogin = context =>
            EscribirErrorSesionAsync(context.HttpContext, StatusCodes.Status401Unauthorized, "Inicia sesión para continuar.");
        options.Events.OnRedirectToAccessDenied = context =>
            EscribirErrorSesionAsync(context.HttpContext, StatusCodes.Status403Forbidden, "Tu usuario no tiene permiso para esta acción.");
    });
// Toda ruta exige sesión salvo las marcadas con [AllowAnonymous] (login, instalación, salud).
builder.Services.AddAuthorization(options =>
    options.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = (context, _) => new ValueTask(EscribirErrorSesionAsync(
        context.HttpContext, StatusCodes.Status429TooManyRequests,
        "Demasiados intentos. Espera un minuto e inténtalo de nuevo."));
    options.AddPolicy(PoliticasApi.InicioSesion, context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "desconocido",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1) }));
});
builder.Services.AddScoped<IGraneroRepository, GraneroRepository>();
builder.Services.AddScoped<IGraneroService, GraneroService>();
builder.Services.AddScoped<IUsuarioRepository, UsuarioRepository>();
builder.Services.AddScoped<IAutenticacionService, AutenticacionService>();
builder.Services.AddSingleton<IPasswordHasher<Usuario>, PasswordHasher<Usuario>>();
builder.Services.AddCors(options => options.AddPolicy("Frontend", policy =>
{
    policy.SetIsOriginAllowed(origin =>
    {
        if (origin == "http://localhost:4200")
            return true;

        // Angular may choose another local port when 4200 is already busy.
        return builder.Environment.IsDevelopment()
            && Uri.TryCreate(origin, UriKind.Absolute, out var uri)
            && uri.Scheme == Uri.UriSchemeHttp
            && (uri.Host == "localhost" || uri.Host == "127.0.0.1");
    })
    .AllowAnyHeader()
    .AllowAnyMethod()
    // necesario para que el navegador envíe la cookie de sesión desde Angular
    .AllowCredentials();
}));
builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var message = context.ModelState.Values
            .SelectMany(value => value.Errors)
            .Select(error => error.ErrorMessage)
            .FirstOrDefault(error => !string.IsNullOrWhiteSpace(error))
            ?? "Revisa los datos enviados.";
        return new BadRequestObjectResult(new ErrorDto(
            message, StatusCodes.Status400BadRequest, context.HttpContext.TraceIdentifier));
    };
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    var scriptsDirectory = Path.Combine(AppContext.BaseDirectory, "database");
    await DatabaseInitializer.InitializeAsync(
        connectionString,
        scriptsDirectory,
        app.Logger,
        app.Lifetime.ApplicationStopping);
}

app.UseMiddleware<ApiExceptionMiddleware>();
app.UseCors("Frontend");
app.UseSwagger();
app.UseSwaggerUI();
app.UseAuthentication();
app.UseRateLimiter();
app.UseAuthorization();
app.MapControllers();
app.Run();

static Task EscribirErrorSesionAsync(HttpContext context, int status, string message)
{
    context.Response.StatusCode = status;
    return context.Response.WriteAsJsonAsync(new ErrorDto(message, status, context.TraceIdentifier));
}

public partial class Program { }
