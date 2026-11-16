FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY KidsfitCRM.slnx ./
COPY src/KidsfitCRM.Api/KidsfitCRM.Api.csproj src/KidsfitCRM.Api/
RUN dotnet restore src/KidsfitCRM.Api/KidsfitCRM.Api.csproj
COPY src/KidsfitCRM.Api/ src/KidsfitCRM.Api/
RUN dotnet publish src/KidsfitCRM.Api/KidsfitCRM.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
# The non-root .NET process needs write access to the persistent private evidence volume.
RUN mkdir -p /var/lib/kidsfit-crm/storage && chown -R $APP_UID:$APP_UID /var/lib/kidsfit-crm/storage
EXPOSE 8080
USER $APP_UID
ENTRYPOINT ["dotnet", "KidsfitCRM.Api.dll"]
