import React from 'react';
import IconPipeline from './IconPipeline';

export default function HeroCard() {
  return (
    <section className="hero-card">
      <div className="hero-grid"></div>
      
      <IconPipeline />
      
      <div className="hero-content">
        <h1 className="hero-heading">
          The simple way to
          <strong>stream your music</strong>
        </h1>
        <p className="hero-sub">
          Unlimited music streaming platform built for real-time <br />
          fetching and flawless audio playback.
        </p>
        <a href="#" className="btn-cta">Start Listening</a>
      </div>
    </section>
  );
}
