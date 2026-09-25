import React from 'react';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="app-error-boundary" role="alert">
        <span aria-hidden="true">⚠</span>
        <h1>Something went wrong while displaying this page.</h1>
        <p>Please try again. If the problem continues, return to your dashboard.</p>
        <div>
          <button className="btn btn-primary" onClick={() => this.setState({ failed: false })}>Try again</button>
          <a className="btn btn-secondary" href="/">Go to Dashboard</a>
        </div>
      </main>
    );
  }
}
