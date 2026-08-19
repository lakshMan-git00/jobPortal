import type { ComponentProps } from 'react';

type IconName =
  | 'search'
  | 'pin'
  | 'briefcase'
  | 'bookmark'
  | 'arrow'
  | 'menu'
  | 'bell'
  | 'users'
  | 'chart'
  | 'plus'
  | 'file'
  | 'settings'
  | 'home'
  | 'check'
  | 'clock'
  | 'close';
const paths: Record<IconName, string> = {
  search: 'm21 21-4.35-4.35m2.35-5.15a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z',
  pin: 'M20 10.5c0 5.25-8 10.5-8 10.5S4 15.75 4 10.5a8 8 0 1 1 16 0ZM12 10.5h.01',
  briefcase:
    'M8 7V5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5V7m4.5 0h-17A1.5 1.5 0 0 0 2 8.5v10A1.5 1.5 0 0 0 3.5 20h17a1.5 1.5 0 0 0 1.5-1.5v-10A1.5 1.5 0 0 0 20.5 7ZM2 12h20',
  bookmark: 'M7 3.5h10a1.5 1.5 0 0 1 1.5 1.5v16l-6.5-3.75L5.5 21V5A1.5 1.5 0 0 1 7 3.5Z',
  arrow: 'M7 17 17 7m-7 0h7v7',
  menu: 'M4 7h16M4 12h16M4 17h16',
  bell: 'M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m16-10a4 4 0 0 0 0-8m-2.2 12a4 4 0 0 1 0 7.75',
  chart: 'M4 19V5m0 14h16M8 16v-4m4 4V8m4 8v-7',
  plus: 'M12 5v14m-7-7h14',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm0 0v6h6M8 13h8m-8 4h6',
  settings:
    'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0-12v2m0 13v2m8.5-8.5h-2m-13 0h-2m14.5-6-1.4 1.4m-9.2 9.2L6 19m0-14 1.4 1.4m9.2 9.2L18 19',
  home: 'm3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10Z',
  check: 'm5 12 4.25 4.25L19 6.75',
  clock: 'M12 6v6l4 2.25M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  close: 'm6 6 12 12M18 6 6 18',
};
export function Icon({
  name,
  size = 20,
  ...props
}: { name: IconName; size?: number } & ComponentProps<'svg'>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
