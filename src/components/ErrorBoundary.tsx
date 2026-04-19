import { Component, type ReactNode } from 'react';
import MyError from '../pages/404error';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Frontend error:', error);
  }

  render() {
    if (this.state.hasError) {
      return <MyError label="frontend issue" />;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
