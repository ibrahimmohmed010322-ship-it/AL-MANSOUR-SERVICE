import { onAuthStateChanged, type User } from 'firebase/auth';
import { useCallback, useEffect, useState } from 'react';
import { AdminAuth } from './components/AdminAuth';
import { AdminDashboard } from './components/AdminDashboard';
import { ClientLanding } from './components/ClientLanding';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { ServiceRequestForm } from './components/ServiceRequestForm';
import { auth } from './lib/firebase';
import { verifyAdminAccess } from './services/maintenanceService';
import type { ServiceType } from './types/maintenance';

export default function App() {
  const [view, setView] = useState<'client' | 'admin'>(() =>
    window.location.hash === '#admin' ? 'admin' : 'client'
  );
  const [selectedService, setSelectedService] =
    useState<ServiceType>('electrical');

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthorizedAdmin, setIsAuthorizedAdmin] = useState(false);

  const checkAuthorization = useCallback(async (user: User | null) => {
    if (!user) {
      setIsAuthorizedAdmin(false);
      setAuthChecking(false);
      return;
    }
    setAuthChecking(true);
    try {
      const ok = await verifyAdminAccess(user);
      setIsAuthorizedAdmin(ok);
    } catch {
      setIsAuthorizedAdmin(false);
    } finally {
      setAuthChecking(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      void checkAuthorization(user);
    });
    return () => unsub();
  }, [checkAuthorization]);

  useEffect(() => {
    const onHashChange = () => {
      setView(window.location.hash === '#admin' ? 'admin' : 'client');
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleNavigateView = (target: 'client' | 'admin', sectionId?: string) => {
    setView(target);
    if (target === 'admin') {
      window.location.hash = 'admin';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (window.location.hash === '#admin') {
      window.history.replaceState(null, '', window.location.pathname);
    }

    if (sectionId) {
      setTimeout(() => {
        if (sectionId === 'top') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          document
            .getElementById(sectionId)
            ?.scrollIntoView({ behavior: 'smooth' });
        }
      }, 40);
    }
  };

  const handleSelectServiceAndScroll = (service: ServiceType) => {
    setSelectedService(service);
    document
      .getElementById('request-form')
      ?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScrollToForm = () => {
    document
      .getElementById('request-form')
      ?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleRefreshAdminStatus = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setCurrentUser(auth.currentUser);
      await checkAuthorization(auth.currentUser);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-[#111113]">
      <Header view={view} onNavigateView={handleNavigateView} />

      <main className="flex-1">
        {view === 'client' ? (
          <>
            <ClientLanding
              selectedService={selectedService}
              onSelectServiceAndScroll={handleSelectServiceAndScroll}
              onScrollToForm={handleScrollToForm}
            />
            <ServiceRequestForm
              selectedService={selectedService}
              onChangeService={setSelectedService}
            />
          </>
        ) : currentUser && isAuthorizedAdmin ? (
          <AdminDashboard user={currentUser} />
        ) : (
          <AdminAuth
            currentUser={currentUser}
            authChecking={authChecking}
            isAuthorizedAdmin={isAuthorizedAdmin}
            onRefreshAdminStatus={handleRefreshAdminStatus}
          />
        )}
      </main>

      <Footer onOpenAdmin={() => handleNavigateView('admin')} />
    </div>
  );
}
