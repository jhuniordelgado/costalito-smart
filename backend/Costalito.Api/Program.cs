using Costalito.Api.Data;
using Costalito.Api.DTOs;
using Costalito.Api.Middleware;
using Costalito.Api.Repositories;
using Costalito.Api.Services;
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
builder.Services.AddAuthorization();
builder.Services.AddScoped<IGraneroRepository, GraneroRepository>();
builder.Services.AddScoped<IGraneroService, GraneroService>();
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
    .AllowAnyMethod();
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
app.UseAuthorization();
app.MapControllers();
app.Run();

public partial class Program { }
