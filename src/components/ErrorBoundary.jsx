import { Component } from 'react';

export class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    background: 'var(--bg-secondary, #1a1a2e)',
                    borderRadius: '12px',
                    margin: '20px',
                    color: 'var(--text-primary, #fff)'
                }}>
                    <h2 style={{ marginBottom: '10px' }}>Something went wrong</h2>
                    <p style={{ color: 'var(--text-secondary, #888)', marginBottom: '20px' }}>
                        {this.props.fallbackMessage || 'An unexpected error occurred.'}
                    </p>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        style={{
                            padding: '10px 24px',
                            background: 'var(--accent, #7B68EE)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '1rem'
                        }}
                    >
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
