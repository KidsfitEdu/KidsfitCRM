using System.IO.Compression;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Xml;
using System.Xml.Linq;
using KidsfitCRM.Api.Common;

namespace KidsfitCRM.Api.Features;

public sealed record SchoolImportIssue(int Row, string Code, string Message);
public sealed record SchoolImportRow(int Row, string SchoolCode, string UnitType, string Name, string Province, string Ward,
    string? Address, string? ContactName, string? ContactPosition, string? ContactPhone, string? Email, string? SchoolPhone, string? Note, string ContentHash);
public sealed record ParsedSchoolWorkbook(string FileHash, SchoolImportRow[] Rows, SchoolImportIssue[] Warnings)
{
    public int SchoolCount => Rows.Count(x => x.UnitType == "MAIN");
    public int BranchCount => Rows.Count(x => x.UnitType == "BRANCH");
}

public static class SchoolWorkbookReader
{
    public const int MaxFileBytes = 2 * 1024 * 1024;
    private static readonly string[] Headers = ["Mã trường chính", "Loại đơn vị", "Tên đơn vị", "Tỉnh / Thành phố", "Phường / Xã", "Địa chỉ", "Người liên hệ", "Chức vụ", "Số điện thoại", "Email", "SĐT trường", "Ghi chú"];
    private static readonly XNamespace S = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";

    internal static string ProposedMainFingerprint(string code, string name, string province, string ward, string? address,
        string? contactName, string? contactPosition, string? contactPhone, string? email) =>
        ChannelSalesValidation.Fingerprint(new string?[] { code, "Trường chính", name, province, ward, address, contactName, contactPosition, contactPhone, email, null, null });

    public static ParsedSchoolWorkbook Read(byte[] bytes)
    {
        if (bytes.Length == 0 || bytes.Length > MaxFileBytes) throw Invalid("Chỉ nhận file .xlsx tối đa 2 MB.");
        try
        {
            using var zip = new ZipArchive(new MemoryStream(bytes), ZipArchiveMode.Read);
            if (zip.Entries.Count > 200 || zip.Entries.Sum(x => x.Length) > 20 * 1024 * 1024 || zip.Entries.Any(x => x.FullName.Contains("vbaProject", StringComparison.OrdinalIgnoreCase)))
                throw Invalid("File quá lớn hoặc chứa macro không được hỗ trợ.");
            XDocument Xml(string path)
            {
                var entry = zip.GetEntry(path) ?? throw Invalid("File Excel thiếu thành phần bắt buộc.");
                using var stream = entry.Open();
                using var reader = XmlReader.Create(stream, new XmlReaderSettings { DtdProcessing = DtdProcessing.Prohibit, XmlResolver = null, MaxCharactersInDocument = 20 * 1024 * 1024 });
                return XDocument.Load(reader);
            }
            var workbook = Xml("xl/workbook.xml");
            var sheet = workbook.Descendants(S + "sheet").SingleOrDefault(x => (string?)x.Attribute("name") == "DANH_SACH_TRUONG")
                ?? throw Invalid("Cần sheet DANH_SACH_TRUONG đúng mẫu đã cung cấp.");
            var relationshipId = (string?)sheet.Attribute(XName.Get("id", "http://schemas.openxmlformats.org/officeDocument/2006/relationships"));
            var relationship = Xml("xl/_rels/workbook.xml.rels").Root!.Elements().SingleOrDefault(x => (string?)x.Attribute("Id") == relationshipId);
            var target = (string?)relationship?.Attribute("Target") ?? throw Invalid("Không đọc được sheet trường học.");
            if ((string?)relationship?.Attribute("TargetMode") == "External" || target.Contains("..") || target.Contains('\\')) throw Invalid("Đường dẫn sheet không hợp lệ.");
            var path = target.StartsWith('/') ? target.TrimStart('/') : "xl/" + target;
            var shared = zip.GetEntry("xl/sharedStrings.xml") is null ? [] : Xml("xl/sharedStrings.xml").Descendants(S + "si").Select(x => string.Concat(x.Descendants(S + "t").Select(t => t.Value))).ToArray();
            var document = Xml(path);
            if (document.Descendants(S + "f").Any() || document.Descendants(S + "mergeCell").Any()) throw Invalid("Mẫu nhập không nhận công thức hoặc ô gộp.");
            var rawRows = document.Descendants(S + "row").ToArray();
            if (rawRows.Length > 5001) throw Invalid("Mỗi lần nhập tối đa 5.000 dòng.");
            var rows = new List<SchoolImportRow>();
            var warnings = new List<SchoolImportIssue>();
            var seenHeaders = false;
            foreach (var raw in rawRows)
            {
                var rowNumber = (int?)raw.Attribute("r") ?? throw Invalid("Thiếu số dòng.");
                if (rowNumber > 5001) throw Invalid("Dữ liệu vượt phạm vi 5.000 dòng.");
                var values = new string?[12];
                var columns = new HashSet<int>();
                foreach (var cell in raw.Elements(S + "c"))
                {
                    var reference = (string?)cell.Attribute("r") ?? "";
                    var letters = new string(reference.TakeWhile(char.IsLetter).ToArray());
                    var column = letters.Aggregate(0, (v, c) => v * 26 + c - 'A' + 1) - 1;
                    var type = (string?)cell.Attribute("t");
                    var value = type == "inlineStr" ? string.Concat(cell.Descendants(S + "t").Select(x => x.Value)) : cell.Element(S + "v")?.Value;
                    if (type == "s") value = int.TryParse(value, out var index) && index >= 0 && index < shared.Length ? shared[index] : throw Invalid("Chuỗi dùng chung không hợp lệ.");
                    value = string.IsNullOrWhiteSpace(value) ? null : value.Trim().Normalize(NormalizationForm.FormC);
                    if (column is < 0 or > 11) { if (value is not null) throw Invalid("Mẫu chỉ nhận 12 cột A:L."); continue; }
                    if (!columns.Add(column)) throw Invalid("Ô bị trùng trong file Excel.");
                    values[column] = value;
                    if (value?.Length > new[] { 64, 30, 500, 100, 100, 500, 500, 120, 40, 190, 40, 4000 }[column]) throw Invalid($"Dòng {rowNumber}, cột {letters} vượt độ dài cho phép.");
                }
                if (rowNumber == 1)
                {
                    if (!values.SequenceEqual(Headers)) throw Invalid("Tiêu đề A1:L1 không khớp mẫu CRM trường học.");
                    seenHeaders = true;
                    continue;
                }
                if (values.All(x => x is null)) continue;
                if (!seenHeaders) throw Invalid("Thiếu dòng tiêu đề.");
                if (values.Take(5).Any(string.IsNullOrWhiteSpace)) throw Invalid($"Dòng {rowNumber}: cần mã, loại, tên, tỉnh và phường/xã.");
                var code = values[0]!.ToUpperInvariant();
                if (!Regex.IsMatch(code, "^[A-Z0-9_-]{1,64}$")) throw Invalid($"Dòng {rowNumber}: mã trường không hợp lệ.");
                var kind = values[1] switch { "Trường chính" => "MAIN", "Phân hiệu" => "BRANCH", _ => throw Invalid($"Dòng {rowNumber}: loại đơn vị không hợp lệ.") };
                if (kind == "MAIN" && values[2]!.Length > 500) throw Invalid($"Dòng {rowNumber}: tên trường chính tối đa 500 ký tự.");
                if (kind == "MAIN" && values[6]?.Length > 500) throw Invalid($"Dòng {rowNumber}: người liên hệ trường chính tối đa 500 ký tự.");
                if (values[6] is not null && values[6]!.All(char.IsDigit)) warnings.Add(new(rowNumber, "CONTACT_COLUMN_REVIEW", "Người liên hệ có dạng số; cần kiểm tra lệch cột."));
                if (values[2]!.Contains("Phân hiệu 2-", StringComparison.OrdinalIgnoreCase)) warnings.Add(new(rowNumber, "COMBINED_BRANCH", "Có thể chứa nhiều phân hiệu trong một ô; giữ nguyên để rà soát."));
                if (values[8] is null && values[10] is null) warnings.Add(new(rowNumber, "MISSING_PHONE", "Chưa có số điện thoại liên hệ hoặc số trường."));
                var hash = ChannelSalesValidation.Fingerprint(values);
                rows.Add(new(rowNumber, code, kind, values[2]!, values[3]!, values[4]!, values[5], values[6], values[7], values[8], values[9], values[10], values[11], hash));
            }
            if (!seenHeaders || rows.Count == 0) throw Invalid("File chưa có dữ liệu trường học.");
            var groups = rows.GroupBy(x => x.SchoolCode).ToArray();
            if (groups.Any(g => g.Count(x => x.UnitType == "MAIN") != 1)) throw Invalid("Mỗi mã trường phải có đúng một dòng Trường chính.");
            if (rows.GroupBy(x => x.ContentHash).Any(g => g.Count() > 1)) throw Invalid("File có dòng giống hệt nhau. Vui lòng loại bỏ dòng trùng trước khi nhập.");
            foreach (var group in rows.Where(x => x.UnitType == "BRANCH").GroupBy(x => new { x.SchoolCode, x.Name }).Where(g => g.Count() > 1))
                foreach (var row in group) warnings.Add(new(row.Row, "REPEATED_BRANCH_NAME", "Tên phân hiệu lặp lại, không tự gộp các đầu mối khác nhau."));
            return new(Convert.ToHexString(SHA256.HashData(bytes)), rows.ToArray(), warnings.ToArray());
        }
        catch (Exception ex) when (ex is InvalidDataException or XmlException or InvalidOperationException or OverflowException or ArgumentException)
        {
            throw Invalid("Không đọc được file .xlsx. Hãy dùng đúng mẫu, không macro/công thức.");
        }
    }

    private static ApiValidationException Invalid(string message) => ApiValidationException.For("file", message);
}
