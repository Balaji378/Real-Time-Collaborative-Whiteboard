import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import "./App.css";

const SERVER_URL = "https://real-time-collaborative-whiteboard-2m59.onrender.com"; 

const socket = io.connect(SERVER_URL);

function App() {
  // --- STATE ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [errorMsg, setErrorMsg] = useState(""); 
  
  const [room, setRoom] = useState("general");
  const [inviteTo, setInviteTo] = useState("");
  const [incomingInvite, setIncomingInvite] = useState(null);

  // Canvas State
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#000000");

  useEffect(() => {
    // 1. Registration Listeners
    socket.on("registration_success", () => {
        setIsLoggedIn(true);
        setErrorMsg("");
    });

    socket.on("registration_error", (msg) => {
        setErrorMsg(msg);
    });

    // 2. Invite Listener
    socket.on("receive_invite", (data) => {
        setIncomingInvite(data); 
    });

    // 3. Drawing Listener
    socket.on("draw_data", (data) => {
       if (!ctxRef.current) return;
       const { x, y, type, color } = data;
       const ctx = ctxRef.current;
       const prevColor = ctx.strokeStyle;
       ctx.strokeStyle = color;

       if (type === "start") {
         ctx.beginPath();
         ctx.moveTo(x, y);
       } else if (type === "draw") {
         ctx.lineTo(x, y);
         ctx.stroke();
       } else if (type === "end") {
         ctx.closePath();
       }
       ctx.strokeStyle = prevColor;
    });

    socket.on("clear_board", () => {
        const ctx = ctxRef.current;
        if(ctx) ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    });

    return () => {
        socket.off("registration_success");
        socket.off("registration_error");
        socket.off("receive_invite");
        socket.off("draw_data");
        socket.off("clear_board");
    };
  }, []);

  // Setup Canvas upon Login
  useEffect(() => {
    if (isLoggedIn && canvasRef.current) {
        const canvas = canvasRef.current;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const ctx = canvas.getContext("2d");
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = 5;
        ctx.strokeStyle = color;
        ctxRef.current = ctx;
        socket.emit("join_room", room);
    }
  }, [isLoggedIn, room]);

  // --- HELPER: Get Coordinates for Mouse OR Touch ---
  const getCoords = (e) => {
      if (e.touches && e.touches.length > 0) {
          const rect = canvasRef.current.getBoundingClientRect();
          return {
              x: e.touches[0].clientX - rect.left,
              y: e.touches[0].clientY - rect.top
          };
      }
      return {
          x: e.nativeEvent.offsetX,
          y: e.nativeEvent.offsetY
      };
  };

  // --- DRAWING HANDLERS ---
  const startDrawing = (e) => {
      // Prevent scrolling on mobile
      if(e.type === 'touchstart') {
        // e.preventDefault(); // Uncomment if scrolling is still an issue
      }
      
      const { x, y } = getCoords(e);
      ctxRef.current.beginPath();
      ctxRef.current.moveTo(x, y);
      ctxRef.current.strokeStyle = color;
      setIsDrawing(true);
      
      socket.emit("draw_data", { roomId: room, type: "start", x, y, color });
  };

  const draw = (e) => {
      if (!isDrawing) return;
      if(e.type === 'touchmove') e.preventDefault(); // Stop scroll while drawing

      const { x, y } = getCoords(e);
      ctxRef.current.lineTo(x, y);
      ctxRef.current.stroke();
      
      socket.emit("draw_data", { roomId: room, type: "draw", x, y, color });
  };

  const stopDrawing = (e) => {
      if(e.type === 'touchend') e.preventDefault();
      ctxRef.current.closePath();
      setIsDrawing(false);
      socket.emit("draw_data", { roomId: room, type: "end", x: 0, y: 0, color });
  };

  // --- UI ACTIONS ---
  const handleLogin = () => {
      if (username.trim()) {
          socket.emit("register", username);
      }
  };

  const sendInvite = () => {
      if (inviteTo) {
          // Create unique room name
          const privateRoom = `room-${username}-${Date.now()}`;
          setRoom(privateRoom);
          socket.emit("join_room", privateRoom);
          socket.emit("send_invite", { toUser: inviteTo, roomId: privateRoom });
          alert(`Invite sent! You are now in a private room.`);
          clearBoard();
      }
  };

  const acceptInvite = () => {
      const newRoom = incomingInvite.roomId;
      setRoom(newRoom);
      socket.emit("join_room", newRoom);
      setIncomingInvite(null);
      clearBoard();
  };

  const clearBoard = () => {
      ctxRef.current.clearRect(0, 0, window.innerWidth, window.innerHeight);
      socket.emit("clear_board", room);
  };

  if (!isLoggedIn) {
      return (
          <div className="login-screen">
              <h1>Whiteboard Login</h1>
              <input 
                placeholder="Enter Username" 
                onChange={(e) => setUsername(e.target.value)} 
              />
              <button onClick={handleLogin}>Join</button>
              {errorMsg && <p style={{color: 'red', marginTop: '10px'}}>{errorMsg}</p>}
          </div>
      );
  }

  return (
    <div className="container">
      {incomingInvite && (
          <div className="notification">
              <p>User <strong>{incomingInvite.fromUser}</strong> invited you!</p>
              <button onClick={acceptInvite}>Accept</button>
              <button onClick={() => setIncomingInvite(null)}>Decline</button>
          </div>
      )}

      <div className="toolbar">
          <span className="user-tag">{username}</span>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          <div className="invite-box">
              <input 
                placeholder="Friend's Name" 
                onChange={(e) => setInviteTo(e.target.value)} 
              />
              <button onClick={sendInvite}>Invite</button>
          </div>
          <button onClick={clearBoard} className="clear-btn">Clear</button>
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
    </div>
  );
}

export default App;