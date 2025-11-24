import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import './App.css';

// ⚠️ KEEP YOUR STACKBLITZ BACKEND URL HERE ⚠️
const SERVER_URL =
  'https://stackblitzstartersevoshp2o-nfgs--3001--cf284e50.local-corp.webcontainer.io';

const socket = io.connect(SERVER_URL);

function App() {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // New State for Toolbar
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(5);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctxRef.current = ctx;

    socket.emit('join_room', 'room1');

    // Listen for Drawing
    socket.on('draw_data', (data) => {
      const { x, y, type, color, size } = data;
      const ctx = ctxRef.current;

      // Temporarily match the broadcaster's style
      ctx.strokeStyle = color;
      ctx.lineWidth = size;

      if (type === 'start') {
        ctx.beginPath();
        ctx.moveTo(x, y);
      } else if (type === 'draw') {
        ctx.lineTo(x, y);
        ctx.stroke();
      } else if (type === 'end') {
        ctx.closePath();
      }
    });

    // Listen for Clear
    socket.on('clear_board', () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
  }, []);

  // Helper to emit events with current style
  const emitEvent = (type, x, y) => {
    socket.emit('draw_data', {
      roomId: 'room1',
      type,
      x,
      y,
      color: color, // Send current color
      size: lineWidth, // Send current size
    });
  };

  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(offsetX, offsetY);
    // Set local style
    ctxRef.current.strokeStyle = color;
    ctxRef.current.lineWidth = lineWidth;

    setIsDrawing(true);
    emitEvent('start', offsetX, offsetY);
  };

  const draw = ({ nativeEvent }) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;
    ctxRef.current.lineTo(offsetX, offsetY);
    ctxRef.current.stroke();
    emitEvent('draw', offsetX, offsetY);
  };

  const endDrawing = () => {
    ctxRef.current.closePath();
    setIsDrawing(false);
    emitEvent('end');
  };

  const clearBoard = () => {
    // Clear locally
    const canvas = canvasRef.current;
    ctxRef.current.clearRect(0, 0, canvas.width, canvas.height);
    // Tell server to clear everyone else
    socket.emit('clear_board', 'room1');
  };

  return (
    <div className="container">
      {/* TOOLBAR */}
      <div className="toolbar">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
        <button
          onClick={() => {
            setColor('#000000');
            setLineWidth(5);
          }}
        >
          Pencil
        </button>
        <button
          onClick={() => {
            setColor('#FFFFFF');
            setLineWidth(20);
          }}
        >
          Eraser
        </button>
        <button
          onClick={clearBoard}
          style={{ background: 'red', color: 'white' }}
        >
          Clear Board
        </button>
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={endDrawing}
      />
    </div>
  );
}

export default App;
