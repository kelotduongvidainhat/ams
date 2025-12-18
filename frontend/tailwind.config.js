/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#f0f9ff',
                    100: '#e0f2fe',
                    500: '#0ea5e9', // Sky blue
                    600: '#0284c7',
                    700: '#0369a1',
                },
                dark: {
                    bg: '#0f172a',    // Slate 900
                    surface: '#1e293b', // Slate 800
                    text: '#f8fafc',  // Slate 50
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
