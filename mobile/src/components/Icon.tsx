// Line icons from the PQMP redesign (24×24 grid, 1.8 stroke, round caps). Add new glyphs here.
import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

const glyphs = {
  user: (
    <>
      <Circle cx="12" cy="8" r="4" />
      <Path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  lock: (
    <>
      <Rect x="4" y="10" width="16" height="11" rx="2" />
      <Path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  eye: (
    <>
      <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12" />
      <Circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <Path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-2.6 3.6M6.6 6.6C3.6 8.5 2 12 2 12s3.5 7 10 7a10 10 0 0 0 5.4-1.6" />
      <Path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
    </>
  ),
  arrowRight: <Path d="M5 12h14M13 6l6 6-6 6" />,
  file: (
    <>
      <Path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" />
      <Path d="M14 3v5h5" />
    </>
  ),
  truck: (
    <>
      <Path d="M3 6h11v10H3zM14 9h4l3 3v4h-7" />
      <Circle cx="7" cy="17.5" r="1.8" />
      <Circle cx="17" cy="17.5" r="1.8" />
    </>
  ),
  check: <Path d="m5 12 5 5 9-10" />,
  home: <Path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  cases: (
    <>
      <Rect x="3" y="7" width="18" height="13" rx="2" />
      <Path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </>
  ),
  plus: <Path d="M12 5v14M5 12h14" />,
  bell: (
    <>
      <Path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <Path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </>
  ),
  back: <Path d="m15 6-6 6 6 6" />,
  chevronRight: <Path d="m9 6 6 6-6 6" />,
  close: <Path d="M6 6l12 12M18 6 6 18" />,
  search: (
    <>
      <Circle cx="11" cy="11" r="7" />
      <Path d="m20 20-3.5-3.5" />
    </>
  ),
  filter: <Path d="M4 6h16M7 12h10M10 18h4" />,
  refresh: <Path d="M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4" />,
  chat: <Path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12" />,
  star: <Path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" />,
  clip: <Path d="m21 12-8.5 8.5a5 5 0 0 1-7-7L14 5a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 8" />,
  send: <Path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />,
  download: <Path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
  clock: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 7v5l3 2" />
    </>
  ),
  alert: <Path d="M12 3 2 20h20zM12 10v4M12 17v.01" />,
  info: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 8v5M12 16.5v.01" />
    </>
  ),
  scan: <Path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10" />,
  headset: (
    <>
      <Path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <Rect x="3" y="14" width="4" height="6" rx="1.5" />
      <Rect x="17" y="14" width="4" height="6" rx="1.5" />
    </>
  ),
  logout: <Path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3" />,
  chart: <Path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  swap: <Path d="M17 3l4 4-4 4M21 7H9M7 21l-4-4 4-4M3 17h12" />,
};

export type IconName = keyof typeof glyphs;

type Props = { name: IconName; color: string; size?: number; filled?: boolean };

export function Icon({ name, color, size = 22, filled = false }: Props) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color : 'none'}
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {glyphs[name]}
    </Svg>
  );
}
