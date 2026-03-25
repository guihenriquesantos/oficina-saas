/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { handleFirestoreError, OperationType } from './lib/firestore-errors';
import { UserProfile } from './types';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Vehicles from './pages/Vehicles';
import Services from './pages/Services';
import Budgets from './pages/Budgets';
import NewBudget from './pages/NewBudget';
import Billing from './pages/Billing';
import PublicLookup from './pages/PublicLookup';
import SetupCompany from './pages/SetupCompany';
import Layout from './components/Layout';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (fUser) => {
      setFirebaseUser(fUser);
      setAuthChecking(false);

      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }

      if (fUser) {
        unsubscribeDoc = onSnapshot(doc(db, 'users', fUser.uid), (userDoc) => {
          if (userDoc.exists()) {
            setUser({ id: fUser.uid, ...userDoc.data() } as UserProfile);
          } else {
            setUser(null);
          }
          setLoading(false);
        }, (error) => {
          console.error('Error listening to user doc:', error);
          setUser(null);
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  if (authChecking || (firebaseUser && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 animate-pulse">Carregando seu perfil...</p>
        </div>
      </div>
    );
  }

  const isPendingSetup = user?.companyId === 'pending_setup' || (firebaseUser && !user && !loading);

  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={!firebaseUser ? <Login /> : <Navigate to="/" />} />
        <Route path="/register" element={!firebaseUser ? <Register /> : <Navigate to="/" />} />
        <Route path="/lookup" element={<PublicLookup />} />
        <Route path="/lookup/:companyId" element={<PublicLookup />} />
        <Route path="/setup" element={firebaseUser ? (isPendingSetup ? <SetupCompany /> : <Navigate to="/" />) : <Navigate to="/login" />} />

        {/* Protected Routes */}
        <Route path="/" element={firebaseUser ? (isPendingSetup ? <Navigate to="/setup" /> : (user ? <Layout user={user} /> : <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>)) : <Navigate to="/login" />}>
          <Route index element={<Dashboard user={user!} />} />
          <Route path="clients" element={<Clients user={user!} />} />
          <Route path="vehicles" element={<Vehicles user={user!} />} />
          <Route path="services" element={<Services user={user!} />} />
          <Route path="budgets" element={<Budgets user={user!} />} />
          <Route path="orcamentos/novo" element={<NewBudget user={user!} />} />
          <Route path="billing" element={<Billing user={user!} />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

