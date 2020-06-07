"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchedStreamHandlers = exports.StreamEventName = void 0;
const aws_sdk_1 = __importDefault(require("aws-sdk"));
var StreamEventName;
(function (StreamEventName) {
    StreamEventName["INSERT"] = "INSERT";
    StreamEventName["MODIFY"] = "MODIFY";
    StreamEventName["REMOVE"] = "REMOVE";
})(StreamEventName = exports.StreamEventName || (exports.StreamEventName = {}));
const matchedRulesPredicate = (dynamoStreamItem) => (rules) => {
    return (!!rules.length &&
        rules.find((rule) => !rule(dynamoStreamItem)) === undefined);
};
const matchedStreamItemRules = (routeHandlers) => (routeItems, dynamoStreamItem) => {
    const ruleMatchesStreamItem = matchedRulesPredicate(dynamoStreamItem);
    routeItems.push(...routeHandlers.reduce((matchedRouteItems, routeHandler) => {
        if (ruleMatchesStreamItem(routeHandler.rules)) {
            matchedRouteItems.push({
                dynamoStreamItem,
                handlers: routeHandler.messageHandlers,
            });
        }
        return matchedRouteItems;
    }, []));
    return routeItems;
};
const convertDynamoRecord = (dynamoRecord) => {
    return {
        newRec: unmarshalDbRecord(dynamoRecord, (dbRec) => dbRec.NewImage),
        oldRec: unmarshalDbRecord(dynamoRecord, (dbRec) => dbRec.OldImage),
        streamEventName: dynamoRecord.eventName,
    };
};
const unmarshalDbRecord = (dynamoRecord, dbRecFn) => {
    return (dynamoRecord.dynamodb && dbRecFn(dynamoRecord.dynamodb)
        ? aws_sdk_1.default.DynamoDB.Converter.unmarshall(dbRecFn(dynamoRecord.dynamodb))
        : {});
};
exports.matchedStreamHandlers = (routeHandlers) => (dynamoRecords) => {
    return dynamoRecords
        .map(convertDynamoRecord)
        .reduce(matchedStreamItemRules(routeHandlers), []);
};
