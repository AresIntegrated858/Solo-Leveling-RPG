/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,html}'],
  theme: {
    extend: {
      colors: {
        system: {
          bg: '#0a0a0f',
          panel: '#0f0f1a',
          border: '#1e1e2e',
          blue: '#4A90D9',
          'blue-dim': '#2a5a8a',
          red: '#C0392B',
          gold: '#C8A951',
          'gold-dim': '#7a6530',
          green: '#27ae60',
          text: '#c8c8d4',
          'text-dim': '#7a7a8a',
          muted: '#4a4a5a',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', '"Courier New"', 'monospace'],
        sans: ['"Rajdhani"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        display: ['"Orbitron"', '"Rajdhani"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flicker': 'flicker 3s linear infinite',
        'scanline': 'scanline 8s linear infinite',
      },
      keyframes: {
        flicker: {
          '0%, 19.999%, 22%, 62.999%, 64%, 64.999%, 70%, 100%': { opacity: '1' },
          '20%, 21.999%, 63%, 63.999%, 65%, 69.999%': { opacity: '0.4' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
    },
  },
  plugins: [],
};
