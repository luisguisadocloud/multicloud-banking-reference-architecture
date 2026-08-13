export class InvalidApplicationRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidApplicationRequestError";
  }
}

export class ApplicationNotFoundError extends Error {
  constructor(applicationId: string) {
    super(`Application not found: ${applicationId}`);
    this.name = "ApplicationNotFoundError";
  }
}

export class InvalidStateTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidStateTransitionError";
  }
}

export class SimulatedEvaluationFailureError extends Error {
  constructor(applicationId: string) {
    super(`Simulated evaluation failure (FORCE_FAILURE fixture) for application ${applicationId}`);
    this.name = "SimulatedEvaluationFailureError";
  }
}
