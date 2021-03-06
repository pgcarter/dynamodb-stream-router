import { DynamoDBStreamEvent } from "aws-lambda";
import { assert } from "chai";
import {
  matchedStreamHandlers,
  DynamoStreamItem,
  StreamEventName,
  StreamRouterRuleFn,
  DynamoMessageRouteHandler,
} from "../src";

interface TestItem {
  cartId: string;
  customerId: string;
  testAttribute: string;
}

describe("dynamo stream message router", () => {
  const dynamoStreamItem: DynamoStreamItem<TestItem> = {
    streamEventName: StreamEventName.INSERT,
    newRec: {
      cartId: "d20c2a9f-9e54-47c8-b15b-3825ab18a9ea",
      customerId: "21abc7c8-4907-4203-a690-8652a6237682",
      testAttribute: "test",
    },
    oldRec: {},
  };
  const matchingRouteRule: StreamRouterRuleFn<TestItem> = (
    _dynamoItem: DynamoStreamItem<TestItem>
  ) => {
    return true;
  };
  const nonMatchingRouteRule: StreamRouterRuleFn<TestItem> = (
    _dynamoItem: DynamoStreamItem<TestItem>
  ) => {
    return false;
  };
  const expectedRouteHandler = (_dynamoItem: DynamoStreamItem<TestItem>) => {
    return Promise.resolve();
  };
  const expectedRouteHandler2 = (
    _dynamoItem: DynamoStreamItem<TestItem>
  ): Promise<void> => {
    return Promise.resolve();
  };
  const cartCreatedEvent: DynamoDBStreamEvent = {
    Records: [
      {
        eventID: "687541e3494dc8de9ff8d1f64b69bba1",
        eventName: "INSERT",
        eventVersion: "1.1",
        eventSource: "aws:dynamodb",
        awsRegion: "us-east-1",
        dynamodb: {
          ApproximateCreationDateTime: 1579295785,
          Keys: {
            cartId: {
              S: "11abc7c8-4907-4203-a690-8652a6237680",
            },
            customerId: {
              S: "21abc7c8-4907-4203-a690-8652a6237682",
            },
          },
          NewImage: {
            testAttribute: {
              S: "test",
            },
            cartId: {
              S: "d20c2a9f-9e54-47c8-b15b-3825ab18a9ea",
            },
            customerId: {
              S: "21abc7c8-4907-4203-a690-8652a6237682",
            },
          },
          SequenceNumber: "4217800000000000074376631",
          SizeBytes: 317,
          StreamViewType: "NEW_AND_OLD_IMAGES",
        },
        eventSourceARN:
          "arn:aws:dynamodb:us-east-1:647096707908:table/CartTable-1CTA7CIJVD6OW/stream/2020-02-08T06:31:13.980",
      },
    ],
  };
  context("routing filters", () => {
    it("1 matching filter with one handler", () => {
      const routeHandlers: DynamoMessageRouteHandler<TestItem> = {
        messageHandlers: [expectedRouteHandler],
        rules: [matchingRouteRule],
      };

      const result = matchedStreamHandlers([routeHandlers])(
        cartCreatedEvent.Records
      );
      assert.lengthOf(
        result,
        1,
        "expected one handler for matching route rule"
      );
      assert.deepStrictEqual(result, [
        {
          dynamoStreamItem,
          handlers: [expectedRouteHandler],
        },
      ]);
    });
    it("2 matching filters with one handler", () => {
      const routeHandlers: DynamoMessageRouteHandler<TestItem> = {
        messageHandlers: [expectedRouteHandler],
        rules: [matchingRouteRule, matchingRouteRule],
      };

      const result = matchedStreamHandlers([routeHandlers])(
        cartCreatedEvent.Records
      );
      assert.lengthOf(
        result,
        1,
        "expected one handler for matching route rule"
      );
      assert.deepStrictEqual(result, [
        {
          dynamoStreamItem,
          handlers: [expectedRouteHandler],
        },
      ]);
    });
    it("1 filter does not match with one handler", () => {
      const routeHandlers: DynamoMessageRouteHandler<TestItem> = {
        messageHandlers: [expectedRouteHandler],
        rules: [nonMatchingRouteRule],
      };

      const result = matchedStreamHandlers([routeHandlers])(
        cartCreatedEvent.Records
      );
      assert.lengthOf(result, 0, "expected no handler for failing route rule");
    });
    it("2 filters and 1 filter does not match with one handler", () => {
      let matchingRouteRuleCalled = false;
      const matchingNeverCalledRouteRule: StreamRouterRuleFn<TestItem> = (
        _dynamoItem: DynamoStreamItem<TestItem>
      ) => {
        matchingRouteRuleCalled = true;
        return true;
      };
      const routeHandlers: DynamoMessageRouteHandler<TestItem> = {
        messageHandlers: [expectedRouteHandler],
        rules: [nonMatchingRouteRule, matchingNeverCalledRouteRule],
      };

      const result = matchedStreamHandlers([routeHandlers])(
        cartCreatedEvent.Records
      );
      assert.lengthOf(result, 0, "expected no handler for failing route rule");
      assert.isFalse(
        matchingRouteRuleCalled,
        "expected failed match to short circuit matching check."
      );
    });
    it("empty filter does not match with one handler", () => {
      const routeHandlers: DynamoMessageRouteHandler<TestItem> = {
        messageHandlers: [expectedRouteHandler],
        rules: [],
      };

      const result = matchedStreamHandlers([routeHandlers])(
        cartCreatedEvent.Records
      );
      assert.lengthOf(
        result,
        0,
        "expected no handler for empty filter rule list"
      );
    });
  });
  context("multiple handlers", () => {
    it("1 filter with 2 handlers handler", () => {
      const routeHandlers: DynamoMessageRouteHandler<TestItem> = {
        messageHandlers: [expectedRouteHandler, expectedRouteHandler2],
        rules: [matchingRouteRule],
      };

      const result = matchedStreamHandlers([routeHandlers])(
        cartCreatedEvent.Records
      );
      assert.lengthOf(result, 1, "expected 1 route handlers");
      assert.deepStrictEqual(result, [
        {
          dynamoStreamItem,
          handlers: [expectedRouteHandler, expectedRouteHandler2],
        },
      ]);
    });
    it("2 route Handlers with 2 handlers each", () => {
      const routeHandlers: DynamoMessageRouteHandler<TestItem> = {
        messageHandlers: [expectedRouteHandler, expectedRouteHandler2],
        rules: [matchingRouteRule],
      };
      const routeHandlers2: DynamoMessageRouteHandler<TestItem> = {
        messageHandlers: [expectedRouteHandler, expectedRouteHandler2],
        rules: [matchingRouteRule],
      };

      const result = matchedStreamHandlers([routeHandlers, routeHandlers2])(
        cartCreatedEvent.Records
      );
      assert.lengthOf(result, 2, "expected 4 route handlers");
      assert.deepStrictEqual(result, [
        {
          dynamoStreamItem,
          handlers: [expectedRouteHandler, expectedRouteHandler2],
        },
        {
          dynamoStreamItem,
          handlers: [expectedRouteHandler, expectedRouteHandler2],
        },
      ]);
    });
    it("2 route Handlers with 1 matching rule handlers each", () => {
      const routeHandlers: DynamoMessageRouteHandler<TestItem> = {
        messageHandlers: [expectedRouteHandler, expectedRouteHandler2],
        rules: [nonMatchingRouteRule],
      };
      const routeHandlers2: DynamoMessageRouteHandler<TestItem> = {
        messageHandlers: [expectedRouteHandler2, expectedRouteHandler],
        rules: [matchingRouteRule],
      };

      const result = matchedStreamHandlers([routeHandlers, routeHandlers2])(
        cartCreatedEvent.Records
      );
      assert.lengthOf(result, 1, "expected 1 route handlers");
      assert.deepStrictEqual(result, [
        {
          dynamoStreamItem,
          handlers: [expectedRouteHandler2, expectedRouteHandler],
        },
      ]);
    });
  });
  context("multiple db stream records", () => {
    const gateCreatedEvent: DynamoDBStreamEvent = {
      Records: [
        {
          eventID: "687541e3494dc8de9ff8d1f64b69bba1",
          eventName: "INSERT",
          eventVersion: "1.1",
          eventSource: "aws:dynamodb",
          awsRegion: "us-east-1",
          dynamodb: {
            ApproximateCreationDateTime: 1573495785,
            Keys: {
              cartId: {
                S: "d20c2a9f-9e54-47c8-b15b-3825ab18a9ea",
              },
              customerId: {
                S: "21abc7c8-4907-4203-a690-8652a6237682",
              },
            },
            NewImage: {
              testAttribute: {
                S: "test",
              },
              cartId: {
                S: "d20c2a9f-9e54-47c8-b15b-3825ab18a9ea",
              },
              customerId: {
                S: "21abc7c8-4907-4203-a690-8652a6237682",
              },
            },
            SequenceNumber: "4217800000000000074377000",
            SizeBytes: 317,
            StreamViewType: "NEW_AND_OLD_IMAGES",
          },
          eventSourceARN:
            "arn:aws:dynamodb:us-east-1:647096707908:table/CartTable-1CTA7CIJVD6OW/stream/2020-02-08T06:31:13.980",
        },
        {
          eventID: "687541e3494dc8de9ff8d1f64b69bba1",
          eventName: "INSERT",
          eventVersion: "1.1",
          eventSource: "aws:dynamodb",
          awsRegion: "us-east-1",
          dynamodb: {
            ApproximateCreationDateTime: 1579395785,
            Keys: {
              cartId: {
                S: "44abc7c8-4907-4203-a690-8652a6237644",
              },
              customerId: {
                S: "77abc7c8-4907-4203-a690-8652a6237677",
              },
            },
            NewImage: {
              testAttribute: {
                S: "test2",
              },
              cartId: {
                S: "44abc7c8-4907-4203-a690-8652a6237644",
              },
              customerId: {
                S: "77abc7c8-4907-4203-a690-8652a6237677",
              },
            },
            SequenceNumber: "4217800000000000074376631",
            SizeBytes: 317,
            StreamViewType: "NEW_AND_OLD_IMAGES",
          },
          eventSourceARN:
            "arn:aws:dynamodb:us-east-1:647096707908:table/CartTable-1CTA7CIJVD6OW/stream/2020-02-08T06:31:13.980",
        },
      ],
    };
    const dynamoStreamItem2: DynamoStreamItem<TestItem> = {
      streamEventName: StreamEventName.INSERT,
      newRec: {
        cartId: "44abc7c8-4907-4203-a690-8652a6237644",
        customerId: "77abc7c8-4907-4203-a690-8652a6237677",
        testAttribute: "test2",
      },
      oldRec: {},
    };
    it("1 filter with 2 handlers", () => {
      const routeHandlers: DynamoMessageRouteHandler<TestItem> = {
        messageHandlers: [expectedRouteHandler, expectedRouteHandler2],
        rules: [matchingRouteRule],
      };

      const result = matchedStreamHandlers([routeHandlers])(
        gateCreatedEvent.Records
      );
      assert.deepStrictEqual(result, [
        {
          dynamoStreamItem,
          handlers: [expectedRouteHandler, expectedRouteHandler2],
        },
        {
          dynamoStreamItem: dynamoStreamItem2,
          handlers: [expectedRouteHandler, expectedRouteHandler2],
        },
      ]);
    });
  });
});
