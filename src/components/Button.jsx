import React from 'react';
import PropTypes from 'prop-types';

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'medium', 
  disabled = false, 
  type = 'button',
  className = '',
  ...props 
}) => {
  const baseClasses = 'font-medium rounded-[10px] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center';
  
  const variants = {
    primary: 'bg-[#fafafa] text-[#18181b] hover:bg-gray-200 disabled:bg-gray-400',
    secondary: 'bg-[#09090b] text-[#fafafa] border border-[#27272a] hover:bg-[#27272a] disabled:bg-gray-600',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:border-gray-200 disabled:text-gray-400',
    active: 'bg-[#22c55e] text-[#18181b] hover:bg-green-600 disabled:bg-gray-400',
    inactive: 'border border-[#e5e7eb] text-[#a1a1aa] hover:bg-gray-50 disabled:border-gray-200'
  };
  
  const sizes = {
    small: 'px-3 py-1 text-sm h-[32px]',
    medium: 'px-4 py-2 text-base h-[40px]',
    large: 'px-6 py-3 text-lg h-[48px]',
  };
  
  const buttonClasses = `${baseClasses} ${variants[variant]} ${sizes[size]} ${disabled ? 'cursor-not-allowed' : ''} ${className}`;
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={buttonClasses}
      {...props}
    >
      {children}
    </button>
  );
};

Button.propTypes = {
  children: PropTypes.node,
  onClick: PropTypes.func,
  variant: PropTypes.oneOf(['primary', 'secondary', 'outline', 'active', 'inactive']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  disabled: PropTypes.bool,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  className: PropTypes.string,
};

export default Button;