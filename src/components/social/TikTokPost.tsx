import React from 'react';
import { MoreHorizontal, Heart, MessageCircle, Share2 } from 'lucide-react';
import { TikTokLogo } from '@/components/icons/TikTokLogo';
import '@/styles/tiktok.css';
import '@/styles/phone-frame.css';

interface TikTokPostProps {
  content: string;
  websiteName?: string;
}

export const TikTokPost: React.FC<TikTokPostProps> = ({ content, websiteName = 'hirely.dk' }) => {
  // Function to process hashtags and make them blue
  const processHashtags = (text: string) => {
    return text.split(/\s+/).map((word, i) => {
      if (word.startsWith('#')) {
        return `<span class="tiktok-hashtag">${word}</span>`;
      }
      return word;
    }).join(' ');
  };

  return (
    <div className="social-phone-frame tiktok">
      {/* TikTok Header */}
      <div className="social-header">
        <span className="tiktok-logo">TikTok</span>
        <button className="social-action-button">
          <MoreHorizontal className="w-6 h-6 text-[#161823]" />
        </button>
      </div>

      {/* Post Container */}
      <div className="social-post-container">
        <article className="tiktok-post">
          {/* Post Header */}
          <div className="tiktok-post-header">
            <div className="tiktok-profile-picture bg-white flex items-center justify-center">
              <TikTokLogo className="w-5 h-5" />
            </div>
            <div className="tiktok-profile-info">
              <div className="tiktok-profile-name">{websiteName}</div>
              <div className="tiktok-post-meta">
                <span>1h ago</span>
              </div>
            </div>
            <button className="social-action-button">
              <MoreHorizontal className="w-5 h-5 text-[#161823]" />
            </button>
          </div>

          {/* Post Content */}
          <div className="tiktok-post-content">
            <div dangerouslySetInnerHTML={{ __html: processHashtags(content) }} />
          </div>

          {/* Engagement Section */}
          <div className="tiktok-engagement">
            <div className="tiktok-reactions">
              <div className="tiktok-reaction-icon">
                <Heart className="w-3 h-3" />
              </div>
              <span>42</span>
            </div>
            <div className="flex items-center gap-4 text-[#161823] text-[13px]">
              <span>8 comments</span>
              <span>3 shares</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="tiktok-actions">
            <button className="tiktok-action-button">
              <Heart className="w-5 h-5" />
              <span>Like</span>
            </button>
            <button className="tiktok-action-button">
              <MessageCircle className="w-5 h-5" />
              <span>Comment</span>
            </button>
            <button className="tiktok-action-button">
              <Share2 className="w-5 h-5" />
              <span>Share</span>
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}; 