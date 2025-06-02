# Malayalam Speech Recognition

A web application for Malayalam speech recognition using client-side ML processing with Transformers.js and the Whisper model.

## Features

- Real-time audio recording
- Audio file upload support
- Client-side speech recognition
- Malayalam text display
- Recording history with playback
- Fully browser-based (no backend required)

## Tech Stack

- React.js
- Transformers.js (Whisper model)
- TailwindCSS
- Web Audio API

## Setup

1. Clone the repository:
```bash
git clone [your-repo-url]
cd malayalam-speech-recognition
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Click "Start Recording" to record audio
2. Click "Stop Recording" to end recording and start transcription
3. Or use "Upload Audio" to transcribe an existing audio file
4. View transcription history below
5. Play back recorded audio using the audio controls

## Notes

- The first time you use the app, it will download the Whisper model (this may take a few moments)
- Supported audio formats: WAV, MP3, etc.
- All processing happens in the browser - no data is sent to any server

## License

MIT 