import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && (
                <ToastTitle className="flex items-center gap-2">
                  {props.variant === "success" && <i className="fas fa-check-circle text-green-400" />}
                  {props.variant === "warning" && <i className="fas fa-exclamation-triangle text-yellow-400" />}
                  {props.variant === "destructive" && <i className="fas fa-times-circle text-red-400" />}
                  {props.variant === "info" && <i className="fas fa-info-circle text-blue-400" />}
                  {title}
                </ToastTitle>
              )}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport className="max-w-md" />
    </ToastProvider>
  )
}
