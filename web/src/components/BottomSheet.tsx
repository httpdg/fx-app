import { PropsWithChildren } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function BottomSheet({ open, onClose, children }: PropsWithChildren<Props>) {
  if (!open) return null;
  return (
    <>
      <div className="bottom-sheet-overlay" onClick={onClose} />
      <div className="bottom-sheet">{children}</div>
    </>
  );
}
