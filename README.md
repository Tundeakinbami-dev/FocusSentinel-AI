# FocusSentinel AI

**Stay aware. Stay in control.**

FocusSentinel AI is an experimental desktop application exploring how physiological signals and human-centred assistance workflows can support everyday awareness, wellbeing, and safety.

## Core Features

### 1. FocusSense
A dedicated workspace for focus sessions, intentional breaks, and everyday productivity.

### 2. Sentinel Safety
A space for safety check-ins and user-initiated requests for assistance.

### 3. SmartSense: Presage SmartSpectra
An integration with the Presage SmartSpectra SDK designed to process three physiological signals:

- Breathing rate
- Pulse rate
- Heart rate variability (HRV/RMSSD)

The Signal Monitor includes:

- Camera preview during live monitoring.
- Signal readings with confidence and stability indicators.
- Development simulation mode for demonstrations.
- Trend charts showing the latest 20 simulated samples for each signal.

**Important:** Simulated readings are generated test data. They are not real physiological measurements and must not be used for health decisions or emergency detection.

Live measurement requires a valid SmartSpectra configuration and available measurement credits. Live measurement has not been verified in this demonstration.

### 4. Privacy Centre
A space for understanding permissions, consent, and data handling.

## Technology Stack

- Electron
- React
- TypeScript
- Vite
- Presage SmartSpectra Node SDK

## Getting Started

### Requirements
- Node.js
- npm

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

Start the application:

```bash
npm run dev
```

### Production Build

Run type checks and generate the production build:

```bash
npm run build
```

## Project Status

The following components are implemented:

- Desktop application and dashboard.
- FocusSense workspace.
- Sentinel Safety interface.
- Privacy Centre interface.
- SmartSpectra SDK integration.
- Signal monitoring interface.
- Development simulation mode.
- Three simulated signal trend charts.

Live SmartSpectra measurement has not been verified for this demonstration because measurement credits are currently exhausted.

The simulation mode allows the application to demonstrate the signal-monitoring experience without consuming measurement credits.

## Privacy and Safety

- Camera access is intended for user-initiated live monitoring.
- Simulation mode generates synthetic values, not actual physiological measurements.
- Confidence and stability indicators describe signal quality, not medical risk.
- The application does not provide medical diagnoses.
- The current prototype does not automatically contact emergency services or trusted contacts.

## Disclaimer

FocusSentinel AI is an experimental prototype for demonstration and development.

It is not a medical device and must not be relied upon for diagnosis, treatment, or emergency response.

## Development

Contributions, testing, and feedback are welcome as the project evolves.