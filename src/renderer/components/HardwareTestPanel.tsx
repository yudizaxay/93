import { useEffect, useState } from 'react';

export function HardwareTestPanel({ buttonKey, onClose }: { buttonKey: string; onClose: () => void }) {
  const [detected, setDetected] = useState<{ key: string; timestamp: number } | null>(null);

  useEffect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      setDetected({ key: e.code, timestamp: performance.now() });
    };
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, []);

  return (
    <div className="admin-panel-overlay">
      <div className="admin-panel">
        <h1>HARDWARE TEST</h1>
        {!detected ? (
          <p>WAITING FOR USB BUTTON...</p>
        ) : (
          <>
            <p>USB BUTTON DETECTED ✓</p>
            <p>KEY: {detected.key} (configured: {buttonKey})</p>
            <p>INPUT RECEIVED at {detected.timestamp.toFixed(2)}ms (diagnostic only)</p>
          </>
        )}
        <button onClick={onClose}>CLOSE</button>
      </div>
    </div>
  );
}
