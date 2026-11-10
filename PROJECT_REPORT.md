# ProxiSpeak: Engineering & Academic Project Report

**Project Title:** 3D Geospatial Proximity Audio Virtual Office for Distributed Teams  
**Repository:** [github.com/khole2004/ProxiSpeak-Virtual-Office](https://github.com/khole2004/ProxiSpeak-Virtual-Office)  
**Author / Developer:** Komal Khole ([@khole2004](https://github.com/khole2004))  
**Date of Submission:** November 2026  
**License:** MIT Open Source  

---

## 1. Executive Summary & Abstract

With the global adoption of remote and hybrid work models, distributed teams face two predominant challenges: **"Zoom fatigue"** caused by rigid grid-based video calls and the loss of **spontaneous workplace interactions** (hallway watercooler conversations).

**ProxiSpeak** solves this problem by providing an interactive 2D/3D virtual office canvas powered by **real-time geospatial proximity audio**. Instead of unmuted audio channels where everyone talks over each other, participants control an avatar inside designated office rooms and zones. Utilizing the HTML5 Web Audio API and WebRTC peer-to-peer mesh networking, participants' voices naturally attenuate (fade) based on their Euclidean distance in the office canvas. When colleagues walk closer to each other, their voices become crystal clear; as they walk away, audio smoothly fades to total silence.

---

## 2. Mathematical Foundations & Audio Attenuation Model

### 2.1 Spatial Distance Formula
The Euclidean separation between the local user $A(x_1, y_1)$ and a peer $B(x_2, y_2)$ is calculated at 60 FPS:

$$d = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$$

### 2.2 Proximity Gain Modulation
Audio volume gain $G(d) \in [0.0, 1.0]$ is governed by a piecewise falloff model:

$$
G(d) = \begin{cases}
1.0 & \text{if } d \le d_{\text{near}} \quad (100\text{ units}) \\
1.0 - \dfrac{d - d_{\text{near}}}{d_{\text{far}} - d_{\text{near}}} & \text{if } d_{\text{near}} < d \le d_{\text{far}} \quad (500\text{ units}) \\
0.0 & \text{if } d > d_{\text{far}} \quad (\text{Complete Mute / Silence})
\end{cases}
$$

### 2.3 Binaural Stereo Panning
Left/Right headphone ear separation is determined by the relative horizontal displacement:

$$P(\Delta x) = \text{clamp}\left(\frac{x_{\text{peer}} - x_{\text{local}}}{D_{\text{pan\_max}}}, -1.0, 1.0\right)$$

Where $-1.0$ represents 100% Left Channel, $+1.0$ represents 100% Right Channel, and $0.0$ represents Center.

---

## 3. System Architecture & Tech Stack

```text
+-----------------------------------------------------------------------------------+
|                                 CLIENT TIER                                       |
|  - React 18 & Vite (SPA Front-End & Responsive Layout)                           |
|  - Three.js & Canvas (3D Entrance Door, Room Navigation, Spatial Avatars)        |
|  - Web Audio API (GainNodes, AnalyserNode, StereoPannerNode, Procedural Chimes)   |
|  - WebRTC RTCPeerConnection (Low-Latency Direct Peer Mesh Media Streams)         |
+-----------------------------------------------------------------------------------+
                                  |                 ^
             Socket.IO Signaling  |                 | Direct WebRTC Audio
             (SDP Offers/Answers) |                 | (Metered STUN/TURN Relays)
                                  v                 v
+-----------------------------------------------------------------------------------+
|                                 SERVER TIER                                       |
|  - Node.js & Express.js (HTTP REST API & Security Headers)                       |
|  - Socket.IO (Low-latency bidirectional spatial coordinate broadcasting)          |
|  - Sliding-Window Rate Limiter Middleware (Anti-DoS & spam protection)           |
|  - Live Health & Telemetry Metrics Engine (/api/health, /api/rooms/metrics)       |
+-----------------------------------------------------------------------------------+
                                  |
                                  v
+-----------------------------------------------------------------------------------+
|                               DATABASE TIER                                       |
|  - MongoDB Atlas Cloud Database (User Profiles, Authentication, Room History)    |
|  - Mongoose ODM & bcryptjs Password Hashing                                       |
|  - Automatic Fallback to Resilient In-Memory Mode during offline development     |
+-----------------------------------------------------------------------------------+
```

---

## 4. Key Functional Modules

| Module # | Module Name | Functional Scope |
|---|---|---|
| **Module 1** | **Authentication & Security** | JWT-based authentication, bcrypt password encryption, protected routes, and session validation. |
| **Module 2** | **Interactive 3D Entrance & Rooms** | Three.js interactive 3D office entrance with rotating doors, lighting effects, and canvas boundary clamping. |
| **Module 3** | **Spatial Canvas Workspace** | 2D office layout supporting drag-and-drop avatar navigation, mouse coordinate tracking, and live participant markers. |
| **Module 4** | **Socket.IO Real-Time Engine** | Coordinates broadcast at 60 FPS, room joining/leaving state management, and real-time synchronization. |
| **Module 5** | **Web Audio Distance Attenuation** | Dynamic `GainNode` modulation applying piecewise linear distance falloff and threshold muting. |
| **Module 6** | **Binaural Stereo Panning** | Spatial stereo panner calculating horizontal azimuth angle for directional headphone audio perception. |
| **Module 7** | **Voice Activity Detection (VAD)** | Fast Fourier Transform (FFT) frequency analysis rendering pulsing visual glow around active speakers. |
| **Module 8** | **WebRTC Peer Mesh & NAT Traversal** | Mesh audio streaming with automatic ICE reconnection and STUN/TURN OpenRelay server integration. |

---

## 5. Verification & Performance Benchmarking

### 5.1 Automated Unit & Integration Tests
The project features an automated Node.js test suite (`tests/proximityAudio.test.js`) executed with `npm test`:
- **Euclidean Distance Accuracy**: Verified 3-4-5 Pythagorean triangle geometry ($d = 50$).
- **Near-Field Full Volume**: Verified 100% gain within 100 units.
- **Mid-Field Attenuation**: Verified exact 50% gain at 300 units.
- **Far-Field Silence**: Verified 0% volume beyond 500 units.
- **Monotonicity**: Verified gain monotonically decreases with distance.
- **Voice Activity Thresholds**: Verified noise suppression threshold filtering.
- **Boundary Clamping**: Verified avatar coordinates never escape canvas bounds.
- **Stereo Panning**: Verified directional left/right audio clamping.

### 5.2 Performance Benchmark Metrics
Run via `npm run benchmark`:
- **Euclidean Distance Throughput**: > 34,000,000 ops/second (2.9 ms for 100,000 iterations).
- **Audio Falloff Throughput**: > 83,000,000 ops/second (1.2 ms for 100,000 iterations).
- **Stereo Azimuth Throughput**: > 5,300,000 ops/second (18.8 ms for 100,000 iterations).

---

## 6. Deployment & Hosting Specifications

1. **Client Deployment (Vercel)**:
   - Configured with `vercel.json` SPA rewrite rules and static asset caching.
2. **Backend Server Deployment (Render)**:
   - Configured with `render.yaml` infrastructure-as-code specification.
3. **PWA & Search Engine Indexation**:
   - Progressive Web App manifest (`manifest.json`), robots policy (`robots.txt`), XML sitemap (`sitemap.xml`), and OpenGraph banner (`office-preview.svg`).

---

## 7. Conclusion

ProxiSpeak bridges the communication gap in distributed remote workplaces. By combining modern Web Audio API DSP algorithms, WebRTC peer mesh networking, and responsive canvas avatars, the application delivers a natural, zero-fatigue virtual office experience ready for enterprise deployment.
