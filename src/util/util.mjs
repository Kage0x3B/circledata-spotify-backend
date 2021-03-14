/*
The default Date.toJSON() doesn't respect timezones which can shift the day by one
*/
function convertDateToJSON(date) {
    const timezoneOffsetInHours = -(date.getTimezoneOffset() / 60); //UTC minus local time
    const sign = timezoneOffsetInHours >= 0 ? "+" : "-";
    const leadingZero = Math.abs(timezoneOffsetInHours) < 10 ? "0" : "";

    const correctedDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        date.getHours(),
        date.getMinutes(),
        date.getSeconds(),
        date.getMilliseconds()
    );
    correctedDate.setHours(date.getHours() + timezoneOffsetInHours);

    return correctedDate.toISOString().replace("Z", "");
}

function isFunction(functionToCheck) {
    return functionToCheck && {}.toString.call(functionToCheck) === "[object Function]";
}

export default {
    convertDateToJSON,
    isFunction
};
