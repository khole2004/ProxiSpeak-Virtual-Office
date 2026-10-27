# ProxiSpeak – Virtual Office

## About the Project

ProxiSpeak is a virtual office application where people can meet and communicate online using avatars. Instead of joining a traditional video call, users can move their avatars around a virtual workspace and talk to other people nearby.

The main idea is to make online communication feel more natural, similar to how people interact in a real office.

When two users are close to each other in the virtual space, their voices can be heard clearly. As they move farther apart, the volume of their voices gradually decreases.

## Features

- **Virtual Office:** A shared virtual workspace where users can interact.
- **Avatar-Based Interaction:** Users are represented by avatars inside the workspace.
- **Real-Time Voice Chat:** Users can communicate using their microphones.
- **Proximity-Based Audio:** Voice volume changes according to the distance between users.
- **WebRTC Communication:** Enables real-time audio communication between participants.
- **Socket.IO Signaling:** Helps participants exchange the information required to establish voice connections.
- **User Authentication:** Supports user registration and login.

## Technologies Used

**Frontend**

- React.js
- Vite
- JavaScript
- HTML and CSS

**Backend**

- Node.js
- Express.js
- Socket.IO

**Real-Time Communication**

- WebRTC
- Web Audio API
- GainNode for controlling audio volume based on distance

**Database and Authentication**

- MongoDB
- Mongoose
- JWT
- bcrypt

## How Proximity-Based Audio Works

ProxiSpeak uses the positions of avatars to calculate the distance between participants.

1. A user grants microphone permission.
2. WebRTC establishes an audio connection between participants.
3. Socket.IO helps exchange signaling information.
4. The application calculates the distance between avatars using their positions.
5. The Web Audio API adjusts the volume of each remote participant.
6. Nearby users can be heard more clearly, while the voices of distant users become quieter.

This feature helps create a more realistic virtual office experience.

## Project Structure

```text
proxispeck/
├── client/
│   ├── src/
│   │   └── services/
│   │       └── audio/
│   │           ├── audioManager.js
│   │           ├── audioSocket.js
│   │           ├── microphone.js
│   │           ├── webrtc.js
│   │           └── proximityAudio.js
│   └── package.json
│
├── server/
│   └── package.json
│
├── .gitignore
└── README.md
```

_Note: This is the main project structure. Other files and folders may exist in the repository._

## Requirements

Before running the project, install:

- Node.js and npm
- MongoDB, if using a local database
- A modern browser such as Google Chrome
- Git (optional, for version control)

## How to Run the Project

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd proxispeck
```

Replace `<your-repository-url>` with your GitHub repository URL.

### 2. Install Frontend Dependencies

```bash
cd client
npm install
```

### 3. Start the Frontend

```bash
npm run dev
```

Keep this terminal running. Vite will display the local URL for the frontend.

### 4. Start the Backend

Open a second terminal and navigate to the server folder:

```bash
cd server
npm install
```

Configure the required environment variables and MongoDB connection according to the server configuration. Then start the backend using the script defined in `server/package.json`. For example, if the project defines a `dev` script:

```bash
npm run dev
```

The audio signaling client currently connects to `http://localhost:5000`.

**Important:** The frontend and backend must both be running for the application to work properly. If your project uses different scripts or configuration, follow the settings in its `package.json` and server files.

## Team Project

ProxiSpeak is being developed as a team project. Each team member contributes to different parts of the application, including the user interface, backend functionality, and real-time communication.

## Future Improvements

- Improve audio connection reliability.
- Make avatar movement and audio volume updates work smoothly together.
- Add more virtual rooms and workspace features.
- Improve microphone controls and participant management.
- Deploy the application so users can connect from different devices.

## Conclusion

ProxiSpeak aims to make remote collaboration more interactive by combining a virtual workspace, avatars, real-time voice communication, and distance-based audio. It provides a foundation for creating a more natural online office experience.
