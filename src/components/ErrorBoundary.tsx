import { Component, type ErrorInfo, type ReactNode } from 'react';
import DebugErrorPage from '../pages/DebugErrorPage';

interface Props {
  children: ReactNode;
}

interface State {
  error: unknown;
  componentStack: string | null;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: null };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('Frontend error:', error);
    this.setState({ error, componentStack: info.componentStack ?? null });
  }

  reset = () => {
    this.setState({ error: null, componentStack: null });
  };

  render() {
    if (this.state.error) {
      return (
        <DebugErrorPage
          error={this.state.error}
          componentStack={this.state.componentStack ?? undefined}
          onReset={this.reset}
        />
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
