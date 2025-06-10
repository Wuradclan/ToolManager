// AddTool.jsx
import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { QRCode } from 'qrcode.react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebaseConfig'; // your initialized Firestore

function AddTool() {
  const [toolName, setToolName] = useState('');
  const [qrCodeId, setQrCodeId] = useState(null);

  const handleAddTool = async () => {
    const newQrCodeId = uuidv4();
    setQrCodeId(newQrCodeId);

    await addDoc(collection(db, 'tools'), {
      name: toolName,
      qrCodeId: newQrCodeId,
      createdAt: serverTimestamp(),
      // other fields like location, gpsLocation, etc.
    });
  };

  return (
    <div>
      <input
        placeholder="Tool Name"
        value={toolName}
        onChange={(e) => setToolName(e.target.value)}
      />
      <button onClick={handleAddTool}>Add Tool</button>

      {qrCodeId && (
        <div style={{ marginTop: 20 }}>
          <p>Download or print this QR code for the tool:</p>
          <QRCode value={qrCodeId} size={150} />
          {/* Optional: add a “Download QR” button here */}
        </div>
      )}
    </div>
  );
}

export default AddTool;
