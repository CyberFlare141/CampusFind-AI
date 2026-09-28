# CampusFind AI backend image (used by Render's Docker runtime; .NET is not a native Render runtime).
# Build context is this folder: CampusFindAI/backend

# --- Build stage ---------------------------------------------------------------------------------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore with only the project file first so a source-only change reuses the NuGet layer.
COPY CampusFindAI.Api.csproj ./
RUN dotnet restore CampusFindAI.Api.csproj

COPY . ./
RUN dotnet publish CampusFindAI.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

# --- Runtime stage -------------------------------------------------------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Render injects PORT at runtime and Program.cs binds to it; ASPNETCORE_URLS keeps plain
# `docker run -p 8080:8080` working. Secrets (JWT key, DATABASE_URL, SMTP, Google, Gemini) come from
# environment variables - never from this image.
ENV ASPNETCORE_ENVIRONMENT=Production \
    ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

COPY --from=build /app/publish ./

ENTRYPOINT ["dotnet", "CampusFindAI.Api.dll"]
