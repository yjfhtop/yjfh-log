import { Console } from 'node:console';
import { data2VisualStr, ErrInfo, getDataType, prototypeAddToJSON } from '@/utils/data';
import { debounce } from './utils/utils';
import { formDate } from './utils/date';

export enum LV {
    l = 'l',
    w = 'w',
    e = 'e',
    pe = 'pe',
}

export interface LogItem {
    // time: number; // 时间戳
    date: string; // 时间戳 的可视
    txt: string; // 日志本体
    lv: LV;
    errInfos?: ErrInfo[];
}

export type SendFun = (arr: LogItem[]) => Promise<any>;

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
    // 用于将日志提交到后台提交到后台
    sendFun?: SendFun;
}

const DefConf: VLogConf = {
    localStorageKey: '__vlog',
    disableCollect: false,
    disableLog: false,
    maxLogLength: 2000,
    debounceTime: 1000 * 2,
    minSavaTime: 1000 * 5,
};
export default class VLog {
    // 和 localStorage 组成 存储的 key
    // private nowIndex = 0;

    private readonly conf: VLogConf = { ...DefConf };

    private oldLog: Console['log'];

    private oldWarn: Console['warn'];

    private oldErr: Console['error'];

    // 用于缓冲
    private bufferArr: LogItem[] = [];

    // 用于保存 定时器id
    private saveTimeoutID: any = null;

    // 生成log item
    static generateLogItem(data: any, lv: LV) {
        const item: LogItem = {
            date: formDate(new Date()),
            txt: data2VisualStr(data),
            lv,
        };
        return item;
    }

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
                this.oldLog(data, 'error');
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
                    this.oldLog(e);
                    this.oldLog(item, 'errMonitor');
                    this.addBufferArr(item);
                },
                true,
            );

            // 监听未捕获的 异步 错误
            window.addEventListener('unhandledrejection', (e) => {
                this.oldLog('捕获到异常：', e);
                const item = VLog.generateLogItem(e, LV.pe);
                this.oldLog(item, 'unhandledrejection');
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
            console.error(e);
        }
    }

    private addBufferArr(item: LogItem) {
        this.bufferArr.push(item);
        this.saveBufferArrDebounce();
    }

    private clearBufferArr() {
        this.bufferArr.length = 0;
    }

    private clearStorage() {
        const { localStorageKey } = this.conf;
        localStorage.removeItem(localStorageKey);
    }

    // 格式化保存的数据
    private formatSavaArr(arr: LogItem[]) {
        const { maxLogLength } = this.conf;
        const diff = arr.length - maxLogLength;
        if (diff > 0) {
            return arr.slice(diff);
        }
        return arr;
    }

    // 获取存储的数据
    private getSaveArr(): LogItem[] {
        const { localStorageKey } = this.conf;
        const oldStr = localStorage.getItem(localStorageKey);
        const oldArr: LogItem[] = oldStr ? JSON.parse(oldStr) || [] : [];
        return oldArr;
    }

    // 将数据存储在本地(替换原有数据, 同时也会限制条数)
    private saveArr2LocalStorage(arr: LogItem[]) {
        const { localStorageKey } = this.conf;
        const useArr = this.formatSavaArr(arr);
        localStorage.setItem(localStorageKey, data2VisualStr(useArr));
    }

    // 将缓存数据保存到本地存储
    // 如果需要开启 每 minSavaTime 秒存储一次, 则需要强制执行本本方法一次
    private saveBufferArr() {
        this.oldLog('saveBufferArr()');
        const { minSavaTime } = this.conf;
        let runArr: LogItem[] = [];
        minSavaTime && clearTimeout(this.saveTimeoutID);
        try {
            if (this.bufferArr && this.bufferArr.length > 0) {
                const oldArr: LogItem[] = this.getSaveArr();
                oldArr.push(...this.bufferArr);
                runArr = oldArr;
                this.saveArr2LocalStorage(oldArr);
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
        return runArr;
    }

    // 将缓存数据保存到本地存储 的防抖, 具体在  constructor 实现
    private saveBufferArrDebounce() {
        this.conf.disableLog;
    }

    // 清空item 以及 这个item 之前的数据
    private clearItemAndBefore(targetItem: LogItem) {
        const oldArr = this.getSaveArr();
        const index = oldArr.findIndex((item) => {
            return (
                item.txt === targetItem.txt &&
                item.lv === targetItem.lv &&
                item.date === targetItem.date
            );
        });
        if (index > 0) {
            const newArr = oldArr.slice(index + 1);
            this.saveArr2LocalStorage(newArr);
        } else {
            // 如果找不到,可能是超过条数限制被删除了
        }
    }

    // 将数据提交, 会立刻进行存储到本地
    // 存储最新的一条日志, 如果 成功这条日志及之前的日志清空
    // 失败, 不做处理
    submit(cbk?: (data: LogItem[]) => Promise<any>) {
        this.saveBufferArr();
        const arr = this.getSaveArr();
        const lastItem = arr[arr.length - 1];
        if (!lastItem) {
            // 没有日志可上传
        }
        const useCbk = cbk || this.conf.sendFun;
        useCbk &&
            cbk(arr)
                .then(() => {
                    this.clearItemAndBefore(lastItem);
                })
                .catch((e) => {
                    // pass
                });
    }
}
