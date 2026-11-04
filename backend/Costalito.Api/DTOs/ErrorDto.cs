namespace Costalito.Api.DTOs;

public sealed record ErrorDto(string Error, int Status, string TraceId);
