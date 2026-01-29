import { HttpException, HttpStatus } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { AxiosError } from 'axios';


export class ErrorHandler {
  static handle(error: any): never {
   
    if (error instanceof HttpException) {
      throw error;
    }

    if (error.isAxiosError) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 401) {
        throw new HttpException('Invalid API Key', HttpStatus.UNAUTHORIZED);
      }
      if (axiosError.response?.status === 403) {
        throw new HttpException('API Access Forbidden', HttpStatus.FORBIDDEN);
      }
      if (axiosError.response?.status === 429) {
        throw new HttpException('API Rate Limit Exceeded', HttpStatus.TOO_MANY_REQUESTS);
      }
      throw new HttpException('External API Error', HttpStatus.BAD_GATEWAY);
    }


    if (error instanceof PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          throw new HttpException('Duplicate record found', HttpStatus.CONFLICT);
        case 'P2021': throw new HttpException(
            'Database schema not applied or table missing. Run migrations (pnpm prisma migrate dev) and regenerate client.',
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        case 'P2009':
          throw new HttpException('Invalid query parameters or fields', HttpStatus.BAD_REQUEST);
        case 'P2025':
          throw new HttpException('Requested record not found', HttpStatus.NOT_FOUND);
          
        default:
          throw new HttpException('Database Error', HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }

    throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
    
  }
}