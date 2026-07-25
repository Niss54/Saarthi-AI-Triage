<!-- Banner -->
<div align="center">

<img src="https://img.shields.io/badge/APL-2025-red?style=for-the-badge" />
<img src="https://img.shields.io/badge/Track-Healthcare-brightgreen?style=for-the-badge" />
<img src="https://img.shields.io/badge/Team-Syntrix-blueviolet?style=for-the-badge" />

# 🏥 Saarthi AI
### *Intelligent OPD Triage & Queue Management for KGMU Lucknow*

> **"5,000 patients walk into KGMU every day. Saarthi AI ensures the most critical ones are never lost in the queue."**

[![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini_AI-4285F4?style=flat-square&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![LiveKit](https://img.shields.io/badge/LiveKit-FF5722?style=flat-square&logo=webrtc&logoColor=white)](https://livekit.io/)
[![Sarvam AI](https://img.shields.io/badge/Sarvam_AI-FF6B35?style=flat-square)](https://sarvam.ai/)
[![WebSocket](https://img.shields.io/badge/WebSocket-010101?style=flat-square&logo=socket.io&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)

[🚀 Live Demo](#) · [📖 Documentation](#) · [🐛 Report Bug](https://github.com/Niss54/Saarthi-AI-Triage/issues) · [💡 Request Feature](https://github.com/Niss54/Saarthi-AI-Triage/issues)

</div>

---

## 📋 Table of Contents

- [Problem Statement](#1-problem-statement)
- [Solution Overview](#2-solution-overview)
- [Key Features](#3-key-features)
- [Tech Stack](#4-tech-stack)
- [Agent Workflow](#5-agent-workflow)
- [System Architecture](#6-system-architecture)
- [Getting Started](#7-getting-started)
- [Screenshots](#8-screenshots)
- [Team](#9-team)
- [License](#10-license)

---

## 1. 🚨 Problem Statement

**KGMU (King George's Medical University), Lucknow** is one of North India's busiest hospitals, handling a massive daily patient load:

| Challenge | Impact |
|-----------|--------|
| 🏥 5,000+ OPD patients daily | Extreme overcrowding |
| ❌ No intelligent prioritization system | Critical cases missed |
| ⚠️ Manual triage process | Slow & error-prone |
| 💔 Cardiac patients wait with minor cases | Life-threatening delays |
| 🏙️ Lucknow Civil Hospital faces same challenge | Systemic problem |

> Manual triage is **slow**, **error-prone**, and in a high-stakes environment like this — **life-threatening**.

---

## 2. 💡 Solution Overview

**Saarthi AI** is an intelligent, multi-modal patient triage agent that automatically prioritizes patients based on symptom severity using AI — so the right patient gets help at the right time.

### What It Does

- 🎙️ **Accepts patient input** via Text, Voice (Hindi + English), or Prescription Image
- 🤖 **AI-powered triage** using Gemini AI to analyze symptom severity
- 🚨 **Emergency escalation** — critical patients bypass queue and receive EMG tokens instantly
- 🏥 **Smart routing** — assigns departments and doctors based on condition
- 📡 **Real-time dashboard** — live queue updates via WebSocket for hospital staff
- 📜 **Prescription OCR** — reads physical prescriptions and auto-fills patient data

---

## 3. ✨ Key Features

### 🗣️ Multi-Modal Patient Intake
- Voice input in **Hindi & English** powered by Sarvam AI (STT + TTS)
- WhatsApp-style chat interface for patient-facing interaction
- OCR-based prescription upload for quick history capture

### 🧠 AI-Driven Risk Assessment
- Gemini AI analyzes symptoms, vitals, and medical history
- Classifies into **Critical / Moderate / Low** severity in real-time
- NLP-powered contextual understanding of patient descriptions

### 🚑 Emergency Protocol
- **Critical patients** get EMG (Emergency) tokens with priority override
- Instant notification to emergency department
- Zero queue wait for life-threatening cases

### 📊 Live Hospital Dashboard
- WebSocket-powered real-time queue visualization
- Doctor and room assignment displayed per patient
- ETA estimation for waiting patients
- Staff can see patient severity at a glance

### 🌐 Hindi-First Accessibility
- Entire patient flow available in Hindi via Sarvam AI
- Designed for semi-urban and rural patients unfamiliar with English
- Voice-based interaction requires zero digital literacy

---

## 4. 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| React + Vite + TypeScript | Core web application |
| Web Speech API | Browser-native voice agent |
| WebSocket Client | Real-time queue updates |
| WhatsApp Chat UI | Patient-friendly interface |

### Backend
| Technology | Purpose |
|-----------|---------|
| FastAPI + Python | REST API & WebSocket server |
| Triage Engine | Symptom analysis & scoring |
| OCR Endpoint | Prescription image processing |

### AI Layer
| Technology | Purpose |
|-----------|---------|
| Gemini AI | Symptom analysis & NLP |
| Sarvam AI | Hindi STT (Speech-to-Text) + TTS |
| LiveKit | Real-time audio/video streaming |

---

## 5. 🤖 Agent Workflow

> **5 AI Agents Working Together in a Coordinated Pipeline**

```
Patient Input          Intake Agent         Risk Triage Agent
(Text/Voice/Image) ──► Symptom Collection ──► Gemini AI Analysis
                                                      │
                                              ┌───────▼────────┐
                                              │   Severity?    │
                                              └───────┬────────┘
                                                      │
                          ┌───────────────────────────┤
                          │                           │
                    CRITICAL ▼                MODERATE/LOW ▼
              Emergency Agent           Department Router Agent
            Priority Override           Assign Dept + Doctor
              EMG Token                         │
                          │                     │
                          └─────────┬───────────┘
                                    │
                             Handoff Agent
                          Token + Room + ETA
                                    │
                             Dashboard Agent
                              WebSocket Live
```

### Agent Descriptions

| Agent | Role |
|-------|------|
| **Intake Agent** | Collects patient symptoms via text, voice, or image |
| **Risk Triage Agent** | Runs Gemini AI analysis on all inputs |
| **Emergency Agent** | Triggers priority override for critical cases |
| **Department Router** | Routes moderate/low cases to correct dept + doctor |
| **Handoff Agent** | Generates token, room assignment, and ETA |
| **Dashboard Agent** | Pushes live updates via WebSocket to hospital screen |

---

## 6. 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                  Frontend — React + Vite + TypeScript        │
│    ┌─────────────────────┐    ┌────────────────────────┐     │
│    │  Voice Agent         │    │  WhatsApp Chat UI      │     │
│    │  (Web Speech API)   │    │  Prescription OCR      │     │
│    └─────────┬───────────┘    └──────────┬─────────────┘     │
└──────────────┼──────────────────────────┼────────────────────┘
               │                          │
┌──────────────▼──────────────────────────▼────────────────────┐
│                Backend — FastAPI + Python                     │
│         ┌────────────────┐  ┌──────────────────┐             │
│         │  Triage Engine  │  │  OCR Endpoint    │             │
│         └────────┬───────┘  └─────────┬────────┘             │
└──────────────────┼─────────────────────┼────────────────────-┘
                   │                     │
┌──────────────────▼─────────────────────▼────────────────────┐
│                    AI Layer                                   │
│    ┌──────────────────────┐   ┌──────────────────────────┐   │
│    │  Gemini AI           │   │  Sarvam AI               │   │
│    │  (Symptom Analysis)  │   │  (Hindi STT + TTS)       │   │
│    └──────────────────────┘   └──────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

## 7. 🚀 Getting Started

### Prerequisites

```bash
node >= 18.0.0
python >= 3.10
pip
```

### Clone the Repository

```bash
git clone https://github.com/Niss54/Saarthi-AI-Triage.git
cd Saarthi-AI-Triage
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Environment Variables

Create a `.env` file in the root directory:

```env
GEMINI_API_KEY=your_gemini_api_key
SARVAM_API_KEY=your_sarvam_api_key
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
```

> ⚠️ Never commit your `.env` file. It is already included in `.gitignore`.

---

## 8. 📸 Screenshots

### OPD Dashboard — Live Queue View
> Real-time patient queue with severity indicators and department routing

### Patient Intake — Voice Mode
> Hindi voice interface powered by Sarvam AI

### Emergency Protocol
> Critical patient EMG token generation with priority override

---

## 9. 👥 Team

**Team Syntrix** — APL 2025, Healthcare Track

| Member | Role |
|--------|------|
| **Nishant Maurya** | Full Stack Lead, AI Integration |
| *(Add teammates)* | *(Add roles)* |

---

## 10. 📄 License

This project was built for **APL 2025 — Healthcare Track** as a competitive hackathon submission.

```
MIT License — see LICENSE file for details
```

---

<div align="center">

**Built with ❤️ for KGMU Lucknow — because every second counts.**

[![GitHub](https://img.shields.io/badge/GitHub-Niss54-181717?style=flat-square&logo=github)](https://github.com/Niss54)
[![Portfolio](https://img.shields.io/badge/Portfolio-nissh.info-blueviolet?style=flat-square)](https://nissh.info)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-niss--visuals-0A66C2?style=flat-square&logo=linkedin)](https://www.linkedin.com/in/niss-visuals)

*"Intelligent triage. Zero delay. Every life matters."*

</div>
