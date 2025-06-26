import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Button, Alert, ActivityIndicator, StyleSheet, TextInput, Platform, KeyboardAvoidingView, ScrollView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Vibration } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

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

export default function ConfirmBorrowScreen() {
  const [indexErrorShown, setIndexErrorShown] = useState(false); // add at the top of your component
  const [scanned, setScanned] = useState(false);
  const [pendingHandoff, setPendingHandoff] = useState(null);
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef(null);

  const [scheduledReturnTime, setScheduledReturnTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notes, setNotes] = useState('');

  const [permission, requestPermission] = useCameraPermissions();
  const [toolInfo, setToolInfo] = useState(null);
  const [scanError, setScanError] = useState(null);
  

  useEffect(() => {
    if (scanned) {
      const timer = setTimeout(() => {
        setScanned(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [scanned]);
  useEffect(() => {
    if (scanError) {
      Alert.alert(scanError.title, scanError.message);
      setScanError(null);
    }
  }, [scanError]);


  const handleBarCodeScanned = async (scanningResult) => {
  if (scanned) return;

  setScanned(true);

  const data = scanningResult?.data;

  if (!data || typeof data !== 'string' || data.includes('://') || data.includes('?')) {
    setScanError({ title: 'Invalid QR Code', message: 'This is not a valid tool QR code.' });
    setTimeout(() => setScanned(false), 2000);
    return;
  }

  Vibration.vibrate(100);
  setLoading(true);

  try {
    const toolId = data;
    const currentUserId = auth.currentUser.uid;

    const toolRef = doc(db, 'tools', toolId);
    const toolSnap = await getDoc(toolRef);

    if (!toolSnap.exists()) {
      setScanError({ title: 'Tool not found', message: 'This tool does not exist in the system.' });
      setTimeout(() => setScanned(false), 2000);
      return;
    }

    const toolData = toolSnap.data();
    setToolInfo({ id: toolSnap.id, ...toolData });

    const handoffsRef = collection(db, 'handoffs');

    let fromUserId = null;
    try {
      const confirmedHandoffsQuery = query(
        handoffsRef,
        where('toolId', '==', toolId),
        where('status', '==', 'confirmed'),
        orderBy('confirmedTime', 'desc'),
        limit(1)
      );
      const confirmedSnap = await getDocs(confirmedHandoffsQuery);
      if (!confirmedSnap.empty) {
        const lastConfirmed = confirmedSnap.docs[0].data();
        fromUserId = lastConfirmed.toUserId || null;
      }
    } catch (queryError) {
      if (
        queryError.code === 'failed-precondition' &&
        queryError.message.includes('requires an index')
      ) {
        if (!indexErrorShown) {
          setIndexErrorShown(true);
          Alert.alert(
            'Missing Firestore Index',
            'An index is required to fetch tool data. Please create it in the Firebase Console.'
          );
        }
        return;
      } else {
        throw queryError;
      }
    }

    if (!fromUserId) {
      fromUserId = toolData.lastUsedBy || null;
    }

    if (!fromUserId) {
      setScanError({ title: 'Tool Unassigned', message: 'This tool currently has no assigned user. Please contact admin.' });
      setTimeout(() => setScanned(false), 2000);
      return;
    }

        // Check if there is a pending request for this tool that this user should confirm
    const confirmableQuery = query(
      handoffsRef,
      where('toolId', '==', toolId),
      where('fromUserId', '==', currentUserId),
      where('status', '==', 'pending'),
      limit(1)
    );
    const confirmableSnap = await getDocs(confirmableQuery);

    if (!confirmableSnap.empty) {
      const docRef = confirmableSnap.docs[0].ref;
      const handoffData = confirmableSnap.docs[0].data();

      setPendingHandoff({
        id: confirmableSnap.docs[0].id,
        ref: docRef,
        data: handoffData,
      });

      setScheduledReturnTime(new Date());
      setNotes('');
      return;
    }

    // If no pending handoff to confirm, and user is already the last holder, show message
    if (fromUserId === currentUserId) {
      setScanError({ title: 'You already have this tool', message: 'You are already the last user of this tool.' });
      setTimeout(() => setScanned(false), 2000);
      return;
    }


    const existingPendingQuery = query(
      handoffsRef,
      where('toolId', '==', toolId),
      where('toUserId', '==', currentUserId),
      where('status', '==', 'pending'),
      limit(1)
    );
    const existingPendingSnap = await getDocs(existingPendingQuery);

    if (!existingPendingSnap.empty) {
      setScanError({ title: 'Pending Request Exists', message: 'You have already requested to borrow this tool and it is pending confirmation.' });
      setTimeout(() => setScanned(false), 2000);
      return;
    }

    const anyPendingQuery = query(
      handoffsRef,
      where('toolId', '==', toolId),
      where('status', '==', 'pending'),
      limit(1)
    );
    const anyPendingSnap = await getDocs(anyPendingQuery);

    if (!anyPendingSnap.empty) {
      setScanError({ title: 'Tool Request Exists', message: 'Another user has already initiated a borrowing request for this tool.' });
      setTimeout(() => setScanned(false), 2000);
      return;
    }

    setPendingHandoff({
      id: null,
      ref: null,
      data: {
        toolId,
        fromUserId,
        toUserId: currentUserId,
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
    setScanError({ title: 'Scan Error', message: 'Something went wrong while processing this QR code.' });
  } finally {
    setLoading(false);
  }
};



///////////////////
  const handleConfirm = async () => {
    if (!pendingHandoff) return;

    setLoading(true);
    try {
      const currentUserId = auth.currentUser.uid;

      if (pendingHandoff?.id && pendingHandoff?.data?.status === 'pending') {
        // Confirm an existing pending handoff
        await updateDoc(pendingHandoff.ref, {
          fromUserId: currentUserId,
          status: 'confirmed',
          ScheduledReturnTime: Timestamp.fromDate(scheduledReturnTime),
          notes: notes.trim(),
          confirmedTime: Timestamp.now(),
        });

        // Update tool to set lastUsedBy to toUserId (the borrower)
        const toolRef = doc(db, 'tools', pendingHandoff.data.toolId);
        await updateDoc(toolRef, {
          lastUsedBy: pendingHandoff.data.toUserId,
          status: 'Borrowed',
        });

        Alert.alert('Success', 'Borrowing confirmed!');
      } else {
        // Create new handoff as fallback (rare)
        await addDoc(collection(db, 'handoffs'), {
          ...pendingHandoff.data,
          ScheduledReturnTime: Timestamp.fromDate(scheduledReturnTime),
          notes: notes.trim(),
        });

        Alert.alert('Success', 'New handoff created.');
      }

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
    if (event.type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }

    if (selectedDate) {
      setScheduledReturnTime(selectedDate);
    }

    if (Platform.OS !== 'ios') {
      setShowDatePicker(false);
    }
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

          {!pendingHandoff && !loading && (
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

          {pendingHandoff && !loading && (
            <View style={styles.infoBox}>
              <Text style={styles.subtitle}>Borrow Request</Text>
              <Text>Tool ID: {pendingHandoff.data.toolId}</Text>
              <Text>To User ID: {pendingHandoff.data.toUserId}</Text>

              <View style={{ marginTop: 15 }}>
                <Text style={{ fontWeight: 'bold' }}>Scheduled Return:</Text>
                <Button title={scheduledReturnTime.toLocaleString()} onPress={() => setShowDatePicker(true)} />
                {showDatePicker && (
                  <DateTimePicker
                    value={scheduledReturnTime}
                    mode="datetime"
                    is24Hour={true}
                    display="default"
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
                  setPendingHandoff(null);
                  setScanned(false);
                  setToolInfo(null);
                  setNotes('');
                  setIndexErrorShown(false); // reset flag
                }} color="red" />
              </View>
            </View>
          )}

          {scanned && !pendingHandoff && !loading && (
            <Button title="Scan Again" onPress={() => {
              setScanned(false);
              setPendingHandoff(null);
              setToolInfo(null);
              setNotes('');
              setIndexErrorShown(false); // reset flag
            }} />
          )}

        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#fff' },
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
    marginTop: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 20,
    justifyContent: 'space-around',
  },
});
