/**
 * M3.2: Flag sender (bridge between edge and network)
 * Only file in monitor feature that imports network code
 * Queues flags in memory (max 20), resends on reconnect
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { DeIdentifiedFlag } from '../../edge';
import { monitorApi } from '../../api/monitor';

const MAX_QUEUE_SIZE = 20;

export function useFlagSender() {
  const [queueLength, setQueueLength] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const queueRef = useRef<DeIdentifiedFlag[]>([]);

  // Send flags from queue
  const sendQueue = useCallback(async () => {
    if (isSending || queueRef.current.length === 0) {
      return;
    }

    setIsSending(true);

    while (queueRef.current.length > 0) {
      const flag = queueRef.current[0];

      try {
        await monitorApi.sendFlag(flag);
        queueRef.current.shift(); // Remove sent flag
        setQueueLength(queueRef.current.length);
      } catch (err) {
        // Failed to send, keep in queue
        console.error('Failed to send flag:', err);
        break;
      }
    }

    setIsSending(false);
  }, [isSending]);

  // Send a flag (add to queue)
  const sendFlag = useCallback(
    (flag: DeIdentifiedFlag) => {
      // Add to queue (drop oldest if full)
      if (queueRef.current.length >= MAX_QUEUE_SIZE) {
        queueRef.current.shift(); // Drop oldest
      }

      queueRef.current.push(flag);
      setQueueLength(queueRef.current.length);

      // Try to send immediately
      sendQueue();
    },
    [sendQueue],
  );

  // Clear queue (on session end or sign-out)
  const clearQueue = useCallback(() => {
    queueRef.current = [];
    setQueueLength(0);
  }, []);

  // Retry sending on interval
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (queueRef.current.length > 0 && !isSending) {
        sendQueue();
      }
    }, 5000); // Retry every 5 seconds

    return () => clearInterval(intervalId);
  }, [isSending, sendQueue]);

  return {
    sendFlag,
    clearQueue,
    queueLength,
    isSending,
  };
}
