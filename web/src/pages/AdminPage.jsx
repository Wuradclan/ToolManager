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
  const [toolCondition, setCondition] = useState("");
  const [toolStatus, setStatus] = useState("");
  const [toolLocation, setLocation] = useState("");
  const [toolLastUsedBy, setLastUsedBy] = useState("");
  const [toolGpsLocation, setGpsLocation] = useState({ lat: 0, lng: 0 });

  // edit 
  const [editingToolId, setEditingToolId] = useState(null);
  const [editedName, setEditedName] = useState("");
  const [editedType, setEditedType] = useState("");
  const [editedLocation, setEditedLocation] = useState("");
  const [editedCondition, setEditedCondition] = useState("");
  const [editedStatus, setEditedStatus] = useState("");
  const [editedGpsLocation, setEditedGpsLocation] = useState({ lat: "", lng: "" });
  const [editedLastUsedBy, setEditedLastUsedBy] = useState("");

  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(""); 




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
      setCurrentUserId(user.uid);
      setLastUsedBy(user.uid); // default selected
        // 🔁 Fetch and listen to tools collection
      const q = query(collection(db, "tools"), orderBy("createdAt", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const toolsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTools(toolsData);
      });
      // Fetch users for dropdown
      const usersSnapshot = await onSnapshot(collection(db, "users"), (snapshot) => {
        const userList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUsers(userList);
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
      condition: toolCondition,
      status : toolStatus,
      location : toolLocation,
      lastUsedBy: doc(db, "users", toolLastUsedBy),
      gpsLocation: new GeoPoint(toolGpsLocation.lat, toolGpsLocation.lng),
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
    //setLastUsedBy("");
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
    setEditedCondition(tool.condition);
    setEditedStatus(tool.status);
    setEditedLocation(tool.location);
    setEditedLastUsedBy(tool.lastUsedBy?.id)
    setEditedGpsLocation({
    lat: tool.gpsLocation?.latitude ?? "",
    lng: tool.gpsLocation?.longitude ?? "",
  });
  };

  const cancelEditing = () => {
    setEditingToolId(null);
    setEditedName("");
    setEditedType("");
    setEditedCondition("");
    setEditedLocation("");
    setEditedStatus("");
    setEditedLastUsedBy("");
    setEditedGpsLocation({ lat: 0, lng: 0 });
  };

  const handleSaveEdit = async (toolId) => {
    try {
      if (
        !editedGpsLocation ||
        typeof editedGpsLocation.lat !== "number" ||
        typeof editedGpsLocation.lng !== "number" ||
        editedGpsLocation.lat < -90 || editedGpsLocation.lat > 90 ||
        editedGpsLocation.lng < -180 || editedGpsLocation.lng > 180
      ) {
        alert("Invalid GPS coordinates. Please provide valid latitude and longitude.");
        return;
      }

      await updateDoc(doc(db, "tools", toolId), {
        name: editedName,
        type: editedType,
        condition: editedCondition,
        status: editedStatus,
        location: editedLocation,
        lastUsedBy: doc(db, "users", editedLastUsedBy),
        gpsLocation: new GeoPoint(editedGpsLocation.lat, editedGpsLocation.lng),
        createdAt: new Date()
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
        value={toolCondition}
        onChange={(e) => setCondition(e.target.value)}
        placeholder="Condition (e.g. good)"
      />

      <input
        type="text"
        className="border p-2 w-full mb-2"
        value={toolStatus}
        onChange={(e) => setStatus(e.target.value)}
        placeholder="Status (e.g. available)"
      />

      <input
        type="text"
        className="border p-2 w-full mb-2"
        value={toolLocation}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Location (e.g. Workshop A)"
      />
      <select
        className="border p-2 w-full mb-2"
        value={toolLastUsedBy}
        onChange={(e) => setLastUsedBy(e.target.value)}
      >
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.displayName || user.email || user.id}
          </option>
        ))}
      </select>

      <div className="flex gap-2 mb-2">
        <input
          type="number"
          className="border p-2 w-1/2"
          value={toolGpsLocation.lat}
          onChange={(e) => setGpsLocation({ ...gpsLocation, lat: parseFloat(e.target.value) })}
          placeholder="Latitude"
        />
        <input
          type="number"
          className="border p-2 w-1/2"
          value={toolGpsLocation.lng}
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
                      <input
                        type="text"
                        className="border p-2 w-full mb-2"
                        value={editedStatus}
                        onChange={(e) => setEditedStatus(e.target.value)}
                        placeholder="Edited Status"
                      />
                      <input
                        type="text"
                        className="border p-2 w-full mb-2"
                        value={editedCondition}
                        onChange={(e) => setEditedCondition(e.target.value)}
                        placeholder="Edited Condition"
                      />
                      <input
                        type="text"
                        className="border p-2 w-full mb-2"
                        value={editedLocation}
                        onChange={(e) => setEditedLocation(e.target.value)}
                        placeholder="Edited Location"
                      />
                      <select
                        className="border p-2 w-full mb-2"
                        value={editedLastUsedBy}
                        onChange={(e) => setEditedLastUsedBy(e.target.value)}
                      >
                        <option value="">Select User</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name || user.email || user.id}
                          </option>
                        ))}
                      </select>


                       <input
                        type="number"
                        className="border p-2 w-1/2"
                        value={editedGpsLocation?.lat}
                        onChange={(e) => setEditedGpsLocation({ ...editedGpsLocation, lat: parseFloat(e.target.value) })}
                        placeholder="Edited Latitude"
                      />
                      <input
                        type="number"
                        className="border p-2 w-1/2"
                        value={editedGpsLocation?.lng}
                        onChange={(e) => setEditedGpsLocation({ ...editedGpsLocation, lng: parseFloat(e.target.value) })}
                        placeholder="Edited Longitude"
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
                        {(() => {
                          const lastUsedById = tool.lastUsedBy?.id || tool.lastUsedBy;
                          const user = users.find((u) => u.id === lastUsedById);
                          return (
                            <p>
                              Last Used By:{" "}
                              {user ? `${user.name || user.email} (${user.id})` : lastUsedById || "N/A"}
                            </p>
                          );
                        })()}


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