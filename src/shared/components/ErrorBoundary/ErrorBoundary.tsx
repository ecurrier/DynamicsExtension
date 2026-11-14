import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
	children: ReactNode;
	/** Rendered in place of the children, given what was caught and a way to try again. */
	fallback: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
	error: Error | null;
}

/**
 * Catches a render crash so it takes down one Area rather than the whole extension.
 *
 * Nothing is recorded and nothing is sent: the error is held in state until the user asks for a
 * report, and React already writes caught errors to the console on its own, so there is no logging
 * of our own here.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	override state: ErrorBoundaryState = { error: null };

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { error };
	}

	private readonly reset = () => this.setState({ error: null });

	override render(): ReactNode {
		const { error } = this.state;
		return error === null ? this.props.children : this.props.fallback(error, this.reset);
	}
}
