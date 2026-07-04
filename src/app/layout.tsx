import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import { AudioProvider } from '@/lib/audio/AudioProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata: Metadata = {
  title: 'Ular Tangga - Educational Board Game',
  description: 'Interactive educational board game with questions',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${inter.variable} ${outfit.variable}`}>
      <body className="font-sans antialiased overflow-x-hidden selection:bg-indigo-500/30">
        <AudioProvider>
          {children}
        </AudioProvider>
      </body>
    </html>
  );
}
