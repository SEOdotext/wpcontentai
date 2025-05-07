import React from 'react';
import { Button } from './button';
import { Save } from 'lucide-react';

interface FloatingSaveButtonProps {
  onClick: () => void;
  isLoading?: boolean;
}

export const FloatingSaveButton: React.FC<FloatingSaveButtonProps> = ({ onClick, isLoading = false }) => {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        onClick={onClick}
        disabled={isLoading}
        className="shadow-lg hover:shadow-xl transition-all duration-200"
      >
        <Save className="w-4 h-4 mr-2" />
        {isLoading ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  );
}; 