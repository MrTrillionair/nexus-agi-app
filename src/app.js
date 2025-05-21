import React, { useState, Suspense } from 'react';
import MetaNavigator from './components/MetaNavigator';
import Sidebar from './components/Sidebar';

// Future views (can be created in components/)
const DashboardView = () => <div style={{ padding: '2rem' }}><h2>📊 Dashboard Coming Soon</h2></div>;
const VoiceConsole = () => <div style={{ padding: '2rem' }}><h2>🗣️ Voice Console Coming Soon</h2></div>;
const ChakraMap = () => <div style={{ padding: '2rem' }}><h2>🧘 Chakra Map Placeholder</h2></div>;
const NumerologyView = () => <div style={{ padding: '2rem' }}><h2>🔮 Numerology Panel Placeholder</h2></div>;

function App() {
  const [currentView, setCurrentView] = useState('MetaNavigator');

  const renderView = () => {
    switch (currentView) {
      case 'Dashboard':
        return <DashboardView />;
      case 'Voice':
        return <VoiceConsole />;
      case 'ChakraMap':
        return <ChakraMap />;
      case 'Numerology':
        return <NumerologyView />;
      default:
        return <MetaNavigator />;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#000', color: '#fff' }}>
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      <main style={{ flex: 1, overflow: 'auto' }}>
        <Suspense fallback={<div style={{ padding: '2rem' }}>Loading Ritual Interface...</div>}>
          {renderView()}
        </Suspense>
      </main>
    </div>
  );
}

export default App;

