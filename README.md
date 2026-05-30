# Saarthi AI — Healthcare AI Triage Agent 🏥

**Project Name**: Saarthi AI  
**Team**: Syntrix  
**Hackathon**: APL Hackathon 2025  
**Theme**: Healthcare AI Triage — KGMU Lucknow (PS-01)  

Saarthi AI is an intelligent, agentic OPD Triage system built specifically for KGMU (King George's Medical University) Lucknow. It uses a multi-agent architecture powered by Google Gemini 1.5 Flash to automatically triage patients, assign departments, allocate specific on-duty doctors, and manage an intelligent priority queue.

---

## 🎯 Key Features & WOW Moments

### 1. Agentic Workflow Architecture
Our solution implements 4 specialized AI agents working together seamlessly:
- **🎙️ Voice Agent**: Multilingual speech recognition & text-to-speech for seamless patient intake (supports Hindi & English).
- **🧠 Triage Agent**: Gemini-powered classification engine that detects symptom severity and extracts medical data.
- **👨‍⚕️ Assignment Agent**: Maps critical patients to specialized departments, assigns on-duty doctors, and allocates rooms.
- **📊 Insights Agent**: Continuously monitors live queue data and generates actionable hospital management insights.

### 2. Emergency Critical WOW Moment
- The system proactively detects life-threatening conditions (e.g., chest pain, breathing issues).
- Automatically triggers a **Priority Escalation Protocol** with a full-screen red emergency alert and audio beep.
- Issues specialized `EMG-XXXX` tokens, pushing the patient to the very front of the hospital queue automatically.

### 3. KGMU-Specific Realism
- Customized hospital dashboard showing KGMU branding.
- Real-time simulation of doctors on duty, active departments, and live wait times.
- Department load monitoring with Recharts and Reusable Activity Feeds.

### 4. Multilingual Voice Assistant
- Integrated Web Speech API for voice recognition (`hi-IN` and `en-US`).
- Text-To-Speech (TTS) engine reads out bot questions aloud for elderly/disabled patients.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS, Lucide React, Recharts.
- **Backend**: Python, FastAPI, WebSockets, Uvicorn, Pydantic.
- **AI Engine**: Google Gemini 1.5 Flash API.
- **Real-time Sync**: WebSockets (`/ws/queue`) for instant dashboard updates.

---

## 🏗️ System Design & Architecture

```mermaid
graph TD
    A[Patient (Patient Portal)] <-->|Voice/Text| B(Voice Agent)
    B -->|Symptoms & Vitals| C(FastAPI Backend)
    C <-->|Prompt & JSON Response| D{Gemini 1.5 Flash Triage Agent}
    D -->|Classification| E(Assignment Agent)
    E -->|Route to Dept & Doctor| F[(In-Memory Queue Store)]
    F <-->|WebSocket Broadcast| G[Admin Dashboard]
    F <-->|Queue Snapshot| H{Insights Agent}
    H -->|Actionable Tips| G
```

### Data Flow
1. **Intake**: Patient interacts with the WhatsApp-style UI (via text or voice).
2. **Analysis**: Patient data is sent to the backend `/api/triage`.
3. **Inference**: The Gemini Triage Agent evaluates the chief complaint alongside vitals to classify as `Critical`, `Moderate`, or `Mild`.
4. **Assignment**: Based on the department, the Assignment Agent looks up a doctor pool and allocates a specific doctor and room.
5. **Queueing**: If Critical, an `EMG` token is generated and pushed to the front. Otherwise, standard FIFO mapping applies.
6. **Broadcasting**: The `InMemoryStore` singleton broadcasts the new queue state via WebSockets to all connected clients.
7. **Insights**: The Admin Dashboard periodically queries the Insights Agent, which analyzes the queue to recommend hospital operations strategies.

---

## 🚀 Running the Project

### Prerequisites
- Node.js (v18+)
- Python (3.10+)
- Gemini API Key

### Backend Setup
1. `cd backend`
2. Create virtual environment: `python -m venv venv`
3. Activate venv: `.\venv\Scripts\activate` (Windows)
4. Install dependencies: `pip install -r requirements.txt`
5. Create `.env` file and add your key: `GEMINI_API_KEY=your_key_here`
6. Run server: `uvicorn app.main:app --reload --port 8000`

### Frontend Setup
1. Run `npm install` in the root directory.
2. Run `npm run dev`.
3. Open `http://localhost:5173/patient` for the Patient Portal.
4. Open `http://localhost:5173/admin` for the Admin Dashboard.

---

## 🧪 Demo Instructions
In the Patient Portal, you will see two **Demo Quick-Fill Buttons** below the chat screen:
1. **Heart Attack (Critical)**: Simulates a 55-year old male with chest pain. Triggers the Emergency Protocol.
2. **Fever (Moderate)**: Simulates a standard OPD fever case assigned to General Medicine.

Pressing these buttons instantly loads a complete conversation history and performs triage for a smooth presentation.
