export class ApiResponse<T> {
  code: number;
  msg: string;
  data: T;

  static success<T>(data: T, msg = 'success'): ApiResponse<T> {
    return { code: 200, msg, data };
  }

  static error<T>(msg = 'error', code = 400, data: T = null as any): ApiResponse<T> {
    return { code, msg, data };
  }
}
