import {
  DynamoMessageRouteHandler,
  MatchedStreamHandler,
  DynamoStreamRouterFn
} from "./lib/types";
import { dynamoStreamEventRouter } from "./lib/dynamo.stream.message.router";
import { DynamoDBRecord } from "aws-lambda";

export const matchedStreamHandlers = (
  routeHandlers: DynamoMessageRouteHandler<unknown>[]
): DynamoStreamRouterFn => (
  dynamoRecords: DynamoDBRecord[]
): MatchedStreamHandler<unknown>[] => {
  return dynamoStreamEventRouter(routeHandlers)(dynamoRecords);
};
