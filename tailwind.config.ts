
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
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
				// Come Get It specific colors
				cgi: {
					primary: 'hsl(var(--cgi-primary))', // #1fb1b7
					'primary-foreground': 'hsl(var(--cgi-primary-foreground))',
					secondary: 'hsl(var(--cgi-secondary))', // #0a6e99
					'secondary-foreground': 'hsl(var(--cgi-secondary-foreground))',
					tertiary: 'hsl(var(--cgi-tertiary))', // #076894
					'tertiary-foreground': 'hsl(var(--cgi-tertiary-foreground))',
					surface: 'hsl(var(--cgi-surface))', // Pure black
					'surface-foreground': 'hsl(var(--cgi-surface-foreground))',
					muted: 'hsl(var(--cgi-muted))',
					'muted-foreground': 'hsl(var(--cgi-muted-foreground))',
					success: 'hsl(var(--cgi-success))',
					'success-foreground': 'hsl(var(--cgi-success-foreground))',
					error: 'hsl(var(--cgi-error))',
					'error-foreground': 'hsl(var(--cgi-error-foreground))',
					role: {
						staff: 'hsl(var(--cgi-role-staff))', // #1fb1b7
						'staff-foreground': 'hsl(var(--cgi-role-staff-foreground))',
						owner: 'hsl(var(--cgi-role-owner))', // #0a6e99
						'owner-foreground': 'hsl(var(--cgi-role-owner-foreground))',
						brand: 'hsl(var(--cgi-role-brand))', // #076894
						'brand-foreground': 'hsl(var(--cgi-role-brand-foreground))',
						admin: 'hsl(var(--cgi-role-admin))', // #1fb1b7
						'admin-foreground': 'hsl(var(--cgi-role-admin-foreground))'
					}
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'fade-in': {
					'0%': { opacity: '0', transform: 'translateY(10px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'slide-in': {
					'0%': { transform: 'translateX(-100%)' },
					'100%': { transform: 'translateX(0)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.3s ease-out',
				'slide-in': 'slide-in 0.3s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
