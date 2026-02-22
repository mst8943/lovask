import { clsx } from 'clsx'

type SpinnerProps = {
    className?: string
    label?: string
}

export default function Spinner({ className, label = 'Yukleniyor' }: SpinnerProps) {
    return (
        <span className={clsx('app-spinner', className)} role="status" aria-label={label} />
    )
}
