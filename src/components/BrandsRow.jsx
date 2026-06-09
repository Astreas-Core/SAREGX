import React from 'react';

export default function BrandsRow() {
  return (
    <div className="brands">
      <div className="brand-item">
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="currentColor" />
          <path fill="var(--bg)" d="M8 9h8v2H8zm0 4h6v2H8z" />
        </svg>
        Spotify
      </div>
      <div className="brand-item">
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="7" r="4" fill="currentColor" />
          <circle cx="5" cy="16" r="3.5" fill="currentColor" />
          <circle cx="19" cy="16" r="3.5" fill="currentColor" />
        </svg>
        SoundCloud
      </div>
      <div className="brand-item">
        <svg viewBox="0 0 24 24">
          <polyline points="4 8 20 8" stroke="currentColor" strokeWidth="2" fill="none" />
          <polyline points="4 12 12 12" stroke="currentColor" strokeWidth="2" fill="none" />
          <polyline points="4 16 20 16" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
        Apple Music
      </div>
      <div className="brand-item">
        <svg viewBox="0 0 24 24">
          <circle cx="15.5" cy="8.5" r="2.5" fill="currentColor" />
          <circle cx="8.5" cy="8.5" r="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 8.5 L13 8.5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        Jamend<span className="hubspot-dot"></span>
      </div>
      <div className="brand-item">
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 3 L12 21 M3 12 L21 12 M6 6 L18 18 M6 18 L18 6" stroke="currentColor" strokeWidth="1" />
        </svg>
        Tidal
      </div>
    </div>
  );
}
