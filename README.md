# Real-Time Collaborative Whiteboard

A modern, real-time collaborative whiteboard application that allows users to draw, chat, and collaborate in private rooms. Built with React, Node.js, and Socket.IO.

## ✨ Features

-   **Real-Time Collaboration**: Draw with multiple users simultaneously with low latency.
-   **Room System**:
    -   **General Room**: Default room for all users.
    -   **Private Rooms**: Create or join specific rooms using unique Room IDs.
    -   **History Persistence**: New users joining a room see the existing drawing history.
-   **Tools**:
    -   ✏️ **Pencil**: Freehand drawing.
    -   🧹 **Eraser**: Erase parts of the drawing.
    -   🎨 **Color Picker**: Choose any color for your brush.
    -   🗑️ **Clear Board**: Instantly clear the canvas for everyone in the room.
-   **Chat**: Real-time comments/chat section to communicate with room members.
-   **User Presence**: Notifications when users enter your room.
-   **Responsive Design**: Works on desktop and mobile devices.

## 🛠️ Tech Stack

-   **Frontend**:
    -   [React](https://react.dev/) (Vite)
    -   [Socket.IO Client](https://socket.io/) (Real-time communication)
    -   [Lucide React](https://lucide.dev/) (Icons)
    -   CSS Grid & Flexbox (Layout)
-   **Backend**:
    -   [Node.js](https://nodejs.org/)
    -   [Express](https://expressjs.com/)
    -   [Socket.IO](https://socket.io/) (WebSocket server)

## 🚀 Getting Started

### Prerequisites

-   Node.js (v18 or higher)
-   npm (Node Package Manager)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/Balaji378/Real-Time-Collaborative-Whiteboard.git
    cd Real-Time-Collaborative-Whiteboard
    ```

2.  **Install Dependencies**
    Run the following command in the root directory. It will install dependencies for the root, client, and server.
    ```bash
    npm install && cd client && npm install && cd ../server && npm install
    ```

### Running the Application

1.  **Start the Development Server**
    From the root directory, run:
    ```bash
    npm start
    ```
    This command uses `concurrently` to run both the backend server (port 3001) and the frontend client (port 5173).

2.  **Access the App**
    Open your browser and navigate to:
    ```
    http://localhost:5173
    ```

## 🎮 Usage

1.  **Login**: Enter a username to join.
2.  **Draw**: Use the pencil tool to draw on the canvas.
3.  **Create Room**: Click "Create Room" in the header to generate a unique Room ID and switch to a private space.
4.  **Join Room**: Enter a Room ID in the header input and click the "Join" button (door icon) to join an existing room.
5.  **Invite**: Share the Room ID with friends so they can join you.
6.  **Chat**: Use the right sidebar to send messages to users in the same room.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
