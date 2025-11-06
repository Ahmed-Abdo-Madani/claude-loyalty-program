/**
 * SelectableOptionCard Component
 * Reusable styled option button with radio input
 * Used for pass type and barcode type selections
 */

function SelectableOptionCard({
  value,
  name,
  checked,
  onChange,
  icon,
  title,
  description,
  isDefault = false
}) {
  return (
    <button
      onClick={() => onChange(value)}
      className={`w-full px-3 sm:px-4 py-3 sm:py-3.5 rounded-lg text-left transition-all duration-200 flex items-center gap-3 min-h-[56px]
        ${checked ?? isDefault
          ? 'bg-primary text-white shadow-md'
          : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600'
        }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked ?? isDefault}
        onChange={() => onChange(value)}
        className="h-5 w-5 text-primary focus:ring-primary border-gray-300 dark:border-gray-600"
        onClick={(e) => e.stopPropagation()}
      />
      {icon && <span className="text-2xl">{icon}</span>}
      <div className="flex-1">
        <div className="font-medium text-sm sm:text-base">{title}</div>
        <div className="text-xs opacity-75">{description}</div>
      </div>
    </button>
  )
}

export default SelectableOptionCard
