/*! firebase-admin v12.4.0 */
"use strict";
/*!
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Messaging = void 0;
const deep_copy_1 = require("../utils/deep-copy");
const error_1 = require("../utils/error");
const utils = require("../utils");
const validator = require("../utils/validator");
const messaging_internal_1 = require("./messaging-internal");
const messaging_api_request_internal_1 = require("./messaging-api-request-internal");
const api_request_1 = require("../utils/api-request");
// FCM endpoints
const FCM_SEND_HOST = 'fcm.googleapis.com';
const FCM_SEND_PATH = '/fcm/send';
const FCM_TOPIC_MANAGEMENT_HOST = 'iid.googleapis.com';
const FCM_TOPIC_MANAGEMENT_ADD_PATH = '/iid/v1:batchAdd';
const FCM_TOPIC_MANAGEMENT_REMOVE_PATH = '/iid/v1:batchRemove';
// Maximum messages that can be included in a batch request.
const FCM_MAX_BATCH_SIZE = 500;
// Key renames for the messaging notification payload object.
const CAMELCASED_NOTIFICATION_PAYLOAD_KEYS_MAP = {
    bodyLocArgs: 'body_loc_args',
    bodyLocKey: 'body_loc_key',
    clickAction: 'click_action',
    titleLocArgs: 'title_loc_args',
    titleLocKey: 'title_loc_key',
};
// Key renames for the messaging options object.
const CAMELCASE_OPTIONS_KEYS_MAP = {
    dryRun: 'dry_run',
    timeToLive: 'time_to_live',
    collapseKey: 'collapse_key',
    mutableContent: 'mutable_content',
    contentAvailable: 'content_available',
    restrictedPackageName: 'restricted_package_name',
};
// Key renames for the MessagingDeviceResult object.
const MESSAGING_DEVICE_RESULT_KEYS_MAP = {
    message_id: 'messageId',
    registration_id: 'canonicalRegistrationToken',
};
// Key renames for the MessagingDevicesResponse object.
const MESSAGING_DEVICES_RESPONSE_KEYS_MAP = {
    canonical_ids: 'canonicalRegistrationTokenCount',
    failure: 'failureCount',
    success: 'successCount',
    multicast_id: 'multicastId',
};
// Key renames for the MessagingDeviceGroupResponse object.
const MESSAGING_DEVICE_GROUP_RESPONSE_KEYS_MAP = {
    success: 'successCount',
    failure: 'failureCount',
    failed_registration_ids: 'failedRegistrationTokens',
};
// Key renames for the MessagingTopicResponse object.
const MESSAGING_TOPIC_RESPONSE_KEYS_MAP = {
    message_id: 'messageId',
};
// Key renames for the MessagingConditionResponse object.
const MESSAGING_CONDITION_RESPONSE_KEYS_MAP = {
    message_id: 'messageId',
};
/**
 * Maps a raw FCM server response to a `MessagingDevicesResponse` object.
 *
 * @param response - The raw FCM server response to map.
 *
 * @returns The mapped `MessagingDevicesResponse` object.
 */
function mapRawResponseToDevicesResponse(response) {
    // Rename properties on the server response
    utils.renameProperties(response, MESSAGING_DEVICES_RESPONSE_KEYS_MAP);
    if ('results' in response) {
        response.results.forEach((messagingDeviceResult) => {
            utils.renameProperties(messagingDeviceResult, MESSAGING_DEVICE_RESULT_KEYS_MAP);
            // Map the FCM server's error strings to actual error objects.
            if ('error' in messagingDeviceResult) {
                const newError = error_1.FirebaseMessagingError.fromServerError(messagingDeviceResult.error, /* message */ undefined, messagingDeviceResult.error);
                messagingDeviceResult.error = newError;
            }
        });
    }
    return response;
}
/**
 * Maps a raw FCM server response to a `MessagingDeviceGroupResponse` object.
 *
 * @param response - The raw FCM server response to map.
 *
 * @returns The mapped `MessagingDeviceGroupResponse` object.
 */
function mapRawResponseToDeviceGroupResponse(response) {
    // Rename properties on the server response
    utils.renameProperties(response, MESSAGING_DEVICE_GROUP_RESPONSE_KEYS_MAP);
    // Add the 'failedRegistrationTokens' property if it does not exist on the response, which
    // it won't when the 'failureCount' property has a value of 0)
    response.failedRegistrationTokens = response.failedRegistrationTokens || [];
    return response;
}
/**
 * Maps a raw FCM server response to a `MessagingTopicManagementResponse` object.
 *
 * @param {object} response The raw FCM server response to map.
 *
 * @returns {MessagingTopicManagementResponse} The mapped `MessagingTopicManagementResponse` object.
 */
function mapRawResponseToTopicManagementResponse(response) {
    // Add the success and failure counts.
    const result = {
        successCount: 0,
        failureCount: 0,
        errors: [],
    };
    if ('results' in response) {
        response.results.forEach((tokenManagementResult, index) => {
            // Map the FCM server's error strings to actual error objects.
            if ('error' in tokenManagementResult) {
                result.failureCount += 1;
                const newError = error_1.FirebaseMessagingError.fromTopicManagementServerError(tokenManagementResult.error, /* message */ undefined, tokenManagementResult.error);
                result.errors.push({
                    index,
                    error: newError,
                });
            }
            else {
                result.successCount += 1;
            }
        });
    }
    return result;
}
/**
 * Messaging service bound to the provided app.
 */
class Messaging {
    /**
     * @internal
     */
    constructor(app) {
        this.useLegacyTransport = false;
        if (!validator.isNonNullObject(app) || !('options' in app)) {
            throw new error_1.FirebaseMessagingError(error_1.MessagingClientErrorCode.INVALID_ARGUMENT, 'First argument passed to admin.messaging() must be a valid Firebase app instance.');
        }
        this.appInternal = app;
        this.messagingRequestHandler = new messaging_api_request_internal_1.FirebaseMessagingRequestHandler(app);
    }
    /**
     * The {@link firebase-admin.app#App} associated with the current `Messaging` service
     * instance.
     *
     * @example
     * ```javascript
     * var app = messaging.app;
     * ```
     */
    get app() {
        return this.appInternal;
    }
    /**
     * Enables the use of legacy HTTP/1.1 transport for `sendEach()` and `sendEachForMulticast()`.
     *
     * @example
     * ```javascript
     * const messaging = getMessaging(app);
     * messaging.enableLegacyTransport();
     * messaging.sendEach(messages);
     * ```
     *
     * @deprecated This will be removed when the HTTP/2 transport implementation reaches the same
     * stability as the legacy HTTP/1.1 implementation.
     */
    enableLegacyHttpTransport() {
        this.useLegacyTransport = true;
    }
    /**
     * Sends the given message via FCM.
     *
     * @param message - The message payload.
     * @param dryRun - Whether to send the message in the dry-run
     *   (validation only) mode.
     * @returns A promise fulfilled with a unique message ID
     *   string after the message has been successfully handed off to the FCM
     *   service for delivery.
     */
    send(message, dryRun) {
        const copy = (0, deep_copy_1.deepCopy)(message);
        (0, messaging_internal_1.validateMessage)(copy);
        if (typeof dryRun !== 'undefined' && !validator.isBoolean(dryRun)) {
            throw new error_1.FirebaseMessagingError(error_1.MessagingClientErrorCode.INVALID_ARGUMENT, 'dryRun must be a boolean');
        }
        return this.getUrlPath()
            .then((urlPath) => {
            const request = { message: copy };
            if (dryRun) {
                request.validate_only = true;
            }
            return this.messagingRequestHandler.invokeRequestHandler(FCM_SEND_HOST, urlPath, request);
        })
            .then((response) => {
            return response.name;
        });
    }
    /**
    * Sends each message in the given array via Firebase Cloud Messaging.
    *
    * Unlike {@link Messaging.sendAll}, this method makes a single RPC call for each message
    * in the given array.
    *
    * The responses list obtained from the return value corresponds to the order of `messages`.
    * An error from this method or a `BatchResponse` with all failures indicates a total failure,
    * meaning that none of the messages in the list could be sent. Partial failures or no
    * failures are only indicated by a `BatchResponse` return value.
    *
    * @param messages - A non-empty array
    *   containing up to 500 messages.
    * @param dryRun - Whether to send the messages in the dry-run
    *   (validation only) mode.
    * @returns A Promise fulfilled with an object representing the result of the
    *   send operation.
    */
    sendEach(messages, dryRun) {
        if (validator.isArray(messages) && messages.constructor !== Array) {
            // In more recent JS specs, an array-like object might have a constructor that is not of
            // Array type. Our deepCopy() method doesn't handle them properly. Convert such objects to
            // a regular array here before calling deepCopy(). See issue #566 for details.
            messages = Array.from(messages);
        }
        const copy = (0, deep_copy_1.deepCopy)(messages);
        if (!validator.isNonEmptyArray(copy)) {
            throw new error_1.FirebaseMessagingError(error_1.MessagingClientErrorCode.INVALID_ARGUMENT, 'messages must be a non-empty array');
        }
        if (copy.length > FCM_MAX_BATCH_SIZE) {
            throw new error_1.FirebaseMessagingError(error_1.MessagingClientErrorCode.INVALID_ARGUMENT, `messages list must not contain more than ${FCM_MAX_BATCH_SIZE} items`);
        }
        if (typeof dryRun !== 'undefined' && !validator.isBoolean(dryRun)) {
            throw new error_1.FirebaseMessagingError(error_1.MessagingClientErrorCode.INVALID_ARGUMENT, 'dryRun must be a boolean');
        }
        const http2SessionHandler = this.useLegacyTransport ? undefined : new api_request_1.Http2SessionHandler(`https://${FCM_SEND_HOST}`);
        return this.getUrlPath()
            .then((urlPath) => {
            const requests = copy.map(async (message) => {
                (0, messaging_internal_1.validateMessage)(message);
                const request = { message };
                if (dryRun) {
                    request.validate_only = true;
                }
                if (http2SessionHandler) {
                    return this.messagingRequestHandler.invokeHttp2RequestHandlerForSendResponse(FCM_SEND_HOST, urlPath, request, http2SessionHandler);
                }
                return this.messagingRequestHandler.invokeHttpRequestHandlerForSendResponse(FCM_SEND_HOST, urlPath, request);
            });
            return Promise.allSettled(requests);
        })
            .then((results) => {
            const responses = [];
            results.forEach(result => {
                if (result.status === 'fulfilled') {
                    responses.push(result.value);
                }
                else { // rejected
                    responses.push({ success: false, error: result.reason });
                }
            });
            const successCount = responses.filter((resp) => resp.success).length;
            return {
                responses,
                successCount,
                failureCount: responses.length - successCount,
            };
        })
            .finally(() => {
            if (http2SessionHandler) {
                http2SessionHandler.close();
            }
        });
    }
    /**
     * Sends the given multicast message to all the FCM registration tokens
     * specified in it.
     *
     * This method uses the {@link Messaging.sendEach} API under the hood to send the given
     * message to all the target recipients. The responses list obtained from the
     * return value corresponds to the order of tokens in the `MulticastMessage`.
     * An error from this method or a `BatchResponse` with all failures indicates a total
     * failure, meaning that the messages in the list could be sent. Partial failures or
     * failures are only indicated by a `BatchResponse` return value.
     *
     * @param message - A multicast message
     *   containing up to 500 tokens.
     * @param dryRun - Whether to send the message in the dry-run
     *   (validation only) mode.
     * @returns A Promise fulfilled with an object representing the result of the
     *   send operation.
     */
    sendEachForMulticast(message, dryRun) {
        const copy = (0, deep_copy_1.deepCopy)(message);
        if (!validator.isNonNullObject(copy)) {
            throw new error_1.FirebaseMessagingError(error_1.MessagingClientErrorCode.INVALID_ARGUMENT, 'MulticastMessage must be a non-null object');
        }
        if (!validator.isNonEmptyArray(copy.tokens)) {
            throw new error_1.FirebaseMessagingError(error_1.MessagingClientErrorCode.INVALID_ARGUMENT, 'tokens must be a non-empty array');
        }
        if (copy.tokens.length > FCM_MAX_BATCH_SIZE) {
            throw new error_1.FirebaseMessagingError(error_1.MessagingClientErrorCode.INVALID_ARGUMENT, `tokens list must not contain more than ${FCM_MAX_BATCH_SIZE} items`);
        }
        const messages = copy.tokens.map((token) => {
            return {
                token,
                android: copy.android,
                apns: copy.apns,
                data: copy.data,
                notification: copy.notification,
                webpush: copy.webpush,
                fcmOptions: copy.fcmOptions,
            };
        });
        return this.sendEach(messages, dryRun);
    }
    /**
     * Sends all the messages in the given array via Firebase Cloud Messaging.
     * Employs batching to send the entire list as a single RPC call. Compared
     * to the `send()` method, this method is a significantly more efficient way
     * to send multiple messages.
     *
     * The responses list obtained from the return value
     * corresponds to the order of tokens in the `MulticastMessage`. An error
     * from this method indicates a total failure, meaning that none of the messages
     * in the list could be sent. Partial failures are indicated by a `BatchResponse`
     * return value.
     *
     * @param messages - A non-empty array
     *   containing up to 500 messages.
     * @param dryRun - Whether to send the messages in the dry-run
     *   (validation only) mode.
     * @returns A Promise fulfilled with an object representing the result of the
     *   send operation.
     *
     * @deprecated Use {@link Messaging.sendEach} instead.
     */
    sendAll(messages, dryRun) {
        if (validator.isArray(messages) && messages.constructor !== Array) {
            // In more recent JS specs, an array-like object might have a constructor that is not of
            // Array type. Our deepCopy() method doesn't handle them properly. Convert such objects to
            // a regular array here before calling deepCopy(). See issue #566 for details.
            messages = Array.from(messages);
        }
        const copy = (0, deep_copy_1.deepCopy)(messages);
        if (!validator.isNonEmptyArray(copy)) {
            throw new error_1.FirebaseMessagingError(error_1.MessagingClientErrorCode.INVALID_ARGUMENT, 'messages must be a non-empty array');
        }
        if (copy.length > FCM_MAX_BATCH_SIZE) {
            throw new error_1.FirebaseMessagingError(error_1.MessagingClientErrorCode.INVALID_ARGUMENT, `messages list must not contain more than ${FCM_MAX_BATCH_SIZE} items`);
        }
        if (typeof dryRun !== 'undefined' && !validator.isBoolean(dryRun)) {
            throw new error_1.FirebaseMessagingError(error_1.MessagingClientErrorCode.INVALID_ARGUMENT, 'dryRun must be a boolean');
        }
        return this.getUrlPath()
            .then((urlPath) => {
            const requests = copy.map((message) => {
                (0, messaging_internal_1.validateMessage)(message);
                const request = { message };
                if (dryRun) {
                    request.validate_only = true;
                }
                return {
                    url: `https://${FCM_SEND_HOST}${urlPath}`,
                    body: request,
                };
            });
            return this.messagingRequestHandler.sendBatchRequest(requests);
        });
    }
    /**
     * Sends the given multicast message to all the FCM registration tokens
     * specified in it.
     *
     * This method uses the `sendAll()` API under the hood to send the given
     * message to all the target recipients. The responses list obtained from the
     * return value corresponds to the order of tokens in the `MulticastMessage`.
     * An error from this method indicates a total failure, meaning that the message
     * was not sent to any of the tokens in the list. Partial failures are indicated
     * by a `BatchResponse` return value.
     *
     * @param message - A multicast message
     *   containing up to 500 tokens.
     * @param dryRun - Whether to send the message in the dry-run
     *   (validation only) mode.
     * @returns A Promise fulfilled with an object representing the result of the
     *   send operation.
     *
     * @deprecated Use {@link Messaging.sendEachForMulticast} instead.
     */
    sendMulticast(message, dryRun) {
        const copy = (0, deep_copy_1.deepCopy)(message);
        if (!validator.isNonNullObject(copy)) {
            throw new error_1.FirebaseMessagingError(error_1.MessagingClientErrorCode.INVALID_ARGUMENT, 'MulticastMessage must be a non-null object');
        }
        if (!validator.isNonEmptyArray(copy.tokens)) {
            throw new error_1.FirebaseMessagingError(error_1.MessagingClientErrorCode.INVALID_ARGUMENT, 'tokens must be a non-empty array');
        }
        if (copy.tokens.length > FCM_MAX_BATCH_SIZE) {
            throw new error_1.FirebaseMessagingError(error_1.MessagingClientErrorCode.INVALID_ARGUMENT, `tokens list must not contain more than ${FCM_MAX_BATCH_SIZE} items`);
        }
        const messages = copy.tokens.map((token) => {
            return {
                token,
                android: copy.android,
                apns: copy.apns,
                data: copy.data,
                notification: copy.notification,
                webpush: copy.webpush,
                fcmOptions: copy.fcmOptions,
            };
        });
        return this.sendAll(messages, dryRun);
    }
    /**
     * Sends an FCM message to a single device corresponding to the provided
     * registration token.
     *
     * See {@link https://firebase.google.com/docs/cloud-messaging/admin/legacy-fcm#send_to_individual_devices |
     * Send to individual devices}
     * for code samples and detailed documentation. Takes either a
     * `registrationToken` to send to a single device or a
     * `registrationTokens` parameter containing an array of tokens to send
     * to multiple devices.
     *
     * @param registrationToken - A device registration token or an array of
     *   device registration tokens to which the message should be sent.
     * @param payload - The message payload.
     * @param options - Optional options to
     *   alter the message.
     *
     * @returns A promise fulfilled with the server's response after the message
     *   has been sent.
     *
     * @deprecated Use {@link Messaging.send} instead.
     */
    sendToDevice(registrationTokenOrTokens, payload, options = {}) {
        // Validate the input argument types. Since these are common developer errors when getting
        // started, throw an error instead of returning a rejected promise.
        this.validateRegistrationTokensType(registrationTokenOrTokens, 'sendToDevice', error_1.MessagingClientErrorCode.INVALID_RECIPIENT);
        this.validateMessagingPayloadAndOptionsTypes(payload, options);
        return Promise.resolve()
            .then(() => {
            // Validate the contents of the input arguments. Because we are now in a promise, any thrown
            // error will cause this method to return a rejected promise.
            this.validateRegistrationTokens(registrationTokenOrTokens, 'sendToDevice', error_1.MessagingClientErrorCode.INVALID_RECIPIENT);
            const payloadCopy = this.validateMessagingPayload(payload);
            const optionsCopy = this.validateMessagingOptions(options);
            const request = (0, deep_copy_1.deepCopy)(payloadCopy);
            (0, deep_copy_1.deepExtend)(request, optionsCopy);
            if (validator.isString(registrationTokenOrTokens)) {
                request.to = registrationTokenOrTokens;
            }
            else {
                request.registration_ids = registrationTokenOrTokens;
            }
            return this.messagingRequestHandler.invokeRequestHandler(FCM_SEND_HOST, FCM_SEND_PATH, request);
        })
            .then((response) => {
            // The sendToDevice() and sendToDeviceGroup() methods both set the `to` query parameter in
            // the underlying FCM request. If the provided registration token argument is actually a
            // valid notification key, the response from the FCM server will be a device group response.
            // If that is the case, we map the response to a MessagingDeviceGroupResponse.
            // See b/35394951 for more context.
            if ('multicast_id' in response) {
                return mapRawResponseToDevicesResponse(response);
            }
            else {
                const groupResponse = mapRawResponseToDeviceGroupResponse(response);
                return {
                    ...groupResponse,
                    canonicalRegistrationTokenCount: -1,
                    multicastId: -1,
                    results: [],
                };
            }
        });
    }
    /**
     * Sends an FCM message to a device group corresponding to the provided
     * notification key.
     *
     * See {@link https://firebase.google.com/docs/cloud-messaging/admin/legacy-fcm#send_to_a_device_group |
     * Send to a device group} for code samples and detailed documentation.
     *
     * @param notificationKey - The notification key for the device group to
     *   which to send the message.
     * @param payload - The message payload.
     * @param options - Optional options to
     *   alter the message.
     *
     * @returns A promise fulfilled with the server's response after the message
     *   has been sent.
     *
     * @deprecated Use {@link Messaging.send} instead.
     */
    sendToDeviceGroup(notificationKey, payload, options = {}) {
        if (!validator.isNonEmptyString(notificationKey)) {
            throw new error_1.FirebaseMessagingError(error_1.MessagingClientErrorCode.INVALID_RECIPIENT, 'Notification key provided to sendToDeviceGroup() must be a non-empty string.');
        }
        else if (notificationKey.indexOf(':') !== -1) {
            // It is possible the developer provides a registration token instead of a notification key
            // to this method. We can detect some of those cases by checking to see if the string contains
            // a colon. Not all registration tokens will contain a colon (only newer ones will), but no
            // notification keys will contain a colon, so we can use it as a rough heuristic.
            // See b/35394951 for more context.
            return Promise.reject(new error_1.FirebaseMessagingError(error_1.MessagingClientErrorCode.INVALID_RECIPIENT, 'Notification key provided to sendToDeviceGroup() has the format of a registration token. ' +
                'You should use sendToDevice() instead.'));
        }
        // Validate the types of the payload and options arguments. Since these are common developer
        // errors, throw an error instead of returning a rejected promise.
        this.validateMessagingPayloadAndOptionsTypes(payload, options);
        return Promise.resolve()
            .then(() => {
            // Validate the contents of the payload and options objects. Because we are now in a
            // promise, any thrown error will cause this method to return a rejected promise.
            const payloadCopy = this.validateMessagingPayload(payload);
            const optionsCopy = this.validateMessagingOptions(options);
            const request = (0, deep_copy_1.deepCopy)(payloadCopy);
            (0, deep_copy_1.deepExtend)(request, optionsCopy);
            request.to = notificationKey;
            return this.messagingRequestHandler.invokeRequestHandler(FCM_SEND_HOST, FCM_SEND_PATH, request);
        })
            .then((response) => {
            // The sendToDevice() and sendToDeviceGroup() methods both set the `to` query parameter in
            // the underlying FCM request. If the provided notification key argument has an invalid
            // format (that is, it is either a registration token or some random string), the response
            // from the FCM server will default to a devices response (which we detect by looking for
            // the `multicast_id` property). If that is the case, we either throw an error saying the
            // provided notification key is invalid (if the message failed to send) or map the response
            // to a MessagingDevicesResponse (if the message succeeded).
            // See b/35394951 for more context.
            if ('multicast_id' in response) {
                if (response.success === 0) {
                    throw new error_1.FirebaseMessagingError(error_1.MessagingClientErrorCode.INVALID_RECIPIENT, 'Notification key provided to sendToDeviceGroup() is invalid.');
                }
                else {
                    const devicesResponse = mapRawResponseToDevicesResponse(response);
                    return {
                        ...devicesResponse,
                        failedRegistrationTokens: [],
                    };
                }
            }
            return mapRawResponseToDeviceGroupResponse(response);
        });
    }
    /**
     * Sends an FCM message to a topic.
     *
     * See {@link https://firebase.google.com/docs/cloud-messaging/admin/legacy-fcm#send_to_a_topic |
     * Send to a topic} for code samples and detailed documentation.
     *
     * @param topic - The topic to which to send the message.
     * @param payload - The message payload.
     * @param options - Optional options to
     *   alter the message.
     *
     * @returns A promise fulfilled with the server's response after the message
     *   has been sent.
     *
     * @deprecated Use {@link Messaging.send} instead.
     */
    sendToTopic(topic, payload, options = {}) {
        // Validate the input argument types. Since these are common developer errors when getting
        // started, throw an error instead of returning a rejected promise.
        this.validateTopicType(topic, 'sendToTopic', error_1.MessagingClientErrorCode.INVALID_RECIPIENT);
        this.validateMessagingPayloadAndOptionsTypes(payload, options);
        // Prepend the topic with /topics/ if necessary.
        topic = this.normalizeTopic(topic);
        return Promise.resolve()
            .then(() => {
            // Validate the contents of the payload and options objects. Because we are now in a
            // promise, any thrown error will cause this method to return a rejected promise.
            const payloadCopy = this.validateMessagingPayload(payload);
            const optionsCopy = this.validateMessagingOptions(options);
            this.validateTopic(topic, 'sendToTopic', error_1.MessagingClientErrorCode.INVALID_RECIPIENT);
            const request = (0, deep_copy_1.deepCopy)(payloadCopy);
            (0, deep_copy_1.deepExtend)(request, optionsCopy);
            request.to = topic;
            return this.messagingRequestHandler.invokeRequestHandler(FCM_SEND_HOST, FCM_SEND_PATH, request);
        })
            .then((response) => {
            // Rename properties on the server response
            utils.renameProperties(response, MESSAGING_TOPIC_RESPONSE_KEYS_MAP);
            return response;
        });
    }
    /**
     * Sends an FCM message to a condition.
     *
     * See {@link https://firebase.google.com/docs/cloud-messaging/admin/legacy-fcm#send_to_a_condition |
     * Send to a condition}
     * for code samples and detailed documentation.
     *
     * @param condition - The condition determining to which topics to send
     *   the message.
     * @param payload - The message payload.
     * @param options - Optional options to
     *   alter the message.
     *
     * @returns A promise fulfilled with the server's response after the message
     *   has been sent.
     *
     * @deprecated Use {@link Messaging.send} instead.
     */
    sendToCondition(condition, payload, options = {}) {
        if (!validator.isNonEmptyString(condition)) {
            throw new error_1.FirebaseMessagingError(error_1.MessagingClientErrorCode.INVALID_RECIPIENT, 'Condition provided to sendToCondition() must be a non-empty string.');
        }
        // Validate the types of the payload and options arguments. Since these are common developer
        // errors, throw an error instead of returning a rejected promise.
        this.validateMessagingPayloadAndOptionsTypes(payload, options);
        // The FCM server rejects conditions which are surrounded in single quotes. When the condition
        // is stringified over the wire, double quotes in it get converted to \" which the FCM server
        // does not properly handle. We can get around this by replacing internal double quotes with
        // single quotes.
        condition = condition.replace(/"/g, '\'');
        return Promise.resolve()
            .then(() => {
            // Validate the contents of the payload and options objects. Because we are now in a
            // promise, any thrown error will cause this method to return a rejected promise.
            const payloadCopy = this.validateMessagingPayload(payload);
            const optionsCopy = this.validateMessagingOptions(options);
            const request = (0, deep_copy_1.deepCopy)(payloadCopy);
            (0, deep_copy_1.deepExtend)(request, optionsCopy);
            request.condition = condition;
            return this.messagingRequestHandler.invokeRequestHandler(FCM_SEND_HOST, FCM_SEND_PATH, request);
        })
            .then((response) => {
            // Rename properties on the server response
            utils.renameProperties(response, MESSAGING_CONDITION_RESPONSE_KEYS_MAP);
            return response;
        });
    }
    /**
     * Subscribes a device to an FCM topic.
     *
     * See {@link https://firebase.google.com/docs/cloud-messaging/manage-topics#suscribe_and_unsubscribe_using_the |
     * Subscribe to a topic}
     * for code samples and detailed documentation. Optionally, you can provide an
     * array of tokens to subscribe multiple devices.
     *
     * @param registrationTokens - A token or array of registration tokens
     *   for the devices to subscribe to the topic.
     * @param topic - The topic to which to subscribe.
     *
     * @returns A promise fulfilled with the server's response after the device has been
     *   subscribed to the topic.
     */
    subscribeToTopic(registrationTokenOrTokens, topic) {
        return this.sendTopicManagementRequest(registrationTokenOrTokens, topic, 'subscribeToTopic', FCM_TOPIC_MANAGEMENT_ADD_PATH);
    }
    /**
     * Unsubscribes a device from an FCM topic.
     *
     * See {@link https://firebase.google.com/docs/cloud-messaging/admin/manage-topic-subscriptions#unsubscribe_from_a_topic |
     * Unsubscribe from a topic}
     * for code samples and detailed documentation.  Optionally, you can provide an
     * array of tokens to unsubscribe multiple devices.
     *
     * @param registrationTokens - A device registration token or an array of
     *   device registration tokens to unsubscribe from the topic.
     * @param topic - The topic from which to unsubscribe.
     *
     * @returns A promise fulfilled with the server's response after the device has been
     *   unsubscribed from the topic.
     */
    unsubscribeFromTopic(registrationTokenOrTokens, topic) {
        return this.sendTopicManagementRequest(registrationTokenOrTokens, topic, 'unsubscribeFromTopic', FCM_TOPIC_MANAGEMENT_REMOVE_PATH);
    }
    getUrlPath() {
        if (this.urlPath) {
            return Promise.resolve(this.urlPath);
        }
        return utils.findProjectId(this.app)
            .then((projectId) => {
            if (!validator.isNonEmptyString(projectId)) {
                // Assert for an explicit project ID (either via AppOptions or the cert itself).
                throw new error_1.FirebaseMessagingError(error_1.MessagingClientErrorCode.INVALID_ARGUMENT, 'Failed to determine project ID for Messaging. Initialize the '
                    + 'SDK with service account credentials or set project ID as an app option. '
                    + 'Alternatively set the GOOGLE_CLOUD_PROJECT environment variable.');
            }
            this.urlPath = `/v1/projects/${projectId}/messages:send`;
            return this.urlPath;
        });
    }
    /**
     * Helper method which sends and handles topic subscription management requests.
     *
     * @param registrationTokenOrTokens - The registration token or an array of
     *     registration tokens to unsubscribe from the topic.
     * @param topic - The topic to which to subscribe.
     * @param methodName - The name of the original method called.
     * @param path - The endpoint path to use for the request.
     *
     * @returns A Promise fulfilled with the parsed server
     *   response.
     */
    sendTopicManagementRequest(registrationTokenOrTokens, topic, methodName, path) {
        this.validateRegistrationTokensType(registrationTokenOrTokens, methodName);
        this.validateTopicType(topic, methodName);
        // Prepend the topic with /topics/ if necessary.
        topic = this.normalizeTopic(topic);
        return Promise.resolve()
            .then(() => {
            // Validate the contents of the input arguments. Because we are now in a promise, any thrown
            // error will cause this method to return a rejected promise.
            this.validateRegistrationTokens(registrationTokenOrTokens, methodName);
            this.validateTopic(topic, methodName);
            // Ensure the registration token(s) input argument is an array.
            let registrationTokensArray = registrationTokenOrTokens;
            if (validator.isString(registrationTokenOrTokens)) {
                registrationTokensArray = [registrationTokenOrTokens];
            }
            const request = {
                to: topic,
                registration_tokens: registrationTokensArray,
            };
            return this.messagingRequestHandler.invokeRequestHandler(FCM_TOPIC_MANAGEMENT_HOST, path, request);
        })
            .then((response) => {
            return mapRawResponseToTopicManagementResponse(response);
        });
    }
    /**
     * Validates the types of the messaging payload and options. If invalid, an error will be thrown.
     *
     * @param payload - The messaging payload to validate.
     * @param options - The messaging options to validate.
     */
    validateMessagingPayloadAndOptionsTypes(payload, options) {
        // Validate the payload is an object
        if (!validator.isNonNullObject(payload)) {
            throw new error_1.FirebaseMessagingError(error_1.MessagingClientErrorCode.INVALID_PAYLOAD, 'Messaging payload must be an object with at least one of the "data" or "notification" properties.');
        }
        // Validate the options argument is an object
        if (!validator.isNonNullObject(options)) {
            throw new error_1.FirebaseMessagingError(error_1.MessagingClientErrorCode.INVALID_OPTIONS, 'Messaging options must be an object.');
        }
    }
    /**
     * Validates the messaging payload. If invalid, an error will be thrown.
     *
     * @param payload - The messaging payload to validate.
     *
     * @returns A copy of the provided payload with whitelisted properties switched
     *     from camelCase to underscore_case.
     */
    validateMessagingPayload(payload) {
        const payloadCopy = (0, deep_copy_1.deepCopy)(payload);
        const payloadKeys = Object.keys(payloadCopy);
        const validPayloadKeys = ['data', 'notification'];
        let containsDataOrNotificationKey = false;
        payloadKeys.forEach((payloadKey) => {
            // Validate the payload does not contain any invalid keys
            if (validPayloadKeys.indexOf(payloadKey) === -1) {
                throw new error_1.FirebaseMessagingError(error_1.MessagingClientErrorCode.INVALID_PAYLOAD, `Messaging payload contains an invalid "${payloadKey}" property. Valid properties are ` +
                    '"data" and "notification".');
            }
            else {
                containsDataOrNotificationKey = true;
            }
        });
        // Validate the payload contains at least one of the "data" and "notification" keys
        if (!containsDataOrNotificationKey) {
            throw new error_1.FirebaseMessagingError(error_1.MessagingClientErrorCode.INVALID_PAYLOAD, 'Messaging payload must contain at least one of the "data" or "notification" properties.');
        }
        const validatePayload = (payloadKey, value) => {
            // Validate each top-level key in the payload is an object
            if (!validator.isNonNullObject(value)) {
                throw new error_1.FirebaseMessagingError(error_1.MessagingClientErrorCode.INVALID_PAYLOAD, `Messaging payload contains an invalid value for the "${payloadKey}" property. ` +
                    'Value must be an object.');
            }
            Object.keys(value).forEach((subKey) => {
                if (!validator.isString(value[subKey])) {
                    // Validate all sub-keys have a string value
                    throw new error_1.FirebaseMessagingError(error_1.MessagingClientErrorCode.INVALID_PAYLOAD, `Messaging payload contains an invalid value for the "${payloadKey}.${subKey}" ` +
                        'property. Values must be strings.');
                }
                else if (payloadKey === 'data' && /^google\./.test(subKey)) {
                    // Validate the data payload does not contain keys which start with 'google.'.
                    throw new error_1.FirebaseMessagingError(error_1.MessagingClientErrorCode.INVALID_PAYLOAD, `Messaging payload contains the blacklisted "data.${subKey}" property.`);
                }
            });
        };
        if (payloadCopy.data !== undefined) {
            validatePayload('data', payloadCopy.data);
        }
        if (payloadCopy.notification !== undefined) {
            validatePayload('notification', payloadCopy.notification);
        }
        // Validate the data payload object does not contain blacklisted properties
        if ('data' in payloadCopy) {
            messaging_internal_1.BLACKLISTED_DATA_PAYLOAD_KEYS.forEach((blacklistedKey) => {
                if (blacklistedKey in payloadCopy.data) {
                    throw new error_1.FirebaseMessagingError(error_1.MessagingClientErrorCode.INVALID_PAYLOAD, `Messaging payload contains the blacklisted "data.${blacklistedKey}" property.`);
                }
            });
        }
        // Convert whitelisted camelCase keys to underscore_case
        if (payloadCopy.notification) {
            utils.renameProperties(payloadCopy.notification, CAMELCASED_NOTIFICATION_PAYLOAD_KEYS_MAP);
        }
        return payloadCopy;
    }
    /**
     * Validates the messaging options. If invalid, an error will be thrown.
     *
     * @param options - The messaging options to validate.
     *
     * @returns A copy of the provided options with whitelisted properties switched
     *   from camelCase to underscore_case.
     */
    validateMessagingOptions(options) {
        const optionsCopy = (0, deep_copy_1.deepCopy)(options);
        // Validate the options object does not contain blacklisted properties
        messaging_internal_1.BLACKLISTED_OPTIONS_KEYS.forEach((blacklistedKey) => {
            if (blacklistedKey in optionsCopy) {
                throw new error_1.FirebaseMessagingError(error_1.MessagingClientErrorCode.INVALID_OPTIONS, `Messaging options contains the blacklisted "${blacklistedKey}" property.`);
            }
        });
        // Convert whitelisted camelCase keys to underscore_case
        utils.renameProperties(optionsCopy, CAMELCASE_OPTIONS_KEYS_MAP);
        // Validate the options object contains valid values for whitelisted properties
        if ('collapse_key' in optionsCopy && !validator.isNonEmptyString(optionsCopy.collapse_key)) {
            const keyName = ('collapseKey' in options) ? 'collapseKey' : 'collapse_key';
            throw new error_1.FirebaseMessagingError(error_1.MessagingClientErrorCode.INVALID_OPTIONS, `Messaging options contains an invalid value for the "${keyName}" property. Value must ` +
                'be a non-empty string.');
        }
        else if ('dry_run' in optionsCopy && !validator.isBoolean(optionsCopy.dry_run)) {
            const keyName = ('dryRun' in options) ? 'dryRun' : 'dry_run';
            throw new error_1.FirebaseMessagingError(error_1.MessagingClientErrorCode.INVALID_OPTIONS, `Messaging options contains an invalid value for the "${keyName}" property. Value must ` +
                'be a boolean.');
        }
        else if ('priority' in optionsCopy && !validator.isNonEmptyString(optionsCopy.priority)) {
            throw new error_1.FirebaseMessagingError(error_1.MessagingClientErrorCode.INVALID_OPTIONS, 'Messaging options contains an invalid value for the "priority" property. Value must ' +
                'be a non-empty string.');
        }
        else if ('restricted_package_name' in optionsCopy &&
            !validator.isNonEmptyString(optionsCopy.restricted_package_name)) {
            const keyName = ('restrictedPackageName' in options) ? 'restrictedPackageName' : 'restricted_package_name';
            throw new error_1.FirebaseMessagingError(error_1.MessagingClientErrorCode.INVALID_OPTIONS, `Messaging options contains an invalid value for the "${keyName}" property. Value must ` +
                'be a non-empty string.');
        }
        else if ('time_to_live' in optionsCopy && !validator.isNumber(optionsCopy.time_to_live)) {
            const keyName = ('timeToLive' in options) ? 'timeToLive' : 'time_to_live';
            throw new error_1.FirebaseMessagingError(error_1.MessagingClientErrorCode.INVALID_OPTIONS, `Messaging options contains an invalid value for the "${keyName}" property. Value must ` +
                'be a number.');
        }
        else if ('content_available' in optionsCopy && !validator.isBoolean(optionsCopy.content_available)) {
            const keyName = ('contentAvailable' in options) ? 'contentAvailable' : 'content_available';
            throw new error_1.FirebaseMessagingError(error_1.MessagingClientErrorCode.INVALID_OPTIONS, `Messaging options contains an invalid value for the "${keyName}" property. Value must ` +
                'be a boolean.');
        }
        else if ('mutable_content' in optionsCopy && !validator.isBoolean(optionsCopy.mutable_content)) {
            const keyName = ('mutableContent' in options) ? 'mutableContent' : 'mutable_content';
            throw new error_1.FirebaseMessagingError(error_1.MessagingClientErrorCode.INVALID_OPTIONS, `Messaging options contains an invalid value for the "${keyName}" property. Value must ` +
                'be a boolean.');
        }
        return optionsCopy;
    }
    /**
     * Validates the type of the provided registration token(s). If invalid, an error will be thrown.
     *
     * @param registrationTokenOrTokens - The registration token(s) to validate.
     * @param method - The method name to use in error messages.
     * @param errorInfo - The error info to use if the registration tokens are invalid.
     */
    validateRegistrationTokensType(registrationTokenOrTokens, methodName, errorInfo = error_1.MessagingClientErrorCode.INVALID_ARGUMENT) {
        if (!validator.isNonEmptyArray(registrationTokenOrTokens) &&
            !validator.isNonEmptyString(registrationTokenOrTokens)) {
            throw new error_1.FirebaseMessagingError(errorInfo, `Registration token(s) provided to ${methodName}() must be a non-empty string or a ` +
                'non-empty array.');
        }
    }
    /**
     * Validates the provided registration tokens. If invalid, an error will be thrown.
     *
     * @param registrationTokenOrTokens - The registration token or an array of
     *     registration tokens to validate.
     * @param method - The method name to use in error messages.
     * @param errorInfo - The error info to use if the registration tokens are invalid.
     */
    validateRegistrationTokens(registrationTokenOrTokens, methodName, errorInfo = error_1.MessagingClientErrorCode.INVALID_ARGUMENT) {
        if (validator.isArray(registrationTokenOrTokens)) {
            // Validate the array contains no more than 1,000 registration tokens.
            if (registrationTokenOrTokens.length > 1000) {
                throw new error_1.FirebaseMessagingError(errorInfo, `Too many registration tokens provided in a single request to ${methodName}(). Batch ` +
                    'your requests to contain no more than 1,000 registration tokens per request.');
            }
            // Validate the array contains registration tokens which are non-empty strings.
            registrationTokenOrTokens.forEach((registrationToken, index) => {
                if (!validator.isNonEmptyString(registrationToken)) {
                    throw new error_1.FirebaseMessagingError(errorInfo, `Registration token provided to ${methodName}() at index ${index} must be a ` +
                        'non-empty string.');
                }
            });
        }
    }
    /**
     * Validates the type of the provided topic. If invalid, an error will be thrown.
     *
     * @param topic - The topic to validate.
     * @param method - The method name to use in error messages.
     * @param errorInfo - The error info to use if the topic is invalid.
     */
    validateTopicType(topic, methodName, errorInfo = error_1.MessagingClientErrorCode.INVALID_ARGUMENT) {
        if (!validator.isNonEmptyString(topic)) {
            throw new error_1.FirebaseMessagingError(errorInfo, `Topic provided to ${methodName}() must be a string which matches the format ` +
                '"/topics/[a-zA-Z0-9-_.~%]+".');
        }
    }
    /**
     * Validates the provided topic. If invalid, an error will be thrown.
     *
     * @param topic - The topic to validate.
     * @param method - The method name to use in error messages.
     * @param errorInfo - The error info to use if the topic is invalid.
     */
    validateTopic(topic, methodName, errorInfo = error_1.MessagingClientErrorCode.INVALID_ARGUMENT) {
        if (!validator.isTopic(topic)) {
            throw new error_1.FirebaseMessagingError(errorInfo, `Topic provided to ${methodName}() must be a string which matches the format ` +
                '"/topics/[a-zA-Z0-9-_.~%]+".');
        }
    }
    /**
     * Normalizes the provided topic name by prepending it with '/topics/', if necessary.
     *
     * @param topic - The topic name to normalize.
     *
     * @returns The normalized topic name.
     */
    normalizeTopic(topic) {
        if (!/^\/topics\//.test(topic)) {
            topic = `/topics/${topic}`;
        }
        return topic;
    }
}
exports.Messaging = Messaging;
