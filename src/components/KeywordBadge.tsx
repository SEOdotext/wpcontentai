
import React from 'react';
import { cn } from '@/lib/utils';

export type KeywordDifficulty = 'easy' | 'medium' | 'hard';

interface KeywordBadgeProps {
  keyword: string;
  difficulty?: KeywordDifficulty;
  className?: string;
  showDifficulty?: boolean;
}

const difficultyColors = {
  easy: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/30',
  medium: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/30',
  hard: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/30',
};

const KeywordBadge: React.FC<KeywordBadgeProps> = ({ 
  keyword, 
  difficulty = 'medium', 
  className,
  showDifficulty = false
}) => {
  return (
    <span 
      className={cn(
        'badge-keyword border',
        difficultyColors[difficulty],
        className
      )}
    >
      {keyword}
      {showDifficulty && (
        <span className="ml-1 opacity-70 text-[10px]">
          {difficulty === 'easy' && '(easy)'}
          {difficulty === 'medium' && '(medium)'}
          {difficulty === 'hard' && '(hard)'}
        </span>
      )}
    </span>
  );
};

export default KeywordBadge;
