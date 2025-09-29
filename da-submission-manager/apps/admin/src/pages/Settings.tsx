import type { CSSProperties } from 'react';

const pageStyle: CSSProperties = {
  padding: '24px',
};

const titleStyle: CSSProperties = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#111827',
  marginBottom: '16px',
};

const infoBoxStyle: CSSProperties = {
  backgroundColor: '#eff6ff',
  border: '1px solid #bfdbfe',
  borderRadius: '6px',
  padding: '16px',
};

const infoTextStyle: CSSProperties = {
  fontSize: '14px',
  color: '#1e40af',
  margin: 0,
};

export default function Settings() {
  return (
    <div style={pageStyle}>
      <h1 style={titleStyle}>Settings</h1>
      <div style={infoBoxStyle}>
        <p style={infoTextStyle}>
          This page will manage system settings, API keys, and integration configurations.
        </p>
      </div>
    </div>
  );
}
