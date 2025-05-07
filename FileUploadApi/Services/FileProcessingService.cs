using System;
using System.Threading;
using System.Threading.Tasks;
using FileUploadApi.Models;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace FileUploadApi.Services
{
    public class FileProcessingService : BackgroundService
    {
        private readonly IBackgroundTaskQueue _taskQueue;
        private readonly ILogger<FileProcessingService> _logger;
        private readonly IServiceProvider _serviceProvider;

        public FileProcessingService(
            IBackgroundTaskQueue taskQueue,
            ILogger<FileProcessingService> logger,
            IServiceProvider serviceProvider)
        {
            _taskQueue = taskQueue;
            _logger = logger;
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("FileProcessingService started.");
            while (!stoppingToken.IsCancellationRequested)
            {
                var workItem = await _taskQueue.DequeueAsync(stoppingToken);
                try
                {
                    await workItem(_serviceProvider, stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred executing work item.");
                }
            }
        }
    }
}
