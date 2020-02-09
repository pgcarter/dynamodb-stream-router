import { DynamoDBRecord } from "aws-lambda";
import AWS from "aws-sdk";

import {
  DynamoStreamItem,
  DynamoMessageRouteHandler,
  StreamEventName,
  MatchedStreamHandler,
  DynamoStreamRouterFn,
  StreamRouterRuleFn
} from "./types";

export const dynamoStreamEventRouter = (
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
