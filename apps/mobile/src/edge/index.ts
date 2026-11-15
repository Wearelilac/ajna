/**
 * M3.1: Edge module exports
 * Only EdgeController and types exposed to app layer.
 * Internal components (Buffer, Inference, etc.) are NOT exported.
 */

export { EdgeController, getEdgeController } from './EdgeController';
export type {
  DeIdentifiedFlag,
  EdgeStatus,
  EdgeControllerConfig,
} from './types';
export { DistressSignature } from './types';
