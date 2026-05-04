const Input = ({ label, error, isTextArea = false, className = '', ...props }) => {
  const inputStyles = `w-full px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-on-surface-variant/50 ${error ? 'border-error' : ''} ${className}`;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label className="text-sm font-semibold text-on-surface-variant ml-1">
          {label}
        </label>
      )}
      
      {isTextArea ? (
        <textarea className={inputStyles} rows="4" {...props} />
      ) : (
        <input className={inputStyles} {...props} />
      )}

      {error && <p className="text-xs text-error ml-1 font-medium">{error}</p>}
    </div>
  );
};

export default Input;