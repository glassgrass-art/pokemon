import { useEffect, useState, lazy, Suspense } from "react";
import type { User } from "@supabase/supabase-js";
import App from "../App";
import { cloudConfigured, supabase } from "../utils/supabase";
import { setStorageOwner } from "../utils/storage";
const SignInModal = lazy(() => import("./SignInModal"));

export default function AccountShell() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!cloudConfigured);
  const [showLogin, setShowLogin] = useState(false);
  useEffect(() => {
    if (!cloudConfigured) return;
    let alive = true;
    let changed = false;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      changed = true;
      if (!alive) return;
      setUser(session?.user || null);
      setReady(true);
      if (session) setShowLogin(false);
    });
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (alive && !changed) {
          setUser(data.session?.user || null);
          setReady(true);
        }
      })
      .catch(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);
  if (!ready)
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 p-8">
        正在读取账号…
      </div>
    );
  // Remount app state on account changes; local snapshots are separated by authenticated UUID.
  setStorageOwner(user?.id);
  return (
    <>
      <App
        key={user?.id || "guest"}
        user={user}
        onSignIn={() => setShowLogin(true)}
      />
      {showLogin && (
        <Suspense fallback={null}>
          <SignInModal onClose={() => setShowLogin(false)} />
        </Suspense>
      )}
    </>
  );
}
