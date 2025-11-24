import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
// import { Pencil, Eraser, Trash2, User, Send, LogOut, Check, X } from "lucide-react";
import "./App.css";

const SERVER_URL = "https://real-time-collaborative-whiteboard-2m59.onrender.com"; 

const socket = io.connect(SERVER_URL);

function App() {
  // --- STATE ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [errorMsg, setErrorMsg] = useState(""); 
  
  const [room, setRoom] = useState("general");
  const [roomIdInput, setRoomIdInput] = useState("");
  const [roomOwner, setRoomOwner] = useState("");
  const [notification, setNotification] = useState(null); // { message, type }

  // Canvas State
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [tool, setTool] = useState("pencil"); // 'pencil' or 'eraser'

  // Chat State
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // --- DRAWING HELPER ---
  const renderDrawOp = (ctx, data) => {
       const { x, y, type, color, tool: drawTool } = data;
       const prevColor = ctx.strokeStyle;
       const prevWidth = ctx.lineWidth;
       const prevComposite = ctx.globalCompositeOperation;

       ctx.strokeStyle = color;
       
       if (drawTool === 'eraser') {
         ctx.globalCompositeOperation = 'destination-out';
         ctx.lineWidth = 20;
       } else {
         ctx.globalCompositeOperation = 'source-over';
         ctx.lineWidth = 5;
       }

       if (type === "start") {
         ctx.beginPath();
         ctx.moveTo(x, y);
       } else if (type === "draw") {
         ctx.lineTo(x, y);
         ctx.stroke();
       } else if (type === "end") {
         ctx.closePath();
       }
       
       // Restore context state
       ctx.strokeStyle = prevColor;
       ctx.lineWidth = prevWidth;
       ctx.globalCompositeOperation = prevComposite;
  };

  useEffect(() => {
    // 1. Registration Listeners
    socket.on("registration_success", () => {
        setIsLoggedIn(true);
        setErrorMsg("");
    });

    socket.on("registration_error", (msg) => {
        setErrorMsg(msg);
    });

    // 2. Room Info Listener
    socket.on("room_info", (data) => {
        setRoomOwner(data.owner);
        setNotification({ message: `Entered ${data.owner}'s Room`, type: 'info' });
        setTimeout(() => setNotification(null), 3000);
    });

    // 3. History Listener
    socket.on("load_history", (history) => {
        if (!ctxRef.current) return;
        history.forEach(op => {
            renderDrawOp(ctxRef.current, op);
        });
    });

    // 4. Drawing Listener
    socket.on("draw_data", (data) => {
       if (!ctxRef.current) return;
       renderDrawOp(ctxRef.current, data);
    });

    socket.on("clear_board", () => {
        const ctx = ctxRef.current;
        if(ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    });

    // 5. Chat Listener
    socket.on("receive_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => {
        socket.off("registration_success");
        socket.off("registration_error");
        socket.off("room_info");
        socket.off("load_history");
        socket.off("draw_data");
        socket.off("clear_board");
        socket.off("receive_message");
    };
  }, []);

  // Setup Canvas upon Login
  useEffect(() => {
    if (isLoggedIn && canvasRef.current) {
        const canvas = canvasRef.current;
        // Make canvas fit the container
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        
        const ctx = canvas.getContext("2d");
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = 5;
        ctx.strokeStyle = color;
        ctxRef.current = ctx;
        
        // Join initial room
        socket.emit("join_room", room);
    }
  }, [isLoggedIn]); // Only run once on login

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
      if(e.type === 'touchstart') {
        // e.preventDefault(); 
      }
      
      const { x, y } = getCoords(e);
      ctxRef.current.beginPath();
      ctxRef.current.moveTo(x, y);
      
      if (tool === 'eraser') {
        ctxRef.current.globalCompositeOperation = 'destination-out';
        ctxRef.current.lineWidth = 20;
      } else {
        ctxRef.current.globalCompositeOperation = 'source-over';
        ctxRef.current.lineWidth = 5;
        ctxRef.current.strokeStyle = color;
      }

      setIsDrawing(true);
      
      socket.emit("draw_data", { roomId: room, type: "start", x, y, color, tool });
  };

  const draw = (e) => {
      if (!isDrawing) return;
      if(e.type === 'touchmove') e.preventDefault(); 

      const { x, y } = getCoords(e);
      ctxRef.current.lineTo(x, y);
      ctxRef.current.stroke();
      
      socket.emit("draw_data", { roomId: room, type: "draw", x, y, color, tool });
  };

  const stopDrawing = (e) => {
      if(e.type === 'touchend') e.preventDefault();
      ctxRef.current.closePath();
      setIsDrawing(false);
      socket.emit("draw_data", { roomId: room, type: "end", x: 0, y: 0, color, tool });
      
      // Reset to default for safety
      ctxRef.current.globalCompositeOperation = 'source-over';
  };

  // --- UI ACTIONS ---
  const handleLogin = () => {
      if (username.trim()) {
          socket.emit("register", username);
      }
  };

  const createRoom = () => {
      const newRoomId = `room-${username}-${Date.now().toString().slice(-4)}`;
      joinRoom(newRoomId);
  };

  const joinRoom = (id) => {
      const targetRoom = id || roomIdInput;
      if (!targetRoom) return;

      setRoom(targetRoom);
      setMessages([]); // Clear chat
      setRoomIdInput(""); // Clear input
      
      // Clear canvas locally before joining new room (history will load)
      if (ctxRef.current) {
          ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }

      socket.emit("join_room", targetRoom);
  };

  const clearBoard = () => {
      ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      socket.emit("clear_board", room);
  };

  const sendMessage = () => {
    if (newMessage.trim()) {
      socket.emit("send_message", { roomId: room, message: newMessage, user: username });
      setNewMessage("");
    }
  };

  if (!isLoggedIn) {
      return (
          <div className="login-screen">
              <div className="login-card">
                  <h1>Welcome to Whiteboard</h1>
                  <p className="login-subtitle">Collaborate in real-time with your team</p>
                  <div className="input-group">
                      <input 
                        placeholder="Enter your username" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                      />
                  </div>
                  <button onClick={handleLogin} className="login-btn">Join Session</button>
                  {errorMsg && <p className="error-msg">{errorMsg}</p>}
              </div>
          </div>
      );
  }

// import { Pencil, Eraser, Trash2, User, Send, LogOut, Check, X } from "lucide-react";

// ... inside App component ...

  return (
    <div className="app-container">
      {notification && (
          <div className="notification">
              <p><strong>{notification.message}</strong></p>
          </div>
      )}

      {/* HEADER */}
      <header className="app-header">
        <div className="header-left">
          <h2>Whiteboard</h2>
          <span className="room-tag">Room: {room}</span>
        </div>
        <div className="header-right">
          <div className="user-badge">
            {/* <User size={18} /> */}
            <span>[U]</span>
            <span>{username}</span>
          </div>
          
          <div className="room-controls">
              <div className="join-box">
                <input 
                    placeholder="Enter Room ID" 
                    value={roomIdInput}
                    onChange={(e) => setRoomIdInput(e.target.value)} 
                />
                <button onClick={() => joinRoom()} title="Join Room">
                    {/* <LogOut size={16} /> */}
                    Join
                </button>
              </div>
              <button onClick={createRoom} className="create-room-btn">Create Room</button>
          </div>
        </div>
      </header>

      {/* SIDEBAR */}
      <aside className="app-sidebar">
        <div className="tool-group">
          <button 
            className={`tool-btn ${tool === 'pencil' ? 'active' : ''}`} 
            onClick={() => setTool('pencil')}
            title="Pencil"
          >
            {/* <Pencil size={24} /> */}
            Pencil
          </button>
          <button 
            className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`} 
            onClick={() => setTool('eraser')}
            title="Eraser"
          >
            {/* <Eraser size={24} /> */}
            Eraser
          </button>
        </div>
        
        <div className="tool-group">
          <label className="color-label">Color</label>
          <div className="color-picker-wrapper">
             <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </div>
        </div>

        <div className="tool-group">
          <button onClick={clearBoard} className="clear-btn" title="Clear Board">
            {/* <Trash2 size={24} /> */}
            Clear
          </button>
        </div>
      </aside>

      {/* CANVAS AREA */}
      <main className="canvas-area">
        <div className="canvas-container">
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
      </main>

      {/* CHAT AREA */}
      <section className="chat-area">
        <div className="chat-header">
          <h3>Comments</h3>
        </div>
        <div className="chat-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.user === username ? 'my-message' : ''}`}>
              <div className="message-user">{msg.user}</div>
              <div className="message-content">{msg.message}</div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="chat-input">
          <input 
            placeholder="Type a comment..." 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          />
          <button onClick={sendMessage}>
            {/* <Send size={18} /> */}
            Send
          </button>
        </div>
      </section>
    </div>
  );
}

export default App;
