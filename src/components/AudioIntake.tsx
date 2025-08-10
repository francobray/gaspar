import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Type, MapPin, Loader2, Volume2, AlertCircle, Camera, X } from 'lucide-react';
import { ProblemSummary } from '../types';
import { analyzeProblem } from '../utils/problemAnalyzer';
import { getLocationFromZip, getCurrentLocation } from '../utils/location';
import { SecureAudioProcessor, getDefaultSecureAudioConfig, TranscriptionResult } from '../utils/secureAudioProcessor';
import { ErrorModal } from './ErrorModal';

interface AudioIntakeProps {
  onProblemAnalyzed: (summary: ProblemSummary, zipCode: string, photos?: File[]) => void;
}

export const AudioIntake: React.FC<AudioIntakeProps> = ({ onProblemAnalyzed }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('In need to repair the central AC of my house');
  const [interimTranscript, setInterimTranscript] = useState('');
  // Confirmation removed; keep flag false
  const [showTranscriptConfirmation, setShowTranscriptConfirmation] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [useTextInput, setUseTextInput] = useState(false);
  const [textInput, setTextInput] = useState('In need to repair the central AC of my house');
  const [zipCode, setZipCode] = useState('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedUrgency, setSelectedUrgency] = useState<'urgent' | 'flexible' | null>('flexible');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [modalError, setModalError] = useState<string>('');
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const secureAudioProcessorRef = useRef<SecureAudioProcessor | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Check microphone permissions on component mount
  useEffect(() => {
    checkMicrophonePermission();
    console.log('AudioIntake mounted - checking secure backend setup');
    console.log('Backend API URL:', import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api');
  }, []);

  const checkMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasPermission(true);
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      setHasPermission(false);
      setAudioError('Microphone access denied. Please enable microphone permissions and refresh the page.');
    }
  };

  const setupAudioVisualization = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      analyserRef.current.fftSize = 256;
      microphoneRef.current.connect(analyserRef.current);
      
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      const updateAudioLevel = () => {
        if (analyserRef.current && isRecording) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          const normalizedLevel = average / 255;
          setAudioLevel(normalizedLevel);
          
          // Log audio levels to help debug
          if (normalizedLevel > 0.1) {
            console.log('Audio level detected:', normalizedLevel.toFixed(3));
          }
          
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        }
      };
      
      updateAudioLevel();
    } catch (error) {
      console.error('Audio visualization setup failed:', error);
    }
  };

  const cleanupAudioVisualization = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    microphoneRef.current = null;
    analyserRef.current = null;
    setAudioLevel(0);
  };

  const initializeSecureAudio = (): SecureAudioProcessor | null => {
    console.log('Initializing secure audio processor...');
    
    try {
      const config = getDefaultSecureAudioConfig();
      console.log('Secure audio config:', config);
      
      return new SecureAudioProcessor(config);
    } catch (error) {
      console.error('Failed to create secure audio processor:', error);
      setAudioError(`Failed to initialize secure audio processor: ${error.message}`);
      return null;
    }
  };

  const handleSecureTranscript = (result: TranscriptionResult) => {
    console.log('Received secure transcript:', result);
    if (result.is_final) {
      // Replace default or existing text with the latest final transcript
      setTranscript(result.transcript.trim());
      setTextInput(result.transcript.trim());
      setInterimTranscript('');
    } else {
      setInterimTranscript(result.transcript);
    }
  };

  const handleSecureError = (error: string) => {
    console.error('Secure audio error:', error);
    setIsRecording(false);
    setIsListening(false);
    setAudioError(null); // Clear any existing inline errors
    setModalError(error);
    setShowErrorModal(true);
    cleanupAudioVisualization();
  };

  useEffect(() => {
    return () => {
      cleanupAudioVisualization();
      // Clean up audio URL to prevent memory leaks
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    if (!isRecording && hasPermission !== false) {
      console.log('Starting recording process...');
      setAudioError(null);
      setInterimTranscript('');
      setIsRecording(true);
      
      try {
        console.log('Initializing secure audio transcription...');
        const processor = initializeSecureAudio();
        if (!processor) {
          console.error('Failed to initialize secure audio processor');
          setIsRecording(false);
          return;
        }
        
        secureAudioProcessorRef.current = processor;
        console.log('Setting up audio visualization...');
        await setupAudioVisualization();
        console.log('Starting secure audio recording...');
        await processor.startRecording(handleSecureTranscript, handleSecureError, (audioBlob) => {
          setRecordedAudioBlob(audioBlob);
          const url = URL.createObjectURL(audioBlob);
          setAudioUrl(url);
        });
        setIsListening(true);
        console.log('Recording started successfully');
      } catch (error) {
        console.error('Failed to start recording:', error);
        setIsRecording(false);
        setIsListening(false);
        cleanupAudioVisualization();
        const errorMessage = `Failed to start recording: ${error instanceof Error ? error.message : 'Please check microphone permissions and try again.'}`;
        setModalError(errorMessage);
        setShowErrorModal(true);
      }
    }
  };

  const stopRecording = () => {
    console.log('Stopping recording, current transcript:', transcript);
    setIsRecording(false);
    setIsListening(false);
    
    if (secureAudioProcessorRef.current) {
      secureAudioProcessorRef.current.stopRecording();
      secureAudioProcessorRef.current = null;
    }
    
    cleanupAudioVisualization();
    
    // Confirmation removed; do nothing here
  };

  // Removed clearTranscript handler as the interim transcript preview block was removed

  // Re-record now just clears and restarts without confirmation UI
  const reRecord = () => {
    setTranscript('');
    setInterimTranscript('');
    setShowTranscriptConfirmation(false);
    setAudioError(null);
    setShowErrorModal(false);
    setModalError('');
    setRecordedAudioBlob(null);
    setAudioUrl(null);
    setIsPlaying(false);
    startRecording();
  };

  const playRecording = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => setIsPlaying(false);
      audio.play().catch(error => {
        console.error('Failed to play audio:', error);
        setIsPlaying(false);
      });
    }
  };

  const stopPlaying = () => {
    setIsPlaying(false);
    // Stop all audio elements
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      setPhotos(prev => [...prev, ...imageFiles].slice(0, 5)); // Max 5 photos
      
      // Generate previews
      imageFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPhotoPreviews(prev => [...prev, e.target?.result as string].slice(0, 5));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const triggerPhotoUpload = () => {
    fileInputRef.current?.click();
  };

  const handleLocationDetection = async () => {
    setIsGettingLocation(true);
    try {
      const location = await getCurrentLocation();
      setZipCode(location.zipCode);
    } catch (error) {
      console.warn('Location detection failed, using default location');
      // Set a default ZIP code instead of leaving it empty
      setZipCode('10001');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleSubmit = async () => {
    const problemText = useTextInput ? textInput : transcript;
    if (!problemText.trim() || !zipCode.trim() || !selectedUrgency) return;
    
    setIsProcessing(true);
    try {
      const summary = await analyzeProblem(problemText);
      // Override the analyzed urgency with user's selection
      summary.urgency = selectedUrgency === 'urgent' ? 'high' : 'low';
      onProblemAnalyzed(summary, zipCode, photos.length > 0 ? photos : undefined);
    } catch (error) {
      console.error('Problem analysis failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (!zipCode) {
      handleLocationDetection();
    }
  }, []);

  return (
    <div className="mx-auto" style={{ maxWidth: '62.4rem' }}>
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            What's the problem?
          </h2>
        </div>

        {hasPermission === false && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800">Microphone Access Required</h4>
                <p className="text-red-700 text-sm mt-1">
                  To use voice input, please enable microphone permissions in your browser settings and refresh the page.
                </p>
              </div>
            </div>
          </div>
        )}
        {!useTextInput ? (
          <div className="space-y-4">
            {/* Container 1: Audio input */}
            <div className="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-3">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={hasPermission === false}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : hasPermission === false
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white`}
                title={isRecording ? 'Stop' : 'Record'}
              >
                {isRecording ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

              {/* Play button (no timeline bar) */}
              <div className="flex items-center gap-2">
                <button
                  onClick={isPlaying ? stopPlaying : playRecording}
                  disabled={!audioUrl}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${audioUrl ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                >
                  {isPlaying ? 'Stop' : 'Play'}
                </button>
                {/* Hidden audio element kept for playback */}
                <audio ref={el => { /* no-op ref to keep element */ }} src={audioUrl || undefined} />
              </div>

              {/* Transcript inline input (single line) */}
              <input
                type="text"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder={isRecording ? (isListening ? 'Listening...' : 'Starting...') : 'Recorded text will appear here'}
                className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white"
              />
            </div>
            {/* Confirmation removed per request */}

            {/* Container 2: Zip + urgency */}
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Your location</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      placeholder="Enter ZIP code"
                      className="w-full px-3 py-2 pl-9 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                    <MapPin className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                    {isGettingLocation && <Loader2 className="absolute right-2.5 top-2.5 w-4 h-4 text-blue-500 animate-spin" />}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">How urgent is this repair?</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setSelectedUrgency('urgent')} className={`p-2 rounded-md border text-sm ${selectedUrgency === 'urgent' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 hover:border-red-300 hover:bg-red-50'}`}>🚨 Urgent</button>
                    <button type="button" onClick={() => setSelectedUrgency('flexible')} className={`p-2 rounded-md border text-sm ${selectedUrgency === 'flexible' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'}`}>📅 Flexible</button>
                  </div>
                </div>
              </div>
            </div>

            

            {/* Guidance when recording */}
            {isRecording && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Volume2 className="w-4 h-4" />
                <span>Speak clearly…</span>
              </div>
            )}

            {audioError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-700 text-sm">{audioError}</p>
                    {hasPermission === false && (
                      <button
                        onClick={checkMicrophonePermission}
                        className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
                      >
                        Try again
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-center">
              <button
                onClick={() => { 
                  setUseTextInput(true); 
                  setTextInput(''); 
                  setAudioError(null);
                  setShowErrorModal(false);
                  setModalError('');
                }}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
              >
                <Type className="w-4 h-4" />
                <span>Switch to text input</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Describe your problem
              </label>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="e.g., My kitchen faucet is dripping constantly and I can't turn it off completely..."
                className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>
            
            <div className="flex justify-center">
              <button
                onClick={() => { 
                  setUseTextInput(false); 
                  setTextInput(''); 
                  setAudioError(null);
                  setShowErrorModal(false);
                  setModalError('');
                }}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
              >
                <Mic className="w-4 h-4" />
                <span>Switch to voice input</span>
              </button>
            </div>
          </div>
        )}

        <div className="mt-6">
          {/* Photo Upload Section */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add Photos (Optional)</h3>
              <span className="text-sm text-gray-500">{photos.length}/5 photos</span>
            </div>
            
            <div className="space-y-4">
              {/* Photo Grid */}
              {photoPreviews.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {photoPreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Problem photo ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        onClick={() => removePhoto(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Upload Button */}
              {photos.length < 5 && (
                <button
                  type="button"
                  onClick={triggerPhotoUpload}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex flex-col items-center space-y-2">
                    <Camera className="w-8 h-8 text-gray-400" />
                    <span className="text-sm font-medium text-gray-600">
                      Add photos of the problem
                    </span>
                    <span className="text-xs text-gray-500">
                      JPG, PNG up to 10MB each
                    </span>
                  </div>
                </button>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
            
            <p className="text-xs text-gray-500 mt-2">
              Photos help professionals better understand your problem and provide more accurate estimates.
            </p>
          </div>
          <div className="mt-6">
            <button
              onClick={handleSubmit}
              disabled={isProcessing || (!transcript.trim() && !textInput.trim()) || !zipCode.trim() || showTranscriptConfirmation || !selectedUrgency}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing problem...</span>
                </>
              ) : (
                <span>Find professionals</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error Modal */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => {
          setShowErrorModal(false);
          setModalError('');
        }}
        error={modalError}
        onRetry={() => {
          setShowErrorModal(false);
          setModalError('');
          startRecording();
        }}
      />
    </div>
  );
};