import React from 'react';
import PropTypes from 'prop-types';

const InputField = ({ 
  type = 'text',
  placeholder = '',
  value = '',
  onChange,
  disabled = false,
  className = '',
  icon,
  iconPosition = 'left',
  ...props 
}) => {
  const baseClasses = 'bg-[#09090b] border border-[#27272a] rounded-[6px] text-[14px] font-inter font-normal leading-[17px] text-[#a1a1aa] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200';

  const paddingClasses = icon ? (iconPosition === 'left' ? 'pl-12 pr-4' : 'pr-12 pl-4') : 'px-4';
  const inputClasses = `${baseClasses} ${paddingClasses} py-2 ${disabled ? 'cursor-not-allowed opacity-50' : ''} ${className}`;

  return (
    <div className="relative flex items-center w-[300px]">
      {icon && iconPosition === 'left' && (
        <div className="absolute left-3 flex items-center pointer-events-none ml-[5px]">
          {typeof icon === 'string' ? (
            <img src={icon} alt="icon" className="w-4 h-4" />
          ) : (
            React.cloneElement(icon, { className: `${icon.props.className || ''} ml-[5px]` })
          )}
        </div>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={inputClasses}
        style={{ textIndent: '30px' }} 
        {...props}
      />
    </div>
  );
};

InputField.propTypes = {
  type: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  icon: PropTypes.node,
  iconPosition: PropTypes.oneOf(['left', 'right']),
};

export default InputField;