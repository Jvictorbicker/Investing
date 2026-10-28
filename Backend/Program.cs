using AtivoApi.Data;
using AtivoApi.Services;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

// ============================================================
// CORS
// ============================================================

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5500",
                "http://127.0.0.1:5500"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// ============================================================
// BANCO DE DADOS
// ============================================================

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("Default")
    )
);

// ============================================================
// AUTENTICAÇÃO POR COOKIE
// ============================================================

builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.Cookie.SecurePolicy = CookieSecurePolicy.None;

        options.ExpireTimeSpan = TimeSpan.FromDays(7);
        options.SlidingExpiration = true;

        // API retorna 401 em vez de redirecionar para a página de login.
        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };

        // API retorna 403 em vez de redirecionar.
        options.Events.OnRedirectToAccessDenied = context =>
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
    });

// ============================================================
// SERVIÇOS
// ============================================================

builder.Services.AddHttpClient();

builder.Services.AddScoped<AtivoService>();
builder.Services.AddScoped<CarteiraService>();

// ============================================================
// CONTROLLERS E JSON
// ============================================================

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler =
            System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

// ============================================================
// SWAGGER
// ============================================================

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ============================================================
// CONSTRUÇÃO DA APLICAÇÃO
// ============================================================

var app = builder.Build();

// ============================================================
// SWAGGER - SOMENTE DESENVOLVIMENTO
// ============================================================

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// ============================================================
// ARQUIVOS ESTÁTICOS
// ============================================================

// Arquivos estáticos da pasta wwwroot, caso exista.
app.UseStaticFiles();

// Arquivos estáticos da pasta FrontEnd, um nível acima de Backend.
var frontendPath = Path.GetFullPath(
    Path.Combine(builder.Environment.ContentRootPath, "..", "FrontEnd")
);

if (Directory.Exists(frontendPath))
{
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(frontendPath),
        RequestPath = ""
    });
}

// ============================================================
// PÁGINA INICIAL
// ============================================================

// Ao acessar a raiz, redireciona para login.html.
app.MapGet("/", context =>
{
    context.Response.Redirect("/login.html");
    return Task.CompletedTask;
});

// ============================================================
// MIDDLEWARE
// ============================================================

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

// ============================================================
// ROTAS DA API
// ============================================================

app.MapControllers();

// ============================================================
// EXECUÇÃO
// ============================================================

app.Run();