import * as React from "react"
import { cn } from "@/lib/utils"
import Spinner from '@/components/ui/Spinner'
export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "premium"
    size?: "default" | "sm" | "lg" | "icon"
    isLoading?: boolean
}
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", isLoading, children, disabled, ...props }, ref) => {
        // Variant styles
        const variants = {
            default: "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 border border-transparent",
            destructive: "bg-red-500 text-white hover:bg-red-600 shadow-sm",
            outline: "border border-white/20 bg-transparent hover:bg-white/5 text-white",
            secondary: "bg-white/10 text-white hover:bg-white/20 border border-white/5",
            ghost: "hover:bg-white/5 text-gray-300 hover:text-white",
            link: "text-primary underline-offset-4 hover:underline",
            premium: "bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold shadow-lg shadow-amber-500/20 border border-amber-300/50"
        }
        // Size styles
        const sizes = {
            default: "h-11 px-4 py-2",
            sm: "h-9 rounded-md px-3",
            lg: "h-12 rounded-xl px-8 text-base",
            icon: "h-10 w-10",
        }
        return (
            <button
                className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "disabled:pointer-events-none disabled:opacity-50 active:scale-95",
                    variants[variant],
                    sizes[size],
                    className
                )}
                ref={ref}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading && <Spinner className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </button>
        )
    }
)
Button.displayName = "Button"
export { Button }
