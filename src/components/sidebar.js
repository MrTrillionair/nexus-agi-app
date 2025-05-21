import React from 'react';

function Sidebar({ currentView, setCurrentView }) {
  const menuItems = [
    { key: 'MetaNavigator', label: '🌌 Ritual Grid' },
    { key: 'Dashboard', label: '📊 Dashboard' },
    { key: 'Voice', label: '🗣️ Voice Console' },
    { key: 'Numerology', label: '🔮 Numerology' },
    { key: 'ChakraMap', label: '🧘 Chakra Map' }
  ];

  return (
    <aside style={{
      width: '220px',
      backgroundColor: '#111',
      height: '100vh',
      color: '#fff',
      padding: '16px',
      boxSizing: 'border-box'
    }}>
      <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>🧭 Navigation</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {menuItems.map(item => (
          <li
            key={item.key}
            style={{
              padding: '10px 8px',
              marginBottom: '6px',
              backgroundColor: currentView === item.key ? '#333' : 'transparent',
              cursor: 'pointer',
              borderRadius: '4px'
            }}
            onClick={() => setCurrentView(item.key)}
          >
            {item.label}
          </li>
        ))}
      </ul>
    </aside>
  );
}

export default Sidebar;
