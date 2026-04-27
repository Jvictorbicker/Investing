using AtivoApi.Data;
using AtivoApi.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// CORS (equivalent to @CrossOrigin + CorsConfig)
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader());
});

// Database (use your provider — SQLite shown here, swap for SQL Server, Postgres, etc.)
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddHttpClient();
builder.Services.AddScoped<AtivoService>();
builder.Services.AddControllers();

var app = builder.Build();

// Auto-create tables on startup (replaces Spring's ddl-auto=update)
using (var scope = app.Services.CreateScope())
    scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.EnsureCreated();

app.UseCors();
app.MapControllers();
app.Run();