import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';

export interface DeepgramConfig {
  apiKey: string;
  model: string;
  language: string;
  smartFormat: boolean;
  punctuate: boolean;
  interim_results: boolean;
}

export interface TranscriptionResult {
  transcript: string;
  confidence: number;
  is_final: boolean;
}

export class DeepgramAudioProcessor {
  private client: any;
  private connection: any;
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private isRecording = false;
  private config: DeepgramConfig;

  constructor(private config: DeepgramConfig) {
    this.config = config;
    try {
      // Ensure API key is properly formatted
      let apiKey = config.apiKey.trim();
      
      // Remove Token prefix if present, we'll let the SDK handle it
      if (apiKey.startsWith('Token ')) {
        apiKey = apiKey.substring(6);
      }
      
      this.client = createClient(apiKey);
      console.log('Deepgram: Client created successfully');
    } catch (error) {
      console.error('Deepgram: Failed to create client:', error);
      throw error;
    }
  }

  async startRecording(
    onTranscript: (result: TranscriptionResult) => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      console.log('Deepgram: Starting recording with config:', { 
        ...this.config, 
        apiKey: this.config.apiKey ? '[REDACTED - Length: ' + this.config.apiKey.length + ']' : 'MISSING'
      });
      
      // Get microphone access
      console.log('Deepgram: Requesting microphone access...');
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
      console.log('Deepgram: Microphone access granted');

      // Create Deepgram live connection
      console.log('Deepgram: Creating live connection');
      
      const connectionOptions = {
        model: this.config.model,
        language: this.config.language,
        smart_format: this.config.smartFormat,
        punctuate: this.config.punctuate,
        interim_results: this.config.interim_results,
        encoding: 'webm-opus',
        sample_rate: 16000,
        channels: 1,
        endpointing: 300,
        vad_events: true,
        utterance_end_ms: 1000,
        // Simplified options for better compatibility
        filler_words: false
      };
      
      console.log('Deepgram: Connection options:', connectionOptions);
      
      try {
        this.connection = this.client.listen.live(connectionOptions);
        console.log('Deepgram: Live connection created');
        
        // Set up event listeners first
        this.connection.on(LiveTranscriptionEvents.Open, () => {
          console.log('Deepgram: Connection opened successfully');
        });
        
        this.connection.on(LiveTranscriptionEvents.Error, (error: any) => {
          console.error('Deepgram: Connection error:', error);
          const errorMessage = this.formatWebSocketError(error);
          onError(`WebSocket connection failed: ${errorMessage}`);
        });

        this.connection.on(LiveTranscriptionEvents.Close, (event: any) => {
          console.log('Deepgram: Connection closed:', event);
        });

        this.connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
          console.log('Deepgram: Received transcript data:', JSON.stringify(data, null, 2));
          
          const transcript = data.channel?.alternatives?.[0]?.transcript;
          const confidence = data.channel?.alternatives?.[0]?.confidence || 0;
          const is_final = data.is_final;

          console.log('Deepgram: Parsed transcript:', { transcript, confidence, is_final });

          if (transcript && transcript.trim()) {
            console.log('Deepgram: Calling onTranscript with:', { transcript: transcript.trim(), confidence, is_final });
            onTranscript({
              transcript: transcript.trim(),
              confidence,
              is_final
            });
          } else {
            console.log('Deepgram: Empty or whitespace-only transcript, skipping');
          }
        });
        
        // Wait for connection to be ready with better error handling
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Connection timeout - WebSocket failed to connect within 15 seconds. This may be due to network issues or invalid API key.'));
          }, 15000);
          
          const onOpen = () => {
            clearTimeout(timeout);
            this.connection.off(LiveTranscriptionEvents.Open, onOpen);
            this.connection.off(LiveTranscriptionEvents.Error, onError);
            resolve();
          };
          
          const onError = (error: any) => {
            clearTimeout(timeout);
            this.connection.off(LiveTranscriptionEvents.Open, onOpen);
            this.connection.off(LiveTranscriptionEvents.Error, onError);
            const errorMessage = this.formatWebSocketError(error);
            reject(new Error(`WebSocket connection failed: ${errorMessage}`));
          };
          
          this.connection.on(LiveTranscriptionEvents.Open, onOpen);
          this.connection.on(LiveTranscriptionEvents.Error, onError);
        });
        
      } catch (error) {
        console.error('Deepgram: Failed to create live connection:', error);
        throw new Error(`Failed to create Deepgram connection: ${error.message}`);
      }


      // Set up MediaRecorder to send audio to Deepgram
      console.log('Deepgram: Setting up MediaRecorder');
      
      // Check supported MIME types
      const supportedTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/wav'
      ];
      
      let selectedMimeType = 'audio/webm;codecs=opus';
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          console.log('Deepgram: Using MIME type:', type);
          break;
        }
      }
      
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: selectedMimeType
      });
      console.log('Deepgram: MediaRecorder created with MIME type:', selectedMimeType);

      this.mediaRecorder.ondataavailable = (event) => {
        console.log('Deepgram: Audio data available, size:', event.data.size, 'bytes');
        const readyState = this.connection?.getReadyState?.();
        console.log('Deepgram: Connection ready state:', readyState);
        
        if (event.data.size > 0 && readyState === 1) {
          console.log('Deepgram: Sending audio data to connection');
          this.connection.send(event.data);
        } else {
          console.log('Deepgram: Connection not ready or no data. Ready state:', readyState, 'Data size:', event.data.size);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('Deepgram: MediaRecorder error:', event.error);
        onError(`Recording error: ${event.error?.message || 'Unknown error'}`);
      };

      // Start recording
      console.log('Deepgram: Starting MediaRecorder');
      this.mediaRecorder.start(100); // Send data every 100ms
      console.log('Deepgram: MediaRecorder started, sending data every 100ms');
      this.isRecording = true;

    } catch (error: any) {
      console.error('Deepgram: Failed to start recording:', error);
      onError(error.message || 'Failed to start recording');
      this.cleanup();
    }
  }

  stopRecording(): void {
    console.log('Deepgram: Stopping recording...');
    this.isRecording = false;

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      console.log('Deepgram: Stopping MediaRecorder');
      this.mediaRecorder.stop();
    }

    if (this.connection) {
      console.log('Deepgram: Finishing connection');
      this.connection.finish();
    }

    console.log('Deepgram: Cleaning up resources');
    this.cleanup();
  }

  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    this.mediaRecorder = null;
    this.connection = null;
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  private formatWebSocketError(error: any): string {
    console.error('Deepgram: Detailed WebSocket error:', {
      message: error.message,
      code: error.code,
      reason: error.reason,
      type: error.type,
      readyState: this.connection?.getReadyState?.(),
      timestamp: new Date().toISOString()
    });
    
    // Check for specific error conditions
    if (error.code === 1006) {
      return 'Connection closed abnormally. This usually indicates an authentication issue with your Deepgram API key.';
    }
    
    if (error.code === 1008 || error.message?.includes('authentication') || error.message?.includes('unauthorized')) {
      return 'Authentication failed. Please verify your Deepgram API key is valid and has sufficient credits.';
    }
    
    if (error.code === 1011) {
      return 'Server error. The Deepgram service may be temporarily unavailable.';
    }
    
    if (error.message?.includes('network') || error.message?.includes('timeout')) {
      return 'Network connection failed. Please check your internet connection and try again.';
    }
    
    return error.message || error.reason || 'Unknown WebSocket connection error';
  }
}

// Default configuration
export const getDefaultDeepgramConfig = (): DeepgramConfig => ({
  apiKey: import.meta.env.VITE_DEEPGRAM_API_KEY || '',
  model: 'nova-2',
  language: 'en-US',
  smartFormat: true,
  punctuate: true,
  interim_results: true
});