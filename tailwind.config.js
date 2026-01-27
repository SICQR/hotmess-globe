/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
  		// LED BRUTALIST: No border radius by default
  		borderRadius: {
  			lg: '0px',
  			md: '0px',
  			sm: '0px',
  			DEFAULT: '0px',
  			none: '0px',
  			// Keep these for legacy compatibility, can be removed later
  			'legacy-lg': 'var(--radius)',
  			'legacy-md': 'calc(var(--radius) - 2px)',
  			'legacy-sm': 'calc(var(--radius) - 4px)'
  		},
  		// LED BRUTALIST: Typography
  		fontFamily: {
  			display: ['Monument Extended', 'Impact', 'Arial Black', 'sans-serif'],
  			mono: ['Space Mono', 'SF Mono', 'Monaco', 'Consolas', 'monospace'],
  			brutal: ['Monument Extended', 'Impact', 'Arial Black', 'sans-serif'],
  		},
  		// LED BRUTALIST: Letter spacing for brutalist typography
  		letterSpacing: {
  			brutal: '-0.03em',
  			'brutal-wide': '0.1em',
  			'brutal-data': '0.05em',
  		},
  		colors: {
  			// LUX BRUTALIST Chrome Luxury Palette
  			'lux-ink': '#0D0D0D',
  			'lux-paper': '#FAFAFA',
  			'lux-accent': '#E62020',
  			'lux-gold': '#E5A820',
  			// Legacy LED names (for backwards compatibility)
  			'led-black': '#000000',
  			'led-white': '#FFFFFF',
  			'led-hot': '#E62020',
  			'led-live': '#39FF14',
  			// Semantic colors
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
  			// HOTMESS Brand Colors (legacy, prefer led-* for new code)
  			hot: {
  				DEFAULT: '#FF1493',
  				50: '#FFF0F7',
  				100: '#FFE0EF',
  				200: '#FFB8D9',
  				300: '#FF8FC3',
  				400: '#FF52A8',
  				500: '#FF1493',
  				600: '#D10076',
  				700: '#A3005C',
  				800: '#750042',
  				900: '#470028'
  			},
  			cyan: {
  				DEFAULT: '#00D9FF',
  				50: '#E6FCFF',
  				100: '#B3F6FF',
  				200: '#80F0FF',
  				300: '#4DE9FF',
  				400: '#1AE3FF',
  				500: '#00D9FF',
  				600: '#00ADD1',
  				700: '#0082A3',
  				800: '#005775',
  				900: '#002B47'
  			},
  			gold: {
  				DEFAULT: '#FFD700',
  				500: '#FFD700'
  			},
  			lime: {
  				DEFAULT: '#39FF14',
  				500: '#39FF14'
  			},
  			purple: {
  				DEFAULT: '#B026FF',
  				500: '#B026FF'
  			},
  			orange: {
  				DEFAULT: '#FF6B35',
  				500: '#FF6B35'
  			}
  		},
  		boxShadow: {
  			// LUX BRUTALIST Chrome Luxury Glows
  			'lux-accent': '0 0 20px rgba(230, 32, 32, 0.6), 0 0 40px rgba(230, 32, 32, 0.3)',
  			'lux-accent-intense': '0 0 30px rgba(230, 32, 32, 0.8), 0 0 60px rgba(230, 32, 32, 0.4)',
  			'lux-gold': '0 0 20px rgba(229, 168, 32, 0.6), 0 0 40px rgba(229, 168, 32, 0.3)',
  			'lux-pulse': '0 0 40px rgba(230, 32, 32, 0.8)',
  			// Legacy LED names
  			'led-hot': '0 0 20px rgba(230, 32, 32, 0.8), 0 0 40px rgba(230, 32, 32, 0.4)',
  			'led-hot-intense': '0 0 30px rgba(230, 32, 32, 1), 0 0 60px rgba(230, 32, 32, 0.6)',
  			'led-live': '0 0 20px rgba(57, 255, 20, 0.8), 0 0 40px rgba(57, 255, 20, 0.4)',
  			'led-live-intense': '0 0 30px rgba(57, 255, 20, 1), 0 0 60px rgba(57, 255, 20, 0.6)',
  			// Legacy glows
  			'glow-hot': '0 0 20px rgba(255, 20, 147, 0.5)',
  			'glow-hot-lg': '0 0 40px rgba(255, 20, 147, 0.6)',
  			'glow-cyan': '0 0 20px rgba(0, 217, 255, 0.5)',
  			'glow-cyan-lg': '0 0 40px rgba(0, 217, 255, 0.6)',
  			'glow-gold': '0 0 20px rgba(255, 215, 0, 0.5)',
  			'glow-purple': '0 0 20px rgba(176, 38, 255, 0.5)',
  			'card-hover': '0 20px 40px -12px rgba(0, 0, 0, 0.4)',
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
  				'0%, 100%': { boxShadow: '0 0 20px var(--glow-color, rgba(255,20,147,0.5))' },
  				'50%': { boxShadow: '0 0 40px var(--glow-color, rgba(255,20,147,0.8)), 0 0 60px var(--glow-color, rgba(255,20,147,0.4))' }
  			},
  			'shimmer': {
  				'0%': { backgroundPosition: '-200% 0' },
  				'100%': { backgroundPosition: '200% 0' }
  			},
  			'float': {
  				'0%, 100%': { transform: 'translateY(0px)' },
  				'50%': { transform: 'translateY(-6px)' }
  			},
  			'scale-in': {
  				'0%': { transform: 'scale(0.95)', opacity: '0' },
  				'100%': { transform: 'scale(1)', opacity: '1' }
  			},
  			'slide-up': {
  				'0%': { transform: 'translateY(10px)', opacity: '0' },
  				'100%': { transform: 'translateY(0)', opacity: '1' }
  			},
  			'gradient-shift': {
  				'0%, 100%': { backgroundPosition: '0% 50%' },
  				'50%': { backgroundPosition: '100% 50%' }
  			},
  			'border-flow': {
  				'0%': { backgroundPosition: '0% 50%' },
  				'50%': { backgroundPosition: '100% 50%' },
  				'100%': { backgroundPosition: '0% 50%' }
  			},
  			'ping-slow': {
  				'0%': { transform: 'scale(1)', opacity: '1' },
  				'75%, 100%': { transform: 'scale(1.5)', opacity: '0' }
  			},
  			'ripple': {
  				'0%': { transform: 'scale(0.8)', opacity: '1' },
  				'100%': { transform: 'scale(2.4)', opacity: '0' }
  			},
  			'magnetic-pull': {
  				'0%': { transform: 'translate(0, 0)' },
  				'100%': { transform: 'translate(var(--magnetic-x, 0), var(--magnetic-y, 0))' }
  			},
  			// LED BRUTALIST Animations
  			'led-pulse': {
  				'0%, 100%': { opacity: '1' },
  				'50%': { opacity: '0.7' }
  			},
  			'led-dot-pulse': {
  				'0%, 100%': { transform: 'scale(1)', opacity: '1' },
  				'50%': { transform: 'scale(1.2)', opacity: '0.8' }
  			},
  			'led-glow-breathe': {
  				'0%, 100%': { boxShadow: '0 0 20px rgba(255, 20, 147, 0.8), 0 0 40px rgba(255, 20, 147, 0.4)' },
  				'50%': { boxShadow: '0 0 30px rgba(255, 20, 147, 1), 0 0 60px rgba(255, 20, 147, 0.6)' }
  			},
  			'wipe-in-right': {
  				'from': { transform: 'translateX(100%)' },
  				'to': { transform: 'translateX(0)' }
  			},
  			'wipe-out-left': {
  				'from': { transform: 'translateX(0)' },
  				'to': { transform: 'translateX(-100%)' }
  			},
  			'shutter-open': {
  				'0%': { clipPath: 'inset(50% 0 50% 0)' },
  				'100%': { clipPath: 'inset(0 0 0 0)' }
  			},
  			'tear-corner': {
  				'0%': { clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' },
  				'100%': { clipPath: 'polygon(0 0, 100% 0, 100% 80%, 80% 100%, 0 100%)' }
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
  			'shimmer': 'shimmer 2s linear infinite',
  			'float': 'float 3s ease-in-out infinite',
  			'scale-in': 'scale-in 0.3s ease-out forwards',
  			'slide-up': 'slide-up 0.4s ease-out forwards',
  			'gradient-shift': 'gradient-shift 3s ease infinite',
  			'border-flow': 'border-flow 4s ease infinite',
  			'ping-slow': 'ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite',
  			'ripple': 'ripple 1s linear infinite',
  			// LED BRUTALIST Animations
  			'led-pulse': 'led-pulse 2s ease-in-out infinite',
  			'led-dot-pulse': 'led-dot-pulse 1s ease-in-out infinite',
  			'led-breathe': 'led-glow-breathe 2s ease-in-out infinite',
  			'wipe-in': 'wipe-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
  			'wipe-out': 'wipe-out-left 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
  			'shutter': 'shutter-open 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}