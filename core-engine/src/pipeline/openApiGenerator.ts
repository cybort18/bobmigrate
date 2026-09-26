export class OpenApiGenerator {
  public static generateOrdersSpec(): string {
    return `openapi: 3.1.0
info:
  title: Orders Microservice API (Synthesized by BobMigrate)
  version: 1.0.0
  description: |
    Decoupled and isolated Orders bounded-context microservice synthesized autonomously 
    by IBM Bob 2.0 Agent Mode from the BobMarket legacy monolith.
servers:
  - url: http://localhost:5001/api/v1
    description: Local Microservice Runtime Container
paths:
  /orders:
    post:
      summary: Create and process a new customer order
      description: |
        Processes checkout with decoupled catalog reservation and event-driven notifications.
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateOrderRequest'
      responses:
        '201':
          description: Order created and confirmed successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Order'
        '400':
          description: Invalid request payload
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '409':
          description: Insufficient inventory stock in catalog
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

    get:
      summary: List authenticated user orders
      description: Retrieves all orders for the authenticated customer.
      security:
        - BearerAuth: []
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
        - name: offset
          in: query
          schema:
            type: integer
            default: 0
      responses:
        '200':
          description: List of order summaries
          content:
            application/json:
              schema:
                type: object
                properties:
                  orders:
                    type: array
                    items:
                      $ref: '#/components/schemas/OrderSummary'
                  total:
                    type: integer

  /orders/{id}:
    get:
      summary: Retrieve order by ID with line items
      security:
        - BearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Full order details with line items
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Order'
        '404':
          description: Order not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /orders/{id}/status:
    patch:
      summary: Update order status transition
      security:
        - BearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [status]
              properties:
                status:
                  type: string
                  enum: [PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED]
      responses:
        '200':
          description: Status updated successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Order'

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    CreateOrderRequest:
      type: object
      required:
        - items
        - paymentMethod
      properties:
        items:
          type: array
          items:
            type: object
            required:
              - productId
              - quantity
            properties:
              productId:
                type: integer
                example: 1
              quantity:
                type: integer
                example: 2
        paymentMethod:
          type: string
          enum: [CREDIT_CARD, PAYPAL, WIRE_TRANSFER]
          example: CREDIT_CARD
        shippingAddress:
          type: string
          example: '124 Tech Blvd, Austin, TX'

    Order:
      type: object
      properties:
        id:
          type: integer
          example: 101
        userId:
          type: integer
          example: 1
        totalAmount:
          type: number
          format: float
          example: 1448.99
        status:
          type: string
          example: CONFIRMED
        paymentMethod:
          type: string
          example: CREDIT_CARD
        shippingAddress:
          type: string
          example: '124 Tech Blvd, Austin, TX'
        trackingNumber:
          type: string
          example: 'TRK-99201-BOB'
        createdAt:
          type: string
          format: date-time
        items:
          type: array
          items:
            $ref: '#/components/schemas/OrderItem'

    OrderItem:
      type: object
      properties:
        id:
          type: integer
          example: 1
        orderId:
          type: integer
          example: 101
        productId:
          type: integer
          example: 1
        quantity:
          type: integer
          example: 2
        unitPrice:
          type: number
          format: float
          example: 1299.99
        subtotal:
          type: number
          format: float
          example: 2599.98

    OrderSummary:
      type: object
      properties:
        id:
          type: integer
        userId:
          type: integer
        totalAmount:
          type: number
        status:
          type: string
        createdAt:
          type: string

    ErrorResponse:
      type: object
      properties:
        error:
          type: string
        details:
          type: string
        timestamp:
          type: string
`;
  }
}
