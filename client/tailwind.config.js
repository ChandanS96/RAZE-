/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          darkest: '#020204',
          secondary: '#07060a',
          panel: 'rgba(12, 10, 18, 0.75)',
          card: 'rgba(16, 13, 24, 0.65)',
          hover: 'rgba(232, 121, 249, 0.08)'
        },
        raze: {
          bg: '#020204',
          surface: '#08070d',
          deepPurple: '#4A154B',
          neonViolet: '#9B5CFF',
          electricMagenta: '#FF2DF7',
          softWhite: '#FFFFFF',
          mutedText: '#A59BBF'
        },
        brand: {
          blue: '#9B5CFF', // Replaced blue with neon violet
          violet: '#6D28D9',
          cyan: '#FF2DF7',  // Replaced cyan with electric magenta
          magenta: '#FF2DF7',
          neon: '#A855F7',
          nebula: '#E879F9'
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#D4CEE5',
          muted: '#8A80A6'
        },
        border: {
          subtle: 'rgba(255, 255, 255, 0.08)',
          glow: 'rgba(255, 45, 247, 0.35)',
          purple: 'rgba(168, 85, 247, 0.25)',
          glass: 'rgba(255, 255, 255, 0.12)'
        },
        status: {
          blocked: '#FF3366',
          warning: '#FFAA33',
          pass: '#10B981',
          info: '#FF2DF7'
        }
      },
      boxShadow: {
        'nebula-sm': '0 0 15px rgba(255, 45, 247, 0.25)',
        'nebula-md': '0 0 30px rgba(168, 85, 247, 0.35), 0 0 60px rgba(255, 45, 247, 0.15)',
        'nebula-lg': '0 0 50px rgba(255, 45, 247, 0.4), 0 0 100px rgba(109, 40, 217, 0.25)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.7), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace']
      }
    },
  },
  plugins: [],
}
