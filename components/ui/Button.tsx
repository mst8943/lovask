import * as React from "react"
import { cn } from "@/lib/utils"
import Spinner from '@/components/ui/Spinner'

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "primary" | "secondary" | "destructive" | "outline" | "ghost" | "link" | "premium" | "premium-glow"
    size?: "default" | "sm" | "md" | "lg" | "icon"
    isLoading?: boolean
    leftIcon?: React.ReactNode
    rightIcon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
        // Variant styles representing Aura v2 semantic design system
        const variants = {
            default: "bg-brand-primary text-text-primary shadow-md shadow-brand-primary/20 hover:shadow-brand-primary/40 border-none",
            primary: "bg-brand-primary text-text-primary shadow-md shadow-brand-primary/20 hover:shadow-brand-primary/40 border-none",
            secondary: "bg-surface-2 text-text-primary border border-surface-1 hover:bg-surface-1",
            outline: "border border-surface-2 bg-transparent hover:bg-surface-2 text-text-primary",
            ghost: "bg-transparent text-text-secondary hover:bg-surface-2 hover:text-text-primary",
            destructive: "bg-status-destructive text-white hover:opacity-90 shadow-sm",
            link: "text-brand-primary underline-offset-4 hover:underline",
            premium: "bg-gradient-to-r from-brand-accent to-fuchsia-500 text-white shadow-md shadow-brand-accent/20 border border-brand-accent/30",
            "premium-glow": "bg-gradient-to-r from-brand-accent to-fuchsia-500 text-white shadow-lg shadow-brand-accent/50 border border-brand-accent/50"
        }

        // Size styles matching the strict grid system
        const sizes = {
            default: "h-11 px-4 py-2", // 44px
            sm: "h-9 rounded-[var(--radius-sm)] px-3",
            md: "h-10 px-4", // 40px
            lg: "h-12 rounded-[var(--radius-xl)] px-8 text-base", // 48px
            icon: "h-11 w-11", // 44x44 hitbox
        }

        return (
            <button
                className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-[var(--radius-md)] text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2",
                    "disabled:pointer-events-none disabled:opacity-50 active:scale-95 duration-[var(--duration-fast)]",
                    variants[variant],
                    sizes[size],
                    className
                )}
                ref={ref}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading && <Spinner className="mr-2 h-4 w-4 animate-spin" />}
                {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
                {children}
                {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
            </button>
        )
    }
)
Button.displayName = "Button"

export { Button }
