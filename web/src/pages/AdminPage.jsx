// src/pages/AdminDashboard.jsx
import React, { useState } from "react";
import { auth, db } from "../firebaseConfig";
import { signOut } from "firebase/auth";
import { collection, addDoc } from "firebase/firestore";
import QRCode from "react-qr-code";

export default function AdminDashboard() {
  const [toolName, setToolName] = useState("");
  const [addedToolId, setAddedToolId] = useState(null);

  const handleAddTool = async () => {
    if (!toolName) return;
    const docRef = await addDoc(collection(db, "tools"), {
      name: toolName,
      createdAt: new Date()
    });
    setAddedToolId(docRef.id);
    setToolName("");
  };

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Admin Dashboard</h1>
      <input
        type="text"
        className="border p-2 w-full mb-2"
        value={toolName}
        onChange={(e) => setToolName(e.target.value)}
        placeholder="Tool name"
      />
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded"
        onClick={handleAddTool}
      >
        Add Tool
      </button>
      {addedToolId && (
        <div className="mt-4">
          <p>QR Code for Tool ID: <code>{addedToolId}</code></p>
          <QRCode value={addedToolId} />
        </div>
      )}
      <button
        onClick={handleLogout}
        className="text-sm text-red-500 mt-6 underline"
      >
        Logout
      </button>
    </div>
  );
}
