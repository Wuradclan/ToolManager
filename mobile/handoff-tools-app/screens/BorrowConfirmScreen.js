import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Button, Alert, ActivityIndicator, StyleSheet, TextInput, Platform ,KeyboardAvoidingView, ScrollView, TouchableWithoutFeedback, Keyboard} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Vibration } from 'react-native';

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  getDoc,
  addDoc
} from 'firebase/firestore';

import { auth, db } from '../src/services/firebaseConfig';
import DateTimePickerInput from '../components/DateTimePickerInput';

export default function ConfirmBorrowScreen() {
  const [scanned, setScanned] = useState(false);
  const [pendingHandoff, setPendingHandoff] = useState(null);
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef(null);

  const [scheduledReturnTime, setScheduledReturnTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notes, setNotes] = useState('');

  const [permission, requestPermission] = useCameraPermissions();
  const [toolInfo, setToolInfo] = useState(null);
  const [lastScannedCode, setLastScannedCode] = useState(null);
  const [draftHandoff, setDraftHandoff] = useState(null); // local handoff to be saved later



  // useEffect(() => {
  //   console.log('Camera permission:', permission);
  // }, [permission]);
  useEffect(() => {
    if (scanned) {
      const timer = setTimeout(() => {
        setScanned(false);
        setLastScannedCode(null); // allow rescanning the same code after cooldown
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [scanned]);
  const handleBarCodeScanned = async (scanningResult) => {
    if (scanned) return;

    const data = scanningResult?.data;
    setScanned(true);

    if (!data || typeof data !== 'string') {
      Alert.alert('Scan error', 'Invalid QR code data.');
      setScanned(false);
      return;
    }

    Vibration.vibrate(100);
    setLoading(true);

    try {
      const toolId = data;
      const currentUserId = auth.currentUser.uid;

      // 🔍 Fetch tool info
      const toolRef = doc(db, 'tools', toolId);
      const toolSnap = await getDoc(toolRef);
      if (!toolSnap.exists()) {
        Alert.alert('Tool not found', 'This tool does not exist.');
        setScanned(false);
        setLoading(false);
        return;
      }
      const toolData = toolSnap.data();
      setToolInfo({ id: toolSnap.id, ...toolData });

      // 🔍 Check if there's a pending handoff for this tool
      const handoffsQuery = query(
        collection(db, 'handoffs'),
        where('toolId', '==', toolId),
        where('status', '==', 'pending'),
        limit(1)
      );
      const handoffSnap = await getDocs(handoffsQuery);

      if (!handoffSnap.empty) {
        const existingDoc = handoffSnap.docs[0];
        const handoffData = existingDoc.data();

        // ✅ This is the correct condition:
        if (toolData.lastUsedBy === currentUserId && handoffData.fromUserId === null) {
          // The current user is the one who last used the tool
          // Show borrow confirmation form
          setPendingHandoff({
            id: existingDoc.id,
            ref: existingDoc.ref,
            data: handoffData,
          });
          setScheduledReturnTime(new Date());
          setNotes('');
          setLoading(false);
          return;
        } else {
          Alert.alert(
            'Pending handoff already exists',
            'Someone else already initiated a request for this tool.'
          );
          setScanned(false);
          setLoading(false);
          return;
        }
      }

      // 🔧 No pending handoff exists, so this user becomes the borrower (initiator)
      setPendingHandoff({
        id: null,
        ref: null,
        data: {
          toolId: toolId,
          toUserId: currentUserId,
          fromUserId: null,
          handoffTime: Timestamp.now(),
          status: 'pending',
          ScheduledReturnTime: null,
          notes: '',
          initiator: true,
        },
      });
      setScheduledReturnTime(new Date());
      setNotes('');
    } catch (error) {
      console.error('Error during scan:', error);
      Alert.alert('Error', 'Failed to process scanned tool.');
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!pendingHandoff) return;

    setLoading(true);
    try {
      const currentUserId = auth.currentUser.uid;

      if (pendingHandoff?.id && pendingHandoff?.data?.status === 'pending') {
        // ✅ Case: A borrower initiated a handoff, and now the last user confirms it
        await updateDoc(pendingHandoff.ref, {
          fromUserId: currentUserId,
          status: 'confirmed',
          ScheduledReturnTime: Timestamp.fromDate(scheduledReturnTime),
          notes: notes.trim(),
          confirmedTime: Timestamp.now(), // Optional metadata
        });

        // Update the tool document to reflect the new borrower
        const toolRef = doc(db, 'tools', pendingHandoff.data.toolId);
        await updateDoc(toolRef, {
          lastUsedBy: pendingHandoff.data.toUserId,
          status: 'Borrowed',
        });

        Alert.alert('Success', 'Borrowing confirmed!');
      } else {
        // ✅ Fallback (rare): if no handoff exists but we somehow got here, create one
        await addDoc(collection(db, 'handoffs'), {
          ...pendingHandoff.data,
          ScheduledReturnTime: Timestamp.fromDate(scheduledReturnTime),
          notes: notes.trim(),
        });

        Alert.alert('Success', 'New handoff created.');
      }

      // Reset state
      setPendingHandoff(null);
      setScanned(false);
      setNotes('');
      setScheduledReturnTime(new Date());

    } catch (error) {
      console.error('Error confirming borrow:', error);
      Alert.alert('Error', 'Failed to confirm borrowing.');
    } finally {
      setLoading(false);
    }
  };



  const rejectHandOff = async () => {
    if (!pendingHandoff) return;

    setLoading(true);
    try {
      await deleteDoc(pendingHandoff.ref);
      Alert.alert('Rejected', 'Borrowing request rejected.');
      setPendingHandoff(null);
      setScanned(false);
    } catch (error) {
      console.error('Error rejecting borrow:', error);
      Alert.alert('Error', 'Failed to reject borrowing request.');
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || scheduledReturnTime;
    setShowDatePicker(Platform.OS === 'ios');
    setScheduledReturnTime(currentDate);
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text>Checking camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text>No access to camera.</Text>
        <Button title="Grant Camera Permission" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        
      {!scanned && (
        <>
          <Text style={styles.title}>Scan the tool QR code to confirm borrowing</Text>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
            onBarcodeScanned={handleBarCodeScanned}
            barCodeScannerSettings={{
              barCodeTypes: ['qr', 'pdf417', 'ean13'],
            }}
          />
        </>
      )}

      {loading && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}

      {(pendingHandoff || draftHandoff) && !loading && (
        <View style={styles.infoBox}>
          <Text style={styles.subtitle}>Borrow Request</Text>
          <Text>Tool ID: {(pendingHandoff?.data?.toolId || draftHandoff?.toolId)}</Text>
          <Text>To User ID: {(pendingHandoff?.data?.toUserId || draftHandoff?.toUserId)}</Text>

          <View style={{ marginTop: 15 }}>
            <Text style={{ fontWeight: 'bold' }}>Scheduled Return:</Text>
            <Button title={scheduledReturnTime.toLocaleString()} onPress={() => setShowDatePicker(true)} />
            {showDatePicker && (
              <DateTimePickerInput
                label="Scheduled Return"
                value={scheduledReturnTime}
                onChange={onDateChange}
              />
            )}
          </View>

          <View style={{ marginTop: 15 }}>
            <Text style={{ fontWeight: 'bold' }}>Notes:</Text>
            <TextInput
              placeholder="Enter optional notes..."
              value={notes}
              onChangeText={setNotes}
              style={styles.notesInput}
              multiline
            />
          </View>

          <View style={styles.buttonRow}>
            <Button title="Confirm Handoff" onPress={handleConfirm} />
            <Button title="Cancel" onPress={() => {
              setDraftHandoff(null);
              setScanned(false);
              setToolInfo(null);
              setNotes('');
            }} color="red" />
          </View>
        </View>
      )}


      {scanned && !pendingHandoff && !loading && (
        <Button title="Scan Again" onPress={() => {
          setScanned(false);
          setPendingHandoff(null);
          setToolInfo(null);
        }} />
      )}
    
     </ScrollView>
    </TouchableWithoutFeedback>
  </KeyboardAvoidingView>
);
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { marginBottom: 10, fontWeight: 'bold', fontSize: 16 },
  subtitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  camera: {
    height: 400,
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
  },
  infoBox: { marginTop: 20 },
  notesInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    borderRadius: 6,
    minHeight: 60,
    marginTop: 6
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 20,
    justifyContent: 'space-around'
  },
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#fff',
  }
});
