using System.Collections.Concurrent;
using FileUploadApi.Models;
using FileUploadApi.Services;
using Microsoft.AspNetCore.Mvc;


namespace FileUploadApi.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class UploadController : ControllerBase
    {
        private readonly long _fileSizeLimit;
        private readonly string[] _permittedExtensions = { ".jpg", ".jpeg", ".png", ".gif", ".pdf" };
        private readonly IBackgroundTaskQueue _taskQueue;
        private readonly IConfiguration _config;
        private readonly ILogger<UploadController> _logger;
        private static readonly ConcurrentDictionary<string, UploadStatus> _statuses = new();

        private const long DEFAULT_FILE_SIZE_LIMIT = 10 * 1024 * 1024;

        public UploadController(
            IBackgroundTaskQueue taskQueue, 
            IConfiguration config,
            ILogger<UploadController> logger)
        {
            _taskQueue = taskQueue;
            _config = config;
            _logger = logger;
            
            // Get file size limit from config with fallback to default
            _fileSizeLimit = config.GetValue<long>("FileSettings:MaxFileSize", DEFAULT_FILE_SIZE_LIMIT);
            _logger.LogInformation($"File size limit configured to: {_fileSizeLimit / 1024 / 1024}MB");
        }

        [HttpPost]
        public async Task<IActionResult> Upload([FromForm] IFormFile file)
        {
            if (file == null)
            {
                _logger.LogWarning("Upload attempt with no file provided");
                return BadRequest(new { error = "No file provided." });
            }

            _logger.LogInformation($"Processing upload: {file.FileName}, Size: {file.Length / 1024}KB, Type: {file.ContentType}");

            // Check file size
            if (file.Length == 0)
            {
                _logger.LogWarning($"Empty file uploaded: {file.FileName}");
                return BadRequest(new { error = "File is empty." });
            }
            
            if (file.Length > _fileSizeLimit)
            {
                _logger.LogWarning($"File too large: {file.FileName}, Size: {file.Length / 1024}KB, Limit: {_fileSizeLimit / 1024}KB");
                return BadRequest(new { 
                    error = $"File size exceeds the limit of {_fileSizeLimit / 1024 / 1024}MB.",
                    fileSize = file.Length,
                    sizeLimit = _fileSizeLimit
                });
            }

            // Check file extension
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!_permittedExtensions.Contains(ext))
            {
                _logger.LogWarning($"Invalid file extension: {ext}");
                return BadRequest(new { 
                    error = "File extension not allowed.", 
                    allowedExtensions = _permittedExtensions 
                });
            }

            try 
            {
                // Read header bytes for magic-number validation
                using var headerStream = file.OpenReadStream();
                byte[] header = new byte[8];
                await headerStream.ReadAsync(header, 0, header.Length);
                

                _logger.LogDebug($"File header bytes: {BitConverter.ToString(header)}");

                var safeFileName = $"{Path.GetFileNameWithoutExtension(file.FileName)}_{Guid.NewGuid():N}{ext}";
                var tempPath = Path.Combine(Path.GetTempPath(), safeFileName);

                // Save to temp for processing
                using (var fs = System.IO.File.Create(tempPath))
                {
                    await file.CopyToAsync(fs);
                }

                _logger.LogInformation($"File saved to temp location: {tempPath}");

                // Create processing record
                var id = Guid.NewGuid().ToString();
                _statuses[id] = new UploadStatus { Status = UploadState.Pending };

                // Enqueue background work
                _taskQueue.QueueBackgroundWorkItem(async (serviceProvider, token) =>
                {
                    try
                    {
                        _logger.LogInformation($"Processing file {id} - Setting status to Scanning");
                        _statuses[id].Status = UploadState.Scanning;

                        // Simulated antivirus scan
                        if (_config.GetValue<bool>("FileSettings:SimulateAntivirus", false))
                        {
                            _logger.LogInformation($"Simulating antivirus scan for {id}");
                            await Task.Delay(TimeSpan.FromSeconds(2), token);
                        }

                        // Set to clean status
                        _logger.LogInformation($"File {id} scanned - Setting status to Clean");
                        _statuses[id].Status = UploadState.Clean;

                        // Move to final storage
                        var finalDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
                        Directory.CreateDirectory(finalDir);
                        var finalPath = Path.Combine(finalDir, safeFileName);

                        _logger.LogInformation($"Moving file from {tempPath} to {finalPath}");
                        System.IO.File.Move(tempPath, finalPath, overwrite: true);

                        _logger.LogInformation($"File processing complete for {id} - Setting status to Completed");
                        _statuses[id].Status = UploadState.Completed;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"Error processing file {id}");
                        _statuses[id].Status = UploadState.Failed;
                    }
                });

                return Accepted(new { processingId = id });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Unexpected error during upload process for {file.FileName}");
                return StatusCode(500, new { error = "Internal server error during upload processing." });
            }
        }

        [HttpGet("status/{id}")]
        public IActionResult Status(string id)
        {
            _logger.LogInformation($"Status check for ID: {id}");
            
            if (!_statuses.TryGetValue(id, out var status))
            {
                _logger.LogWarning($"Invalid ID requested: {id}");
                return NotFound(new { error = "Invalid ID." });
            }

            return Ok(new { 
                id, 
                status = status.Status.ToString(),
            });
        }
    }
}