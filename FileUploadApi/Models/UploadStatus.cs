namespace FileUploadApi.Models
{
    public enum UploadState
    {
        Pending,
        Scanning,
        Clean,
        VirusDetected,
        Processing,
        Completed,
        Failed
    }

    public class UploadStatus
    {
        public UploadState Status { get; set; }
        public string? ErrorMessage { get; set; }
    }
}
