import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if device is iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const installApp = async () => {
    if (isIOS) {
      alert("To install on iOS: Tap the Share icon (box with arrow pointing up) at the bottom of the browser, then tap 'Add to Home Screen'.");
      return;
    }

    if (!deferredPrompt) {
      alert("To install this app on your device:\n\n📱 Android/Chrome: Tap the 3 dots menu (⋮) in the top right and select 'Install app' or 'Add to Home screen'.\n\n🍎 iOS/Safari: Tap the Share icon (box with arrow) at the bottom and select 'Add to Home Screen'.");
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    // We've used the prompt, and can't use it again, throw it away
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return { installApp, isIOS, canInstall: !!deferredPrompt || isIOS };
}
