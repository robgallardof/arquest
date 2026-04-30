/**
 * Reports browser online status after hydration to avoid SSR/client mismatches.
 * - Returns `null` until mounted (server + pre-hydration render).
 * - Returns `true/false` afterwards and stays in sync with online/offline events.
 */
import { useEffect, useState } from "react";

export function useOnlineStatus(): boolean | null {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const read = () =>
      setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    read();
    window.addEventListener("online", read);
    window.addEventListener("offline", read);
    return () => {
      window.removeEventListener("online", read);
      window.removeEventListener("offline", read);
    };
  }, []);

  return online;
}
