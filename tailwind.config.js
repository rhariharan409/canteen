/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: '#F5F1E8',
        neoBlack: '#111111',
        neoPrimary: '#D9FF00',
        neoSecondary: '#FF5A36',
        neoSuccess: '#20C997',
        neoDanger: '#FF3B30',
      },
      fontFamily: {
        display: ['var(--font-archivo)', 'sans-serif'],
        body: ['var(--font-space-grotesk)', 'sans-serif'],
        mono: ['var(--font-space-mono)', 'monospace'],
      },
      boxShadow: {
        neo: '4px 4px 0px 0px #111111',
        'neo-sm': '2px 2px 0px 0px #111111',
        'neo-lg': '6px 6px 0px 0px #111111',
      },
      borderWidth: {
        3: '3px',
      },
    },
  },
  plugins: [],
};
