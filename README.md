# ProxiSpeak – Geospatial Proximity Audio Virtual Office

A real-time 2D virtual office and proximity-based audio communication ecosystem for remote teams. Instead of traditional grid-based video calls, team members interact through personalized avatars on an interactive canvas, where spatial audio naturally fades with distance—simulating organic, in-person workplace interactions.

---

## 🌟 Key Features

### 1. 🏢 Interactive Virtual Office & Canvas
- **Shared Spatial Workspace**: Navigate avatars across an office layout in real-time.
- **Dynamic Movement & Positioning**: Smooth avatar drag-and-drop or directional movement synchronized instantly across all connected team members.
- **Visual Rooms & Zones**: Designated meeting areas, open office spaces, and private desk clusters.

### 2. 🎧 Distance-Based Proximity Audio
- **Natural Attenuation**: Voice volume is dynamically calculated and adjusted via Web Audio API `GainNode` based on Euclidean distance between avatars.
- **Immediate Proximity**: Crisp, full-volume audio when avatars are close to each other.
- **Organic Fading**: Audio fades smoothly as participants move apart, dropping to zero beyond a defined spatial perimeter to avoid chatter overload.

### 3. 🎙️ Real-Time Voice Activity & Mute Controls (Module 7)
- **Voice Activity Detection (VAD)**: Real-time microphone audio level monitoring via Web Audio `AnalyserNode`.
- **Speaking Wave Pulse**: Dynamic animated glowing ring around the avatar head when a participant speaks.
- **Mute / Unmute Controls**: Quick toggle button with immediate visual status badges (mute icon indicator) synchronized across all peers.

### 4. 🌐 Robust WebRTC Audio Architecture & NAT Traversal (Module 8)
- **Peer-to-Peer Mesh Audio**: Low-latency direct media streams between active participants.
- **STUN & TURN Server Integration**: Integrated with Metered OpenRelay TURN servers (over UDP, TCP ports 80/443) ensuring seamless audio relay across restrictive firewalls and symmetric NATs.

### 5. 🔐 User Authentication & Session Management
- **Animated Sign-in Experience**: Engaging office-door login/registration UI with form validation.
- **JWT & Persistent Accounts**: Secure authentication powered by Express, bcrypt, and MongoDB.
- **Resilient Fallback Mode**: In-memory session fallback ensuring seamless development and testing even when local database services are offline.

---

## 📚 Curriculum & Module Breakdown (Infotact Solutions)

This project strictly adheres to the 8 core development modules specified in the **Infotact Solutions Project Execution Handbook**:

| Module | Component | Key Implementations | Owner |
|---|---|---|---|
| **Module 1** | Workspace & Canvas Architecture | React 18 base canvas, office layout background, viewports | Member A & B |
| **Module 2** | User Authentication & Profiles | Sign-in modal, form validation, JWT token issuance | Member A |
| **Module 3** | Avatar Spatial Movement | Coordinate tracking, drag-and-drop mechanics, boundary clamping | Member B |
| **Module 4** | Real-Time Coordinate Sync | Socket.IO room join, position broadcasting, active peer updates | Member B & C |
| **Module 5** | WebRTC Audio Connection | `RTCPeerConnection` mesh network, local mic capture, SDP/ICE signaling | Member C |
| **Module 6** | Proximity Audio Attenuation | Euclidean distance calculation, Web Audio API `AudioContext` & `GainNode` | Member C |
| **Module 7** | Voice Activity & Speaking Indicators | `AnalyserNode` threshold detection, avatar pulse wave animation, mute sync | **Member D** |
| **Module 8** | TURN Server Relay & Deployment | Metered TURN integration, cross-network relay, build audit & packaging | **Member D** |

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, JavaScript, HTML5 Canvas / CSS3 Animations |
| **Real-Time Signaling** | Socket.IO (Signaling, coordinate broadcast, speaking/mute state sync) |
| **Audio & Media** | WebRTC (`RTCPeerConnection`), Web Audio API (`AudioContext`, `GainNode`, `AnalyserNode`) |
| **NAT Traversal** | Metered OpenRelay TURN / STUN servers |
| **Backend** | Node.js, Express.js |
| **Database & Security** | MongoDB Atlas, Mongoose ODM, JWT, bcryptjs |

---

## 📐 Architecture & How Proximity Audio Works

```text
[ Microphones ]
      │
      ▼
[ Web Audio API ] ────► [ AnalyserNode ] ──► Voice Activity / Speaking Pulse Animation
      │
      ▼
[ RTCPeerConnection (WebRTC) ] ◄──► [ Metered TURN / STUN Relays ]
      │
      ▼
[ Remote Audio Stream ]
      │
      ▼
[ GainNode (Distance Attenuation) ] ◄── Euclidean Distance (User A (x,y) ↔ User B (x,y))
      │
      ▼
[ Destination (Headphones/Speakers) ]
```

1. **Microphone Capture**: User grants microphone access; Web Audio API creates an `AudioContext`.
2. **Signaling Exchange**: Participants exchange WebRTC SDP offers/answers and ICE candidates over Socket.IO.
3. **Continuous Spatial Tracking**: As avatars move, coordinates `(x, y)` are broadcast to the room.
4. **Distance Calculation**: The application computes the Euclidean distance between avatars:
   $$\text{distance} = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$$
5. **Gain Modulation**: Volume is scaled from `1.0` (close) down to `0.0` (beyond hearing radius) using smooth audio curves.
6. **Voice Activity Sync**: When local volume exceeds the detection threshold, Socket.IO broadcasts speaking state to display real-time pulse animations on avatar heads.

---

## 📡 Real-Time Socket.IO Signaling Matrix

| Event Name | Direction | Payload | Description |
|---|---|---|---|
| `join-room` | Client ➔ Server | `{ roomId, displayName, position }` | User joins room, initializes coordinates |
| `avatar-position-update` | Bidirectional | `{ participantId, position, displayName }` | Broadcasts avatar `(x, y)` coordinates |
| `signal` | Bidirectional | `{ to, from, signal }` | Relays WebRTC SDP Offer/Answer and ICE candidates |
| `speaking` | Client ➔ Server | `{ roomId, isSpeaking }` | Broadcasts voice activity state for pulse animation |
| `user-speaking` | Server ➔ Peers | `{ participantId, isSpeaking }` | Displays/hides pulsating ring on avatar head |
| `toggle-mute` | Client ➔ Server | `{ roomId, isMuted }` | Broadcasts microphone mute/unmute state |
| `user-mute-status` | Server ➔ Peers | `{ participantId, isMuted }` | Displays/hides mute badge (`🔇`) on peer avatar |
| `audio-participant-left` | Server ➔ Peers | `participantId` | Cleans up WebRTC peer connection and avatar node |

---

## 📁 Project Structure

```text
ProxiSpeak-Virtual-Office/
├── client/                     # Frontend Application (React + Vite)
│   ├── public/                 # Static assets (office graphics, icons)
│   ├── src/
│   │   ├── services/
│   │   │   └── audio/
│   │   │       ├── audioManager.js      # Audio stream & mute controller
│   │   │       ├── audioSocket.js       # Socket.IO signaling connection
│   │   │       ├── microphone.js        # Mic permissions & stream capture
│   │   │       ├── proximityAudio.js    # Distance & GainNode calculation
│   │   │       ├── speechDetector.js    # VAD & volume threshold analysis
│   │   │       └── webrtc.js            # PeerConnection & TURN config
│   │   ├── Workspace.jsx       # Main 2D office canvas & avatar management
│   │   ├── style.css           # UI styles, pulse animations, layout
│   │   ├── App.jsx             # Routes & layout wrapper
│   │   └── main.jsx            # React root mount
│   ├── package.json
│   └── vite.config.js
│
├── server/                     # Backend Signaling & Auth Server (Node.js)
│   ├── routes/
│   │   └── auth.js             # Registration & login with DB/memory fallback
│   ├── models/
│   │   └── User.js             # Mongoose user schema
│   ├── src/
│   │   └── server.js           # Express app, Socket.IO handlers & WebRTC relay
│   ├── .env.example            # Sample environment variables
│   └── package.json
│
├── .gitignore
└── README.md                   # Complete Project Documentation
```

---

## 🚀 Getting Started Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [Git](https://git-scm.com/)
- Modern Web Browser (Google Chrome, Microsoft Edge, Brave, Firefox) with microphone permissions enabled

### 1. Clone the Repository
```bash
git clone https://github.com/khole2004/ProxiSpeak-Virtual-Office.git
cd ProxiSpeak-Virtual-Office
```

### 2. Start the Backend Server
Open a terminal in the root directory:
```bash
cd server
npm install
npm run dev
# or
node src/server.js
```
The backend server will start on `http://localhost:5000`.  
*(Note: If MongoDB is not running locally, the server automatically uses in-memory authentication for local testing).*

### 3. Start the Frontend Application
Open a second terminal:
```bash
cd client
npm install
npm run dev
```
Open the local URL displayed by Vite (typically `http://localhost:5173`) in your browser.

### 4. Test Multi-User Interaction
- Open `http://localhost:5173` in a normal browser window and log in.
- Open `http://localhost:5173` in an Incognito / Private window (or a second browser) and log in as a second user.
- Allow microphone access on both.
- Drag avatars close to each other to hear proximity audio; observe speaking wave animations when talking.

---

## 🎯 Viva & Review Quick Reference (Evaluator Cheat-Sheet)

1. **Why WebRTC Mesh over SFU for this project?**
   - For team sizes up to 4–6 participants in virtual rooms, WebRTC mesh delivers the lowest latency with zero media server overhead, keeping audio direct peer-to-peer.
2. **Why Web Audio API `GainNode` instead of HTML5 `<audio volume>`?**
   - `GainNode` operates natively in the audio rendering graph on raw byte streams without introducing pipeline stalls, clicks, or latency, enabling smooth linear/exponential volume attenuation based on continuous avatar movement.
3. **How does Voice Activity Detection (VAD) work without lagging the app?**
   - We tap into the local `MediaStream` using an `AnalyserNode`, compute the Root Mean Square (RMS) volume level via requestAnimationFrame, and broadcast a lightweight boolean only when the speaking status transitions.
4. **Why do we need a TURN server?**
   - In real-world networks (mobile hotspots, corporate/college Wi-Fi), symmetric NATs and firewalls block direct P2P connections. Metered OpenRelay TURN relays audio over ports 80/443 TCP/UDP as a guaranteed fallback.
5. **How does Authentication handle offline MongoDB?**
   - `server/routes/auth.js` implements an in-memory credential map (`memoryUsers`) as an automated fallback. If MongoDB Atlas is unreachable on localhost, login and registration continue without crashing the server.

---

## 👥 Team Collaboration (Infotact Solutions)

This project is developed by **Batch-22** under the Infotact Solutions Internship Program:
- **Member A**: User Interface, Animated Sign-in flow, and Virtual Office layout prototype.
- **Member B**: Interactive Canvas, Avatar Movement mechanics, and coordinate synchronization.
- **Member C**: WebRTC Mesh setup, Socket.IO signaling, and Proximity Audio GainNode integration.
- **Member D**: Speaking activity detection, visual pulse wave animations, mute/unmute controls, TURN relay integration, auth fallback, and release packaging.

---

## 📄 License
This project is developed for educational and evaluation purposes under the Infotact Solutions Internship Program.
