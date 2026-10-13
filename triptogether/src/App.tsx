import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TripGroup } from './types';
import { subscribeToUserGroups, localStore } from './services/db';
import { seedDemoTripData, DEMO_USERS } from './utils/mockData';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { GroupView } from './components/GroupView';
import { CreateTripModal } from './components/CreateTripModal';
import { JoinTripModal } from './components/JoinTripModal';

function MainApp() {
  const { currentUser, switchPersona } = useAuth();
  const [groups, setGroups] = useState<TripGroup[]>(() => {
    const existing = localStore.get('groups', []);
    if (!existing || existing.length === 0) {
      const demo = seedDemoTripData();
      return [demo];
    }
    return existing;
  });
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(() => {
    const existing = localStore.get('groups', []);
    return existing && existing.length > 0 ? existing[0].id : null;
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joinCode, setJoinCode] = useState<string | null>(null);

  // Subscribe to trips and auto-seed demo trip on first run
  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToUserGroups(currentUser.id, (loaded) => {
      setGroups(loaded);
      if (loaded.length === 0 && !localStorage.getItem('triptogether_seeded_once')) {
        localStorage.setItem('triptogether_seeded_once', 'true');
        const demo = seedDemoTripData();
        setSelectedGroupId(demo.id);
      }
    });
    return () => unsub();
  }, [currentUser]);

  // Check URL hash for invite link e.g. /#join=trip_123
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#join=')) {
        const code = hash.replace('#join=', '').trim();
        if (code) {
          setJoinCode(code);
        }
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleSeedDemo = () => {
    const demo = seedDemoTripData();
    switchPersona(DEMO_USERS[0]); // Elena (Admin)
    setSelectedGroupId(demo.id);
  };

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) || null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        activeGroupName={selectedGroup?.name}
        onBackToDashboard={() => setSelectedGroupId(null)}
        onSeedDemo={handleSeedDemo}
      />

      <main className="flex-1 pb-16">
        {selectedGroupId ? (
          <GroupView
            groupId={selectedGroupId}
            currentUser={currentUser!}
            onBackToDashboard={() => setSelectedGroupId(null)}
          />
        ) : (
          <Dashboard
            groups={groups}
            onSelectGroup={(id) => setSelectedGroupId(id)}
            onCreateClick={() => setShowCreateModal(true)}
            onSeedDemo={handleSeedDemo}
            onOpenJoinCode={(code) => setJoinCode(code)}
          />
        )}
      </main>

      {/* Create Trip Modal */}
      {showCreateModal && (
        <CreateTripModal
          onCreated={(group) => {
            setShowCreateModal(false);
            setSelectedGroupId(group.id);
          }}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Join Trip Modal (via QR scan or pasted code) */}
      {joinCode && (
        <JoinTripModal
          inviteCode={joinCode}
          onJoined={(groupId) => {
            setJoinCode(null);
            window.location.hash = '';
            setSelectedGroupId(groupId);
          }}
          onCancel={() => {
            setJoinCode(null);
            window.location.hash = '';
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
