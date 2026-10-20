export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'], sans: ['"Instrument Sans"', 'system-ui', 'sans-serif'] },
      colors: { ink: '#0E1A17', paper: '#F3F5F1', night: '#0A110F', panel: '#111B18', signal: '#14B8A6', amber: '#F5A524' },
    },
  },
  plugins: [],
};
