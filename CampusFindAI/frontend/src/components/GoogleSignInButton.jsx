import { useEffect, useRef, useState } from 'react';
import { ButtonSpinner } from './Ui';
import { runtimeConfig } from '../config/runtimeConfig';

const GOOGLE_CLIENT_ID = runtimeConfig.googleClientId;

/**
 * Google Sign-In button integrating Google Identity Services (GIS).
 * Securely captures Google ID token (credential) and passes it to onCredentialReceived.
 */
export function GoogleSignInButton({
  onCredentialReceived,
  onError,
  disabled = false,
  text = 'Continue with Google',
}) {
  const buttonContainerRef = useRef(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If script already loaded
    if (window.google?.accounts?.id) {
      setScriptLoaded(true);
      return;
    }

    // Load Google Identity Services script dynamically
    const existingScript = document.getElementById('google-gsi-client');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'google-gsi-client';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => setScriptLoaded(true);
      script.onerror = () => {
        console.warn('Failed to load Google Identity Services SDK.');
      };
      document.head.appendChild(script);
    } else {
      existingScript.addEventListener('load', () => setScriptLoaded(true));
    }
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !window.google?.accounts?.id || !GOOGLE_CLIENT_ID) {
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          if (!response?.credential) {
            onError?.('Google did not return an authentication credential.');
            return;
          }
          setLoading(true);
          try {
            await onCredentialReceived(response.credential);
          } catch (err) {
            onError?.(err.message || 'Google sign-in failed.');
          } finally {
            setLoading(false);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      if (buttonContainerRef.current) {
        buttonContainerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(buttonContainerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: buttonContainerRef.current.offsetWidth || 340,
        });
      }
    } catch (err) {
      console.warn('Google Identity button initialization warning:', err);
    }
  }, [scriptLoaded, onCredentialReceived, onError]);

  const handleCustomClick = () => {
    if (!GOOGLE_CLIENT_ID) {
      onError?.(
        'Google Client ID is not configured. Please set VITE_GOOGLE_CLIENT_ID in your frontend .env file.'
      );
      return;
    }

    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // If One-tap is suppressed, the standard rendered button handles clicks
        }
      });
    } else {
      onError?.('Google Identity Services SDK is not ready yet. Please refresh the page.');
    }
  };

  // If Client ID is present and GIS loaded the button into container, we display the container.
  // Otherwise, we display a beautifully styled Google button matching CampusFind AI theme.
  return (
    <div style={{ width: '100%' }}>
      {/* Container for Google's official rendered button */}
      <div
        ref={buttonContainerRef}
        style={{
          display: GOOGLE_CLIENT_ID ? 'flex' : 'none',
          justifyContent: 'center',
          width: '100%',
        }}
      />

      {/* Fallback & Custom Styled Button */}
      {(!GOOGLE_CLIENT_ID || !scriptLoaded) && (
        <button
          type="button"
          onClick={handleCustomClick}
          disabled={disabled || loading}
          className="btn btn-secondary btn-block btn-lg"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            background: 'var(--card-bg, #ffffff)',
            border: '1px solid var(--border, #d1d5db)',
            color: 'var(--text-primary, #1f2937)',
            fontWeight: 600,
            fontSize: '0.95rem',
            padding: '10px 16px',
            borderRadius: 'var(--radius-md, 8px)',
            boxShadow: 'var(--shadow-xs, 0 1px 2px rgba(0,0,0,0.05))',
            cursor: disabled || loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? (
            <ButtonSpinner />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>{text}</span>
        </button>
      )}
    </div>
  );
}

