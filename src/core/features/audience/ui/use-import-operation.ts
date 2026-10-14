import { useEffect, useRef, useState } from 'react';

export type ImportOperation = { kind: 'csv' | 'archive'; stopped: boolean };
export type ImportOperationOwner = ReturnType<typeof useImportOperation>;

/** One synchronous owner for every CSV and archive writer, including callbacks from older renders. */
export function useImportOperation() {
  const driving = useRef<{ mounted: boolean; operation?: ImportOperation }>({ mounted: true });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    driving.current.mounted = true;
    return () => {
      driving.current.mounted = false;
      driving.current.operation = undefined;
    };
  }, []);

  const owns = (operation: ImportOperation) => driving.current.mounted && driving.current.operation === operation;
  return {
    busy,
    operation: driving.current.operation,
    acquire(kind: ImportOperation['kind']) {
      if (!driving.current.mounted || driving.current.operation) return;
      const operation: ImportOperation = { kind, stopped: false };
      driving.current.operation = operation;
      setBusy(true);
      return operation;
    },
    owns,
    release(operation: ImportOperation) {
      if (!owns(operation)) return;
      driving.current.operation = undefined;
      setBusy(false);
    },
    stopCsv(operation?: ImportOperation) {
      if (operation?.kind === 'csv' && owns(operation)) operation.stopped = true;
    },
  };
}
