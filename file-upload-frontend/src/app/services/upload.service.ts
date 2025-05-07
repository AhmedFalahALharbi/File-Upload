import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, tap, switchMap, retry } from 'rxjs/operators';
import { UploadResponse, StatusResponse, UploadState } from '../models/upload-status.model';

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  private apiUrl = 'http://localhost:5103'; 
  private retryAttempts = 2; // Number of retries for status checks

  constructor(private http: HttpClient) {}

  uploadFile(file: File): Observable<{ 
    processingId?: string, 
    progress: number, 
    error?: string,
    errorDetails?: any
  }> {
    // Log file details for debugging
    console.log('Uploading file:', {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024).toFixed(2)} KB`,
      lastModified: new Date(file.lastModified).toLocaleString()
    });

    const formData = new FormData();
    formData.append('file', file);

    return this.http.post(`${this.apiUrl}/upload`, formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      tap(event => {
        // Log all events for debugging
        if (event.type !== HttpEventType.UploadProgress) {
          console.log('Upload event:', event);
        }
      }),
      map(event => {
        switch (event.type) {
          case HttpEventType.UploadProgress:
            const progress = Math.round(100 * event.loaded / (event.total || 1));
            return { progress };
          case HttpEventType.Response:
            return { 
              progress: 100, 
              processingId: (event.body as UploadResponse).processingId 
            };
          default:
            return { progress: 0 };
        }
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Upload error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error,
          url: error.url
        });

        let errorMessage = 'Upload failed';
        if (error.error && error.error.error) {
          errorMessage = error.error.error;
        }
        
        return of({ 
          progress: 0, 
          error: errorMessage,
          errorDetails: error.error
        });
      })
    );
  }


  checkStatus(processingId: string): Observable<StatusResponse> {
    return this.http.get<StatusResponse>(`${this.apiUrl}/upload/status/${processingId}`).pipe(
      retry(this.retryAttempts),
      tap(response => console.log('Status check response:', response)),
      catchError(error => {
        console.error('Status check error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error
        });
        
        return of({ 
          id: processingId, 
          status: UploadState.Failed, 
          errorMessage: error.error?.error || 'Failed to check status' 
        });
      })
    );
  }
  

  uploadAndMonitor(file: File, pollIntervalMs = 2000): Observable<{
    status: string,
    progress: number,
    processingId?: string,
    error?: string
  }> {
    return this.uploadFile(file).pipe(
      switchMap(uploadResult => {
        if (uploadResult.error) {
          return of({
            status: 'Failed',
            progress: 0,
            error: uploadResult.error
          });
        }
        
        if (!uploadResult.processingId) {
          return of({
            status: 'Failed',
            progress: uploadResult.progress,
            error: 'No processing ID received from server'
          });
        }
        
        // Start polling for status
        const processingId = uploadResult.processingId;
        
        const poll$ = new Observable<{
          status: string,
          progress: number,
          processingId: string,
          error?: string
        }>(observer => {
          const interval = setInterval(() => {
            this.checkStatus(processingId).subscribe(statusResult => {
              let progress = 100;
              let status = statusResult.status;
              
              // Map backend status to progress percentage
              if (status === UploadState.Pending) progress = 25;
              else if (status === UploadState.Scanning) progress = 50;
              else if (status === UploadState.Clean) progress = 75;
              else if (status === UploadState.Completed) progress = 100;
              else if (status === UploadState.Failed) progress = 0;
              
              observer.next({
                status,
                progress,
                processingId,
                error: statusResult.errorMessage
              });
              
              // Complete polling when we reach a terminal state
              if (
                status === UploadState.Completed || 
                status === UploadState.Failed
              ) {
                clearInterval(interval);
                observer.complete();
              }
            });
          }, pollIntervalMs);
          
          // Cleanup on unsubscribe
          return () => clearInterval(interval);
        });
        
        return poll$;
      })
    );
  }
}