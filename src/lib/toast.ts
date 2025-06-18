import { toast } from 'react-hot-toast'

interface ToastOptions {
  duration?: number
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
}

export const toastService = {
  success: (message: string, options?: ToastOptions) => {
    toast.success(message, {
      duration: options?.duration || 4000,
      position: options?.position || 'top-right',
      style: {
        background: '#10B981',
        color: '#fff',
      },
      iconTheme: {
        primary: '#fff',
        secondary: '#10B981',
      },
    })
  },

  error: (message: string, options?: ToastOptions) => {
    toast.error(message, {
      duration: options?.duration || 6000,
      position: options?.position || 'top-right',
      style: {
        background: '#EF4444',
        color: '#fff',
      },
      iconTheme: {
        primary: '#fff',
        secondary: '#EF4444',
      },
    })
  },

  warning: (message: string, options?: ToastOptions) => {
    toast(message, {
      duration: options?.duration || 5000,
      position: options?.position || 'top-right',
      icon: '⚠️',
      style: {
        background: '#F59E0B',
        color: '#fff',
      },
    })
  },

  info: (message: string, options?: ToastOptions) => {
    toast(message, {
      duration: options?.duration || 4000,
      position: options?.position || 'top-right',
      icon: 'ℹ️',
      style: {
        background: '#3B82F6',
        color: '#fff',
      },
    })
  },

  loading: (message: string = 'Loading...') => {
    return toast.loading(message, {
      style: {
        background: '#6B7280',
        color: '#fff',
      },
    })
  },

  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: any) => string)
    }
  ) => {
    return toast.promise(promise, messages, {
      style: {
        minWidth: '250px',
      },
      success: {
        duration: 4000,
        style: {
          background: '#10B981',
          color: '#fff',
        },
      },
      error: {
        duration: 6000,
        style: {
          background: '#EF4444',
          color: '#fff',
        },
      },
      loading: {
        style: {
          background: '#6B7280',
          color: '#fff',
        },
      },
    })
  },

  dismiss: (toastId?: string) => {
    toast.dismiss(toastId)
  },

  dismissAll: () => {
    toast.dismiss()
  },
}

// Predefined toast messages for common operations
export const toastMessages = {
  // Success messages
  created: (entity: string) => `${entity} created successfully`,
  updated: (entity: string) => `${entity} updated successfully`,
  deleted: (entity: string) => `${entity} deleted successfully`,
  saved: (entity: string) => `${entity} saved successfully`,
  sent: (entity: string) => `${entity} sent successfully`,
  
  // Error messages
  createError: (entity: string) => `Failed to create ${entity}`,
  updateError: (entity: string) => `Failed to update ${entity}`,
  deleteError: (entity: string) => `Failed to delete ${entity}`,
  loadError: (entity: string) => `Failed to load ${entity}`,
  saveError: (entity: string) => `Failed to save ${entity}`,
  networkError: 'Network error. Please check your connection.',
  
  // Loading messages
  creating: (entity: string) => `Creating ${entity}...`,
  updating: (entity: string) => `Updating ${entity}...`,
  deleting: (entity: string) => `Deleting ${entity}...`,
  loading: (entity: string) => `Loading ${entity}...`,
  saving: (entity: string) => `Saving ${entity}...`,
  
  // Validation messages
  requiredField: (field: string) => `${field} is required`,
  invalidFormat: (field: string) => `Invalid ${field} format`,
  invalidEmail: 'Please enter a valid email address',
  invalidPhone: 'Please enter a valid phone number',
  
  // Business logic messages
  noPermission: 'You do not have permission to perform this action',
  sessionExpired: 'Your session has expired. Please log in again.',
  duplicateEntry: (entity: string) => `${entity} already exists`,
  cannotDelete: (entity: string, reason: string) => `Cannot delete ${entity}: ${reason}`,
}

// Utility function to handle API response toasts
export function handleApiResponse<T>(
  promise: Promise<Response>,
  entity: string,
  action: 'create' | 'update' | 'delete' | 'load' = 'load'
): Promise<T> {
  return toastService.promise(
    promise.then(async (response) => {
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(error.error || `HTTP ${response.status}`)
      }
      return response.json()
    }),
    {
      loading: toastMessages[action === 'create' ? 'creating' : 
                              action === 'update' ? 'updating' :
                              action === 'delete' ? 'deleting' : 'loading'](entity),
      success: toastMessages[action === 'create' ? 'created' :
                            action === 'update' ? 'updated' :
                            action === 'delete' ? 'deleted' : 'loaded'](entity),
      error: (error) => toastMessages[action === 'create' ? 'createError' :
                                    action === 'update' ? 'updateError' :
                                    action === 'delete' ? 'deleteError' : 'loadError'](entity)
    }
  )
}