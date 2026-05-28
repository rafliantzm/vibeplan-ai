"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/api";
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

    void getCurrentUser()
      .then((payload) => {
        if (!isMounted || !payload?.user) {
          return;
        }

        updateStoredUser(payload.user);
      })
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
  };
}
