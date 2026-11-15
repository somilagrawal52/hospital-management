/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./views/**/*.{ejs,js,html}"],
  safelist: [
    'bg-indigo-100',
    'text-black',
    'bg-white',
    'text-gray-600',
    'bg-emerald-500',
    'bg-rose-500',
    'bg-amber-500',
    'bg-blue-500',
    'bg-emerald-100',
    'text-emerald-800',
    'bg-rose-100',
    'text-rose-800',
    'bg-amber-100',
    'text-amber-800',
    'bg-blue-100',
    'text-blue-800',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#4f46e5",
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        brand: {
          dark: "#0b0f19",
          navy: "#0f172a",
          slate: "#1e293b",
          teal: "#0d9488",
          cyan: "#06b6d4",
          surface: "#f8fafc",
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      boxShadow: {
        'glow-primary': '0 0 30px -5px rgba(79, 70, 229, 0.35)',
        'glow-teal': '0 0 30px -5px rgba(13, 148, 136, 0.35)',
        'glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.35)',
        'card-elevated': '0 20px 40px -15px rgba(15, 23, 42, 0.07)',
        'card-hover': '0 25px 50px -12px rgba(15, 23, 42, 0.12)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 5s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      },
      gridTemplateColumns: {
        auto: 'repeat(auto-fill, minmax(220px, 1fr))'
      }
    },
  },
  plugins: [],
}