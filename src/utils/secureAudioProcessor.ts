import { apiClient, TranscriptionResponse } from './apiClient';

export interface SecureAudioConfig {
  model: string;
  language: string;
  smartFormat: boolean;
  punctuate: boolean;
  interimResults: boolean;
}

export interface TranscriptionResult {
  transcript: string;
  confidence: number;
  is_final: boolean;
}

export class SecureAudioProcessor {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private isRecording = false;
  private config: SecureAudioConfig;
  private audioChunks: Blob[] = [];
  private onTranscriptCallback: ((result: TranscriptionResult) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onAudioBlobCallback: ((blob: Blob) => void) | null = null;

  constructor(config: SecureAudioConfig) {
    this.config = config;
  }

  async startRecording(
    onTranscript: (result: TranscriptionResult) => void,
    onError: (error: string) => void,
    onAudioBlob?: (blob: Blob) => void
  ): Promise<void> {
    try {
      console.log('SecureAudioProcessor: Starting recording...');
      
      // Check if backend is ready
      try {
        const healthCheck = await apiClient.isReady();
        if (healthCheck.status !== 'ready') {
          throw new Error('Backend is not ready. Please check your configuration.');
        }
      } catch (error) {
        throw new Error(`Backend connection failed: ${error.message}`);
      }

          this.onTranscriptCallback = onTranscript;
    this.onErrorCallback = onError;
    this.onAudioBlobCallback = onAudioBlob;
    this.audioChunks = [];

      // Get microphone access
      console.log('SecureAudioProcessor: Requesting microphone access...');
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
          channelCount: 1,
          volume: 1.0
        }
      });
      console.log('SecureAudioProcessor: Microphone access granted');

      // Set up MediaRecorder - prioritize formats that Deepgram supports
      const supportedTypes = [
        'audio/mp4',
        'audio/wav',
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg'
      ];

      let selectedMimeType = 'audio/webm;codecs=opus';
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          console.log('SecureAudioProcessor: Using MIME type:', type);
          break;
        }
      }

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: selectedMimeType
      });

      this.mediaRecorder.ondataavailable = (event) => {
        console.log('SecureAudioProcessor: Audio data available, size:', event.data.size);
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          console.log('SecureAudioProcessor: Added audio chunk, total chunks:', this.audioChunks.length);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('SecureAudioProcessor: MediaRecorder error:', event.error);
        this.handleError(`Recording error: ${event.error?.message || 'Unknown error'}`);
      };

      this.mediaRecorder.onstop = async () => {
        await this.processAudioChunks();
      };

      // Start recording
      console.log('SecureAudioProcessor: Starting MediaRecorder');
      this.mediaRecorder.start(1000); // Collect data every second
      this.isRecording = true;
      console.log('SecureAudioProcessor: Recording started successfully');

    } catch (error) {
      console.error('SecureAudioProcessor: Failed to start recording:', error);
      this.handleError(error.message || 'Failed to start recording');
      this.cleanup();
    }
  }

  stopRecording(): void {
    console.log('SecureAudioProcessor: Stopping recording');
    this.isRecording = false;

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    // Don't cleanup here - let the ondataavailable event process the chunks first
  }

  private async processAudioChunks(): Promise<void> {
    console.log('SecureAudioProcessor: Processing audio chunks, count:', this.audioChunks.length);
    if (this.audioChunks.length === 0) {
      console.log('SecureAudioProcessor: No audio chunks to process');
      this.cleanup();
      return;
    }

    try {
      console.log('SecureAudioProcessor: Processing audio chunks...');
      
      // Combine all audio chunks into a single blob
      const audioBlob = new Blob(this.audioChunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });
      console.log('SecureAudioProcessor: Created audio blob, size:', audioBlob.size, 'bytes');
      
      // Call the audio blob callback if provided
      if (this.onAudioBlobCallback) {
        console.log('SecureAudioProcessor: Calling audio blob callback');
        this.onAudioBlobCallback(audioBlob);
      }
      
      // Convert blob to file with appropriate extension
      const getFileExtension = (mimeType: string) => {
        switch (mimeType) {
          case 'audio/mp4': return 'm4a';
          case 'audio/wav': return 'wav';
          case 'audio/ogg': return 'ogg';
          default: return 'webm';
        }
      };
      
      const fileExtension = getFileExtension(audioBlob.type);
      const fileName = `recording.${fileExtension}`;
      const audioFile = new File([audioBlob], fileName, { type: audioBlob.type });
      console.log('SecureAudioProcessor: Audio file details:', {
        name: audioFile.name,
        type: audioFile.type,
        size: audioFile.size
      });
      
      console.log('SecureAudioProcessor: Sending audio to backend for transcription...');
      
      // Send to backend for transcription
      const response: TranscriptionResponse = await apiClient.transcribeAudio({
        audio: audioFile,
        model: this.config.model,
        language: this.config.language,
        smartFormat: this.config.smartFormat,
        punctuate: this.config.punctuate,
        interimResults: this.config.interimResults
      });

      console.log('SecureAudioProcessor: Received transcription response:', response);

      if (response.success) {
        // Simulate interim results by calling the callback
        if (this.onTranscriptCallback) {
          this.onTranscriptCallback({
            transcript: response.transcript || '',
            confidence: response.confidence,
            is_final: true
          });
        }
      } else {
        throw new Error('No transcript received from backend');
      }

    } catch (error) {
      console.error('SecureAudioProcessor: Failed to process audio:', error);
      this.handleError(`Transcription failed: ${error.message}`);
    } finally {
      // Cleanup after processing is complete
      this.cleanup();
    }
  }

  private handleError(error: string): void {
    console.error('SecureAudioProcessor: Error:', error);
    if (this.onErrorCallback) {
      this.onErrorCallback(error);
    }
    // Cleanup on error
    this.cleanup();
  }

  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.mediaRecorder) {
      this.mediaRecorder = null;
    }

    this.audioChunks = [];
    this.isRecording = false;
  }

  isRecordingActive(): boolean {
    return this.isRecording;
  }
}

// Default configuration
export const getDefaultSecureAudioConfig = (): SecureAudioConfig => ({
  model: 'nova-2',
  language: 'es-AR',
  smartFormat: true,
  punctuate: true,
  interimResults: false // Backend doesn't support real-time interim results yet
}); 