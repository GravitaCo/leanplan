import { createRoot } from 'react-dom/client'
import { useStore } from '@/store/store'
import '@/styles/theme.css'
import '@/styles/onboarding.css'
import '@/styles/mind.css'
import '@/styles/loop.css'
import { Gallery } from './Gallery'

// as App.tsx does on launch, so the header's pill reads the same state as the native render
useStore.getState().initAuth()
createRoot(document.getElementById('root')!).render(<Gallery />)
