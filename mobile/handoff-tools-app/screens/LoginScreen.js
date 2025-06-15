
import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet, Alert } from 'react-native';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../src/services/firebaseConfig';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
     if (!email || !email.includes('@')) {
    Alert.alert('Invalid Email', 'Please enter a valid email address.');
    return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      Alert.alert('Login Success');
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
              message = 'The password is too weak. Please use at least 6 characters.';
              break;
            case 'auth/missing-password':
              message = 'The password can not be empty.';
              break;
            case 'auth/invalid-credential':
              message = 'Invalid credentials. Please try again.';
              break;
            case 'auth/user-not-found':
              message = 'User not found. Please sign up first.';
              break;
            case 'auth/wrong-password':
              message = 'Incorrect password. Please try again.';
              break;
            case 'auth/network-request-failed':
              message = 'Network error. Please check your connection.';
              break;
            case 'auth/configuration-not-found':
              message = 'Firebase configuration is missing or incorrect.';
              break;
          }
      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      Alert.alert('User Created Successfully');
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
              message = 'The password is too weak. Please use at least 6 characters.';
              break;
            case 'auth/invalid-credential':
              message = 'Invalid credentials. Please try again.';
              break;
            case 'auth/user-not-found':
              message = 'User not found. Please sign up first.';
              break;
            case 'auth/wrong-password':
              message = 'Incorrect password. Please try again.';
              break;
            case 'auth/network-request-failed':
              message = 'Network error. Please check your connection.';
              break;
            case 'auth/configuration-not-found':
              message = 'Firebase configuration is missing or incorrect.';
              break;
          }

          
      Alert.alert('Sign Up Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign In or Sign Up</Text>
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
      <Button title={loading ? 'Logging in...' : 'Login'} onPress={handleLogin} disabled={loading} />
      <View style={{ height: 10 }} />
      <Button title={loading ? 'Signing up...' : 'Sign Up'} onPress={handleSignUp} disabled={loading} />
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
    marginBottom: 24,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    marginBottom: 16,
    borderRadius: 8
  }
});
