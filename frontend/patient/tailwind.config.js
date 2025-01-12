/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./views/**/*.{ejs,js,html}"],
  safelist: [
    'bg-indigo-100',
    'text-black',
    'bg-white',
    'text-gray-600',
  ],
  theme: {
    extend: {
      colors:{
        primary:"#5f6fff"
      },
      gridTemplateColumns:{
        auto:'repeat(auto-fill,minmax(200px,1fr))'
      }
    },
  },
  plugins: [],
}