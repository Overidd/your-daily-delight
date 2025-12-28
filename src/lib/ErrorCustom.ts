export class ErrorCustom extends Error {
  public statusCode: number;
  public details?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    details?: unknown
  ) {
    super(message);

    this.name = 'ErrorCustom';
    this.statusCode = statusCode;
    this.details = details;

    Object.setPrototypeOf(this, ErrorCustom.prototype);
  }
}
