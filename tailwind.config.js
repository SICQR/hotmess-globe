/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			// HOTMESS Brand Colors
  			hot: {
  				DEFAULT: '#FF1493',
  				50: '#FFE5F3',
  				100: '#FFCCE7',
  				200: '#FF99CF',
  				300: '#FF66B7',
  				400: '#FF339F',
  				500: '#FF1493',
  				600: '#CC1076',
  				700: '#990C59',
  				800: '#66083C',
  				900: '#33041E',
  			},
  			cyan: {
  				DEFAULT: '#00D9FF',
  				50: '#E5FBFF',
  				100: '#CCF7FF',
  				200: '#99EFFF',
  				300: '#66E7FF',
  				400: '#33DFFF',
  				500: '#00D9FF',
  				600: '#00ADCC',
  				700: '#008299',
  				800: '#005666',
  				900: '#002B33',
  			},
  			gold: {
  				DEFAULT: '#FFD700',
  				50: '#FFFBE5',
  				100: '#FFF7CC',
  				200: '#FFEF99',
  				300: '#FFE766',
  				400: '#FFDF33',
  				500: '#FFD700',
  				600: '#CCAC00',
  				700: '#998100',
  				800: '#665600',
  				900: '#332B00',
  			},
  			lime: {
  				DEFAULT: '#39FF14',
  				glow: 'rgba(57, 255, 20, 0.5)',
  			},
  			purple: {
  				DEFAULT: '#B026FF',
  				50: '#F5E5FF',
  				100: '#EBCCFF',
  				200: '#D799FF',
  				300: '#C366FF',
  				400: '#B026FF',
  				500: '#8C00CC',
  				600: '#690099',
  				700: '#460066',
  				800: '#230033',
  			},
  			orange: {
  				DEFAULT: '#FF6B35',
  			},
  			// Shadcn defaults
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		boxShadow: {
  			'glow-hot': '0 0 20px rgba(255, 20, 147, 0.5)',
  			'glow-hot-lg': '0 0 40px rgba(255, 20, 147, 0.6)',
  			'glow-cyan': '0 0 20px rgba(0, 217, 255, 0.5)',
  			'glow-cyan-lg': '0 0 40px rgba(0, 217, 255, 0.6)',
  			'glow-gold': '0 0 20px rgba(255, 215, 0, 0.5)',
  			'glow-gold-lg': '0 0 40px rgba(255, 215, 0, 0.6)',
  			'glow-purple': '0 0 20px rgba(176, 38, 255, 0.5)',
  			'glow-purple-lg': '0 0 40px rgba(176, 38, 255, 0.6)',
  			'glow-green': '0 0 20px rgba(57, 255, 20, 0.5)',
  			'glow-green-lg': '0 0 40px rgba(57, 255, 20, 0.6)',
  			'glass': '0 8px 32px rgba(0, 0, 0, 0.3)',
  			'card-hover': '0 20px 60px rgba(0, 0, 0, 0.4)',
  		},
  		keyframes: {
  			'accordion-down': {
  				from: { height: '0' },
  				to: { height: 'var(--radix-accordion-content-height)' }
  			},
  			'accordion-up': {
  				from: { height: 'var(--radix-accordion-content-height)' },
  				to: { height: '0' }
  			},
  			'glow-pulse': {
  				'0%, 100%': {
  					boxShadow: '0 0 15px rgba(255, 20, 147, 0.4)',
  					opacity: '1'
  				},
  				'50%': {
  					boxShadow: '0 0 30px rgba(255, 20, 147, 0.7)',
  					opacity: '0.9'
  				}
  			},
  			'float': {
  				'0%, 100%': { transform: 'translateY(0px)' },
  				'50%': { transform: 'translateY(-10px)' }
  			},
  			'shimmer': {
  				'0%': { backgroundPosition: '-200% 0' },
  				'100%': { backgroundPosition: '200% 0' }
  			},
  			'pulse-ring': {
  				'0%': { transform: 'scale(1)', opacity: '0.5' },
  				'50%': { transform: 'scale(1.2)', opacity: '0' },
  				'100%': { transform: 'scale(1)', opacity: '0.5' }
  			},
  			'gradient-shift': {
  				'0%': { backgroundPosition: '0% 50%' },
  				'50%': { backgroundPosition: '100% 50%' },
  				'100%': { backgroundPosition: '0% 50%' }
  			},
  			'scale-in': {
  				'0%': { transform: 'scale(0.95)', opacity: '0' },
  				'100%': { transform: 'scale(1)', opacity: '1' }
  			},
  			'slide-up': {
  				'0%': { transform: 'translateY(10px)', opacity: '0' },
  				'100%': { transform: 'translateY(0)', opacity: '1' }
  			},
  			'slide-down': {
  				'0%': { transform: 'translateY(-10px)', opacity: '0' },
  				'100%': { transform: 'translateY(0)', opacity: '1' }
  			},
  			'fade-in': {
  				'0%': { opacity: '0' },
  				'100%': { opacity: '1' }
  			},
  			'spin-slow': {
  				'0%': { transform: 'rotate(0deg)' },
  				'100%': { transform: 'rotate(360deg)' }
  			},
  			'bounce-subtle': {
  				'0%, 100%': { transform: 'translateY(0)' },
  				'50%': { transform: 'translateY(-5px)' }
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
  			'float': 'float 3s ease-in-out infinite',
  			'shimmer': 'shimmer 2s linear infinite',
  			'pulse-ring': 'pulse-ring 2s ease-in-out infinite',
  			'gradient-shift': 'gradient-shift 3s ease infinite',
  			'scale-in': 'scale-in 0.2s ease-out',
  			'slide-up': 'slide-up 0.3s ease-out',
  			'slide-down': 'slide-down 0.3s ease-out',
  			'fade-in': 'fade-in 0.3s ease-out',
  			'spin-slow': 'spin-slow 8s linear infinite',
  			'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite'
  		},
  		backgroundImage: {
  			'gradient-hot': 'linear-gradient(135deg, #FF1493, #B026FF)',
  			'gradient-cyan': 'linear-gradient(135deg, #00D9FF, #3B82F6)',
  			'gradient-gold': 'linear-gradient(135deg, #FFD700, #FF6B35)',
  			'gradient-purple': 'linear-gradient(135deg, #B026FF, #FF1493)',
  			'gradient-green': 'linear-gradient(135deg, #39FF14, #00D9FF)',
  			'gradient-rainbow': 'linear-gradient(-45deg, #FF1493, #B026FF, #00D9FF, #FFD700)',
  			'shimmer': 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}