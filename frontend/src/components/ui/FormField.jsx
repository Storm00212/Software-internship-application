import './FormField.css';

export default function FormField({ label, error, children }) {
  return (
    <div className="form-field">
      {label && <label className="field-label">{label}</label>}
      {children}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

export function Input({ ...props }) {
  return <input className="field-input" {...props} />;
}

export function Select({ children, ...props }) {
  return <select className="field-input" {...props}>{children}</select>;
}

export function Textarea({ ...props }) {
  return <textarea className="field-input field-textarea" {...props} />;
}

export function Button({ variant = 'primary', loading, children, ...props }) {
  return (
    <button className={`btn btn-${variant}`} disabled={loading || props.disabled} {...props}>
      {loading ? <span className="spinner" style={{ width:16, height:16 }} /> : children}
    </button>
  );
}
