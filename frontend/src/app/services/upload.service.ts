import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  private apiUrl = '/api';

  constructor(private http: HttpClient) {}

  uploadIdProof(file: File): Observable<{ message: string; url: string }> {
    const formData = new FormData();
    formData.append('idProof', file);

    // No need to set Content-Type manually, HttpClient will set it to multipart/form-data with the correct boundary
    return this.http.post<{ message: string; url: string }>(`${this.apiUrl}/upload`, formData);
  }

  uploadMultipleImages(files: File[]): Observable<{ message: string; urls: string[] }> {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }
    return this.http.post<{ message: string; urls: string[] }>(`${this.apiUrl}/upload/multiple`, formData);
  }
}
