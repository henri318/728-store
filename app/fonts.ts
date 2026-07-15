import localFont from 'next/font/local';
import { Poppins } from 'next/font/google';

export const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal'],
  variable: '--font-poppins',
  display: 'swap',
});

export const fallingButton = localFont({
  src: '../fonts/Falling Button.ttf',
  variable: '--font-falling-button',
  display: 'swap',
  weight: '400',
  style: 'normal',
});
