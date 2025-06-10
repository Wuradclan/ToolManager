// QRScanner.js
import React, { useState, useEffect } from 'react';
import { Text, View, Button, Alert } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebaseConfig'; // your initialized Firestore

// Lookup tool by qrCodeId
async function getToolByQrCode(qrCodeId) {
  const toolsRef = collection(db, 'tools');
  const q = query(toolsRef, where('qrCodeId', '==', qrCodeId));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}

export default function QRScanner({ onToolFound }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ data }) => {
    setScanned(true);
    const tool = await getToolByQrCode(data);
    if (tool) {
      onToolFound(tool);
    } else {
      Alert.alert('Tool not found', `No tool with QR code "${data}"`);
    }
  };

  if (hasPermission === null) {
    return <Text>Requesting camera permission…</Text>;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={{ flex: 1 }}>
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={{ flex: 1 }}
      />
      {scanned && (
        <Button title="Tap to Scan Again" onPress={() => setScanned(false)} />
      )}
    </View>
  );
}
