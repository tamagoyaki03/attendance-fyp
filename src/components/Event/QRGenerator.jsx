import React from 'react';
import {QRCodeSVG} from "qrcode.react";

const QRGenerator = ({ courseId, isTutorial = false }) => {
  const type = isTutorial ? 'tutorial' : 'course';
  const password = 'default_password'; // Replace with dynamic source if needed
  const qrData = `${type}|${courseId}|${password}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrData);
      alert('QR Data copied to clipboard');
    } catch {
      alert('Failed to copy QR Data');
    }
  };

  return (
    <div>
      <QRCodeSVG
        value={qrData}
        size={200}
        includeMargin={true}
        imageSettings={{
          src: '/icon.png', // Make sure this icon exists in your public folder
          excavate: true,
        }}
      />
    </div>
  );
};

export default QRGenerator;
