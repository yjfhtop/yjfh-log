import { Console } from 'node:console';
import { debounce, prototypeAddToJSON } from './utils/utils';

prototypeAddToJSON();

export enum LV {
    l = 'l',
    w = 'w',
    e = 'e',
}
export interface LogItem {
    time: number; // 时间戳
    txt: string; // 日志本体
    lv: LV;
}

export interface VLogConf {
    // 存储的key 的前置 字符
    localStoragePre: string;
    // 禁用时, 不会收集日志, 和使用 console 一致
    disable: boolean;
}

const DefConf: VLogConf = {
    localStoragePre: '__vl',
    disable: false,
};

export default class VLog {
    // 和 localStoragePre 组成 存储的 key
    private nowIndex = 0;

    private conf: VLogConf = { ...DefConf };

    private oldLog: Console['log'];

    private oldWarn: Console['warn'];

    private oldErr: Console['error'];

    // 用于缓冲
    private bufferArr: LogItem[] = [];

    constructor(conf: Partial<VLogConf>) {
        this.conf = Object.assign(JSON.parse(JSON.stringify(DefConf)), conf);
        this.initOldPrototype();
        this.prototypeRep();
        // 对 addBufferArr 节流
        this.addBufferArr = debounce(this.addBufferArr, this, 1000);
    }

    addBufferArr(item: LogItem) {
        this.bufferArr.push(item);
    }

    initOldPrototype() {
        this.oldLog = console.log.bind(console);
        this.oldWarn = console.warn.bind(console);
        this.oldErr = console.warn.bind(console);
    }

    // 原型替换
    prototypeRep() {
        console.log = (...data: any[]) => {
            if (!this.conf.disable) {
                const logItem: LogItem = {
                    time: Date.now(),
                    txt: JSON.stringify(data),
                    lv: LV.l,
                };
            }
            this.oldLog(...data);
        };
    }
}
