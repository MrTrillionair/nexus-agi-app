import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';

// Voice Recognition API Setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

const chakraColors = {
  Crown: '#ffffff',
  ThirdEye: '#8000ff',
  Throat: '#0000ff',
  Heart: '#00ff00',
  SolarPlexus: '#ffff00',
  Sacral: '#ff8000',
  Root: '#ff0000'
};

function MetaNavigator() {
  const [numerologyCode, setNumerologyCode] = useState(null);
  const [numerologyMeaning, setNumerologyMeaning] = useState('');
  const [numerologyShadow, setNumerologyShadow] = useState('');
  const [commandOutput, setCommandOutput] = useState('');

  const numerologyMeanings = {
    1: { meaning: 'Initiation, leadership, self-mastery', opposite: 'Selfishness, isolation' },
    2: { meaning: 'Partnership, balance, harmony', opposite: 'Dependence, indecision' },
    3: { meaning: 'Creativity, joy, self-expression', opposite: 'Scattered energy, superficiality' },
    4: { meaning: 'Stability, foundation, structure', opposite: 'Rigidity, stagnation' },
    5: { meaning: 'Freedom, change, adventure', opposite: 'Restlessness, recklessness' },
    6: { meaning: 'Responsibility, nurturing, service', opposite: 'Overburden, martyrdom' },
    7: { meaning: 'Spiritual insight, contemplation, wisdom', opposite: 'Isolation, doubt' },
    8: { meaning: 'Power, abundance, mastery of matter', opposite: 'Greed, materialism' },
    9: { meaning: 'Completion, compassion, universal love', opposite: 'Loss, detachment' }
  };

  // Calculate today's numerology
  useEffect(() => {
    const date = new Date();
    const digits = `${date.getFullYear()}${date.getMonth() + 1}${date.getDate()}`.split('').map(Number);
    let sum = digits.reduce((a, b) => a + b, 0);
    while (sum > 9) {
      sum = sum.toString().split('').map(Number).reduce((a, b) => a + b, 0);
    }
    setNumerologyCode(sum);
    setNumerologyMeaning(numerologyMeanings[sum].meaning);
    setNumerologyShadow(numerologyMeanings[sum].opposite);
  }, []);

  // Start voice listening
  useEffect(() => {
    if (!recognition) return;

    recognition.continuous = true;
    recognition.lang = 'en-US';
    recognition.start();

    recognition.onresult = (event) => {
      const command = event.results[event.results.length - 1][0].transcript.toLowerCase();
      console.log('🎙 Voice Command:', command);

      if (command.includes('dashboard')) {
        setCommandOutput('🧭 Navigating to dashboard window.');
      } else if (command.includes('numerology')) {
        setCommandOutput(`🔮 Numerology: ${numerologyCode} — ${numerologyMeaning}`);
      } else if (command.includes('root') || command.includes('directory')) {
        setCommandOutput('📁 Ritual root directory: /src/components/');
      } else if (command.includes('clear')) {
        setCommandOutput('');
      } else {
        setCommandOutput(`🤔 Unknown command: "${command}"`);
      }
    };

    recognition.onerror = (event) => {
      console.warn('Voice recognition error:', event.error);
    };
  }, [numerologyCode, numerologyMeaning]);

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', height: '100vh' }}>
      <div style={{ padding: '16px' }}>
        <h1>Nexus AGI Ritual Dashboard</h1>
        <p>Numerology Code: {numerologyCode}</p>
        <p style={{ color: '#90ee90' }}>Meaning: {numerologyMeaning}</p>
        <p style={{ color: '#ff8888' }}>Opposite: {numerologyShadow}</p>

        {commandOutput && (
          <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#111', borderRadius: '8px' }}>
            <strong>🗣️ Voice Response:</strong>
            <p style={{ margin: 0 }}>{commandOutput}</p>
          </div>
        )}
      </div>

      <Canvas camera={{ position: [0, 0, 6] }}>
        <ambientLight />
        <Stars radius={100} depth={50} count={3000} factor={4} fade />
        <OrbitControls enableZoom enablePan enableRotate />

        {/* Sun */}
        <mesh position={[-2.5, 0, 0]}>
          <sphereGeometry args={[0.3, 64, 64]} />
          <meshStandardMaterial emissive="#FFD700" emissiveIntensity={1} />
        </mesh>

        {/* Earth + Moon */}
        <mesh position={[1.5, 0, 0]}>
          <sphereGeometry args={[0.1, 32, 32]} />
          <meshStandardMaterial color="blue" />
        </mesh>
        <mesh position={[1.7, 0, 0]}>
          <sphereGeometry args={[0.03, 16, 16]} />
          <meshStandardMaterial color="lightgray" />
        </mesh>

        {/* Galactic Core */}
        <mesh position={[0, 2, 0]}>
          <sphereGeometry args={[0.25, 64, 64]} />
          <meshStandardMaterial color="#8000ff" emissive="#4500ff" emissiveIntensity={0.8} />
        </mesh>

        {/* Ritual Spiral - Homopolar Symbol */}
        <mesh position={[0, 1.2, -1]}>
          <torusGeometry args={[0.2, 0.02, 16, 100]} />
          <meshStandardMaterial color="#FFA500" emissive="#FF8C00" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[0, 1.2, -1]}>
          <cylinderGeometry args={[0.01, 0.01, 0.6, 32]} />
          <meshStandardMaterial color="#00FFFF" emissive="#00FFFF" emissiveIntensity={0.6} />
        </mesh>
        <mesh position={[0, 1.2, -1]}>
          <torusKnotGeometry args={[0.08, 0.01, 100, 16]} />
          <meshStandardMaterial color="#B87333" emissive="#FF4500" emissiveIntensity={0.4} />
        </mesh>
      </Canvas>
    </div>
  );
}

export default MetaNavigator;

