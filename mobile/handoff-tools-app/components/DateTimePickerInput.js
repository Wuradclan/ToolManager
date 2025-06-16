// components/DateTimePickerInput.js
import React, { useState } from 'react';
import { View, Text, Button, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function DateTimePickerInput({ label, value, onChange, mode = 'datetime' }) {
  const [show, setShow] = useState(false);

  const handleChange = (event, selectedDate) => {
    setShow(false);
    if (event.type === 'set' && selectedDate) {
      onChange(selectedDate);
    }
  };

  return (
    <View style={{ marginBottom: 15 }}>
      {label && <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>{label}</Text>}
      <Button title={value.toLocaleString()} onPress={() => setShow(true)} />
      {show && (
        <DateTimePicker
          value={value}
          mode={mode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
        />
      )}
    </View>
  );
}
