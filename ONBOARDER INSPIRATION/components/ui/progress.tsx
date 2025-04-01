import React, { useEffect, useState } from 'react';

interface ProgressProps {
  value?: number;
  className?: string;
}

export const Progress: React.FC<ProgressProps> = ({ value = 0, className }) => {
  const [animatedValue, setAnimatedValue] = useState(0);

  // Handle smooth animation when value changes
  useEffect(() => {
    // Ensure value is between 0 and 100
    const targetValue = Math.max(0, Math.min(100, value));
    setAnimatedValue(targetValue);
  }, [value]);

  return (
    <div className={`relative h-2 w-full overflow-hidden rounded-full bg-secondary ${className}`}>
      <div 
        className="h-full bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"
        style={{ 
          width: `${animatedValue}%`,
          transition: 'width 1000ms ease-in-out'
        }}
      />
    </div>
  );
};
