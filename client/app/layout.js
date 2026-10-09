import { Inter, Instrument_Serif } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const instrument = Instrument_Serif({ subsets: ['latin'], weight: '400', style: ['normal', 'italic'], variable: '--font-instrument' });

export const metadata = {
  title: 'IntervYou — AI Mock Interviews That Adapt To You',
  description: 'Practice real interviews out loud with an AI interviewer that adapts to your answers, then get a detailed feedback report.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${instrument.variable}`}>
      <body>{children}</body>
    </html>
  );
}
