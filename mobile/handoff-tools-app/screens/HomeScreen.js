import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  onSnapshot,
} from 'firebase/firestore';

const CHUNK_SIZE = 10;

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export default function HomeScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingTools, setLoadingTools] = useState(true);
  const [userTools, setUserTools] = useState([]);

  const [confirmedToolHandoffs, setConfirmedToolHandoffs] = useState([]);
  const [pendingHandoffToolIds, setPendingHandoffToolIds] = useState([]);
  const [pendingHandoffObjectsByToolId, setPendingHandoffObjectsByToolId] = useState(new Map());
  const [userRequestedHandoffs, setUserRequestedHandoffs] = useState([]);
  const [pendingHandoffs, setPendingHandoffs] = useState([]);

  const userNameCache = useRef(new Map());
  const toolNameCache = useRef(new Map());
  const unsubscribes = useRef([]);

  // Fetch user profile only once
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          setLoadingUser(false);
          return;
        }
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        } else {
          Alert.alert('Error', 'User profile not found.');
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        Alert.alert('Error', 'Failed to load user profile.');
      }
      setLoadingUser(false);
    };
    fetchUserProfile();
  }, []);

  // Fetch tools & set listeners on focus
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const currentUserId = auth.currentUser?.uid;
      if (!currentUserId) return;

      const fetchUserToolsAndListeners = async () => {
        setLoadingTools(true);
        try {
          // Fetch tools last used by user
          const toolsRef = collection(db, 'tools');
          const q = query(toolsRef, where('lastUsedBy', '==', currentUserId), orderBy('createdAt', 'desc'));
          const snapshot = await getDocs(q);
          if (!isActive) return;
          const tools = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setUserTools(tools);

          // Cleanup old listeners
          unsubscribes.current.forEach(unsub => unsub && unsub());
          unsubscribes.current = [];

          if (tools.length === 0) {
            setConfirmedToolHandoffs([]);
            setPendingHandoffToolIds([]);
            setPendingHandoffObjectsByToolId(new Map());
            setLoadingTools(false);
            return;
          }

          const toolIds = tools.map(t => t.id);

          const confirmedMap = new Map();
          const pendingMap = new Map();

          const updateState = () => {
            if (!isActive) return;

            // Confirmed handoffs where toUserId === currentUserId
            const confirmed = Array.from(confirmedMap.values()).filter(h => h.toUserId === currentUserId);
            setConfirmedToolHandoffs(confirmed);

            // Pending handoffs from others
            const pendings = Array.from(pendingMap.values());
            const pendingOthers = pendings.filter(h => h.toUserId !== currentUserId && h.fromUserId !== currentUserId);
            const pendingIds = pendingOthers.map(h => h.toolId);
            setPendingHandoffToolIds(pendingIds);

            // Map of pending handoff objects keyed by toolId (first found)
            const pendingByToolIdMap = new Map();
            pendingOthers.forEach(h => {
              if (!pendingByToolIdMap.has(h.toolId)) {
                pendingByToolIdMap.set(h.toolId, h);
              }
            });
            setPendingHandoffObjectsByToolId(pendingByToolIdMap);
          };

          const handoffsRef = collection(db, 'handoffs');
          const chunks = chunkArray(toolIds, CHUNK_SIZE);

          chunks.forEach(chunk => {
            // Confirmed
            const qConfirmed = query(
              handoffsRef,
              where('toolId', 'in', chunk),
              where('toUserId', '==', currentUserId),
              where('status', '==', 'confirmed')
            );
            const unsubConfirmed = onSnapshot(qConfirmed, (snapshot) => {
              snapshot.docChanges().forEach(change => {
                const handoff = { id: change.doc.id, ...change.doc.data() };
                if (change.type === 'removed') {
                  confirmedMap.delete(handoff.id);
                } else {
                  confirmedMap.set(handoff.id, handoff);
                }
              });
              updateState();
            });
            unsubscribes.current.push(unsubConfirmed);

            // Pending
            const qPending = query(
              handoffsRef,
              where('toolId', 'in', chunk),
              where('status', '==', 'pending')
            );
            const unsubPending = onSnapshot(qPending, (snapshot) => {
              snapshot.docChanges().forEach(change => {
                const handoff = { id: change.doc.id, ...change.doc.data() };
                if (change.type === 'removed') {
                  pendingMap.delete(handoff.id);
                } else {
                  pendingMap.set(handoff.id, handoff);
                }
              });
              updateState();
            });
            unsubscribes.current.push(unsubPending);
          });
        } catch (err) {
          console.error('Error fetching user tools:', err);
        }
        setLoadingTools(false);
      };

      fetchUserToolsAndListeners();

      return () => {
        isActive = false;
        unsubscribes.current.forEach(unsub => unsub && unsub());
        unsubscribes.current = [];
      };
    }, [])
  );

  // Fetch pending handoffs to confirm or requested by user
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const currentUserId = auth.currentUser?.uid;
      if (!currentUserId) return;

      const fetchPendingHandoffs = async () => {
        try {
          const handoffsRef = collection(db, 'handoffs');
          const q = query(
            handoffsRef,
            where('fromUserId', '==', currentUserId),
            where('status', '==', 'pending')
          );
          const snapshot = await getDocs(q);
          if (!isActive) return;

          const userCache = userNameCache.current;
          const toolCache = toolNameCache.current;

          const handoffs = await Promise.all(
            snapshot.docs.map(async (docSnap) => {
              const data = docSnap.data();
              const handoffId = docSnap.id;

              // Tool name from cache or DB
              let toolName = toolCache.get(data.toolId);
              if (!toolName) {
                try {
                  const toolDoc = await getDoc(doc(db, 'tools', data.toolId));
                  if (toolDoc.exists()) {
                    toolName = toolDoc.data().name;
                    toolCache.set(data.toolId, toolName);
                  }
                } catch {}
              }

              // toUserName from cache or DB
              let toUserName = userCache.get(data.toUserId);
              if (!toUserName && data.toUserId) {
                try {
                  const toUserDoc = await getDoc(doc(db, 'users', data.toUserId));
                  if (toUserDoc.exists()) {
                    toUserName = toUserDoc.data().name || '';
                    userCache.set(data.toUserId, toUserName);
                  }
                } catch {}
              }

              return {
                id: handoffId,
                ...data,
                toolName,
                toUserName,
              };
            })
          );

          const toConfirm = handoffs.filter(h => h.fromUserId === currentUserId);
          const requestedByYou = handoffs.filter(h => h.toUserId === currentUserId);

          setPendingHandoffs(toConfirm);
          setUserRequestedHandoffs(requestedByYou);
        } catch (err) {
          console.error('Error fetching pending handoffs:', err);
        }
      };

      fetchPendingHandoffs();

      return () => {
        isActive = false;
      };
    }, [])
  );

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout Error:', error);
      Alert.alert('Logout Failed', error.message);
    }
  };

  if (loadingUser || loadingTools) {
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
          // Confirmed handoff where current user is toUserId
          const confirmed = confirmedToolHandoffs.find(h => h.toolId === tool.id);

          // Pending handoff from others for this tool
          const pendingFromOthers = pendingHandoffObjectsByToolId.get(tool.id);

          return (
            <View key={tool.id} style={styles.toolCard}>
              <Text style={styles.toolName}>{tool.name}</Text>
              <Text style={styles.toolDetail}>Location: {tool.location}</Text>
              <Text style={styles.toolDetail}>Notes: {confirmed?.notes || '-'}</Text>
              <Text style={styles.toolDetail}>Status: {confirmed?.status || tool.status}</Text>

              {pendingFromOthers && (
                <Text
                  style={{
                    color: 'red',
                    fontWeight: 'bold',
                    position: 'absolute',
                    top: 10,
                    right: 10,
                  }}
                >
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
            <Text style={styles.toolName}>
              Tool: {handoff.toolName} ({handoff.toolId})
            </Text>
            <Text style={styles.toolDetail}>Handoff ID: {handoff.id}</Text>
            <Text style={styles.toolDetail}>Notes: {handoff.notes || '-'}</Text>
            <Text style={styles.toolDetail}>Awaiting Confirmation From: {handoff.fromUserId}</Text>
            <Text style={styles.toolDetail}>
              Scheduled Return:{' '}
              {handoff.ScheduledReturnTime?.toDate().toLocaleString() || '-'}
            </Text>
          </View>
        ))
      )}

      <Text style={styles.sectionTitle}>Pending Handoff Requests To Confirm</Text>
      {pendingHandoffs.length === 0 ? (
        <Text style={styles.subtitle}>No pending requests to confirm.</Text>
      ) : (
        pendingHandoffs.map(handoff => (
          <View key={handoff.id} style={styles.toolCard}>
            <Text style={styles.toolName}>
              Tool: {handoff.toolName} ({handoff.toolId})
            </Text>
            <Text style={styles.toolDetail}>Handoff ID: {handoff.id}</Text>
            <Text style={styles.toolDetail}>Notes: {handoff.notes || '-'}</Text>
            <Text style={styles.toolDetail}>
              Requested By: {handoff.toUserName || handoff.toUserId}
            </Text>
            <Text style={styles.toolDetail}>
              Scheduled Return: {handoff.ScheduledReturnTime?.toDate().toLocaleString() || '-'}
            </Text>
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
    position: 'relative',
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
