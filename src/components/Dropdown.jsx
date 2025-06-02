import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

const Dropdown = ({ 
  options = [],
  value = '',
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  className = '',
  icon,
  ...props 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  const baseClasses = 'bg-[#09090b] border border-[#27272a] rounded-[6px] text-[14px] font-inter font-normal leading-[17px] text-[#a1a1aa] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 cursor-pointer';
  
  const dropdownClasses = `${baseClasses} px-4 py-2 flex items-center justify-between ${disabled ? 'cursor-not-allowed opacity-50' : ''} ${className}`;
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const handleSelect = (option) => {
    if (onChange) {
      onChange(option);
    }
    setIsOpen(false);
  };
  
  const selectedOption = options.find(option => option.value === value);
  
  return (
    <div className="relative" ref={dropdownRef} {...props}>
      <div
        className={dropdownClasses}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex items-center">
          {icon && (
            <img src={icon} alt="icon" className="w-4 h-4 mr-2" />
          )}
          <span className={selectedOption ? 'text-[#fafafa]' : 'text-[#a1a1aa]'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <img
          src="/images/img_vector.svg"
          alt="dropdown arrow"
          className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </div>
      
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#09090b] border border-[#27272a] rounded-[6px] shadow-lg z-50 max-h-60 overflow-y-auto">
          {options.map((option, index) => (
            <div
              key={index}
              className="px-4 py-2 text-[14px] font-inter font-normal leading-[17px] text-[#fafafa] hover:bg-[#27272a] cursor-pointer transition-colors duration-200"
              onClick={() => handleSelect(option)}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

Dropdown.propTypes = {
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
  value: PropTypes.string,
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  icon: PropTypes.string,
};

export default Dropdown;