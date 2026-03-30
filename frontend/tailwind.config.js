/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // [新增] 将系统中用到的动态颜色加入安全名单，防止 build 打包时被清除
  safelist: [
    {
      pattern: /(bg|text|border)-(purple|blue|green|yellow|gray|red)-(300|400|500)/,
    },
    {
      pattern: /bg-(purple|blue|green|yellow|gray|red)-500\/20/,
    }
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7c3aed',
          800: '#6b21a8',
          900: '#581c87',
          950: '#3b0764',
        }
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        fadeIn: 'fadeIn 0.5s ease-out forwards', // 建议补上绩效模块用到的渐显动画
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%': { opacity: '0.5', transform: 'scale(1)' },
          '100%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      },
    },
  },
  plugins: [],
}