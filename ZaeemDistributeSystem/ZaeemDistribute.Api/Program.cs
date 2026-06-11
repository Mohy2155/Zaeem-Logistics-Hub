using Scalar.AspNetCore;
using Microsoft.EntityFrameworkCore;
using ZaeemDistribute.Api.Models;

var builder = WebApplication.CreateBuilder(args);

// 1. ADD THIS: Define the CORS policy for Angular
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularApp", policy =>
    {
        policy.WithOrigins("http://localhost:4200") // Trust this exact URL
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddDbContext<ZaeemDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

app.MapOpenApi();
app.MapScalarApiReference();

// 2. ADD THIS: Enforce the CORS policy BEFORE mapping controllers
app.UseCors("AllowAngularApp"); 

app.UseAuthorization();
app.MapControllers();

app.Run();