import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'payment',
})
export class PaymentGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PaymentGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribeOrder')
  handleSubscribeOrder(client: Socket, orderNo: string) {
    client.join(`order:${orderNo}`);
    this.logger.log(`Client ${client.id} subscribed to order: ${orderNo}`);
    return { status: 'subscribed' };
  }

  notifyPaymentStatus(orderNo: string, status: string) {
    this.server.to(`order:${orderNo}`).emit('paymentStatus', { orderNo, status });
  }
}
