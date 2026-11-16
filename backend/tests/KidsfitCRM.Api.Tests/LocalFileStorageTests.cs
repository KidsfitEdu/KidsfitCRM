using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Hosting.Internal;

namespace KidsfitCRM.Api.Tests;

public sealed class LocalFileStorageTests : IDisposable
{
    private readonly string root = Path.Combine(Path.GetTempPath(), "kidsfit-storage-unit-" + Guid.NewGuid().ToString("N"));
    private LocalFileStorageService Create()
    {
        var settings = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Storage:RootPath"] = root })
            .Build();
        return new LocalFileStorageService(settings, new HostingEnvironment
        {
            EnvironmentName = Environments.Development,
            ContentRootPath = root
        });
    }

    [Fact]
    public void Development_without_override_creates_storage_under_project_root()
    {
        var projectRoot = Path.Combine(root, "backend", "src", "KidsfitCRM.Api");
        var storage = new LocalFileStorageService(
            new ConfigurationBuilder().Build(),
            new HostingEnvironment
            {
                EnvironmentName = Environments.Development,
                ContentRootPath = projectRoot
            });
        Assert.True(Directory.Exists(Path.Combine(projectRoot, "Storage")));
        Assert.True(Directory.Exists(projectRoot));
    }

    [Fact]
    public async Task Saves_private_pdf_and_reads_exact_bytes_after_reopening_storage()
    {
        var bytes = "%PDF-1.4\nSynthetic contract"u8.ToArray();
        var storage = Create();
        await using var upload = new MemoryStream(bytes);
        var saved = await storage.SaveAsync(upload, "CONTRACT", CancellationToken.None);
        Assert.StartsWith("contracts/", saved.StorageKey);
        Assert.Equal("application/pdf", saved.MimeType);
        Assert.Equal(bytes.LongLength, saved.FileSize);
        Assert.Equal(Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(bytes)), saved.Sha256);
        using (var downloaded = Create().OpenRead(saved.StorageKey))
        {
            using var output = new MemoryStream();
            await downloaded.CopyToAsync(output);
            Assert.Equal(bytes, output.ToArray());
        }
        storage.Delete(saved.StorageKey);
        Assert.Throws<FileNotFoundException>(() => Create().OpenRead(saved.StorageKey));
    }

    [Fact]
    public async Task Repeated_uploads_never_overwrite_previous_evidence()
    {
        var storage = Create();
        var bytes = new byte[] { 0xFF, 0xD8, 0xFF, 0xD9 };
        var one = await storage.SaveAsync(new MemoryStream(bytes), "RECEIPT", CancellationToken.None);
        var two = await storage.SaveAsync(new MemoryStream(bytes), "RECEIPT", CancellationToken.None);
        Assert.NotEqual(one.StorageKey, two.StorageKey);
        Assert.Equal("image/jpeg", two.MimeType);
        storage.Delete(one.StorageKey);
        using var stillThere = storage.OpenRead(two.StorageKey);
        Assert.Equal(bytes, await ReadAsync(stillThere));
    }

    [Fact]
    public async Task Rejects_unsupported_files_and_removes_partial_disk_writes()
    {
        var storage = Create();
        await Assert.ThrowsAsync<ApiValidationException>(() =>
            storage.SaveAsync(new MemoryStream("not-an-image"u8.ToArray()), "PAYOUT", CancellationToken.None));
        await Assert.ThrowsAsync<ApiValidationException>(() =>
            storage.SaveAsync(new MemoryStream("%PDF-1.4\n"u8.ToArray()), "RECEIPT", CancellationToken.None));
        await Assert.ThrowsAsync<ApiValidationException>(() =>
            storage.SaveAsync(new MemoryStream(new byte[LocalFileStorageService.MaxFileBytes + 1]), "CONTRACT", CancellationToken.None));
        Assert.Empty(Directory.EnumerateFiles(root, "*", SearchOption.AllDirectories));
    }

    [Fact]
    public void Rejects_untrusted_path_values()
    {
        var storage = Create();
        Assert.Throws<InvalidOperationException>(() => storage.OpenRead("../private/secret"));
        Assert.Throws<InvalidOperationException>(() => storage.Delete("contracts/../../secrets"));
    }

    private static async Task<byte[]> ReadAsync(Stream stream)
    {
        using var output = new MemoryStream();
        await stream.CopyToAsync(output);
        return output.ToArray();
    }

    public void Dispose()
    {
        if (Directory.Exists(root)) Directory.Delete(root, recursive: true);
    }
}
