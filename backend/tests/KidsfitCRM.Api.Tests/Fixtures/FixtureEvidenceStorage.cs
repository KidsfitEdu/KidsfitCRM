using KidsfitCRM.Api.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Hosting.Internal;

namespace KidsfitCRM.Api.Tests;

/// <summary>Isolated filesystem fixture for evidence metadata and download authorization tests.</summary>
public static class FixtureEvidenceStorage
{
    private static readonly Lazy<IFileStorageService> Instance = new(() =>
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Storage:RootPath"] = Path.Combine(Path.GetTempPath(), "kidsfit-crm-tests", Guid.NewGuid().ToString("N"))
            }).Build();
        return new LocalFileStorageService(config, new HostingEnvironment
        {
            EnvironmentName = Environments.Development,
            ContentRootPath = Path.GetTempPath()
        });
    });

    public static IFileStorageService Service => Instance.Value;

    public static StoredFile Save(byte[] bytes, string kind = "CONTRACT")
    {
        // Fixtures are created inside asynchronous xUnit tests: run the async writer on
        // the thread pool to avoid blocking a captured test synchronization context.
        return Task.Run(async () =>
        {
            await using var source = new MemoryStream(bytes);
            return await Service.SaveAsync(source, kind, CancellationToken.None);
        }).GetAwaiter().GetResult();
    }
}
