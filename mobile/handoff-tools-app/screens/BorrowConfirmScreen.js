import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Button, Alert, ActivityIndicator, StyleSheet, TextInput, Platform } from 'react-native';
import { Camera } from 'expo-camera';
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
  Timestamp
} from 'firebase/firestore';
import { auth , firestore } from '../src/services/firebaseConfig';
import DateTimePickerInput from '../components/DateTimePickerInput';


export default function ConfirmBorrowScreen() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [pendingHandoff, setPendingHandoff] = useState(null);
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef(null);

  const [scheduledReturnTime, setScheduledReturnTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ data }) => {
    if (scanned) return;
    setScanned(true);
    setLoading(true);

    try {
      const toolId = data;
      const currentUserRef = doc(firestore, 'users', auth.currentUser.uid);
      const toolRef = doc(firestore, 'tools', toolId);

      const handoffsRef = collection(firestore, 'handoffs');
      const q = query(
        handoffsRef,
        where('toolId', '==', toolRef),
        where('fromUserId', '==', currentUserRef),
        where('status', '==', 'pending'),
        orderBy('handoffTime', 'desc'),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        Alert.alert('No pending handoff', 'There is no borrowing request to confirm for this tool.');
        setLoading(false);
        setScanned(false);
        return;
      }

      const docSnap = querySnapshot.docs[0];
      const data = docSnap.data();
      setPendingHandoff({ id: docSnap.id, ref: docSnap.ref, data });
      if (data.ScheduledReturnTime) {
        setScheduledReturnTime(data.ScheduledReturnTime.toDate());
      }
      if (data.notes) {
        setNotes(data.notes);
      }
    } catch (error) {
      console.error('Error checking pending handoff:', error);
      Alert.alert('Error', 'Failed to check pending handoff.');
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  const confirmBorrow = async () => {
    if (!pendingHandoff) return;

    setLoading(true);
    try {
      await updateDoc(pendingHandoff.ref, {
        status: 'confirmed',
        ScheduledReturnTime: Timestamp.fromDate(scheduledReturnTime),
        notes: notes.trim()
      });

      await updateDoc(pendingHandoff.data.toolId, {
        lastUsedBy: pendingHandoff.data.toUserId,
        status: 'Borrowed',
      });

      Alert.alert('Success', 'Borrowing confirmed!');
      setPendingHandoff(null);
      setScanned(false);
      setNotes('');
    } catch (error) {
      console.error('Error confirming borrow:', error);
      Alert.alert('Error', 'Failed to confirm borrowing.');
    } finally {
      setLoading(false);
    }
  };

  const rejectBorrow = async () => {
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

  if (hasPermission === null) return <Text>Requesting camera permission...</Text>;
  if (hasPermission === false) return <Text>No access to camera.</Text>;

  return (
    <View style={styles.container}>
      {!scanned && (
        <>
          <Text style={styles.title}>Scan the tool QR code to confirm borrowing</Text>
          <Camera
            ref={cameraRef}
            style={styles.camera}
            onBarCodeScanned={handleBarCodeScanned}
            barCodeScannerSettings={{ barCodeTypes: [Camera.Constants.BarCodeType.qr] }}
          />
        </>
      )}

      {loading && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}

      {pendingHandoff && !loading && (
        <View style={styles.infoBox}>
          <Text style={styles.subtitle}>Pending Borrow Request</Text>
          <Text>Tool ID: {pendingHandoff.data.toolId.id}</Text>
          <Text>From User ID: {pendingHandoff.data.fromUserId.id}</Text>
          <Text>To User ID: {pendingHandoff.data.toUserId.id}</Text>

          <View style={{ marginTop: 15 }}>
            <Text style={{ fontWeight: 'bold' }}>Scheduled Return:</Text>
            <Button title={scheduledReturnTime.toLocaleString()} onPress={() => setShowDatePicker(true)} />
            {showDatePicker && (
              <DateTimePickerInput
                label="Scheduled Return"
                value={scheduledReturnTime}
                onChange={setScheduledReturnTime}
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
            <Button title="Confirm Borrow" onPress={confirmBorrow} />
            <Button title="Reject" onPress={rejectBorrow} color="red" />
          </View>
        </View>
      )}

      {scanned && !pendingHandoff && !loading && (
        <Button title="Scan Again" onPress={() => setScanned(false)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { marginBottom: 10, fontWeight: 'bold', fontSize: 16 },
  subtitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  camera: { flex: 1, borderRadius: 10, overflow: 'hidden' },
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
  }
});
