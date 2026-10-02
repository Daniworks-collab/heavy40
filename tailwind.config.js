/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: v('bg'),
        surface: v('surface'),
        raised: v('raised'),
        line: v('line'),
        line2: v('line2'),
        muted: v('muted'),
        fg: v('fg'),
        ember: { DEFAULT: v('ember'), hot: v('ember-hot'), deep: v('ember-deep') },
        rust: v('rust'),
        ok: v('ok'),
        warn: v('warn'),
        onember: v('onember')
      },
      fontFamily: {
        display: ['"Big Shoulders Display"', 'Impact', 'sans-serif'],
        sans: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace']
      },
      letterSpacing: { forge: '0.08em' },
      // Geometría industrial: radios cortos y consistentes
      borderRadius: { sm: '3px', DEFAULT: '4px', md: '5px', lg: '7px', xl: '8px', '2xl': '10px', '3xl': '14px' },
      screens: { lg: '1024px' },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        wave: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        ember: { '0%,100%': { opacity: '0.55' }, '50%': { opacity: '1' } }
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        wave: 'wave 3.2s linear infinite',
        ember: 'ember 2.4s ease-in-out infinite'
      }
    }
  },
  plugins: []
};
