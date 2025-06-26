import React, { useState } from 'react';
import {
  View,
  TextInput,
  Button,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { auth, db } from '../src/services/firebaseConfig';
import { Picker } from '@react-native-picker/picker';


export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Signup specific states:
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false); // toggle form

  const handleLogin = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        throw new Error('User profile not found.');
      }

      const userData = userDoc.data();

      if (userData.status !== 'active') {
        await signOut(auth);
        Alert.alert('Access Denied', 'Your account is inactive. Contact support.');
        return;
      }

      Alert.alert('Login Success');
      navigation.replace('Home');
    } catch (error) {
      console.error(error);
      let message = 'Login failed. Please try again.';
      switch (error.code) {
        case 'auth/user-not-found':
          message = 'User not found. Please sign up first.';
          break;
        case 'auth/wrong-password':
          message = 'Incorrect password. Please try again.';
          break;
        case 'auth/network-request-failed':
          message = 'Network error. Please check your connection.';
          break;
      }
      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!name || !phone || !role || !email || !password) {
      Alert.alert('Missing Info', 'Please fill out all fields.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: name });

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name,
        email,
        phone,
        role,
        status: 'active',
        joinedAt: Timestamp.now(),
      });

      Alert.alert('User Created Successfully');
      setIsSigningUp(false);
      navigation.replace('Home');
    } catch (error) {
      console.error(error);
      let message = 'Something went wrong. Please try again.';
      switch (error.code) {
        case 'auth/email-already-in-use':
          message = 'This email address is already in use.';
          break;
        case 'auth/invalid-email':
          message = 'The email address is invalid.';
          break;
        case 'auth/weak-password':
          message = 'The password is too weak. Use at least 6 characters.';
          break;
      }
      Alert.alert('Sign Up Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        {isSigningUp ? 'Sign Up' : 'Sign In'}
      </Text>

      {/* Show extra signup inputs only if signing up */}
      {isSigningUp && (
        <>
          <TextInput
            placeholder="Full Name"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />

          <TextInput
            placeholder="Phone Number"
            value={phone}
            keyboardType="phone-pad"
            onChangeText={setPhone}
            style={styles.input}
          />

          <Text style={styles.label}>Role</Text>
          <TextInput
            value={role}
            placeholder="Role (e.g. technician)"
            onChangeText={setRole}
            style={styles.input}
          />
        </>
      )}

      {/* Email & Password always visible */}
      <TextInput
        placeholder="Email"
        value={email}
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
        style={styles.input}
      />

      <TextInput
        placeholder="Password"
        value={password}
        secureTextEntry
        onChangeText={setPassword}
        style={styles.input}
      />

      {/* Show appropriate buttons */}
      {isSigningUp ? (
        <>
          <Button
            title={loading ? 'Signing up...' : 'Submit Sign Up'}
            onPress={handleSignUp}
            disabled={loading}
          />
          <View style={{ height: 10 }} />
          <Button
            title="Back to Login"
            onPress={() => setIsSigningUp(false)}
            disabled={loading}
          />
        </>
      ) : (
        <>
          <Button
            title={loading ? 'Logging in...' : 'Login'}
            onPress={handleLogin}
            disabled={loading}
          />
          <View style={{ height: 10 }} />
          <Button
            title="Go to Sign Up"
            onPress={() => setIsSigningUp(true)}
            disabled={loading}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    flexGrow: 1,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    marginBottom: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
  },
  label: {
    marginBottom: 4,
    fontWeight: '500',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#000', // avoid red default
  },
});
