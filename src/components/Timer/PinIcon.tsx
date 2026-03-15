import React from 'react';

interface PinIconProps {
  filled?: boolean;
  size?: number;
}

const PinIcon = ({ filled = false, size = 11 }: PinIconProps) => (
  <svg
    width={size}
    height={Math.round(size * 14 / 11)}
    viewBox="0 0 11 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M5.5 1.5 L9.5 5.5 L7.5 5.5 L7.5 9.5 L8.8 11 L2.2 11 L3.5 9.5 L3.5 5.5 L1.5 5.5 Z"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <line
      x1="5.5" y1="11"
      x2="5.5" y2="13"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

export default PinIcon;
