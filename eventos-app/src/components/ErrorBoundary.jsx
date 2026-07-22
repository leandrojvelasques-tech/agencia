import React from 'react'

export class ErrorBoundary extends React.Component {
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
        <div className="p-8 max-w-2xl mx-auto my-12 bg-red-50 border border-red-200 rounded-2xl shadow-sm text-center">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-2xl">error_outline</span>
          </div>
          <h3 className="text-lg font-bold text-red-900 mb-2">Ocurrió un problema al cargar esta sección</h3>
          <p className="text-xs text-red-700 mb-4 max-w-md mx-auto font-mono bg-red-100/60 p-3 rounded-lg overflow-x-auto text-left">
            {this.state.error?.toString() || 'Error desconocido'}
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="btn-primary !bg-red-700 hover:!bg-red-800 !text-xs"
            >
              Reintentar / Cargar de nuevo
            </button>
            <button
              onClick={() => window.history.back()}
              className="btn-secondary !text-xs"
            >
              Volver atrás
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
