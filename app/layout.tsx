import './globals.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Campus Canteen | Smart Pre-Order & Pickup',
  description: 'Fast pre-ordering, live stock, batch assignment, and instant OTP pickup for college canteens.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
        <main className="flex-1 w-full max-w-md md:max-w-4xl lg:max-w-6xl mx-auto px-4 py-4 mb-20 md:mb-6">
          {children}
        </main>
      </body>
    </html>
  );
}
