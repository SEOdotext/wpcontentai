import React from 'react';
import { Instagram, Heart, MessageCircle, Share2, Bookmark, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InstagramPostProps {
  content: string;
}

export const InstagramPost: React.FC<InstagramPostProps> = ({ content }) => {
  // Function to process hashtags and make them blue
  const processHashtags = (text: string) => {
    return text.split(' ').map((word, i) => {
      if (word.startsWith('#')) {
        return `<span class="text-[#0095F6] hover:underline cursor-pointer">${word}</span>`;
      }
      return word;
    }).join(' ');
  };

  // Function to process emojis and numbers in circles
  const processEmojis = (text: string) => {
    // Replace 🔍 with the magnifying glass and bar chart
    text = text.replace('🔍📊', '<span class="inline-flex gap-1">🔍📊</span>');
    
    // Replace numbered circles (e.g., ①) with styled numbers
    text = text.replace(/①/g, '<span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#F1F1F1] text-sm">1</span>');
    
    return text;
  };

  return (
    <div className="instagram-phone-frame">
      {/* Status Bar */}
      <div className="status-bar">
        <div className="time">5:26</div>
        <div className="icons">
          <div className="signal-wifi" />
          <div className="battery" />
        </div>
      </div>

      {/* Instagram App Header */}
      <div className="instagram-app-header">
        <div className="stories-bar">
          <div className="story-item">
            <div className="story-avatar your-story">
              <span className="plus-icon">+</span>
            </div>
            <span className="story-username">Your story</span>
          </div>
          {/* Example story items */}
          {['jaded.ele', 'pia.m.a.pod', 'wyatt338'].map((username) => (
            <div key={username} className="story-item">
              <div className="story-avatar has-story" />
              <span className="story-username">{username}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Post Content */}
      <article className="instagram-post">
        {/* Post Header */}
        <header className="post-header">
          <div className="flex items-center">
            <div className="profile-picture">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-fuchsia-600 p-[2px]">
                <div className="w-full h-full rounded-full bg-white p-0.5">
                  <Instagram className="w-5 h-5 text-[#262626]" />
                </div>
              </div>
            </div>
            <span className="username">hirely.dk</span>
          </div>
          <button className="more-options">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </header>

        {/* Post Content */}
        <div className="post-content">
          <div 
            className="caption"
            dangerouslySetInnerHTML={{ 
              __html: processEmojis(processHashtags(content))
            }}
          />
        </div>

        {/* Post Actions */}
        <div className="post-actions">
          <div className="primary-actions">
            <button className="action-button">
              <Heart className="action-icon" />
            </button>
            <button className="action-button">
              <MessageCircle className="action-icon" />
            </button>
            <button className="action-button">
              <Share2 className="action-icon" />
            </button>
          </div>
          <button className="action-button">
            <Bookmark className="action-icon" />
          </button>
        </div>
      </article>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <button className="nav-item">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button className="nav-item">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </button>
        <button className="nav-item">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="12" y1="3" x2="12" y2="21" />
            <line x1="3" y1="12" x2="21" y2="12" />
          </svg>
        </button>
        <button className="nav-item">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87" />
            <path d="M16 3.13a4 4 0 010 7.75" />
          </svg>
        </button>
      </nav>
    </div>
  );
}; 