import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationIdHeader = 'X-Correlation-ID';
    let correlationId = req.header(correlationIdHeader);

    if (!correlationId) {
      correlationId = uuidv4();
    }

    (req as any)['correlationId'] = correlationId;
    res.setHeader(correlationIdHeader, correlationId);
    next();
  }
}
