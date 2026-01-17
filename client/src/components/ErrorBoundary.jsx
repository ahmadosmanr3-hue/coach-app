import { Component } from 'react'

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null, errorInfo: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo)
        this.setState({ errorInfo })
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#0f172a',
                    color: '#f1f5f9',
                    padding: '20px',
                    fontFamily: 'system-ui, sans-serif'
                }}>
                    <h1 style={{ color: '#ef4444', marginBottom: '16px' }}>Something went wrong</h1>
                    <p style={{ color: '#94a3b8', marginBottom: '24px' }}>
                        The page encountered an error. Please try refreshing.
                    </p>
                    <pre style={{
                        backgroundColor: '#1e293b',
                        padding: '16px',
                        borderRadius: '8px',
                        maxWidth: '600px',
                        overflow: 'auto',
                        fontSize: '12px',
                        color: '#fbbf24'
                    }}>
                        {this.state.error?.message || 'Unknown error'}
                    </pre>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: '24px',
                            padding: '10px 20px',
                            backgroundColor: '#6366f1',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        Refresh Page
                    </button>
                </div>
            )
        }
        return this.props.children
    }
}
