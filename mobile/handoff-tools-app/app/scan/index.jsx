// app/scan/index.jsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, ScrollView } from 'react-native';
import QRScanner from '../../components/QRScanner';

export default function ScanScreen() {
  const [scannedTool, setScannedTool] = useState(null);

  return (
    <View style={styles.container}>
      {!scannedTool ? (
        <>
          <Text style={styles.title}>Scan Tool QR Code</Text>
          <QRScanner onToolFound={(tool) => setScannedTool(tool)} />
        </>
      ) : (
        <ScrollView contentContainerStyle={styles.infoContainer}>
          <Text style={styles.title}>Tool Found</Text>
          <Text style={styles.label}>Name:</Text>
          <Text style={styles.value}>{scannedTool.name}</Text>

          <Text style={styles.label}>Location:</Text>
          <Text style={styles.value}>{scannedTool.location || 'Unknown'}</Text>

          <Text style={styles.label}>QR Code ID:</Text>
          <Text style={styles.value}>{scannedTool.qrCodeId}</Text>

          <Button title="Scan Another Tool" onPress={() => setScannedTool(null)} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 22,
    marginBottom: 16,
    textAlign: 'center',
  },
  infoContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  label: {
    fontWeight: 'bold',
    marginTop: 12,
  },
  value: {
    fontSize: 16,
  },
});
