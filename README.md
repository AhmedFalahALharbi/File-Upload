📁 Secure File Upload App (.NET Core + Angular)

This project demonstrates a secure file upload system with backend validation, simulated antivirus scanning, async processing, and status tracking, built using .NET Core and Angular.
🔧 Features
✅ Backend (.NET Core)

    Simulated Antivirus Scanning (with delay)

    Basic File Content Analysis (checks initial bytes)

    Filename Sanitization

    Rate Limiting (per IP or user)

    Error Handling (clear messages for every failure)

    Asynchronous File Processing using BackgroundService

    Status Tracking via Processing ID

    File Storage in a safe local folder (wwwroot or temp)

🧑‍💻 Frontend (Angular)

    Upload form with progress bar

    Sends file to backend with HttpClient

    Displays upload progress

    Polls backend for status updates

    Shows final result (success or error)

🚀 Getting Started
Prerequisites

    .NET SDK

    Node.js

    Angular CLI:

    npm install -g @angular/cli

Running the App

    Backend

cd backend-folder
dotnet run

Frontend

cd frontend-folder
npm install
ng serve

Open your browser at http://localhost:4200
