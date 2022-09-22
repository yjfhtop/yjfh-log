import { Console } from 'node:console';
import { data2VisualStr, ErrInfo, getDataType, prototypeAddToJSON } from './utils/data';
import { debounce } from './utils/utils';
import { formDate } from './utils/date';

export enum LV {
    l = 'l',
    w = 'w',
    e = 'e',
    pe = 'pe',
    // null
    n = 'n',
}

export interface LogItem {
    // time: number; // 时间戳
    date: string; // 时间戳 的可视
    txt: string; // 日志本体
    lv: LV;
    errInfos?: ErrInfo[];
}

export type SendFun = (arr: string[]) => Promise<any>;

export interface VLogConf {
    // 存储的 localStorage 的 key
    localStorageKey: string;
    sIndexKey: string;
    eIndexKey: string;
    // 开启时, 不会收集日志, 和使用 console 一致
    disableCollect: boolean;
    // 开启时, 不会 调用 console 的方法 打印日志
    disableLog: boolean;
    // 最长的日志条数, 超出这个长度会丢弃之前的日志
    maxLogLength: number;
    // 保存的防抖时间: 假设设置1000ms, 每900ms 出现一条日志, 存储就会被一直延后, 可能导致无法存储在本地.  所以出现了 minSavaTime, 无论怎么延后, minSavaTime 超过了 minSavaTime 时间没有存储,就会被存储一次
    debounceTime: number;
    // 没间隔多少ms存储在本地一次, 0 为不开启本项
    minSavaTime: number;
    // 用于将日志提交到后台提交到后台
    sendFun?: SendFun;
    // 每个item 变成 json 后最长能够为多长, 如果大于这个数, 就会占用 maxLogLength 额外长度, 比如 item 长度为1000, itemMaxLen 为: 256, 那么将占用 4个位置
    itemMaxLen?: number;
    setItem: (key: string, data: any) => any;
    getItem: (key: string) => string;
    removeItem: (key: string) => any;
}
const DefConf: VLogConf = {
    localStorageKey: '_v',
    sIndexKey: '_sk',
    eIndexKey: '_ek',
    disableCollect: false,
    disableLog: false,
    maxLogLength: 1000,
    debounceTime: 1000 * 2,
    minSavaTime: 1000 * 5,
    itemMaxLen: 1024,
    setItem: (key: string, data: any) => {
        localStorage.setItem(key, data);
    },
    getItem(key: string) {
        return localStorage.getItem(key);
    },
    removeItem(key: string) {
        return localStorage.removeItem(key);
    },
};
export default class VLog {
    // 和 localStorage 组成 存储的 key
    // private nowIndex = 0;

    private readonly conf: VLogConf = { ...DefConf };

    // 数据的开始下标
    private _sIndex: number;

    // 数据的开始下标
    get sIndex() {
        return this._sIndex;
    }

    set sIndex(v: number) {
        this._sIndex = v;
        localStorage.setItem(this.conf.sIndexKey, JSON.stringify(v));
    }

    // 数据的结束下标
    private _eIndex: number;

    // 数据的结束下标
    get eIndex() {
        return this._eIndex;
    }

    set eIndex(v: number) {
        this._eIndex = v;
        localStorage.setItem(this.conf.eIndexKey, JSON.stringify(v));
    }

    private oldLog: Console['log'];

    private oldWarn: Console['warn'];

    private oldErr: Console['error'];

    // 用于缓冲
    private bufferArr: string[] = [];

    // 用于保存 定时器id
    private saveTimeoutID: any = null;

    // 生成log item
    static generateLogItem(data: any, lv: LV) {
        const id = formDate(new Date());
        const item: LogItem = {
            date: id,
            txt: data2VisualStr(data),
            lv,
        };
        return item;
    }

    // static setItem(key: string,)

    // 获取当前存储的数据
    get allDataLen(): number {
        const { conf } = this;
        const { maxLogLength } = conf;
        // 下标1,0只会出现在第一次初始化时
        if (this.eIndex === 0) return 0;
        if (this.eIndex >= this.sIndex) {
            return this.eIndex - this.sIndex + 1;
        }
        return maxLogLength - this.sIndex + 1 + this.eIndex;
    }

    // 获取存储的数据
    get saveDataArr(): string[] {
        const { conf, allDataLen } = this;
        const { maxLogLength } = conf;
        // const { allDataLen } = this;
        const targetArr: string[] = [];
        let nowIndex = this.sIndex;

        if (allDataLen === 0) {
            return targetArr;
        }

        for (let i = 0; i < allDataLen; i++) {
            const key = conf.localStorageKey + nowIndex;
            const dataStr = localStorage.getItem(key);
            if (dataStr) {
                targetArr.push(dataStr);
            }

            nowIndex++;
            if (nowIndex > maxLogLength) {
                nowIndex = 1;
            }
        }
        return targetArr;
    }

    constructor(conf: Partial<VLogConf>) {
        this.conf = Object.assign(JSON.parse(JSON.stringify(DefConf)), conf);
        this.conf.getItem = this.conf.getItem || DefConf.getItem;
        this.conf.setItem = this.conf.setItem || DefConf.setItem;
        this.conf.removeItem = this.conf.removeItem || DefConf.removeItem;
        // 开始下标为1
        this.initIndex();
        // 对 addBufferArr 节流
        // this.addBufferArr = debounce(this.addBufferArr, this, 1000);
        this.saveBufferArrDebounce = debounce(this.saveBufferArr, this, this.conf.debounceTime);
        this.init();
        // 为了唤醒 minSavaTime
        this.saveBufferArr();
    }

    // 初始化指针坐标
    private initIndex() {
        const c = this.conf;
        const sIndexStr = localStorage.getItem(c.sIndexKey);
        const eIndexStr = localStorage.getItem(c.eIndexKey);
        // 开始下标为1, 为什么坐标为0? 因为第一次时, 是没有值的
        if (sIndexStr && eIndexStr) {
            this.sIndex = parseInt(sIndexStr, 10) || 1;
            this.eIndex = parseInt(eIndexStr, 10) || 0;
        } else {
            this.sIndex = 1;
            this.eIndex = 0;
        }
    }

    // 记录原方法
    private initOldPrototype() {
        this.oldLog = console.log.bind(console);
        this.oldWarn = console.warn.bind(console);
        this.oldErr = console.error.bind(console);
    }

    // 原方法替换
    private prototypeRep() {
        console.log = (...data: any[]) => {
            if (!this.conf.disableCollect) {
                const logItem: LogItem = VLog.generateLogItem(data, LV.l);
                this.addBufferArr(logItem);
            }
            !this.conf.disableLog && this.oldLog(...data);
        };
        console.warn = (...data: any[]) => {
            if (!this.conf.disableCollect) {
                const logItem: LogItem = VLog.generateLogItem(data, LV.w);
                this.addBufferArr(logItem);
            }
            !this.conf.disableLog && this.oldWarn(...data);
        };
        console.error = (...data: any[]) => {
            if (!this.conf.disableCollect) {
                const logItem: LogItem = VLog.generateLogItem(data, LV.e);
                this.addBufferArr(logItem);
            }
            !this.conf.disableLog && this.oldErr(...data);
        };
    }

    // 错误监控
    private errMonitor() {
        // 监听资源错误 以及 代码错误. 缺点 new Img 等资源错误无法监听, 第三方框架 比如 vue的错误无法监听(如果第三方框架错误抛出是通过 console.error 等, 则是可以 通过替换 console.error | throw 方法来捕获)
        if (typeof window === 'object') {
            window.addEventListener(
                'error',
                (e) => {
                    const item = VLog.generateLogItem(e, LV.e);
                    this.addBufferArr(item);
                },
                true,
            );

            // 监听未捕获的 异步 错误
            window.addEventListener('unhandledrejection', (e) => {
                const item = VLog.generateLogItem(e, LV.pe);
                this.addBufferArr(item);
            });
        }
    }

    init() {
        // 立马要要进行添加 json 方法
        try {
            prototypeAddToJSON();
            this.initOldPrototype();
            this.prototypeRep();
            this.errMonitor();
        } catch (e) {
            // console.error(e);
            this.oldErr(e);
        }
    }

    private addBufferArr(item: LogItem) {
        if (!this.conf.disableCollect) {
            const jsonStr = data2VisualStr(item);
            const strLen = jsonStr.length;
            const len = Math.ceil(strLen / this.conf.itemMaxLen) || 1;
            const useArr: string[] = Array(len);
            useArr[0] = jsonStr;
            this.bufferArr.push(...useArr);
            this.saveBufferArrDebounce();
        }
    }

    private clearBufferArr() {
        this.bufferArr.length = 0;
    }

    // 格式化保存的数据, 主要是最长条数的限制
    private formatSavaArr(arr: LogItem[]) {
        const { maxLogLength } = this.conf;
        const diff = arr.length - maxLogLength;
        if (diff > 0) {
            return arr.slice(diff);
        }
        return arr;
    }

    // 将数据存储在本地
    private saveArr2LocalStorage(arr: LogItem[]) {
        const { localStorageKey } = this.conf;
        const useArr = this.formatSavaArr(arr);
        const useDataStr = data2VisualStr(useArr);
        localStorage.setItem(localStorageKey, useDataStr);
    }

    // 将缓存数据保存到本地存储
    saveBuffer2LocalStorage(clearBufferArr = false) {
        const c = this.conf;
        let newSIndex = this.sIndex;
        let newEIndex = this.eIndex;
        if (this.bufferArr && this.bufferArr.length > 0) {
            // 缓存的最大长度为 maxLogLength
            const useBufferArr = this.bufferArr.slice(-c.maxLogLength);
            for (let i = 0; i < useBufferArr.length; i++) {
                newEIndex++;
                if (newEIndex > c.maxLogLength) {
                    newEIndex = 1;
                }

                const item = useBufferArr[i];
                const itemSaveKey = c.localStorageKey + newEIndex;
                // 数据量满了的情况下, 只可能为 eIndex === maxLogLength 或者 (eIndex < sIndex 且 eIndex 不为0), 为0是初次赋值
                // 这里是数据没有满的情况
                if (
                    (this.eIndex >= this.sIndex && this.eIndex !== c.maxLogLength) ||
                    this.eIndex === 0
                ) {
                    // pass
                } else {
                    // 都变化
                    newSIndex++;
                    if (newSIndex > c.maxLogLength) {
                        newSIndex = 1;
                    }
                }
                if (item) {
                    c.setItem(itemSaveKey, item);
                } else {
                    c.removeItem(itemSaveKey);
                }
            }

            this.sIndex = newSIndex;
            this.eIndex = newEIndex;

            // 总条数 = 最大长度 都变化
            clearBufferArr && this.clearBufferArr();
        }
    }

    // 将缓存数据保存到本地
    // 如果需要开启 每 minSavaTime 秒存储一次, 则需要强制执行本本方法一次
    private saveBufferArr() {
        const { minSavaTime } = this.conf;
        const runArr: LogItem[] = [];
        minSavaTime && clearTimeout(this.saveTimeoutID);
        try {
            if (this.bufferArr && this.bufferArr.length > 0) {
                this.saveBuffer2LocalStorage(true);
            }
        } catch (e) {
            this.oldErr(e);
        }
        if (minSavaTime) {
            // 用于 每 minSavaTime 秒存储一次
            this.saveTimeoutID = setTimeout(() => {
                this.saveBufferArr();
            }, minSavaTime);
        }
        return runArr;
    }

    // 将缓存数据保存到本地存储 的防抖, 具体在  constructor 实现
    private saveBufferArrDebounce() {
        this.conf.disableLog;
    }

    // 将数据提交, 会立刻进行存储到本地
    submit(cbk?: SendFun) {
        this.saveBufferArr();
        const arr = this.saveDataArr;
        const lastItem = arr[arr.length - 1];
        if (!lastItem) {
            // 没有日志可上传
            this.oldLog('没有日志可上传');
        }
        const useCbk = cbk || this.conf.sendFun;
        useCbk && useCbk(arr);
        // cbk || this.conf.sendFun;
    }
}
