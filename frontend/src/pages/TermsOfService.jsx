import React from 'react';

function TermsOfService() {
  return (
    <div className="legal-page">
      <div className="legal-card">
        <h1>Terms of Service</h1>
        <p>By using this platform, you agree to use the service in a safe, respectful, and lawful manner.</p>

        <h2>Account responsibilities</h2>
        <ul>
          <li>You are responsible for the security of your account and credentials.</li>
          <li>You must not impersonate others or abuse the social features.</li>
          <li>You may not upload illegal, abusive, or harmful content.</li>
        </ul>

        <h2>Gameplay and platform rules</h2>
        <ul>
          <li>All multiplayer game flows are subject to normal server-side validation.</li>
          <li>Users must respect fair play and avoid manipulating the game state or system.</li>
          <li>Misuse of the service may result in account restrictions.</li>
        </ul>

        <h2>Service availability</h2>
        <p>The platform is provided as-is and may be updated or unavailable during maintenance, testing, or deployment.</p>

        <h2>Changes</h2>
        <p>These terms may be updated as the project evolves. Continued use of the site after changes implies acceptance of those terms.</p>
      </div>
    </div>
  );
}

export default TermsOfService;
