import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiError } from '@kairos/types';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erro interno do servidor';
    let error = 'InternalServerError';
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, unknown>;
        message = (obj.message as string) || message;
        error = (obj.error as string) || exception.name;
        if (obj.details) details = obj.details as Record<string, unknown>;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
    }

    // Log do erro (completo no server, genérico no client)
    this.logger.error(
      `${request.method} ${request.url} → ${status} ${error}: ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    // Resposta para o client (nunca vaza stack trace)
    const body: ApiError = {
      statusCode: status,
      error,
      message:
        status === HttpStatus.INTERNAL_SERVER_ERROR
          ? 'Não foi possível processar a solicitação. Tente novamente.'
          : message,
      details,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(body);
  }
}
