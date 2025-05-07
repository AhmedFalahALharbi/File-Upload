import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileUploadComponent } from './componenets/file-upload/file-upload.component';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FileUploadComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Secure File Upload';
}