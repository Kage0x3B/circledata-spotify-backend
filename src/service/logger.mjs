import db from "./db.mjs";

const logLevel = Object.freeze({
    error: "error",
    warning: "warning",
    info: "info",
    debug: "debug"
});

const logTag = Object.freeze({
    general: "general",
    auth: "auth",
    event: "event",
    task: "task",
    cronJob: "cronJob",
    printer: "printer",
    shipping: "shipping",
    webhook: "webhook"
});

function log(level = logLevel.info, tag = logTag.general, summary = "", data = {}) {
    const logUserId = data.userId || 0;
    const logTaskId = data.taskId || 0;
    const logOrderId = data.orderId || 0;

    console.log(`${level}#${tag}`, summary);

    db.query("INSERT INTO log (logLevel, tag, summary, data, userId, taskId, orderId) VALUES (?, ?, ?, ?, ?, ?, ?)", [
        level,
        tag,
        summary,
        JSON.stringify(data),
        logUserId,
        logTaskId,
        logOrderId
    ]);

    /*if (level === logLevel.warning || level === logLevel.error) {
    const telegramMessage = `[<b>${level}/${tag}</b>]\n${summary || "No summary"}\n\n<pre><code>${JSON.stringify(data, null, 2)}</code></pre>`;
    sendMessage(telegramMessage, {
      parse_mode: "HTML"
    });
  }*/
}

function error(tag, summary, data = {}) {
    log(logLevel.error, tag, summary, data);
}

function warning(tag, summary, data = {}) {
    log(logLevel.warning, tag, summary, data);
}

function info(tag, summary, data = {}) {
    log(logLevel.info, tag, summary, data);
}

function debug(tag, summary, data = {}) {
    log(logLevel.debug, tag, summary, data);
}

const logger = {
    log,
    error,
    warning,
    info,
    debug
};

function createTagLogger(tag) {
    return {
        log: (level, summary, data = {}) => {
            logger.log(level, tag, summary, data);
        },
        error: (summary, data = {}) => {
            logger.error(tag, summary, data);
        },
        warning: (summary, data = {}) => {
            logger.warning(tag, summary, data);
        },
        info: (summary, data = {}) => {
            logger.info(tag, summary, data);
        },
        debug: (summary, data = {}) => {
            logger.debug(tag, summary, data);
        }
    };
}

export default logger;

const generalLogger = createTagLogger(logTag.general);
const authLogger = createTagLogger(logTag.auth);
const eventLogger = createTagLogger(logTag.event);
const taskLogger = createTagLogger(logTag.task);
const cronJobLogger = createTagLogger(logTag.cronJob);
const printerLogger = createTagLogger(logTag.printer);
const shippingLogger = createTagLogger(logTag.shipping);
const webhookLogger = createTagLogger(logTag.webhook);

export {
    logLevel,
    logTag,
    generalLogger,
    authLogger,
    eventLogger,
    taskLogger,
    cronJobLogger,
    printerLogger,
    shippingLogger,
    webhookLogger
};
