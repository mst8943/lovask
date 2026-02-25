import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: boolean
    label?: string
    errorMsg?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, error, label, errorMsg, id, required, ...props }, ref) => {
        const inputId = id || React.useId()

        return (
            <div className="relative w-full">
                <input
                    id={inputId}
                    type={type}
                    placeholder=" "
                    className={cn(
                        "peer flex h-14 w-full rounded-[var(--radius-md)] border border-surface-1 bg-surface-2 px-4 pt-4 pb-1 text-sm text-text-primary transition-all duration-[var(--duration-fast)]",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50 focus-visible:border-brand-primary",
                        "hover:bg-surface-1",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
                        (error || errorMsg) && "border-status-destructive focus-visible:ring-status-destructive/50 focus-visible:border-status-destructive",
                        className
                    )}
                    ref={ref}
                    required={required}
                    {...props}
                />
                {label && (
                    <label
                        htmlFor={inputId}
                        className={cn(
                            "absolute left-4 top-4 z-10 origin-[0] -translate-y-2.5 scale-75 transform text-text-secondary duration-[var(--duration-fast)] peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:-translate-y-2.5 peer-focus:scale-75 cursor-text",
                            (error || errorMsg) ? "text-status-destructive" : "peer-focus:text-brand-primary"
                        )}
                    >
                        {label}
                        {required && <span className="ml-1 text-status-destructive">*</span>}
                    </label>
                )}
                {errorMsg && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-status-destructive">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                        {errorMsg}
                    </p>
                )}
            </div>
        )
    }
)
Input.displayName = "Input"

export { Input }
