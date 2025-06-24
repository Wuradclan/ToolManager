import React, { useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../src/services/firebaseConfig';
import { View, Text, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  getDoc
} from 'firebase/firestore';

export default function HomeScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userTools, setUserTools] = useState([]);
  const [pendingHandoffs, setPendingHandoffs] = useState([]);

  const fetchUserTools = async (uid) => {
    try {
      const toolsRef = collection(db, 'tools');
      const q = query(toolsRef, where('lastUsedBy', '==', uid), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const tools = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUserTools(tools);
    } catch (err) {
      console.error('Error fetching user tools:', err);
    }
  };

  const fetchPendingHandoffs = async (uid) => {
    try {
      const handoffsRef = collection(db, 'handoffs');
      const q = query(
        handoffsRef,
        where('toUserId', '==', uid),
        where('status', '==', 'pending')
      );
      const snapshot = await getDocs(q);

      const handoffs = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          const handoffId = docSnap.id;
          const toolId = data.toolId;

          let toolName = '';
          let lastUsedByName = '';

          // Fetch tool name
          try {
            const toolDoc = await getDoc(doc(db, 'tools', toolId));
            if (toolDoc.exists()) {
              toolName = toolDoc.data().name;
            }
          } catch {
            // handle tool fetch error if needed
          }

          // --- Updated lastUsedByName logic ---
          try {
            const confirmedHandoffsQuery = query(
              handoffsRef,
              where('toolId', '==', toolId),
              where('status', '==', 'confirmed'),
              orderBy('handoffTime', 'desc'),
              limit(1)
            );
            const confirmedSnap = await getDocs(confirmedHandoffsQuery);

            let lastUserId = null;
            if (!confirmedSnap.empty) {
              lastUserId = confirmedSnap.docs[0].data().fromUserId;
            } else {
              // fallback to tool's lastUsedBy
              const toolDoc = await getDoc(doc(db, 'tools', toolId));
              if (toolDoc.exists()) {
                lastUserId = toolDoc.data().lastUsedBy || null;
              }
            }

            if (lastUserId) {
              const userDoc = await getDoc(doc(db, 'users', lastUserId));
              if (userDoc.exists()) {
                lastUsedByName = userDoc.data().name || '';
              }
            }
          } catch {
            // handle errors fetching lastUsedByName
          }

          return {
            id: handoffId,
            ...data,
            toolName,
            lastUsedByName,
          };
        })
      );


      setPendingHandoffs(handoffs);
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
            fetchUserTools(currentUser.uid);
            fetchPendingHandoffs(currentUser.uid);
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

    fetchUserProfile();
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
    <Text style={styles.title}>
      Welcome {userData?.name || 'User'}
    </Text>
    <Text style={styles.subtitle}>
      Email: {userData?.email}
    </Text>
    <Text style={styles.subtitle}>
      Role: {userData?.role}
    </Text>

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
      userTools.map(tool => (
        <View key={tool.id} style={styles.toolCard}>
          <Text style={styles.toolName}>{tool.name}</Text>
          <Text style={styles.toolDetail}>Location: {tool.location}</Text>
          <Text style={styles.toolDetail}>Condition: {tool.condition}</Text>
          <Text style={styles.toolDetail}>Status: {tool.status}</Text>
        </View>
      ))
    )}

    <Text style={styles.sectionTitle}>Pending Handoff Requests</Text>
    {pendingHandoffs.length === 0 ? (
      <Text style={styles.subtitle}>No pending requests.</Text>
    ) : (
      pendingHandoffs.map(handoff => (
        <View key={handoff.id} style={styles.toolCard}>
          <Text style={styles.toolName}>
            Tool: {`${handoff.toolName} (${handoff.toolId})`}
          </Text>
          <Text style={styles.toolDetail}>Handoff ID: {handoff.id}</Text>
          <Text style={styles.toolDetail}>Notes: {handoff.notes}</Text>
          <Text style={styles.toolDetail}>
            Last Used By: {handoff.lastUsedByName || 'Unknown'}
          </Text>
          <Text style={styles.toolDetail}>
            Scheduled Return: {handoff.ScheduledReturnTime?.toDate().toLocaleString()}
          </Text>
          {/* <Button
            title="Confirm"
            onPress={() => handleConfirmHandoff(handoff)}
            color="#5cb85c"
          /> */}
          <View style={{ height: 8 }} />
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
    backgroundColor: '#fff'
  },
  title: {
    fontSize: 24,
    marginBottom: 12,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8
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
  },
  toolName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  toolDetail: {
    fontSize: 14,
    color: '#444',
  }


});
