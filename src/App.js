import React, { useState, useRef, useEffect } from 'react';
import { MicrophoneIcon, StopIcon, ArrowUpTrayIcon, LanguageIcon, PlayIcon, PauseIcon, TrashIcon, VideoCameraIcon } from '@heroicons/react/24/solid';
import { pipeline, env, AutoProcessor } from '@xenova/transformers';
import '@fontsource/noto-sans-malayalam';

// Configure environment
env.allowLocalModels = false;
env.useBrowserCache = true;
env.backends.onnx.wasm.numThreads = 1;

// Specify model configuration
const MODEL_CONFIG = {
  model_id: 'Xenova/whisper-tiny',  // Using tiny model for better browser performance
  revision: 'main'
};

// Basic audio settings
const AUDIO_CONFIG = {
  sampleRate: 16000,
  channelCount: 1
};

// Supported languages for voice cloning
const SUPPORTED_LANGUAGES = [
  { code: 'ml', name: 'Malayalam' },
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' }
];

// Update Malayalam font style configuration
const MALAYALAM_FONT_STYLE = {
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Malayalam", "Malayalam Sangam MN", "Manjari", sans-serif',
  fontSize: '1.1rem',
  lineHeight: '1.5',
  direction: 'ltr',
  unicodeBidi: 'isolate'
};

function AudioPlayer({ audioUrl, onDelete }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (audioRef.current.paused) {
      audioRef.current.play();
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    const handleEnded = () => setIsPlaying(false);
    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, []);

  return (
    <div className="flex items-center space-x-2 bg-gray-100 p-2 rounded-lg">
      <button
        onClick={togglePlay}
        className="p-2 rounded-full hover:bg-gray-200 transition-colors"
      >
        {isPlaying ? (
          <PauseIcon className="h-5 w-5 text-gray-700" />
        ) : (
          <PlayIcon className="h-5 w-5 text-gray-700" />
        )}
      </button>
      <audio ref={audioRef} src={audioUrl} className="w-48" controls />
      {onDelete && (
        <button
          onClick={onDelete}
          className="p-2 rounded-full hover:bg-gray-200 transition-colors"
        >
          <TrashIcon className="h-5 w-5 text-red-600" />
        </button>
      )}
    </div>
  );
}

// Update the transcription display components
const TranscriptionDisplay = ({ text }) => {
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <textarea
        value={text}
        readOnly
        className="w-full p-3 border border-gray-300 rounded-md min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
        lang="ml"
        dir="ltr"
        style={MALAYALAM_FONT_STYLE}
        placeholder="മലയാളം ടെക്സ്റ്റ് ഇവിടെ കാണിക്കും..."
      />
    </div>
  );
};

// Update the AudioHistoryItem component
const AudioHistoryItem = ({ audio, onDelete }) => {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <AudioPlayer 
        audioUrl={audio.audioUrl} 
        onDelete={() => onDelete(audio.id)}
      />
      <div className="mt-2">
        <p className="text-sm text-gray-500">{new Date(audio.timestamp).toLocaleString()}</p>
        <div className="mt-2 p-3 bg-white rounded border border-gray-200">
          <p 
            className="whitespace-pre-wrap" 
            lang="ml"
            dir="ltr"
            style={MALAYALAM_FONT_STYLE}
          >
            {audio.transcription.malayalam || 'വാക്ക് തിരിച്ചറിഞ്ഞില്ല'}
          </p>
        </div>
      </div>
    </div>
  );
};

function App() {
  // State variables
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState({ malayalam: '' });
  const [editedTranscription, setEditedTranscription] = useState({ malayalam: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [audioHistory, setAudioHistory] = useState([]);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('ml');
  const [isVoiceCloning, setIsVoiceCloning] = useState(false);
  const [voiceAccent, setVoiceAccent] = useState('neutral');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const transcriberRef = useRef(null);

  // Initialize transcriber
  const initializeTranscriber = async () => {
    if (!transcriberRef.current) {
      try {
        console.log('Loading whisper model...');
        transcriberRef.current = await pipeline('automatic-speech-recognition', MODEL_CONFIG.model_id, {
          revision: MODEL_CONFIG.revision,
          quantized: true
        });
        console.log('Model loaded successfully!');
      } catch (error) {
        console.error('Model initialization error:', error);
        setError(`Failed to load model: ${error.message}`);
        throw error;
      }
    }
  };

  // Simplified audio processing
  const processAudio = async (audioData, sampleRate) => {
    try {
      console.log('Processing audio...');
      setError(null);

      // Initialize model if needed
      if (!transcriberRef.current) {
        await initializeTranscriber();
      }

      // Simple normalization
      const maxValue = Math.max(...audioData.map(Math.abs));
      const normalizedAudio = audioData.map(x => x / maxValue);

      // Direct transcription
      const result = await transcriberRef.current(normalizedAudio, {
        sampling_rate: sampleRate,
        language: 'ml',
        task: 'transcribe'
      });

      console.log('Transcription result:', result);

      return {
        malayalam: result?.text || 'വാക്ക് തിരിച്ചറിഞ്ഞില്ല',
        sourceLanguage: 'ml'
      };
    } catch (error) {
      console.error('Audio processing error:', error);
      setError(`Failed to process audio: ${error.message}`);
      throw error;
    }
  };

  // Simplified recording setup
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: AUDIO_CONFIG.channelCount,
          sampleRate: AUDIO_CONFIG.sampleRate,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          deviceId: selectedDevice ? { exact: selectedDevice } : undefined
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16000
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
          await transcribeAudio(audioBlob);
        } catch (error) {
          console.error('Error processing recording:', error);
          setError('Failed to process recording: ' + error.message);
        }
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
    } catch (error) {
      console.error('Recording error:', error);
      setError('Failed to start recording: ' + error.message);
    }
  };

  // Simplified transcription function
  const transcribeAudio = async (audioBlob) => {
    try {
      setIsProcessing(true);
      setError(null);

      const audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: AUDIO_CONFIG.sampleRate
      });

      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioData = await audioContext.decodeAudioData(arrayBuffer);
      const float32Array = audioData.getChannelData(0);

      const result = await processAudio(float32Array, AUDIO_CONFIG.sampleRate);
      
      setTranscription(result);
      setEditedTranscription(result);
      
      const newAudioEntry = {
        id: Date.now(),
        blob: audioBlob,
        audioUrl: URL.createObjectURL(audioBlob),
        transcription: result,
        editedTranscription: result,
        timestamp: new Date().toISOString()
      };

      setAudioHistory(prevHistory => {
        const newHistory = [newAudioEntry, ...prevHistory];
        return newHistory.slice(0, 10);
      });

      audioContext.close();
    } catch (error) {
      console.error('Transcription error:', error);
      setError('Failed to process audio: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Initialize model with progress tracking and retry logic
  useEffect(() => {
    let isMounted = true;
    let retryTimeout = null;

    const loadModel = async () => {
      try {
        if (isMounted) {
          setIsModelLoading(true);
          setError(null);
        }
        
        // Add progress handler
        env.progress_callback = (progress) => {
          if (isMounted) {
            setLoadingProgress(Math.round(progress.progress * 100));
          }
        };

        await initializeTranscriber();
        
        if (isMounted) {
          setIsModelLoading(false);
          setRetryCount(0);
          setError(null);
        }
      } catch (error) {
        console.error('Error initializing models:', error);
        if (isMounted) {
          setError(error.message);
          setIsModelLoading(false);
          
          // If we haven't exceeded max retries, try again after a delay
          if (retryCount < 3) {
            retryTimeout = setTimeout(() => {
              if (isMounted) {
                handleRetry();
              }
            }, Math.min(1000 * Math.pow(2, retryCount), 10000)); // Exponential backoff with max 10s
          }
        }
      }
    };

    loadModel();

    // Cleanup function
    return () => {
      isMounted = false;
      env.progress_callback = null;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [retryCount]);

  // Function to handle retry
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setError(null);
    setLoadingProgress(0);
  };

  // Get available audio input devices
  useEffect(() => {
    const getAudioDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        setAudioDevices(audioInputs);
        // Set first device as default if available
        if (audioInputs.length > 0 && !selectedDevice) {
          setSelectedDevice(audioInputs[0].deviceId);
        }
      } catch (error) {
        console.error('Error getting audio devices:', error);
      }
    };

    getAudioDevices();
  }, []);

  // Save edited transcription
  const saveEditedTranscription = (id, newText) => {
    setAudioHistory(prevHistory => 
      prevHistory.map(item => 
        item.id === id 
          ? { ...item, editedTranscription: newText }
          : item
      )
    );
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        await transcribeAudio(file);
      } catch (error) {
        console.error('Error processing uploaded file:', error);
        setError('Failed to process uploaded file: ' + error.message);
      }
    }
  };

  // Delete audio from history
  const deleteAudio = (id) => {
    setAudioHistory(prevHistory => prevHistory.filter(item => item.id !== id));
  };

  // Function to handle YouTube URL input
  const handleYoutubeInput = async (url) => {
    try {
      setIsProcessing(true);
      setError(null);
      // Here we would integrate with YouTube API
      // For now, show a message
      setError('YouTube integration coming soon!');
    } catch (error) {
      setError('Failed to process YouTube URL: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to handle YouTube URL processing
  const processYoutubeUrl = async (url) => {
    try {
      setIsProcessing(true);
      setError(null);
      
      // Here we would:
      // 1. Validate YouTube URL
      // 2. Extract audio from video
      // 3. Process the audio
      // For now, show a message
      throw new Error('YouTube integration coming soon!');
    } catch (error) {
      setError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Language Selection Handler
  const handleLanguageChange = async (e) => {
    const newLang = e.target.value;
    setSelectedLanguage(newLang);
    // Reset transcriber to load with new language
    transcriberRef.current = null;
    try {
      await initializeTranscriber();
    } catch (error) {
      console.error('Error changing language:', error);
      setError('Failed to change language: ' + error.message);
    }
  };

  // Voice Accent Handler
  const handleAccentChange = (e) => {
    setVoiceAccent(e.target.value);
  };

  // Voice Cloning Toggle Handler
  const handleVoiceCloningToggle = (e) => {
    setIsVoiceCloning(e.target.checked);
  };

  return (
    <div className="min-h-screen malayalam-pattern py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white app-card sm:rounded-3xl sm:p-20">
          <div className="max-w-md mx-auto">
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                {/* Title */}
                <h2 className="text-2xl font-bold mb-8 text-center text-gray-900">
                  Malayalam Speech Recognition
                </h2>

                {/* Error Display */}
                {error && (
                  <div className="p-4 bg-red-50 rounded-lg text-red-800 text-center">
                    {error}
                  </div>
                )}

                {/* Loading Indicator */}
                {isModelLoading && (
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <div className="flex items-center justify-center text-yellow-800">
                      <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Loading model...
                      <span className="ml-2">{loadingProgress}%</span>
                    </div>
                  </div>
                )}

                {/* Language Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Language
                  </label>
                  <select
                    value={selectedLanguage}
                    onChange={handleLanguageChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Audio Device Selection */}
                {audioDevices.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Audio Input Device
                    </label>
                    <select
                      value={selectedDevice || ''}
                      onChange={(e) => setSelectedDevice(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      {audioDevices.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Audio Input ${audioDevices.indexOf(device) + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* YouTube URL Input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    YouTube URL (Optional)
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="Enter YouTube URL"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={() => handleYoutubeInput(youtubeUrl)}
                      disabled={!youtubeUrl || isProcessing}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                      <VideoCameraIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Advanced Options Toggle */}
                <div className="mb-4">
                  <button
                    onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {showAdvancedOptions ? 'Hide' : 'Show'} Advanced Options
                  </button>
                </div>

                {/* Advanced Options Panel */}
                {showAdvancedOptions && (
                  <div className="p-4 bg-gray-50 rounded-lg mb-4">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Voice Accent
                        </label>
                        <select
                          value={voiceAccent}
                          onChange={handleAccentChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="neutral">Neutral</option>
                          <option value="formal">Formal</option>
                          <option value="casual">Casual</option>
                        </select>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={isVoiceCloning}
                          onChange={handleVoiceCloningToggle}
                          className="h-4 w-4 text-blue-600"
                        />
                        <label className="ml-2 text-sm text-gray-700">
                          Enable Voice Cloning
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Existing Controls */}
                <div className="space-y-4">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isProcessing || isModelLoading}
                    className={`w-full px-6 py-3 rounded-full flex items-center justify-center ${
                      isRecording 
                        ? 'bg-red-500 hover:bg-red-600' 
                        : 'bg-blue-500 hover:bg-blue-600'
                    } text-white transition-colors disabled:opacity-50`}
                  >
                    {isRecording ? (
                      <>
                        <StopIcon className="h-6 w-6 mr-2" />
                        Stop Recording
                      </>
                    ) : (
                      <>
                        <MicrophoneIcon className="h-6 w-6 mr-2" />
                        Start Recording
                      </>
                    )}
                  </button>

                  <label className="w-full px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-full cursor-pointer flex items-center justify-center">
                    <ArrowUpTrayIcon className="h-6 w-6 mr-2" />
                    Upload Audio
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isProcessing || isModelLoading}
                    />
                  </label>
                </div>

                {/* Processing Indicator */}
                {isProcessing && (
                  <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg mt-4">
                    <svg className="animate-spin h-5 w-5 mr-3 text-blue-500" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing audio...
                  </div>
                )}

                {transcription.malayalam && (
                  <div className="mt-6 p-4 bg-white rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-3">Malayalam Transcription</h3>
                    <TranscriptionDisplay text={transcription.malayalam} />
                  </div>
                )}

                {/* Recording History */}
                {audioHistory.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-xl font-semibold mb-4">Recording History</h3>
                    <div className="space-y-4">
                      {audioHistory.map((audio) => (
                        <AudioHistoryItem 
                          key={audio.id}
                          audio={audio}
                          onDelete={deleteAudio}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;