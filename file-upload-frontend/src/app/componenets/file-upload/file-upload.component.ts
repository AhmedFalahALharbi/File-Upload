import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadService } from '../../services/upload.service';
import { UploadState } from '../../models/upload-status.model';
import { interval, Subscription } from 'rxjs';
import { take, takeWhile } from 'rxjs/operators';
import { UploadStatusComponent } from '../upload-status/upload-status.component';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule, UploadStatusComponent],
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.css']
})
export class FileUploadComponent {
  selectedFile: File | null = null;
  uploadProgress = 0;
  uploadStatus: string = '';
  processingId: string | null = null;
  error: string | null = null;
  statusPolling: Subscription | null = null;
  
  // For UI state management
  isUploading = false;
  isProcessing = false;
  isCompleted = false;
  
  // States to show friendly status messages
  readonly UploadState = UploadState;
  currentState: UploadState | null = null;

  constructor(private uploadService: UploadService) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.resetStatus();
    }
  }

  resetStatus(): void {
    this.uploadProgress = 0;
    this.uploadStatus = '';
    this.processingId = null;
    this.error = null;
    this.isUploading = false;
    this.isProcessing = false;
    this.isCompleted = false;
    this.currentState = null;
    
    if (this.statusPolling) {
      this.statusPolling.unsubscribe();
      this.statusPolling = null;
    }
  }

  uploadFile(): void {
    if (!this.selectedFile) {
      this.error = 'Please select a file to upload.';
      return;
    }

    this.resetStatus();
    this.isUploading = true;
    
    this.uploadService.uploadFile(this.selectedFile).subscribe({
      next: response => {
        this.uploadProgress = response.progress;
        
        if (response.processingId) {
          this.processingId = response.processingId;
          this.isUploading = false;
          this.isProcessing = true;
          this.startStatusPolling();
        }
        
        if (response.error) {
          this.handleError(response.error);
        }
      },
      error: err => this.handleError('Upload failed: ' + (err.message || 'Unknown error'))
    });
  }

  startStatusPolling(): void {
    if (!this.processingId) return;
    
    // Poll every 1 second
    this.statusPolling = interval(1000).pipe(
      takeWhile(() => this.isProcessing)
    ).subscribe(() => {
      this.checkStatus();
    });
  }

  checkStatus(): void {
    if (!this.processingId) return;
    
    this.uploadService.checkStatus(this.processingId).subscribe({
      next: response => {
        this.uploadStatus = response.status;
        this.currentState = UploadState[response.status as keyof typeof UploadState];
        
        if (response.errorMessage) {
          this.error = response.errorMessage;
        }
        
        // Check if processing is complete
        if (
          this.currentState === UploadState.Completed || 
          this.currentState === UploadState.Failed ||
          this.currentState === UploadState.VirusDetected
        ) {
          this.isProcessing = false;
          this.isCompleted = true;
          if (this.statusPolling) {
            this.statusPolling.unsubscribe();
            this.statusPolling = null;
          }
        }
      },
      error: err => this.handleError('Status check failed: ' + (err.message || 'Unknown error'))
    });
  }

  handleError(message: string): void {
    this.error = message;
    this.isUploading = false;
    this.isProcessing = false;
    this.isCompleted = true;
    
    if (this.statusPolling) {
      this.statusPolling.unsubscribe();
      this.statusPolling = null;
    }
  }

  reset(): void {
    this.selectedFile = null;
    this.resetStatus();
  }

  getStatusClass(): string {
    if (!this.currentState) return '';
    
    switch (this.currentState) {
      case UploadState.Completed:
        return 'status-success';
      case UploadState.Failed:
      case UploadState.VirusDetected:
        return 'status-error';
      default:
        return 'status-info';
    }
  }
}