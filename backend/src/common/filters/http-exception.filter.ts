import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const body = this.toErrorBody(exception);

    if (body.statusCode >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.stack : exception,
      );
    }

    response.status(body.statusCode).json(body);
  }

  private toErrorBody(exception: unknown): ErrorBody {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      // Nest's ValidationPipe already throws a BadRequestException whose
      // response body is { statusCode, message: string[], error }. Reuse it
      // as-is so validation errors keep their per-field messages.
      if (typeof payload === 'object' && payload !== null) {
        const { message, error } = payload as Record<string, unknown>;
        return {
          statusCode: status,
          message: (message as string | string[]) ?? exception.message,
          error: (error as string) ?? HttpStatus[status],
        };
      }

      return {
        statusCode: status,
        message: exception.message,
        error: HttpStatus[status] ?? 'Error',
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'Internal Server Error',
    };
  }
}
