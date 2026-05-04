const Select = ({ label, options = [], error, className = '', ...props }) => {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label className="text-sm font-semibold text-on-surface-variant ml-1">
          {label}
        </label>
      )}
      
      <select
        className={`w-full px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer ${error ? 'border-error' : ''} ${className}`}
        {...props}
      >
        <option value="" disabled selected>Pilih salah satu...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      
      {error && <p className="text-xs text-error ml-1 font-medium">{error}</p>}
    </div>
  );
};

export default Select;