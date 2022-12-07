export class KnownError extends Error {
  reason: string;

  constructor(message: string, reason: string) {
    super(message);

    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
    this.reason = reason;
  }
}
