import React from 'react';

function PrivacyPolicy() {
  return (
    <div className="legal-page">
      <div className="legal-card">
        <h1>Privacy Policy</h1>
        <p>We collect the minimum information required to operate the platform safely and provide core social features.</p>

        <h2>Information we process</h2>
        <ul>
          <li>Account data such as username, email address, password hash, and avatar.</li>
          <li>Profile details such as biographies and match statistics.</li>
          <li>Friend relationships and chat messages necessary for social features.</li>
          <li>Technical metadata such as login timestamps and connection status.</li>
        </ul>

        <h2>How we use it</h2>
        <ul>
          <li>Authenticate users and maintain secure sessions.</li>
          <li>Provide multiplayer matchmaking, friend operations, and chat.</li>
          <li>Track match results and user statistics.</li>
          <li>Improve security, abuse prevention, and service reliability.</li>
        </ul>

        <h2>Data retention</h2>
        <p>Account data is retained as long as the service is in use. Users can request deletion or account cleanup as part of project administration if applicable.</p>

        <h2>Security</h2>
        <p>Passwords are stored using a secure password hashing algorithm. Access to the platform is protected by authentication and authorized session validation.</p>
      </div>
    </div>
  );
}

export default PrivacyPolicy;
