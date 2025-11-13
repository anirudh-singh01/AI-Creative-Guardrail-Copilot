/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          purple: '#7F5DFF',
          cyan: '#1FD1F9',
          yellow: '#FFEE58',
        },
      },
      backgroundImage: {
        'gradient-neon': 'linear-gradient(135deg, #7F5DFF 0%, #1FD1F9 50%, #7F5DFF 100%)',
        'gradient-neon-hover': 'linear-gradient(135deg, #8F6DFF 0%, #2FE1F9 50%, #8F6DFF 100%)',
        'gradient-card': 'linear-gradient(135deg, rgba(127, 93, 255, 0.1) 0%, rgba(31, 209, 249, 0.1) 100%)',
      },
      boxShadow: {
        'neon': '0 0 20px rgba(127, 93, 255, 0.3), 0 0 40px rgba(31, 209, 249, 0.2)',
        'neon-sm': '0 0 10px rgba(127, 93, 255, 0.2), 0 0 20px rgba(31, 209, 249, 0.1)',
        'neon-lg': '0 0 30px rgba(127, 93, 255, 0.4), 0 0 60px rgba(31, 209, 249, 0.3)',
        'card': '0 4px 6px -1px rgba(127, 93, 255, 0.1), 0 2px 4px -1px rgba(31, 209, 249, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(127, 93, 255, 0.2), 0 4px 6px -2px rgba(31, 209, 249, 0.1)',
      },
      animation: {
        'gradient': 'gradient 8s ease infinite',
        'pulse-neon': 'pulse-neon 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-in': 'slide-in 0.3s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
      },
      keyframes: {
        gradient: {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          },
        },
        'pulse-neon': {
          '0%, 100%': {
            opacity: '1',
            boxShadow: '0 0 20px rgba(127, 93, 255, 0.3), 0 0 40px rgba(31, 209, 249, 0.2)',
          },
          '50%': {
            opacity: '0.8',
            boxShadow: '0 0 30px rgba(127, 93, 255, 0.5), 0 0 60px rgba(31, 209, 249, 0.4)',
          },
        },
        glow: {
          '0%': {
            boxShadow: '0 0 5px rgba(127, 93, 255, 0.2), 0 0 10px rgba(31, 209, 249, 0.1)',
          },
          '100%': {
            boxShadow: '0 0 20px rgba(127, 93, 255, 0.4), 0 0 40px rgba(31, 209, 249, 0.3)',
          },
        },
        'slide-in': {
          '0%': {
            transform: 'translateX(-100%)',
            opacity: '0',
          },
          '100%': {
            transform: 'translateX(0)',
            opacity: '1',
          },
        },
        'fade-in': {
          '0%': {
            opacity: '0',
            transform: 'translateY(10px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
      },
    },
  },
  plugins: [],
}

