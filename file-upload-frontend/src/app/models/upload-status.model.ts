export enum UploadState {
    Pending = 'Pending',
    Scanning = 'Scanning',
    Clean = 'Clean',
    VirusDetected = 'VirusDetected',
    Processing = 'Processing',
    Completed = 'Completed',
    Failed = 'Failed'
  }
  
  export interface UploadStatus {
    id: string;
    status: UploadState;
    errorMessage?: string;
  }
  
  export interface UploadResponse {
    processingId: string;
  }
  
  export interface StatusResponse {
    id: string;
    status: string;
    errorMessage?: string;
  }