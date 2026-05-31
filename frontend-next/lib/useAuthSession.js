"use client";

import { useEffect, useState } from "react";
import { getCurrentUser, getProfile } from "@/lib/api";
import {
  clearSession,
  getToken,
  getUser,
  subscribeAuthChange,
  updateStoredUser,
} from "@/lib/auth";

export function useAuthSession({ syncWithServer = false } = {}) {
  const [session, setSessionState] = useState({
    token: null,
    user: null,
  });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    function syncLocalState() {
      setSessionState({
        token: getToken(),
        user: getUser(),
      });
      setIsReady(true);
    }

    const timer = window.setTimeout(syncLocalState, 0);
    const unsubscribe = subscribeAuthChange(syncLocalState);

    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!syncWithServer || !session.token) {
      return undefined;
    }

    let isMounted = true;
    
    async function refreshProfile() {
      try {
        const payload = await getProfile();

        if (!isMounted || !payload?.data) {
          return;
        }

        updateStoredUser(payload.data);
      } catch (profileError) {
        if (!isMounted) {
          return;
        }

        const fallbackPayload = await getCurrentUser();

        if (!isMounted || !fallbackPayload?.user) {
          return;
        }

        updateStoredUser(fallbackPayload.user);
      }
    }

    void refreshProfile()
      .catch(() => {
        if (!isMounted) {
          return;
        }

        clearSession();
      });

    return () => {
      isMounted = false;
    };
  }, [session.token, syncWithServer]);

  return {
    token: session.token,
    user: session.user,
    isReady,
    isLoggedIn: Boolean(session.token),
    isAdmin: session.user?.role === "admin",
    refreshUser: async () => {
      if (!getToken()) {
        return null;
      }

      try {
        const payload = await getProfile();
        return payload?.data || null;
      } catch {
        const payload = await getCurrentUser();

        if (payload?.user) {
          updateStoredUser(payload.user);
        }

        return payload?.user || null;
      }
    },
  };
}
