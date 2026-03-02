/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './index.html',
        './src/**/*.{js,ts,jsx,tsx}', // путь к твоим компонентам
    ],
    theme: {
        extend: {},
    },
    plugins: [require('daisyui')],
}
