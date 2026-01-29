import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express'; 

@Catch()
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (
      exception.getStatus &&
      exception.getStatus() === HttpStatus.BAD_REQUEST
    ) {
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse.message) {
        const validationErrors = this.formatValidationErrors(
          exceptionResponse.message,
        );

        return response.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          statusCode: HttpStatus.BAD_REQUEST,
          timestamp: new Date().toISOString(),
          path: request.url,
          method: request.method,
          error: 'Validation Error',
          message: 'Validation failed',
          validationErrors: validationErrors,
        });
      }
    }

    // If not a validation error, pass through
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: 'Internal Server Error',
      message: exception.message || 'Something went wrong',
    });
  }

  private formatValidationErrors(errors: any): any[] {
    if (Array.isArray(errors)) {
      return errors.map((error) => {
        if (typeof error === 'string') {
          return { message: error };
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return error;
      });
    }
    return [{ message: errors }];
  }
}
