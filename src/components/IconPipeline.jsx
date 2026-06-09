import React, { useEffect, useRef } from 'react';
import { Disc3, Play, AudioLines } from 'lucide-react';

export default function IconPipeline() {
  const pipelineRef = useRef(null);
  const nodeStackRef = useRef(null);
  const nodeXRef = useRef(null);
  const nodeShieldRef = useRef(null);
  const splashRef = useRef(null);
  
  const beam1Ref = useRef(null);
  const beam2Ref = useRef(null);
  const gradientRef = useRef(null);

  useEffect(() => {
    let animationFrameId;
    let state = 'p1';
    let lastStateChange = performance.now();

    const updatePath = () => {
      if (!pipelineRef.current || !nodeStackRef.current || !nodeXRef.current || !nodeShieldRef.current) return;
      
      const pRect = pipelineRef.current.getBoundingClientRect();
      const sRect = nodeStackRef.current.getBoundingClientRect();
      const xRect = nodeXRef.current.getBoundingClientRect();
      const shRect = nodeShieldRef.current.getBoundingClientRect();
      
      const startX = sRect.left + sRect.width / 2 - pRect.left;
      const startY = sRect.top + sRect.height / 2 - pRect.top;
      
      const midX = xRect.left + xRect.width / 2 - pRect.left;
      const midY = xRect.top + xRect.height / 2 - pRect.top;
      
      const endX = shRect.left + shRect.width / 2 - pRect.left;
      const endY = shRect.top + shRect.height / 2 - pRect.top;
      
      const d = `M ${startX},${startY} L ${midX},${midY} L ${endX},${endY}`;
      
      if (beam1Ref.current) beam1Ref.current.setAttribute('d', d);
      if (beam2Ref.current) beam2Ref.current.setAttribute('d', d);
    };

    const animate = (time) => {
      const elapsed = time - lastStateChange;
      
      // Update dimensions just in case of resize
      updatePath();
      
      if (state === 'p1') {
        const p = Math.min(elapsed / 800, 1);
        const percentage = p * 0.5; // 0 to 0.5
        
        if (gradientRef.current) {
          const center = percentage * 100;
          gradientRef.current.setAttribute('x1', `${center - 5}%`);
          gradientRef.current.setAttribute('x2', `${center + 5}%`);
        }
        
        if (nodeStackRef.current) {
          if (p < 0.4) nodeStackRef.current.classList.add('active');
          else nodeStackRef.current.classList.remove('active');
        }
        
        if (p >= 1) {
          state = 'splash';
          lastStateChange = time;
          
          if (beam1Ref.current) beam1Ref.current.style.opacity = '0';
          if (beam2Ref.current) beam2Ref.current.style.opacity = '0';
          if (splashRef.current) splashRef.current.classList.add('animate');
        }
      } else if (state === 'splash') {
        if (elapsed >= 800) {
          state = 'p2';
          lastStateChange = time;
          
          if (splashRef.current) splashRef.current.classList.remove('animate');
          if (beam1Ref.current) beam1Ref.current.style.opacity = '0.6';
          if (beam2Ref.current) beam2Ref.current.style.opacity = '1';
        }
      } else if (state === 'p2') {
        const p = Math.min(elapsed / 800, 1);
        const percentage = 0.5 + (p * 0.5); // 0.5 to 1.0
        
        if (gradientRef.current) {
          const center = percentage * 100;
          gradientRef.current.setAttribute('x1', `${center - 5}%`);
          gradientRef.current.setAttribute('x2', `${center + 5}%`);
        }
        
        if (nodeShieldRef.current) {
          if (p > 0.6) nodeShieldRef.current.classList.add('active');
          else nodeShieldRef.current.classList.remove('active');
        }
        
        if (p >= 1) {
          state = 'idle';
          lastStateChange = time;
          if (nodeShieldRef.current) nodeShieldRef.current.classList.remove('active');
        }
      } else if (state === 'idle') {
        if (elapsed >= 1000) {
          state = 'p1';
          lastStateChange = time;
        }
      }
      
      animationFrameId = requestAnimationFrame(animate);
    };

    // Initial setup
    updatePath();
    animationFrameId = requestAnimationFrame(animate);
    window.addEventListener('resize', updatePath);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', updatePath);
    };
  }, []);

  return (
    <div className="icon-pipeline" ref={pipelineRef}>
      <svg className="beam-svg">
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id="beam-gradient" gradientUnits="userSpaceOnUse" ref={gradientRef} x1="-5%" x2="5%" y1="0%" y2="0%">
            <stop offset="0%" stopColor="#b04090" stopOpacity="0" />
            <stop offset="20%" stopColor="#b04090" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#fff" stopOpacity="1" />
            <stop offset="80%" stopColor="#c8a0e0" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#c8a0e0" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path 
          ref={beam1Ref}
          fill="none"
          stroke="url(#beam-gradient)" 
          strokeWidth="2" 
          filter="url(#glow)" 
          style={{ opacity: 0.6, transition: 'opacity 0.2s' }} 
        />
        <path 
          ref={beam2Ref}
          fill="none"
          stroke="url(#beam-gradient)" 
          strokeWidth="0.8" 
          style={{ transition: 'opacity 0.2s' }}
        />
      </svg>

      <div className="icon-node node-light-right" ref={nodeStackRef}>
        <Disc3 />
      </div>

      <div className="pipeline-line"></div>

      <div className="center-wrapper">
        <div className="splash" ref={splashRef}></div>
        <div className="icon-node-center" ref={nodeXRef}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3" fill="currentColor"></polygon>
          </svg>
        </div>
      </div>

      <div className="pipeline-line right"></div>

      <div className="icon-node node-light-left" ref={nodeShieldRef}>
        <AudioLines />
      </div>
    </div>
  );
}
