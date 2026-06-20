import React, { useState } from 'react';
import { redirectToDiscordAuth } from '../../services/auth';


const CohortParticipantLogin: React.FC = () => {
  const [isLoading] = useState(false);


  return (
    <>
      <link 
        href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800&display=swap" 
        rel="stylesheet" 
      />
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#18181b', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif', color: '#fff' }}>
        <div 
          className="rounded-2xl p-10 w-full max-w-sm text-center"
          style={{ backgroundColor: '#27272a' }}
        >
          <div className="flex items-center justify-center gap-4 mb-8">
            <img 
              src="./logo.png"
              alt="Logo"
              className="w-54 h-12"
            />
          </div>
          
          <h1 className="text-2xl font-semibold mb-8" style={{ color: '#f1f5f9' }}>
            Cohort Participant Login
          </h1>
          
          <button
            onClick={() => redirectToDiscordAuth('participant')}
            disabled={isLoading}
            className="text-white b-0 w-full p-4 rounded-lg text-base font-medium cursor-pointer transition-all duration-200 flex items-center justify-center gap-2 mb-8 hover:opacity-90 bg-[#4752C4]"
          >
            {isLoading ? (
              <>
                <div 
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
                />
                Connecting...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Continue with Discord
              </>
            )}
          </button>
          
          <div 
            className="p-4 rounded-md italic text-sm text-left"
            style={{ 
              backgroundColor: 'rgba(248, 149, 39, 0.1)', 
              color: '#cbd5e1' 
            }}
          >
            "The root problem with conventional currency is all the trust that's required to make it work." - Satoshi Nakamoto
          </div>
        </div>
      </div>
    </>
  );
};

export default CohortParticipantLogin;