import { useContext } from 'react'
import { MonitoringContext } from './context'
import { MonitoringContextType } from './types'

export function useMonitoring(): MonitoringContextType {
  const context = useContext(MonitoringContext)
  if (!context) {
    throw new Error('useMonitoring must be used within a MonitoringProvider')
  }
  return context
}
