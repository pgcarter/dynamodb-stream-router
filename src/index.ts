import { DynamoDBRecord, StreamRecord } from "aws-lambda";
import AWS, { DynamoDB } from "aws-sdk";

///////////////////////////////
///// Defined Types
///////////////////////////////
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
  REMOVE = "REMOVE",
}

export interface MatchedStreamHandler<T> {
  readonly dynamoStreamItem: DynamoStreamItem<T>;
  readonly handlers: StreamMessageHandlerFn<T>[];
}

const matchedRulesPredicate = (dynamoStreamItem: DynamoStreamItem<unknown>) => (
  rules: StreamRouterRuleFn<unknown>[]
): boolean => {
  return (
    !!rules.length &&
    rules.find((rule) => !rule(dynamoStreamItem)) === undefined
  );
};

const matchedStreamItemRules = (
  routeHandlers: DynamoMessageRouteHandler<unknown>[]
) => (
  routeItems: MatchedStreamHandler<unknown>[],
  dynamoStreamItem: DynamoStreamItem<unknown>
): MatchedStreamHandler<unknown>[] => {
  const ruleMatchesStreamItem = matchedRulesPredicate(dynamoStreamItem);
  routeItems.push(
    ...routeHandlers.reduce(
      (
        matchedRouteItems: MatchedStreamHandler<unknown>[],
        routeHandler: DynamoMessageRouteHandler<unknown>
      ) => {
        if (ruleMatchesStreamItem(routeHandler.rules)) {
          matchedRouteItems.push({
            dynamoStreamItem,
            handlers: routeHandler.messageHandlers,
          });
        }
        return matchedRouteItems;
      },
      [] as MatchedStreamHandler<unknown>[]
    )
  );
  return routeItems;
};

const convertDynamoRecord = <T>(
  dynamoRecord: DynamoDBRecord
): DynamoStreamItem<T> => {
  return {
    newRec: unmarshalDbRecord(
      dynamoRecord,
      (dbRec) => dbRec.NewImage as DynamoDB.AttributeMap
    ),
    oldRec: unmarshalDbRecord(
      dynamoRecord,
      (dbRec) => dbRec.OldImage as DynamoDB.AttributeMap
    ),
    streamEventName: dynamoRecord.eventName as StreamEventName,
  };
};
const unmarshalDbRecord = <T>(
  dynamoRecord: DynamoDBRecord,
  dbRecFn: (rec: StreamRecord) => DynamoDB.AttributeMap
): T => {
  return (dynamoRecord.dynamodb && dbRecFn(dynamoRecord.dynamodb)
    ? AWS.DynamoDB.Converter.unmarshall(dbRecFn(dynamoRecord.dynamodb))
    : {}) as T;
};
export const matchedStreamHandlers = (
  routeHandlers: DynamoMessageRouteHandler<unknown>[]
): DynamoStreamRouterFn => (
  dynamoRecords: DynamoDBRecord[]
): MatchedStreamHandler<unknown>[] => {
  return dynamoRecords
    .map(convertDynamoRecord)
    .reduce(
      matchedStreamItemRules(routeHandlers),
      [] as MatchedStreamHandler<unknown>[]
    );
};
