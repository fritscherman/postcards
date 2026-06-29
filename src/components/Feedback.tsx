import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Check, Info, TriangleAlert, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDialog } from '../hooks/useDialog';

type ToastType = 'success' | 'error' | 'info';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastOptions {
  type?: ToastType;
  /** Auto-dismiss after this many ms. Defaults depend on type / presence of an action. */
  duration?: number;
  action?: ToastAction;
}

interface Toast extends Required<Pick<ToastOptions, 'type'>> {
  id: number;
  message: string;
  action?: ToastAction;
}

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style the confirm button as a destructive action. */
  danger?: boolean;
}

interface FeedbackValue {
  /** Show a non-blocking toast. Replaces ad-hoc alert() calls. */
  notify: (message: string, opts?: ToastOptions) => void;
  /** Styled, accessible replacement for window.confirm(). Resolves true/false. */
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackValue | null>(null);

const ICONS: Record<ToastType, ReactNode> = {
  success: <Check size={18} />,
  error: <TriangleAlert size={18} />,
  info: <Info size={18} />,
};

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(
    null,
  );
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback<FeedbackValue['notify']>(
    (message, opts = {}) => {
      const id = nextId.current++;
      const type = opts.type ?? 'success';
      const toast: Toast = { id, message, type, action: opts.action };
      setToasts((prev) => [...prev, toast]);
      const duration = opts.duration ?? (opts.action ? 6000 : type === 'error' ? 5000 : 3500);
      window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const confirm = useCallback<FeedbackValue['confirm']>((opts) => {
    return new Promise<boolean>((resolve) => setPending({ ...opts, resolve }));
  }, []);

  const settle = useCallback(
    (value: boolean) => {
      pending?.resolve(value);
      setPending(null);
    },
    [pending],
  );

  return (
    <FeedbackContext.Provider value={{ notify, confirm }}>
      {children}

      <div className="toast-stack" role="region" aria-label={t('feedback.hintsAria')} aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span className="toast-icon" aria-hidden="true">{ICONS[toast.type]}</span>
            <span className="toast-message">{toast.message}</span>
            {toast.action && (
              <button
                className="toast-action"
                onClick={() => {
                  toast.action!.onClick();
                  dismiss(toast.id);
                }}
              >
                {toast.action.label}
              </button>
            )}
            <button className="toast-close" aria-label={t('common.close')} onClick={() => dismiss(toast.id)}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      {pending && (
        <ConfirmDialog
          {...pending}
          onConfirm={() => settle(true)}
          onCancel={() => settle(false)}
        />
      )}
    </FeedbackContext.Provider>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger,
  onConfirm,
  onCancel,
}: ConfirmOptions & { onConfirm: () => void; onCancel: () => void }) {
  const { t } = useTranslation();
  const ref = useDialog<HTMLDivElement>(onCancel);
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>{title}</h3>
        {message && <p>{message}</p>}
        <div className="modal-actions">
          <button className="btn ghost" onClick={onCancel}>{cancelLabel ?? t('common.cancel')}</button>
          <button className={`btn ${danger ? 'danger' : 'primary'}`} onClick={onConfirm}>
            {confirmLabel ?? t('common.ok')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useFeedback(): FeedbackValue {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used within FeedbackProvider');
  return ctx;
}
