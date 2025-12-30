import React from 'react';
import {
  FacebookShareButton,
  TwitterShareButton,
  LinkedinShareButton,
  WhatsappShareButton,
  TelegramShareButton,
  EmailShareButton,
  FacebookIcon,
  TwitterIcon,
  LinkedinIcon,
  WhatsappIcon,
  TelegramIcon,
  EmailIcon,
} from 'react-share';
import { trackEvent } from '@/components/lib/analytics';

/**
 * Social Share Component
 * 
 * @param {string} url - URL to share
 * @param {string} title - Title for the share
 * @param {string} description - Description/summary
 * @param {number} iconSize - Size of share icons (default: 32)
 * @param {string} className - Additional CSS classes
 */
export function SocialShare({ 
  url = window.location.href, 
  title = "Check this out!", 
  description = "",
  iconSize = 32,
  className = "" 
}) {
  const handleShare = (platform) => {
    trackEvent('social_share', {
      platform,
      url,
      title,
    });
  };

  return (
    <div className={`flex gap-2 items-center ${className}`}>
      <FacebookShareButton
        url={url}
        quote={title}
        onClick={() => handleShare('facebook')}
      >
        <FacebookIcon size={iconSize} round />
      </FacebookShareButton>

      <TwitterShareButton
        url={url}
        title={title}
        onClick={() => handleShare('twitter')}
      >
        <TwitterIcon size={iconSize} round />
      </TwitterShareButton>

      <LinkedinShareButton
        url={url}
        title={title}
        summary={description}
        onClick={() => handleShare('linkedin')}
      >
        <LinkedinIcon size={iconSize} round />
      </LinkedinShareButton>

      <WhatsappShareButton
        url={url}
        title={title}
        separator=" - "
        onClick={() => handleShare('whatsapp')}
      >
        <WhatsappIcon size={iconSize} round />
      </WhatsappShareButton>

      <TelegramShareButton
        url={url}
        title={title}
        onClick={() => handleShare('telegram')}
      >
        <TelegramIcon size={iconSize} round />
      </TelegramShareButton>

      <EmailShareButton
        url={url}
        subject={title}
        body={description}
        onClick={() => handleShare('email')}
      >
        <EmailIcon size={iconSize} round />
      </EmailShareButton>
    </div>
  );
}