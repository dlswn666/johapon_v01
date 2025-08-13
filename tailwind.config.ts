import type { Config } from 'tailwindcss';

const config: Config = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
        './src/shared/**/*.{js,ts,jsx,tsx,mdx}',
        './src/entities/**/*.{js,ts,jsx,tsx,mdx}',
        './src/features/**/*.{js,ts,jsx,tsx,mdx}',
        './src/widgets/**/*.{js,ts,jsx,tsx,mdx}',
        './src/processes/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    safelist: [
        {
            pattern: /bg-(red|green|blue|yellow|purple)-(50|100|200)/,
        },
        {
            pattern: /text-(red|green|blue|yellow|purple)-(600|700|800)/,
        },
    ],
    theme: {
        extend: {
            colors: {
                basic: {
                    primary: '#41505D',
                },
            },
            fontFamily: {
                wanted: ['Wanted Sans', 'sans-serif'],
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
            },
        },
    },
    plugins: [],
};
export default config;
