export {
  ADVERTEK_STAGING_BASE_URL,
  buildBasicAuthHeader,
  loadAdvertekWebhookConfig,
  loadFulfillmentConfig,
  type AdvertekWebhookConfig,
  type FulfillmentConfig,
} from "./config.js";

export {
  advertekAddressSchema,
  advertekAssetSchema,
  advertekAssetTypeSchema,
  advertekCancelOrderRequestSchema,
  advertekCreateOrderRequestSchema,
  advertekCreateOrderResponseSchema,
  advertekMetadataSchema,
  advertekOptionSchema,
  advertekOrderDetailResponseSchema,
  advertekOrderItemSchema,
  advertekOrderMutationResponseSchema,
  advertekOrderStatusSchema,
  advertekUpdateShippingRequestSchema,
  advertekWebhookPackageSchema,
  advertekWebhookPayloadSchema,
  type AdvertekAddress,
  type AdvertekAsset,
  type AdvertekAssetType,
  type AdvertekCancelOrderRequest,
  type AdvertekCreateOrderRequest,
  type AdvertekCreateOrderResponse,
  type AdvertekMetadata,
  type AdvertekOption,
  type AdvertekOrderDetailResponse,
  type AdvertekOrderItem,
  type AdvertekOrderMutationResponse,
  type AdvertekOrderStatus,
  type AdvertekUpdateShippingRequest,
  type AdvertekWebhookPackage,
  type AdvertekWebhookPayload,
} from "./advertek-api-types.js";

export {
  PRODUCT_LINE_TO_ADVERTEK_PRODUCT_CODE,
  mapProductLineToAdvertekProductCode,
  type AdvertekProductCode,
} from "./product-code-map.js";

export { formatUsdCentsAsDecimalString } from "./money.js";

export {
  buildAdvertekCreateOrderRequest,
  fulfillmentOrderInputSchema,
  fulfillmentOrderItemInputSchema,
  type FulfillmentOrderInput,
  type FulfillmentOrderItemInput,
} from "./request-builder.js";

export {
  AdvertekApiError,
  createAdvertekFulfillmentClient,
  type AdvertekFetchLike,
  type AdvertekFulfillmentClient,
  type CreateAdvertekFulfillmentClientOptions,
} from "./advertek-client.js";

export {
  pollAdvertekOrderStatus,
  type PolledOrderStatus,
  type PollOrderStatusDeps,
} from "./poll-order-status.js";

export { bridgeAdvertekStatusToOrderStatus } from "./status-bridge.js";

export {
  createFulfillmentOrderStatusUpdater,
  type CreateFulfillmentOrderStatusUpdaterDeps,
  type FulfillmentOrderSubmissionResult,
  type OrderDetailsLookup,
} from "./payment-confirmed-handler.js";

export {
  pollAndDispatchOrderStatus,
  type PollAndDispatchOrderStatusDeps,
  type PollAndDispatchOrderStatusInput,
  type PollAndDispatchOrderStatusResult,
} from "./status-poll-dispatcher.js";

export {
  AdvertekWebhookAuthError,
  AdvertekWebhookPayloadValidationError,
  handleAdvertekWebhook,
  verifyAdvertekWebhookBasicAuth,
  type AdvertekWebhookCredentials,
  type AdvertekWebhookEvent,
  type AdvertekWebhookRequest,
  type HandleAdvertekWebhookDeps,
} from "./advertek-webhook.js";

export {
  createAdvertekWebhookRequestHandler,
  type AdvertekWebhookRequestListener,
} from "./advertek-webhook-http.js";

export {
  dispatchAdvertekWebhookEvent,
  type DispatchAdvertekWebhookEventDeps,
  type WebhookSubscriptionLookup,
} from "./webhook-dispatch.js";
