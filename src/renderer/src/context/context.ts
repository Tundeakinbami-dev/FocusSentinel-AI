import { createContext } from 'react'
import { MonitoringContextType } from './types'

export const MonitoringContext = createContext<MonitoringContextType | null>(null)
