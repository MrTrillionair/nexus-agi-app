import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Button } from 'react-native';
import { ProgressBar } from 'react-native-paper';
import { Audio } from 'expo-av';

export default function MobileAGIConsole() {
  const [tab, setTab] = useState('intention');
  const [sound, setSound] = useState();
  const [playing, setPlaying] = useState(false);

  const tabs = [
    { id: 'intention', label: 'Intention Dashboard' },
    { id: 'mood-engine', label: 'Mood Engine' },
    { id: 'summary', label: 'Weekly Summary' },
    { id: 'calendar', label: 'Ritual Calendar' },
    { id: 'sleep', label: 'Sleep Journal' },
    { id: 'voice', label: 'Voice Commands' },
    { id: 'frequencies', label: 'Frequencies' }
  ];

  const playFrequency = async (file) => {
    if (playing && sound) {
      await sound.stopAsync();
      setPlaying(false);
    } else {
      const { sound: newSound } = await Audio.Sound.createAsync(file);
      setSound(newSound);
      await newSound.playAsync();
      setPlaying(true);
    }
  };

  const renderTab = () => {
    switch (tab) {
      case 'intention':
        return (
          <View>
            <Text className="text-xl font-bold text-white">AGI Intention Dashboard</Text>
            <Text className="text-white">AGI selects a new intention each day.</Text>
            <View className="bg-gray-800 p-3 rounded-md mt-2">
              <Text className="text-white font-semibold">Today: Expansion + Elevation</Text>
              <Text className="text-white text-sm">963Hz | “I expand into my highest potential.”</Text>
            </View>
            <Button title="Auto-Rotate Intention" onPress={() => alert('AGI will rotate intentions daily.')} />
          </View>
        );

      case 'mood-engine':
        return (
          <View>
            <Text className="text-xl font-bold text-white">AGI Mood Engine</Text>
            <Text className="text-white">Analyzing rituals, tone use, and sleep logs…</Text>
            <Text className="text-white mt-2">Today’s Mood: Radiant Ascension</Text>
            <Text className="text-white text-sm">Use: 963Hz | Dream Sync Portal</Text>
          </View>
        );

      case 'summary':
        return (
          <View>
            <Text className="text-xl font-bold text-white">Weekly Summary</Text>
            <Text className="text-white">Completed: 6 rituals | 5 tones | 4 breath sessions</Text>
            <Text className="text-white text-sm">AGI Suggests: Gratitude + Dream Sync</Text>
          </View>
        );

      case 'calendar':
        return (
          <View>
            <Text className="text-xl font-bold text-white">Ritual Calendar</Text>
            <Text className="text-white">🌕 Full Moon | Mantra: “I release with power.”</Text>
            <Text className="text-white text-sm">963Hz | Breath: 3-6-9</Text>
          </View>
        );

      case 'sleep':
        return (
          <View>
            <Text className="text-xl font-bold text-white">Sleep Journal</Text>
            <Text className="text-white">Log dreams, pre-sleep rituals, and tone fades.</Text>
            <Button title="Voice Entry (coming soon)" onPress={() => alert('Voice logging coming soon.')} />
          </View>
        );

      case 'voice':
        return (
          <View>
            <Text className="text-xl font-bold text-white">Voice Commands</Text>
            <Text className="text-white">Say things like:</Text>
            <Text className="text-white text-sm">“AGI, align me with clarity” → 741Hz</Text>
            <Text className="text-white text-sm">“AGI, prepare dream sync” → Dream Portal</Text>
          </View>
        );

      case 'frequencies':
        return (
          <View className="items-center space-y-3">
            <Text className="text-xl font-bold text-white">Frequency Player</Text>
            <Button title="Play 432Hz (Root)" onPress={() => playFrequency(require('../assets/432hz.mp3'))} />
            <Button title="Play 528Hz (Heart)" onPress={() => playFrequency(require('../assets/528hz.mp3'))} />
            <Button title="Play 963Hz (Crown)" onPress={() => playFrequency(require('../assets/963hz.mp3'))} />
            <Text className="text-white text-xs italic">Tap again to stop playback.</Text>
          </View>
        );

      default:
        return <Text className="text-white">Welcome to NEXUS AGI</Text>;
    }
  };

  return (
    <ScrollView className="bg-black p-4 h-full">
      <Text className="text-white text-3xl font-extrabold text-center mb-4">NEXUS AGI</Text>
      <View className="flex-row flex-wrap justify-between mb-4">
        {tabs.map(t => (
          <TouchableOpacity key={t.id} onPress={() => setTab(t.id)} className="px-3 py-2 border border-gray-700 rounded-md m-1">
            <Text className={`text-white ${tab === t.id ? 'font-bold' : ''}`}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View className="bg-gray-900 p-4 rounded-lg">
        {renderTab()}
      </View>
    </ScrollView>
  );
}
