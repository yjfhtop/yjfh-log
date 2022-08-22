import { Console } from 'node:console';
import { data2VisualStr, prototypeAddToJSON } from '@/utils/data';
import { debounce } from './utils/utils';
import { formDate } from './utils/date';

// 立马要要进行添加 json 方法
prototypeAddToJSON();

export enum LV {
    l = 'l',
    w = 'w',
    e = 'e',
}
export interface LogItem {
    // time: number; // 时间戳
    date: string; // 时间戳 的可视
    txt: string; // 日志本体
    lv: LV;
}

export interface VLogConf {
    // 存储的 localStorage 的 key
    localStorageKey: string;
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
}

const DefConf: VLogConf = {
    localStorageKey: '__vl',
    disableCollect: false,
    disableLog: false,
    maxLogLength: 2000,
    debounceTime: 1000 * 2,
    minSavaTime: 1000 * 5,
};

export default class VLog {
    // 和 localStorage 组成 存储的 key
    // private nowIndex = 0;

    private conf: VLogConf = { ...DefConf };

    private oldLog: Console['log'];

    private oldWarn: Console['warn'];

    private oldErr: Console['error'];

    // 用于缓冲
    private bufferArr: LogItem[] = [];

    // 用于保存 定时器id
    private saveTimeoutID: any = null;

    constructor(conf: Partial<VLogConf>) {
        this.conf = Object.assign(JSON.parse(JSON.stringify(DefConf)), conf);
        // 对 addBufferArr 节流
        // this.addBufferArr = debounce(this.addBufferArr, this, 1000);
        this.saveBufferArrDebounce = debounce(this.saveBufferArr, this, this.conf.debounceTime);
        this.init();
        // 为了唤醒 minSavaTime
        this.saveBufferArr();
    }

    // 记录原方法
    initOldPrototype() {
        this.oldLog = console.log.bind(console);
        this.oldWarn = console.warn.bind(console);
        this.oldErr = console.warn.bind(console);
    }

    // 原方法替换
    prototypeRep() {
        console.log = (...data: any[]) => {
            if (!this.conf.disableCollect) {
                const logItem: LogItem = {
                    // time: Date.now(),
                    date: formDate(new Date()),
                    txt: JSON.stringify(data),
                    lv: LV.l,
                };
                this.addBufferArr(logItem);
            }
            !this.conf.disableLog && this.oldLog(...data);
        };
        console.warn = (...data: any[]) => {
            if (!this.conf.disableCollect) {
                const logItem: LogItem = {
                    date: formDate(new Date()),
                    txt: JSON.stringify(data),
                    lv: LV.w,
                };
                this.addBufferArr(logItem);
            }
            !this.conf.disableLog && this.oldWarn(...data);
        };
        console.error = (...data: any[]) => {
            if (!this.conf.disableCollect) {
                const logItem: LogItem = {
                    date: formDate(new Date()),
                    txt: JSON.stringify(data),
                    lv: LV.e,
                };
                this.addBufferArr(logItem);
            }
            !this.conf.disableLog && this.oldErr(...data);
        };
    }

    init() {
        this.initOldPrototype();
        this.prototypeRep();
    }

    addBufferArr(item: LogItem) {
        this.bufferArr.push(item);
        this.saveBufferArrDebounce();
    }

    clearBufferArr() {
        this.bufferArr.length = 0;
    }

    clearStorage(clearBufferArr = false) {
        const { localStorageKey } = this.conf;
        localStorage.removeItem(localStorageKey);
        if (clearBufferArr) {
            this.bufferArr.length = 0;
        }
    }

    // 格式化保存的数据
    formatSavaArr(arr: LogItem[]) {
        const { maxLogLength } = this.conf;
        const diff = arr.length - maxLogLength;
        if (diff > 0) {
            return arr.slice(diff);
        }
        return arr;
    }

    // 将缓存数据保存到本地存储
    // 如果需要开启 每 minSavaTime 秒存储一次, 则需要强制执行本本方法一次
    saveBufferArr() {
        this.oldLog('saveBufferArr()');
        const { localStorageKey, minSavaTime } = this.conf;
        minSavaTime && clearTimeout(this.saveTimeoutID);
        try {
            const oldStr = localStorage.getItem(localStorageKey);
            if (this.bufferArr && this.bufferArr.length > 0) {
                const oldArr: LogItem[] = oldStr ? JSON.parse(oldStr) || [] : [];
                oldArr.push(...this.bufferArr);
                const useArr = this.formatSavaArr(oldArr);
                localStorage.setItem(localStorageKey, data2VisualStr(useArr));
                this.clearBufferArr();
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
    }

    // 将缓存数据保存到本地存储 的防抖, 具体在  constructor 实现
    saveBufferArrDebounce() {
        this.conf.disableLog;
    }
}
