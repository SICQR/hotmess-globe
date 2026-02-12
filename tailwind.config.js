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
  			// HOTMESS brand colors
  			hot: '#FF1493',
  			pink: {
  				50: '#FFF0F7',
  				100: '#FFE0EF',
  				200: '#FFC2DF',
  				300: '#FF94C8',
  				400: '#FF57A8',
  				500: '#FF1493', // Foundation pink
  				600: '#E6007F',
  				700: '#BF006A',
  				800: '#990055',
  				900: '#730040',
  				950: '#4D002B',
  			},
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
			},
			// Brand colors - HOTMESS design system
			hot: {
				DEFAULT: '#FF1493',
				light: '#FF69B4',
				dark: '#C71585',
				glow: 'rgba(255, 20, 147, 0.55)'
			},
			cyan: {
				DEFAULT: '#00D9FF',
				light: '#67E8F9',
				dark: '#0891B2',
				glow: 'rgba(0, 217, 255, 0.55)'
			},
			neon: {
				green: '#39FF14',
				purple: '#B026FF',
				gold: '#FFD700',
				orange: '#FFB800',
				yellow: '#FFEB3B'
			},
			glass: {
				DEFAULT: 'rgba(255, 255, 255, 0.05)',
				border: 'rgba(255, 255, 255, 0.1)',
				hover: 'rgba(255, 255, 255, 0.1)'
			}
  		},
		boxShadow: {
			'glow-hot': '0 0 20px rgba(255, 20, 147, 0.5), 0 0 40px rgba(255, 20, 147, 0.3)',
			'glow-hot-lg': '0 0 30px rgba(255, 20, 147, 0.6), 0 0 60px rgba(255, 20, 147, 0.4)',
			'glow-cyan': '0 0 20px rgba(0, 217, 255, 0.5), 0 0 40px rgba(0, 217, 255, 0.3)',
			'glow-cyan-lg': '0 0 30px rgba(0, 217, 255, 0.6), 0 0 60px rgba(0, 217, 255, 0.4)',
			'glow-purple': '0 0 20px rgba(176, 38, 255, 0.5), 0 0 40px rgba(176, 38, 255, 0.3)',
			'glow-purple-lg': '0 0 30px rgba(176, 38, 255, 0.6), 0 0 60px rgba(176, 38, 255, 0.4)',
			'glow-gold': '0 0 20px rgba(255, 215, 0, 0.5), 0 0 40px rgba(255, 215, 0, 0.3)',
			'glow-green': '0 0 20px rgba(57, 255, 20, 0.5), 0 0 40px rgba(57, 255, 20, 0.3)',
			'glow-white': '0 0 20px rgba(255, 255, 255, 0.3), 0 0 40px rgba(255, 255, 255, 0.1)',
			'inner-glow': 'inset 0 0 20px rgba(255, 255, 255, 0.1)',
			'premium': '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
		},
		backgroundImage: {
			'gradient-hot': 'linear-gradient(135deg, #FF1493 0%, #B026FF 100%)',
			'gradient-cyan': 'linear-gradient(135deg, #00D9FF 0%, #0891B2 100%)',
			'gradient-purple': 'linear-gradient(135deg, #B026FF 0%, #FF1493 100%)',
			'gradient-gold': 'linear-gradient(135deg, #FFD700 0%, #FF6B35 100%)',
			'gradient-fire': 'linear-gradient(135deg, #FF1493 0%, #FF6B35 50%, #FFD700 100%)',
			'gradient-night': 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
			'gradient-mesh': 'radial-gradient(at 40% 20%, rgba(255, 20, 147, 0.3) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(176, 38, 255, 0.2) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(0, 217, 255, 0.2) 0px, transparent 50%)',
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
				'0%, 100%': { opacity: '1', boxShadow: '0 0 20px rgba(255, 20, 147, 0.5)' },
				'50%': { opacity: '0.7', boxShadow: '0 0 40px rgba(255, 20, 147, 0.8)' }
			},
			'float': {
				'0%, 100%': { transform: 'translateY(0)' },
				'50%': { transform: 'translateY(-10px)' }
			},
			'shimmer': {
				'0%': { backgroundPosition: '-200% 0' },
				'100%': { backgroundPosition: '200% 0' }
			},
			'pulse-ring': {
				'0%': { transform: 'scale(1)', opacity: '0.5' },
				'100%': { transform: 'scale(1.5)', opacity: '0' }
			},
			'gradient-shift': {
				'0%': { backgroundPosition: '0% 50%' },
				'50%': { backgroundPosition: '100% 50%' },
				'100%': { backgroundPosition: '0% 50%' }
			},
			'slide-up': {
				'0%': { transform: 'translateY(20px)', opacity: '0' },
				'100%': { transform: 'translateY(0)', opacity: '1' }
			},
			'scale-in': {
				'0%': { transform: 'scale(0.9)', opacity: '0' },
				'100%': { transform: 'scale(1)', opacity: '1' }
			},
			'spin-slow': {
				'0%': { transform: 'rotate(0deg)' },
				'100%': { transform: 'rotate(360deg)' }
			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
			'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
			'float': 'float 3s ease-in-out infinite',
			'shimmer': 'shimmer 2s linear infinite',
			'pulse-ring': 'pulse-ring 2s ease-out infinite',
			'gradient-shift': 'gradient-shift 5s ease infinite',
			'slide-up': 'slide-up 0.5s ease-out',
			'scale-in': 'scale-in 0.3s ease-out',
			'spin-slow': 'spin-slow 8s linear infinite'
  		},
		// Safe area insets for notched devices (iPhone)
		padding: {
			'safe': 'env(safe-area-inset-bottom, 16px)',
			'safe-top': 'env(safe-area-inset-top, 0px)',
		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}