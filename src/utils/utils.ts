// 防抖
export function debounce(cb: (...arg: any[]) => any, thisObj?: any, wait = 1000) {
    let timer: any = null;

    return (...args: any[]) => {
        if (timer) clearTimeout(timer);

        timer = setTimeout(() => {
            timer = null;
            cb.apply(thisObj, args);
        }, wait);
    };
}
