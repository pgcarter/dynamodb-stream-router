import { DynamoDBRecord } from "aws-lambda";

export type StreamRouterRuleFn<T> = (
  dynamoItem: DynamoStreamItem<T>
) => boolean;

export type StreamMessageHandlerFn<T> = (
  dynamoItem: DynamoStreamItem<T>
) => Promise<void>;

export type DynamoStreamRouterFn = (
  dynamoRecords: DynamoDBRecord[]
) => MatchedStreamHandler<unknown>[];

export interface DynamoMessageRouteHandler<T> {
  readonly rules: StreamRouterRuleFn<T>[];
  readonly messageHandlers: StreamMessageHandlerFn<T>[];
}

export interface DynamoStreamItem<T> {
  readonly newRec?: Partial<T>;
  readonly oldRec?: Partial<T>;
  readonly streamEventName: StreamEventName;
}

export enum StreamEventName {
  INSERT = "INSERT",
  MODIFY = "MODIFY",
  REMOVE = "REMOVE"
}

export interface MatchedStreamHandler<T> {
  readonly dynamoStreamItem: DynamoStreamItem<T>;
  readonly handlers: StreamMessageHandlerFn<T>[];
}
