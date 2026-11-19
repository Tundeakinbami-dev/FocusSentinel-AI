# FocusTellisense AI

**Stay aware. Stay in control.**

FocusTellisense AI is a human-centred desktop application exploring how physiological signals and intentional workflows can support everyday awareness, wellbeing, and safety.

## Core Features

### 1. FocusSense

A dedicated workspace for focus sessions, intentional breaks, and everyday productivity, displaying live physiological sensing feedback during active monitoring sessions.

### 2. Sentinel Safety

A space for personal check-ins and user-initiated requests for assistance with local status recording.

### 3. Presage SmartSpectra Signal Monitoring

An integration with the Presage SmartSpectra SDK designed to process three physiological signals using standard webcam video:

- **Breathing rate** (`br/min`)
- **Pulse rate** (`bpm`)
- **Heart rate variability** (HRV / RMSSD in `ms`)

The Signal Monitor includes:

- Persistent background monitoring across all workspace views.
- Real-time camera preview with camera hardware selection.
- Signal readings with stability pills and confidence indicators.
- Development simulation mode for offline and local testing.
- Dynamic real-time trend charts tracking physiological signals.

**Important:** Simulated readings are generated test data. They are not real physiological measurements and must not be used for health decisions or emergency detection.

Live measurement requires a valid SmartSpectra configuration and available measurement credits on the Presage platform.

### 4. Privacy Centre

Transparent insight into device permissions, local signal processing, and user consent.

## Technology Stack

- Electron 44
- React 19
- TypeScript 5.9
- Vite 8
- Presage SmartSpectra Node SDK v3.5

## Getting Started

### System Requirements

- **Node.js**: `>= 20.12.0` (Node.js 22 LTS recommended)
- **npm**: `>= 10.0.0`
- **Operating System**: Linux (x64/arm64), Windows 10/11 (x64), or macOS (Apple Silicon arm64)

### Installation

Clone the repository and enter the project directory:

```bash
git clone https://github.com/Tundeakinbami-dev/FocusSentinel-AI.git
cd FocusSentinel-AI
```

Install dependencies:

```bash
npm install
```

### Environment Configuration

Copy the example environment template and configure your Presage SmartSpectra API key:

```bash
cp .env.example .env
```

Edit `.env`:

```env
SMARTSPECTRA_API_KEY=your_actual_api_key_here
```

### Running the Application

Start the development server with HMR:

```bash
npm run dev
```

### Production Build

Run type checks and generate the production bundles:

```bash
npm run build
```

Package platform installers:

```bash
# Package for current platform
npm run build:unpack

# Linux packages (AppImage, snap, deb)
npm run build:linux

# macOS package (DMG for Apple Silicon)
npm run build:mac

# Windows package (NSIS installer)
npm run build:win
```

## Privacy and Safety Disclaimers

- Camera access is requested only upon explicit user action and ceases immediately when stopped.
- Video frames are processed locally; vitals are retained strictly in temporary memory during an active session.
- FocusTellisense AI is an experimental awareness platform, not a medical device. It does not provide clinical diagnoses or replace professional medical care.
