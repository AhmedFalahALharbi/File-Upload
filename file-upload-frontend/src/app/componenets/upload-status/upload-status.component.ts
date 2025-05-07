import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadState } from '../../models/upload-status.model';

@Component({
  selector: 'app-upload-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upload-status.component.html',
  styleUrls: ['./upload-status.component.css']
})
export class UploadStatusComponent {
  @Input() processingId: string | null = null;
  @Input() status: UploadState | null = null;
  @Input() errorMessage: string | null = null;
  
  readonly UploadState = UploadState;
  
  getStatusClass(): string {
    if (!this.status) return '';
    
    switch (this.status) {
      case UploadState.Completed:
        return 'status-success';
      case UploadState.Failed:
      case UploadState.VirusDetected:
        return 'status-error';
      default:
        return 'status-info';
    }
  }
  
  getStatusDescription(): string {
    if (!this.status) return '';
    
    switch (this.status) {
      case UploadState.Pending:
        return 'File is queued for processing.';
      case UploadState.Scanning:
        return 'File is being scanned for viruses.';
      case UploadState.Clean:
        return 'File passed virus scan and is being processed.';
      case UploadState.Processing:
        return 'File is being processed.';
      case UploadState.Completed:
        return 'File has been successfully uploaded and processed.';
      case UploadState.VirusDetected:
        return 'A potential security threat was detected in the file.';
      case UploadState.Failed:
        return this.errorMessage || 'File processing failed.';
      default:
        return '';
    }
  }
}