const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

interface ApiResponse<T = any> {
  success?: boolean;
  error?: string;
  message?: string;
  data?: T;
}

interface TranscriptionRequest {
  audio: File;
  model?: string;
  language?: string;
  smartFormat?: boolean;
  punctuate?: boolean;
  interimResults?: boolean;
}

interface TranscriptionResponse {
  success: boolean;
  transcript: string;
  confidence: number;
  words: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
  metadata: {
    model: string;
    language: string;
    audioDuration?: number;
    audioSize: number;
  };
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const response = await fetch(url, { ...defaultOptions, ...options });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Health check
  async healthCheck(): Promise<ApiResponse> {
    return this.request<ApiResponse>('/health');
  }

  // Check if backend is ready
  async isReady(): Promise<ApiResponse> {
    return this.request<ApiResponse>('/health/ready');
  }

  // Transcribe audio file
  async transcribeAudio(request: TranscriptionRequest): Promise<TranscriptionResponse> {
    const formData = new FormData();
    formData.append('audio', request.audio);
    
    if (request.model) formData.append('model', request.model);
    if (request.language) formData.append('language', request.language);
    if (request.smartFormat !== undefined) formData.append('smartFormat', request.smartFormat.toString());
    if (request.punctuate !== undefined) formData.append('punctuate', request.punctuate.toString());
    if (request.interimResults !== undefined) formData.append('interimResults', request.interimResults.toString());

    const url = `${this.baseUrl}/deepgram/transcribe`;
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Transcription failed! status: ${response.status}`);
    }

    return response.json();
  }

  // Validate Deepgram API key
  async validateDeepgramKey(): Promise<ApiResponse> {
    return this.request<ApiResponse>('/deepgram/validate-key', {
      method: 'POST',
    });
  }

  // Recommend Places search term via Gemini
  async recommendSearchTerm(text: string): Promise<{ success: boolean; term: string }> {
    return this.request<{ success: boolean; term: string }>(
      '/gemini/recommend-search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      }
    );
  }

  // Get available Deepgram models
  async getDeepgramModels(): Promise<ApiResponse> {
    return this.request<ApiResponse>('/deepgram/models');
  }

  // Get Maps API key from backend
  async getMapsApiKey(): Promise<{ mapsApiKey: string | null }> {
    return this.request<{ mapsApiKey: string | null }>('/config/maps-key');
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient();

// Export types for use in components
export type { ApiResponse, TranscriptionRequest, TranscriptionResponse }; 