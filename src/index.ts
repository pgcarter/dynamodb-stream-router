import { DynamoDBRecord } from "aws-lambda";
import AWS from "aws-sdk";

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
  REMOVE = "REMOVE"
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
    rules.find(rule => rule(dynamoStreamItem) === false) === undefined
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
            handlers: routeHandler.messageHandlers
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
  const dynamoRecordParse = AWS.DynamoDB.Converter.output;
  return {
    newRec: dynamoRecordParse({ M: dynamoRecord.dynamodb.NewImage }),
    oldRec: dynamoRecordParse({ M: dynamoRecord.dynamodb.OldImage }),
    streamEventName: dynamoRecord.eventName as StreamEventName
  };
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
