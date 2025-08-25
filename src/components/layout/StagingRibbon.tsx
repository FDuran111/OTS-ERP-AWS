'use client'

import React from 'react'

export default function StagingRibbon() {
  // Only show in staging environment
  if (process.env.NEXT_PUBLIC_ENV !== 'staging') {
    return null
  }

  return (
    <div className="staging-ribbon">
      <div className="staging-ribbon-content">
        <span className="staging-ribbon-icon">⚠️</span>
        <span className="staging-ribbon-text">STAGING – TEST DATA ONLY</span>
        <span className="staging-ribbon-icon">⚠️</span>
      </div>
      
      <style jsx>{`
        .staging-ribbon {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 9999;
          background: linear-gradient(
            135deg,
            #ff6b6b 0%,
            #feca57 25%,
            #ff6b6b 50%,
            #feca57 75%,
            #ff6b6b 100%
          );
          background-size: 200% 200%;
          animation: staging-gradient 3s ease infinite;
          padding: 4px 0;
          text-align: center;
          font-family: system-ui, -apple-system, sans-serif;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        @keyframes staging-gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .staging-ribbon-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-size: 13px;
          font-weight: 600;
          color: #000;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .staging-ribbon-icon {
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }

        /* Push down body content to avoid overlap */
        :global(body) {
          padding-top: 28px !important;
        }

        /* Ensure it works with both light and dark themes */
        @media (prefers-color-scheme: dark) {
          .staging-ribbon {
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
          }
          
          .staging-ribbon-content {
            color: #000;
            text-shadow: 0 0 2px rgba(255, 255, 255, 0.3);
          }
        }

        /* Mobile responsive */
        @media (max-width: 640px) {
          .staging-ribbon-content {
            font-size: 11px;
            gap: 8px;
          }
        }
      `}</style>
    </div>
  )
}