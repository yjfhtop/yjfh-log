// 日期处理
/**
 * 格式化日期  单个字母是不补0的返回
 * @param date
 * @param formStr
 */
export function formDate(date: string | number | Date, formStr = 'YYYY-MM-DD HH:mm:ss') {
    const useDate = new Date(date);
    const year = `${useDate.getFullYear()}`;
    const month = `${useDate.getMonth() + 1}`;
    const day = `${useDate.getDate()}`;

    const hour = `${useDate.getHours()}`;
    const minute = `${useDate.getMinutes()}`;
    const second = `${useDate.getSeconds()}`;
    const millisecond = `${useDate.getMilliseconds()}`;

    const fillMonth = month.length >= 2 ? month : `0${month}`;
    const fillDay = day.length >= 2 ? day : `0${day}`;
    const fillHour = hour.length >= 2 ? hour : `0${hour}`;
    const fillMinute = minute.length >= 2 ? minute : `0${minute}`;
    const fillSecond = second.length >= 2 ? second : `0${second}`;
    const fillMillisecond = millisecond.padStart(3, '0');

    const formObj = {
        YYYY: year,
        MM: fillMonth,
        M: month,
        D: day,
        DD: fillDay,
        H: hour,
        HH: fillHour,
        m: minute,
        mm: fillMinute,
        s: second,
        ss: fillSecond,
        // 毫秒 不补0
        S: millisecond,
        // 毫秒 补0
        SSS: fillMillisecond,
    };

    let use = formStr;
    // 对key 进行长度排序， 防止正则匹配的影响， 比如 D 对 DD的影响
    const keyArr = Object.keys(formObj).sort((a: string, b: string) => {
        if (a.length > b.length) {
            return -1;
        }
        return 1;
    });
    keyArr.forEach((key: keyof typeof formObj) => {
        const v = formObj[key];
        use = use.replace(new RegExp(`(${key}){1,1}`, 'g'), v);
    });
    return use;
}
