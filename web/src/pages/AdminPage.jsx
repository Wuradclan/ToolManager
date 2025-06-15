// src/pages/AdminDashboard.jsx
import React, { useState, useRef, useEffect } from "react";
import { auth, db } from "../firebaseConfig";
import { signOut } from "firebase/auth";
import { collection, GeoPoint, addDoc, doc, updateDoc, onSnapshot, query, orderBy, deleteDoc, } from "firebase/firestore";
import QRCode from "react-qr-code";
import html2canvas from "html2canvas";
import { useNavigate } from "react-router-dom";
import { getUserRole } from "../utils/getUserRole";




export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  const [toolName, setToolName] = useState("");
  const [addedToolId, setAddedToolId] = useState(null);
  const [toolType, setToolType] = useState("");
  const [qrUrl, setQrUrl] = useState(null);
  const qrRef = useRef();
  const [tools, setTools] = useState([]);
  const [condition, setCondition] = useState("");
  const [status, setStatus] = useState("");
  const [location, setLocation] = useState("");
  const [lastUsedBy, setLastUsedBy] = useState("");
  const [gpsLocation, setGpsLocation] = useState({ lat: 0, lng: 0 });

  // edit 
  const [editingToolId, setEditingToolId] = useState(null);
  const [editedName, setEditedName] = useState("");
  const [editedType, setEditedType] = useState("");


  useEffect(() => {
    const checkAccess = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate("/login");
        return;
      }

      const role = await getUserRole();
      if (role !== "admin") {
        navigate("/unauthorized"); // or show 403 page
        return;
      }

      setIsAdmin(true);
      setLoading(false);
        // 🔁 Fetch and listen to tools collection
      const q = query(collection(db, "tools"), orderBy("createdAt", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const toolsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTools(toolsData);
      });

      // Cleanup on unmount
      return () => unsubscribe();
    };
    checkAccess();
  }, []);

  if (loading) return (
  <div className="flex items-center justify-center h-screen">
    <p className="text-gray-600">Checking admin access...</p>
  </div>  
  );
  if (!isAdmin && !loading) return <p className="text-center mt-10 text-red-600">Access denied</p>;
   

  const handleAddTool = async () => {
    if (!toolName) return;
    // 1. Add tool to Firestore
   const docRef = await addDoc(collection(db, "tools"), {
      name: toolName,
      type: toolType,
      condition,
      status,
      location,
      lastUsedBy,
      gpsLocation: new GeoPoint(gpsLocation.lat, gpsLocation.lng),
      createdAt: new Date()
    });
    const toolId = docRef.id;
    setAddedToolId(toolId);
    // 2. Render QR Code and convert it to image
    setTimeout(async () => {
    const canvas = await html2canvas(qrRef.current);
    canvas.toBlob(async (blob) => {
    const formData = new FormData();
    formData.append("file", blob);
    formData.append("upload_preset", "tool_QRCode_upload");

    try {
      const res = await fetch("https://api.cloudinary.com/v1_1/dmtgdujxu/image/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Upload failed");

      const imageUrl = data.secure_url;
      console.log("Cloudinary URL:", imageUrl);

      setQrUrl(imageUrl);

      await updateDoc(doc(db, "tools", toolId), {
        qrImageUrl: imageUrl,
      });

          console.log("Firestore updated successfully");
        } catch (error) {
          console.error("Upload or Firestore update error:", error);
          alert("Error uploading QR or updating Firestore: " + error.message);
        }
      }, "image/png");
    }, 1000);; // Wait for QRCode to render

    // Clear inputs
    setToolName("");
    setToolType("");
    setCondition("");
    setStatus("");
    setLocation("");
    setLastUsedBy("");
    setGpsLocation({ lat: 0, lng: 0 });
  };

  // edit and delete 
  const handleDeleteTool = async (toolId) => {
    if (!window.confirm("Are you sure you want to delete this tool?")) return;
    try {
      await deleteDoc(doc(db, "tools", toolId));
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete tool.");
    }
  };

  const startEditing = (tool) => {
    setEditingToolId(tool.id);
    setEditedName(tool.name);
    setEditedType(tool.type || "");
  };

  const cancelEditing = () => {
    setEditingToolId(null);
    setEditedName("");
    setEditedType("");
  };

  const handleSaveEdit = async (toolId) => {
    try {
      await updateDoc(doc(db, "tools", toolId), {
        name: editedName,
        type: editedType,
      });
      cancelEditing();
    } catch (error) {
      console.error("Update error:", error);
      alert("Failed to update tool.");
    }
  };


  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error during sign-out:", error);
      alert("Logout failed. Please try again.");
    }
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
      <input
        type="text"
        className="border p-2 w-full mb-2"
        value={toolType}
        onChange={(e) => setToolType(e.target.value)}
        placeholder="Tool Type"
      />
      <input
        type="text"
        className="border p-2 w-full mb-2"
        value={condition}
        onChange={(e) => setCondition(e.target.value)}
        placeholder="Condition (e.g. good)"
      />

      <input
        type="text"
        className="border p-2 w-full mb-2"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        placeholder="Status (e.g. available)"
      />

      <input
        type="text"
        className="border p-2 w-full mb-2"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Location (e.g. Workshop A)"
      />

      <input
        type="text"
        className="border p-2 w-full mb-2"
        value={lastUsedBy}
        onChange={(e) => setLastUsedBy(e.target.value)}
        placeholder="Last Used By (e.g. user123)"
      />

      <div className="flex gap-2 mb-2">
        <input
          type="number"
          className="border p-2 w-1/2"
          value={gpsLocation.lat}
          onChange={(e) => setGpsLocation({ ...gpsLocation, lat: parseFloat(e.target.value) })}
          placeholder="Latitude"
        />
        <input
          type="number"
          className="border p-2 w-1/2"
          value={gpsLocation.lng}
          onChange={(e) => setGpsLocation({ ...gpsLocation, lng: parseFloat(e.target.value) })}
          placeholder="Longitude"
        />
      </div>

      <button
        className="bg-blue-500 text-white px-4 py-2 rounded"
        onClick={handleAddTool}
      >
        Add Tool
      </button>

      {addedToolId && (
        <div className="mt-4">
          <p>QR Code for Tool ID: <code>{addedToolId}</code></p>
         <div
          ref={qrRef}
          style={{
            display: "inline-block",
            padding: 0,
            margin: 0,
            backgroundColor: "white",
            width: "auto",
          }}
        >
          <QRCode value={addedToolId} size={256} /> {/* Use square size like 256x256 */}
        </div>
          {qrUrl && (
            <div className="mt-2">
              <p className="text-sm text-green-600">QR image saved:</p>
              <a href={qrUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">View QR Code</a>
            </div>
          )}
        </div>
      )}
        {tools.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-2">Tool List</h2>
            <ul className="space-y-2">
              {tools.map((tool) => (
                <li
                  key={tool.id}
                  className="p-3 border rounded shadow-sm flex flex-col gap-2 text-xs text-gray-700"
                >
                  {editingToolId === tool.id ? (
                    <div className="p-2 border rounded bg-gray-50">
                      <h3 className="font-semibold mb-2">Editing: {tool.name}</h3>
                      <input
                        type="text"
                        className="border p-2 w-full mb-2"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        placeholder="Edited Name"
                      />
                      <input
                        type="text"
                        className="border p-2 w-full mb-2"
                        value={editedType}
                        onChange={(e) => setEditedType(e.target.value)}
                        placeholder="Edited Type"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(tool.id)}
                          className="bg-green-500 text-white px-4 py-2 rounded"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="bg-gray-300 text-black px-4 py-2 rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between gap-2">
                      <div className="flex-1 space-y-0.5">
                        <p className="font-semibold">{tool.name}</p>
                        <p>Type: {tool.type || "N/A"}</p>
                        <p>Status: {tool.status || "N/A"}</p>
                        <p>Condition: {tool.condition || "N/A"}</p>
                        <p>Location: {tool.location || "N/A"}</p>
                        <p>Last Used By: {tool.lastUsedBy || "N/A"}</p>
                        {tool.gpsLocation && (
                          <p>
                            GPS: {tool.gpsLocation.latitude.toFixed(4)}, {tool.gpsLocation.longitude.toFixed(4)}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        {tool.qrImageUrl ? (
                          <a href={tool.qrImageUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                          <img
                            src={tool.qrImageUrl.replace("/upload/", "/upload/w_100,h_100,c_scale/")}
                            alt={`QR for ${tool.name}`}
                            className="border rounded w-60 h-60 object-contain"
                          />
                          </a>
                        ) : (
                          <p className="text-red-500">QR missing</p>
                        )}
                        <button
                          onClick={() => startEditing(tool)}
                          className="text-blue-500 underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTool(tool.id)}
                          className="text-red-500 underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}


            </ul>
            {/* {editingToolId && (
            <div className="mt-4 p-4 border rounded bg-gray-100">
              <h3 className="font-semibold mb-2">Edit Tool</h3>
              <input
                type="text"
                className="border p-2 w-full mb-2"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                placeholder="Edited Name"
              />
              <input
                type="text"
                className="border p-2 w-full mb-2"
                value={editedType}
                onChange={(e) => setEditedType(e.target.value)}
                placeholder="Edited Type"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleSaveEdit(editingToolId)}
                  className="bg-green-500 text-white px-4 py-2 rounded"
                >
                  Save
                </button>
                <button
                  onClick={cancelEditing}
                  className="bg-gray-300 text-black px-4 py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          )} */}
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