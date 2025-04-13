import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';

const PublicNav: React.FC = () => {
  return (
    <header className="w-full py-4 px-6 border-b border-border/10 bg-background/98 backdrop-blur-lg">
      <div className="w-full max-w-6xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link to="/">
            <Logo className="scale-110" />
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/pricing">
            <Button variant="ghost" className="font-medium">Pricing</Button>
          </Link>
          <Link to="/auth">
            <Button variant="ghost" className="font-medium">Login</Button>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default PublicNav; 