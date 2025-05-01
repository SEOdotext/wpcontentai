import React from 'react';
import { Facebook, MoreHorizontal, ThumbsUp, MessageCircle, Share2 } from 'lucide-react';
import '@/styles/facebook.css';
import '@/styles/phone-frame.css';

interface FacebookPostProps {
  content: string;
  websiteName?: string;
}

export const FacebookPost: React.FC<FacebookPostProps> = ({ content, websiteName = 'hirely.dk' }) => {
  // Function to process hashtags and make them blue
  const processHashtags = (text: string) => {
    return text.split(/\s+/).map((word, i) => {
      if (word.startsWith('#')) {
        return `<span class="facebook-hashtag">${word}</span>`;
      }
      return word;
    }).join(' ');
  };

  return (
    <div className="social-phone-frame facebook">
      {/* Facebook Header */}
      <div className="social-header">
        <span className="facebook-logo">facebook</span>
        <button className="social-action-button">
          <MoreHorizontal className="w-6 h-6 text-[#65676b]" />
        </button>
      </div>

      {/* Post Container */}
      <div className="social-post-container">
        <article className="facebook-post">
          {/* Post Header */}
          <div className="facebook-post-header">
            <div className="facebook-profile-picture">
              <Facebook className="w-5 h-5 text-white" />
            </div>
            <div className="facebook-profile-info">
              <div className="facebook-profile-name">{websiteName}</div>
              <div className="facebook-post-meta">
                <span>1h</span>
                <span>•</span>
                <span>🌐</span>
              </div>
            </div>
            <button className="social-action-button">
              <MoreHorizontal className="w-5 h-5 text-[#65676b]" />
            </button>
          </div>

          {/* Post Content */}
          <div className="facebook-post-content">
            <div dangerouslySetInnerHTML={{ __html: processHashtags(content) }} />
          </div>

          {/* Engagement Section */}
          <div className="facebook-engagement">
            <div className="facebook-reactions">
              <div className="facebook-reaction-icon">
                <ThumbsUp className="w-3 h-3" />
              </div>
              <span>42</span>
            </div>
            <div className="flex items-center gap-4 text-[#65676b] text-[13px]">
              <span>8 comments</span>
              <span>3 shares</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="facebook-actions">
            <button className="facebook-action-button">
              <ThumbsUp className="w-5 h-5" />
              <span>Like</span>
            </button>
            <button className="facebook-action-button">
              <MessageCircle className="w-5 h-5" />
              <span>Comment</span>
            </button>
            <button className="facebook-action-button">
              <Share2 className="w-5 h-5" />
              <span>Share</span>
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}; 