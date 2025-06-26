import React, { useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../src/services/firebaseConfig';
import { View, Text, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  getDoc,
  limit,
  onSnapshot
} from 'firebase/firestore';


export default function HomeScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userTools, setUserTools] = useState([]);
  const [pendingHandoffs, setPendingHandoffs] = useState([]);
  const [pendingHandoffToolIds, setPendingHandoffToolIds] = useState([]);
  const [userRequestedHandoffs, setUserRequestedHandoffs] = useState([]);
  const [confirmedToolHandoffs, setConfirmedToolHandoffs] = useState([]);



  useFocusEffect(
    React.useCallback(() => {
      const currentUser = auth.currentUser;
      if (currentUser?.uid) {
        fetchPendingHandoffs(currentUser.uid);
      }
    }, [])
  );

  // Fetch tools last used by current user
  const fetchUserTools = async (uid) => {
    try {
      const toolsRef = collection(db, 'tools');
      const q = query(toolsRef, where('lastUsedBy', '==', uid), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const tools = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUserTools(tools);
      // Now get confirmed handoffs for these tools
      const toolIds = tools.map(tool => tool.id);

      if (toolIds.length > 0) {
        const handoffsRef = collection(db, 'handoffs');
        // ✅ Real-time listener for pending handoffs for tools I last used
       
          const qPendingForMyTools = query(
            handoffsRef,
            where('toolId', 'in', toolIds),
            where('status', '==', 'pending')
          );

          const unsubscribePending = onSnapshot(qPendingForMyTools, (snapshot) => {
            const handoffs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllRelevantHandoffs((prev) => {
              // Update only the relevant handoffs for "Requested by" logic
              return handoffs;
            });

            // Update the red badge toolIds
            const othersPending = handoffs.filter(
              h => h.toUserId !== uid && h.fromUserId !== uid
            ).map(h => h.toolId);

            setPendingHandoffToolIds(othersPending);
          });
        ////
        // ✅ Real-time listener for confirmed handoffs for tools I used
          const qConfirmed = query(
            handoffsRef,
            where('toolId', 'in', toolIds),
            where('toUserId', '==', uid),
            where('status', '==', 'confirmed')
          );

          const unsubscribeConfirmed = onSnapshot(qConfirmed, (snapshot) => {
            const confirmed = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setConfirmedToolHandoffs(confirmed);
          });

          // 🧼 Cleanup on unmount
          return () => {
            unsubscribePending();
            unsubscribeConfirmed();
          };
        }
    } catch (err) {
      console.error('Error fetching user tools:', err);
    }
  };

  // Fetch pending handoffs where current user is fromUserId (user expected to confirm)
  const fetchPendingHandoffs = async (uid) => {
    try {
      const handoffsRef = collection(db, 'handoffs');

      // Query pending handoffs where current user is the "fromUser" (last user)
      const q = query(
        handoffsRef,
        where('fromUserId', '==', uid),
        where('status', '==', 'pending')
      );
      const snapshot = await getDocs(q);

      const handoffs = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          const handoffId = docSnap.id;
          const toolId = data.toolId;

          let toolName = '';
          let toUserName = '';
          

          // Fetch tool name
          try {
            const toolDoc = await getDoc(doc(db, 'tools', toolId));
            if (toolDoc.exists()) {
              toolName = toolDoc.data().name;
            }
          } catch {
            // Ignore errors here
          }

          // Fetch "toUser" name (the user borrowing the tool)
          try {
            if (data.toUserId) {
              const toUserDoc = await getDoc(doc(db, 'users', data.toUserId));
              if (toUserDoc.exists()) {
                toUserName = toUserDoc.data().name || '';
              }
            }
          } catch {
            // Ignore errors here
          }
          //setPendingHandoffToolIds(handoffs.map(h => h.toolId));

          return {
            id: handoffId,
            ...data,
            toolName,
            toUserName,
          };
        })
      );

      //setPendingHandoffs(handoffs);
      ///new 
      // Separate into two categories
    const toConfirm = handoffs.filter(h => h.fromUserId === uid);  // You're the one expected to confirm
    const requestedByYou = handoffs.filter(h => h.toUserId === uid); // You requested and waiting for confirmation

    // Tool IDs where someone else has requested a handoff for your last used tools
    const toolIdsRequestedByOthers = handoffs
      .filter(h => h.toUserId !== uid && h.fromUserId !== uid)
      .map(h => h.toolId);

    setPendingHandoffToolIds(toolIdsRequestedByOthers);
    setPendingHandoffs(toConfirm);
    setUserRequestedHandoffs(requestedByYou); // ← New state, defined below

    } catch (err) {
      console.error('Error fetching pending handoffs:', err);
    }
  };

 useEffect(() => {
  const fetchUserProfile = async () => {
    const currentUser = auth.currentUser;

    if (currentUser) {
      try {
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData(data);
          const cleanup = await fetchUserTools(currentUser.uid); // now returns cleanup
          return cleanup;
        } else {
          Alert.alert('Error', 'User profile not found in database.');
        }
      } catch (err) {
        console.error('Failed to load user profile:', err);
        Alert.alert('Error', 'Failed to load user profile.');
      }
    }

    setLoading(false);
  };

  const cleanupListener = fetchUserProfile();

  // Cleanup real-time listener
  return () => {
    if (typeof cleanupListener === 'function') {
      cleanupListener();
    }
  };
}, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout Error:', error);
      Alert.alert('Logout Failed', error.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#d9534f" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome {userData?.name || 'User'}</Text>
      <Text style={styles.subtitle}>Email: {userData?.email}</Text>
      <Text style={styles.subtitle}>Role: {userData?.role}</Text>

      <Button
        title="Start Scanning"
        onPress={() => navigation.navigate('BorrowConfirm')}
        color="#d9534f"
      />
      <View style={{ height: 12 }} />
      <Button title="Logout" onPress={handleLogout} color="#d9534f" />

      <Text style={styles.sectionTitle}>Your Last Used Tools</Text>
      {userTools.length === 0 ? (
        <Text style={styles.subtitle}>No tools used yet.</Text>
      ) : (
        userTools.map(tool => {
          const confirmed = confirmedToolHandoffs.find(h => h.toolId === tool.id);
          const pendingFromOthers = allRelevantHandoffs.find(
            h => h.toolId === tool.id && h.status === 'pending' && h.toUserId !== auth.currentUser.uid
          );

          return (
            <View key={tool.id} style={styles.toolCard}>
              <Text style={styles.toolName}>{tool.name}</Text>
              <Text style={styles.toolDetail}>Location: {tool.location}</Text>

              <Text style={styles.toolDetail}>Notes: {confirmed?.notes || '-'}</Text>
              <Text style={styles.toolDetail}>Status: {confirmed?.status || tool.status}</Text>

              {pendingFromOthers && (
                <Text style={{
                  color: 'red',
                  fontWeight: 'bold',
                  position: 'absolute',
                  top: 10,
                  right: 10,
                }}>
                  Requested by {pendingFromOthers.toUserName || pendingFromOthers.toUserId}
                </Text>
              )}
            </View>
          );
        })
      )}

      <Text style={styles.sectionTitle}>Handoff Requests You Initiated</Text>
        {userRequestedHandoffs.length === 0 ? (
          <Text style={styles.subtitle}>No handoff requests initiated.</Text>
        ) : (
          userRequestedHandoffs.map(handoff => (
            <View key={handoff.id} style={styles.toolCard}>
              <Text style={styles.toolName}>Tool: {handoff.toolName} ({handoff.toolId})</Text>
              <Text style={styles.toolDetail}>Handoff ID: {handoff.id}</Text>
              <Text style={styles.toolDetail}>Notes: {handoff.notes || '-'}</Text>
              <Text style={styles.toolDetail}>Awaiting Confirmation From: {handoff.fromUserId}</Text>
              <Text style={styles.toolDetail}>Scheduled Return: {handoff.ScheduledReturnTime?.toDate().toLocaleString() || '-'}</Text>
            </View>
          ))
        )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    marginBottom: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  toolCard: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
    position: 'relative', // ← add this
  },
  toolName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  toolDetail: {
    fontSize: 14,
    color: '#444',
  },
});
