import React, { useState, useRef, useEffect } from 'react';
import { MicrophoneIcon, StopIcon, ArrowUpTrayIcon, LanguageIcon, PlayIcon, PauseIcon, TrashIcon } from '@heroicons/react/24/solid';
import { pipeline } from '@xenova/transformers';

// Audio settings
const AUDIO_SETTINGS = {
  sampleRate: 16000,
  channelCount: 1,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true
};

// Initialize the transcriber
let transcriber = null;

const initializeTranscriber = async () => {
  if (!transcriber) {
    transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-small', {
      chunk_length_s: 30,
      stride_length_s: 5,
      language: 'ml',
      task: 'transcribe'
    });
  }
  return transcriber;
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

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [audioHistory, setAudioHistory] = useState([]);
  const [isModelLoading, setIsModelLoading] = useState(true);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    // Initialize the transcriber when component mounts
    initializeTranscriber()
      .then(() => setIsModelLoading(false))
      .catch(error => {
        console.error('Error loading model:', error);
        setError('Failed to load transcription model');
        setIsModelLoading(false);
      });
  }, []);

  // Function to transcribe audio using Transformers.js
  const transcribeAudio = async (audioBlob) => {
    try {
      setIsProcessing(true);
      setError(null);

      // Convert blob to audio data
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioData = await audioContext.decodeAudioData(arrayBuffer);
      
      // Convert audio data to Float32Array
      const float32Array = audioData.getChannelData(0);
      
      // Transcribe using the loaded model
      const result = await transcriber(float32Array, {
        language: 'ml',
        task: 'transcribe',
        sampling_rate: audioContext.sampleRate
      });

      const text = result.text;
      setTranscription(text);
      
      // Add to history
      const newAudioEntry = {
        id: Date.now(),
        blob: audioBlob,
        audioUrl: URL.createObjectURL(audioBlob),
        transcription: text,
        timestamp: new Date().toISOString()
      };

      setAudioHistory(prevHistory => {
        const newHistory = [newAudioEntry, ...prevHistory];
        // Keep only last 10 recordings
        return newHistory.slice(0, 10);
      });

      // Clean up
      audioContext.close();

    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: AUDIO_SETTINGS
      });

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Failed to start recording: ' + error.message);
    }
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

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <div className="max-w-md mx-auto">
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                <h2 className="text-2xl font-bold mb-8 text-center text-gray-900">
                  Malayalam Speech Recognition
                  <span className="ml-2">
                    <LanguageIcon className="h-8 w-8 inline-block text-blue-500" />
                  </span>
                </h2>

                {/* Model loading indicator */}
                {isModelLoading && (
                  <div className="text-center mb-4 p-2 bg-yellow-50 rounded">
                    Loading transcription model...
                  </div>
                )}

                {/* Error messages */}
                {error && (
                  <div className="text-red-500 text-center mb-4 p-2 bg-red-50 rounded">
                    {error}
                  </div>
                )}

                {/* Recording controls */}
                <div className="space-y-4">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isProcessing || isModelLoading}
                    className={`w-full px-6 py-3 rounded-full flex items-center justify-center ${
                      isRecording 
                        ? 'bg-red-500 hover:bg-red-600' 
                        : 'bg-blue-500 hover:bg-blue-600'
                    } text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
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

                  <label className={`w-full px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-full cursor-pointer flex items-center justify-center ${
                    isProcessing || isModelLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}>
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

                {/* Processing indicator */}
                {isProcessing && (
                  <div className="text-center mb-4 p-4">
                    <div className="animate-pulse text-blue-500 font-semibold">
                      Processing audio...
                    </div>
                  </div>
                )}

                {/* Latest Transcription */}
                {transcription && (
                  <div className="mb-8 bg-blue-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold mb-3 text-blue-900">Latest Transcription:</h3>
                    <div className="p-4 bg-white rounded-lg shadow-sm">
                      <p className="text-gray-800 text-lg" style={{ fontFamily: 'Malayalam Sangam MN, Malayalam MN, sans-serif' }}>
                        {transcription}
                      </p>
                    </div>
                  </div>
                )}

                {/* Audio History */}
                {audioHistory.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-xl font-semibold mb-4 text-gray-900">Recording History</h3>
                    <div className="space-y-6">
                      {audioHistory.map((audio) => (
                        <div key={audio.id} className="p-4 bg-gray-50 rounded-lg shadow">
                          <div className="mb-3">
                            <p className="text-sm text-gray-500 mb-2">
                              {new Date(audio.timestamp).toLocaleString()}
                            </p>
                            <AudioPlayer 
                              audioUrl={audio.audioUrl} 
                              onDelete={() => deleteAudio(audio.id)}
                            />
                          </div>
                          <div className="p-3 bg-white rounded">
                            <p className="text-gray-800" style={{ fontFamily: 'Malayalam Sangam MN, Malayalam MN, sans-serif' }}>
                              {audio.transcription}
                            </p>
                          </div>
                        </div>
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