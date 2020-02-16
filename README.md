# DynamoDB Stream Router

The router can be configured with a set of handlers. A handler has the concept of rules and message handlers. 
For each DynamoDB stream record that matches the set of rules the message handlers will be returned from the route function.
 
> Note, this is meant to be used on Dynamo Streams with a StreamViewType of NEW_AND_OLD_IMAGES

## Installation

`npm install dynamodb-stream-router --save`

## Usage

Before any of the handler rules are evaluated against the DynamoDB stream records. The stream records are converted to a stream Item with the following shape:

```
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
```

This item is then checked against each handlers set of rules. If all rules match the handler is returned as a matched handler.

### Example

Given the following stream record:
```
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
             S: "11abc7c8-4907-4203-a690-8652a6237680"
           },
           customerId: {
             S: "21abc7c8-4907-4203-a690-8652a6237682"
           }
         },
         NewImage: {
           testAttribute: {
             S: "test"
           },
           cartId: {
             S: "d20c2a9f-9e54-47c8-b15b-3825ab18a9ea"
           },
           customerId: {
             S: "21abc7c8-4907-4203-a690-8652a6237682"
           }
         },
         SequenceNumber: "4217800000000000074376631",
         SizeBytes: 317,
         StreamViewType: "NEW_AND_OLD_IMAGES"
       },
       eventSourceARN:
         "arn:aws:dynamodb:us-east-1:647096707908:table/CartTable-1CTA7CIJVD6OW/stream/2020-02-08T06:31:13.980"
     }
   ]
 };
```
it would be converted to:
```
 interface TestItem {
   cartId: string;
   customerId: string;
   testAttribute: string;
 }     

 const dynamoStreamItem: DynamoStreamItem<TestItem> = {
    streamEventName: "INSERT",
    newRec: {
      cartId: "d20c2a9f-9e54-47c8-b15b-3825ab18a9ea",
      customerId: "21abc7c8-4907-4203-a690-8652a6237682",
      testAttribute: "test"
    },
    oldRec: {}
  };

```
We can then create a handler for all insert events:
```
 const insertItemHandler: DynamoMessageRouteHandler<TestItem> = {
        rules: [
           (streamItem: DynamoStreamItem<TestItem>) => { 
              return streamItem.streamEventName === "INSERT';
           }
        ],
        messageHandlers: [
           (streamItem: DynamoStreamItem<TestItem>) => { 
               console.log(`matched handler, cartId: ${streamItem.newRec.cartId}`);
           }
        ]
  };
```
 Now we setup the router with all the configured handlers.
 
 ```
 const configuredStreamRouter = matchedStreamHandlers([
    insertItemHandler, deleteItemHanlder
 ]);

 const matchedHandlers = configuredStreamRouter(dynamoDBStreamEvent)
```
