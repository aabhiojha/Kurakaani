import { StrictMode, Component, type ErrorInfo, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

class GlobalErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null, info: ErrorInfo | null}> {
	constructor(props: {children: ReactNode}) {
		super(props)
		this.state = { hasError: false, error: null, info: null }
	}

	static getDerivedStateFromError(error: Error) {
		return { hasError: true, error }
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error('Global Crash:', error, info)
		this.setState({ info })
	}

	render() {
		if (this.state.hasError) {
			return (
				<div style={{ backgroundColor: 'black', color: 'white', padding: '20px', height: '100vh', width: '100vw', boxSizing: 'border-box', overflow: 'auto' }}>
					<h1 style={{ color: 'red' }}>App Crashed!</h1>
					<pre style={{ color: 'lightgray', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
						{this.state.error?.toString()}
					</pre>
					<hr style={{ borderColor: '#333', margin: '20px 0' }} />
					<pre style={{ color: 'gray', fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
						{this.state.info?.componentStack}
					</pre>
				</div>
			)
		}
		return this.props.children
	}
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
	<GlobalErrorBoundary>
    	<App />
	</GlobalErrorBoundary>
  </StrictMode>,
)
