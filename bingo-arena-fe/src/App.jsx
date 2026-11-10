
import { Routes, Route, Navigate } from "react-router";

import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import Home from "./pages/Home/Home";
import CreateRoom from "./pages/CreateRoom/CreateRoom";
import WaitingRoom from "./pages/WaitingRoom/WaitingRoom";
import JoinRoom from "./pages/JoinRoom/JoinRoom";
import Game from "./pages/Game/Game";
import Result from "./pages/Result/Result";
import History from "./pages/History/History";

function ProtectedRoute({ children }) {
  const token = sessionStorage.getItem(
    "bingo_access_token"
  );

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />

      <Route
        path="/create-room"
        element={
          <ProtectedRoute>
            <CreateRoom />
          </ProtectedRoute>
        }
      />

      <Route
        path="/room/:code"
        element={
          <ProtectedRoute>
            <WaitingRoom />
          </ProtectedRoute>
        }
      />

      <Route
        path="/join-room"
        element={
          <ProtectedRoute>
            <JoinRoom />
          </ProtectedRoute>
        }
      />

      <Route
        path="/game/:code"
        element={
          <ProtectedRoute>
            <Game />
          </ProtectedRoute>
        }
      />

      <Route
        path="/result/:code"
        element={
          <ProtectedRoute>
            <Result />
          </ProtectedRoute>
        }
      />

      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <History />
          </ProtectedRoute>
        }
      />

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}
