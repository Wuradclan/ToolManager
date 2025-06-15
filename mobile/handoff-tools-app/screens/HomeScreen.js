
import { signOut } from 'firebase/auth';
import { auth } from '../src/services/firebaseConfig';
import React from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';

export default function HomeScreen({ navigation }) {
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.replace('Login'); // or navigation.navigate('Login')
    } catch (error) {
      console.error('Logout Error:', error);
      Alert.alert('Logout Failed', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Home</Text>
      <Button title="Logout" onPress={handleLogout} color="#d9534f" />
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
  }
});
