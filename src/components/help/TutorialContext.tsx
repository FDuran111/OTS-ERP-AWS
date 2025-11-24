'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

// Tutorial definitions with robust selectors
export const TUTORIALS = {
  createCustomer: {
    id: 'createCustomer',
    title: 'Create a Customer',
    steps: [
      {
        target: 'a[href="/customers"], nav a[href="/customers"], [href="/customers"]',
        title: 'Step 1: Go to Customers',
        content: 'Click "Customers" in the sidebar to view all customers.',
        position: 'right' as const,
      },
      {
        target: 'button:has-text("Add Customer"), button:has-text("New Customer"), button:has-text("Add"), .MuiButton-root:has-text("Add")',
        title: 'Step 2: Click Add Customer',
        content: 'Click the "Add Customer" button to open the form.',
        position: 'bottom' as const,
      },
      {
        target: '.MuiDialog-paper, [role="dialog"], form, .MuiModal-root .MuiPaper-root',
        title: 'Step 3: Fill the Form',
        content: 'Enter customer details: Name, Phone, Email, and Address.',
        position: 'right' as const,
      },
      {
        target: '.MuiDialog-paper button[type="submit"], .MuiDialog-paper button:has-text("Create"), .MuiDialog-paper button:has-text("Save"), button:has-text("Create Customer")',
        title: 'Step 4: Save Customer',
        content: 'Click "Create" or "Save" to add the customer. Tutorial complete!',
        position: 'top' as const,
      },
    ],
  },
  createJob: {
    id: 'createJob',
    title: 'Create a Job',
    steps: [
      {
        target: 'a[href="/jobs"], nav a[href="/jobs"], [href="/jobs"]',
        title: 'Step 1: Go to Jobs',
        content: 'Click "Jobs" in the sidebar to view all jobs.',
        position: 'right' as const,
      },
      {
        target: 'button:has-text("New Job"), button:has-text("Create Job"), button:has-text("Add Job"), .MuiButton-root:has-text("New")',
        title: 'Step 2: Click New Job',
        content: 'Click the "New Job" button to create a job.',
        position: 'bottom' as const,
      },
      {
        target: '.MuiDialog-paper, [role="dialog"], .MuiModal-root .MuiPaper-root',
        title: 'Step 3: Fill Job Details',
        content: 'Select a customer and enter the job description, type, and scheduled date.',
        position: 'right' as const,
      },
      {
        target: '.MuiDialog-paper button[type="submit"], .MuiDialog-paper button:has-text("Create"), button:has-text("Create Job")',
        title: 'Step 4: Create Job',
        content: 'Click "Create Job" to save. Tutorial complete!',
        position: 'top' as const,
      },
    ],
  },
  enterTime: {
    id: 'enterTime',
    title: 'Enter Time Card',
    steps: [
      {
        target: 'a[href="/time"], nav a[href="/time"], [href="/time"]',
        title: 'Step 1: Go to Time Card',
        content: 'Click "Time Card" in the sidebar.',
        position: 'right' as const,
      },
      {
        target: 'button:has-text("Add"), button:has-text("Manual Entry"), button:has-text("New Entry"), button:has-text("Clock In"), .MuiButton-root:has-text("Add")',
        title: 'Step 2: Add Time Entry',
        content: 'Click "Add" or "Manual Entry" to log your time.',
        position: 'bottom' as const,
      },
      {
        target: '.MuiDialog-paper, [role="dialog"], .MuiModal-root .MuiPaper-root, form',
        title: 'Step 3: Fill Time Details',
        content: 'Select the job you worked on and enter your hours.',
        position: 'right' as const,
      },
      {
        target: '.MuiDialog-paper button[type="submit"], button:has-text("Submit"), button:has-text("Save"), .MuiDialog-paper button:has-text("Add")',
        title: 'Step 4: Submit Entry',
        content: 'Click "Submit" to save your time entry. Tutorial complete!',
        position: 'top' as const,
      },
    ],
  },
  approveTime: {
    id: 'approveTime',
    title: 'Approve Time Entries',
    steps: [
      {
        target: 'a[href="/admin"], nav a[href="/admin"], [href="/admin"]',
        title: 'Step 1: Go to Approvals',
        content: 'Click "Approvals" in the sidebar.',
        position: 'right' as const,
      },
      {
        target: 'table tbody tr, .MuiTableRow-root, [data-testid="approval-row"], .approval-item',
        title: 'Step 2: Review Entries',
        content: 'Review pending time entries from employees. Check the hours and job details.',
        position: 'bottom' as const,
      },
      {
        target: 'button:has-text("Approve"), .MuiButton-root:has-text("Approve"), [data-testid="approve-btn"]',
        title: 'Step 3: Approve or Reject',
        content: 'Click "Approve" to approve the entry, or "Reject" if there are issues. Tutorial complete!',
        position: 'left' as const,
      },
    ],
  },
}

export type TutorialKey = keyof typeof TUTORIALS

interface TutorialState {
  activeTutorial: TutorialKey | null
  currentStep: number
}

interface TutorialContextType {
  activeTutorial: TutorialKey | null
  currentStep: number
  startTutorial: (key: TutorialKey) => void
  nextStep: () => void
  prevStep: () => void
  endTutorial: () => void
  getCurrentTutorial: () => typeof TUTORIALS[TutorialKey] | null
  getCurrentStep: () => typeof TUTORIALS[TutorialKey]['steps'][number] | null
}

const TutorialContext = createContext<TutorialContextType | null>(null)

const STORAGE_KEY = 'ots-erp-tutorial-state'

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TutorialState>({
    activeTutorial: null,
    currentStep: 0,
  })

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as TutorialState
        if (parsed.activeTutorial && TUTORIALS[parsed.activeTutorial]) {
          setState(parsed)
        }
      }
    } catch (e) {
      console.warn('Failed to load tutorial state:', e)
    }
  }, [])

  // Save to localStorage on change
  useEffect(() => {
    try {
      if (state.activeTutorial) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch (e) {
      console.warn('Failed to save tutorial state:', e)
    }
  }, [state])

  const startTutorial = useCallback((key: TutorialKey) => {
    setState({ activeTutorial: key, currentStep: 0 })
  }, [])

  const nextStep = useCallback(() => {
    setState(prev => {
      if (!prev.activeTutorial) return prev
      const tutorial = TUTORIALS[prev.activeTutorial]
      if (prev.currentStep >= tutorial.steps.length - 1) {
        // Tutorial complete
        return { activeTutorial: null, currentStep: 0 }
      }
      return { ...prev, currentStep: prev.currentStep + 1 }
    })
  }, [])

  const prevStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(0, prev.currentStep - 1),
    }))
  }, [])

  const endTutorial = useCallback(() => {
    setState({ activeTutorial: null, currentStep: 0 })
  }, [])

  const getCurrentTutorial = useCallback(() => {
    return state.activeTutorial ? TUTORIALS[state.activeTutorial] : null
  }, [state.activeTutorial])

  const getCurrentStep = useCallback(() => {
    if (!state.activeTutorial) return null
    return TUTORIALS[state.activeTutorial].steps[state.currentStep] || null
  }, [state.activeTutorial, state.currentStep])

  return (
    <TutorialContext.Provider
      value={{
        activeTutorial: state.activeTutorial,
        currentStep: state.currentStep,
        startTutorial,
        nextStep,
        prevStep,
        endTutorial,
        getCurrentTutorial,
        getCurrentStep,
      }}
    >
      {children}
    </TutorialContext.Provider>
  )
}

export function useTutorial() {
  const context = useContext(TutorialContext)
  if (!context) {
    throw new Error('useTutorial must be used within TutorialProvider')
  }
  return context
}
