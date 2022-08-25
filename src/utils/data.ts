// 数据处理
type DataType =
    | 'Object'
    | 'Array'
    | 'Null'
    | 'Number'
    | 'String'
    | 'Boolean'
    | 'Undefined'
    // to string
    | 'Function'
    | 'Symbol'
    | 'File'
    | 'FileList'
    | 'Date'
    | 'RegExp'
    | 'ErrorEvent'
    | 'Event'
    | 'BigInt'
    | 'Window'
    | 'Element'
    | 'NodeList'
    | 'Map'
    | 'Set'
    | 'Error';

export interface ErrFileInfo {
    // 行号
    lineno: number;
    // 列号
    colno: number;
    // 文件名
    path: string;
}

export interface ErrInfo {
    // 错误信息
    message: string;
    // 错误栈信息
    stack: string;
    errFileInfos: ErrFileInfo[];
}

// 从错误的堆栈信息获取 错误文件的url  和 行号 列号
export function stackStringGetNo(stackStr: string) {
    const lines = stackStr.split('\n');
    const reg = /((http|https):\/\/.+):(\d+):(\d+)/i;
    const targetArr: ErrFileInfo[] = [];
    // 逐行处理
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < lines.length; i++) {
        const item = lines[i];
        const arr = item.match(reg) || [];
        if (arr.length === 5) {
            const url = arr[1];
            const line = Number(arr[3]);
            const column = Number(arr[4]);
            targetArr.push({
                lineno: line,
                colno: column,
                path: url,
            });
        }
    }
    return targetArr;
}

export function toJsonBase(this: any) {
    return this.toString();
}
export function file2Json(this: File) {
    return {
        lastModified: this.lastModified,
        name: this.name,
        size: this.size,
        type: this.type,
        webkitRelativePath: this.webkitRelativePath,
    };
}

export function fileList2Json(this: FileList) {
    return Array.from(this);
}

export function ErrorEvent2Json(this: ErrorEvent): ErrInfo {
    return {
        message: this.error?.message || this.message,
        stack: this.error?.stack || `${this.filename} ${this.lineno}:${this.colno}`,
        errFileInfos: [{ lineno: this.lineno, colno: this.colno, path: this.filename }],
    };
}

export function element2Json(this: Element) {
    return this.outerHTML;
}

export function nodeList2Json(this: NodeList) {
    return Array.from(this);
}

export function map2Json(this: Map<any, any>) {
    return Object.fromEntries(this.entries());
}

export function set2Json(this: Set<any>) {
    return Array.from(this);
}

export function formData2Json(this: FormData) {
    return Object.fromEntries(this.entries());
}

export function event2Json(this: Event) {
    const target = (this.target || this.srcElement) as any;
    if (!target)
        return {
            html: 'Event target is null',
            sourceUrl: '',
        };
    return {
        html: target.outerHTML,
        sourceUrl: target.href || target.src,
    };
}

export function promiseRejectionEvent2Json(this: PromiseRejectionEvent): ErrInfo {
    const { reason } = this;
    // message: "Failed to fetch"
    // stack: "TypeError: Failed to fetch\n    at VLog.init (http://localhost:8858/dist/umd/index.js:363:13)\n    at new VLog (http://localhost:8858/dist/umd/index.js:283:18)\n    at http://localhost:8858/:16:26"
    if (!reason) {
        return {
            message: 'promiseRejectionEvent: reason is null',
            stack: '',
            errFileInfos: [],
        };
    }
    return {
        message: reason.message,
        stack: reason.stack,
        errFileInfos: stackStringGetNo(reason.stack),
    };
}

// 修改原型, 不可枚举即可
export function setPrototype(structureFun: any, key: string, v: any) {
    Object.defineProperty(structureFun.prototype, key, {
        value: v,
        configurable: true,
        enumerable: false,
        writable: true,
    });
}

// 注意,添加的方法必须不可枚举
export function prototypeAddToJSON() {
    typeof Function !== 'undefined' && setPrototype(Function, 'toJSON', toJsonBase);
    typeof Symbol !== 'undefined' && setPrototype(Symbol, 'toJSON', toJsonBase);
    typeof File !== 'undefined' && setPrototype(File, 'toJSON', file2Json);
    typeof FileList !== 'undefined' && setPrototype(FileList, 'toJSON', fileList2Json);
    typeof RegExp !== 'undefined' && setPrototype(RegExp, 'toJSON', toJsonBase);
    typeof ErrorEvent !== 'undefined' && setPrototype(ErrorEvent, 'toJSON', ErrorEvent2Json);
    typeof BigInt !== 'undefined' && setPrototype(BigInt, 'toJSON', toJsonBase);
    typeof Element !== 'undefined' && setPrototype(Element, 'toJSON', element2Json);
    typeof NodeList !== 'undefined' && setPrototype(NodeList, 'toJSON', nodeList2Json);
    typeof Map !== 'undefined' && setPrototype(Map, 'toJSON', map2Json);
    typeof Set !== 'undefined' && setPrototype(Set, 'toJSON', set2Json);
    typeof FormData !== 'undefined' && setPrototype(FormData, 'toJSON', formData2Json);
    typeof Event !== 'undefined' && setPrototype(Event, 'toJSON', event2Json);
    typeof PromiseRejectionEvent !== 'undefined' &&
        setPrototype(PromiseRejectionEvent, 'toJSON', promiseRejectionEvent2Json);
    typeof Error !== 'undefined' && setPrototype(Error, 'toJSON', toJsonBase);
}

function isElement(value) {
    return typeof HTMLElement === 'object'
        ? value instanceof HTMLElement // DOM2
        : value &&
              typeof value === 'object' &&
              value !== null &&
              value.nodeType === 1 &&
              typeof value.nodeName === 'string';
}

/**
 * 获取数据类型
 * @param data
 * @returns {string}  Object  Array Function Null ....
 */
export function getDataType(data: any): DataType {
    if (isElement(data)) {
        return 'Element';
    }
    const typeStr = Object.prototype.toString.call(data);
    let useTypeStr = typeStr.slice(8);
    useTypeStr = useTypeStr.slice(0, useTypeStr.length - 1);
    return useTypeStr as DataType;
}

// 尝试将数据转为json, 缺点, 循环引用的出现会导致失败(暂不处理循环引用), 如果失败,会打印失败信息
export function try2Json(data: any, errStr = '__json-err__'): string {
    let strData = errStr;
    try {
        strData = JSON.stringify(data);
    } catch (e) {
        strData = `${strData} : ${e}`;
    }
    return strData;
}

// 将数据变为 可视 的string 类型
export function data2VisualStr(data: any) {
    let targetStr = '';
    const dataType = getDataType(data);
    switch (dataType) {
        case 'Undefined':
            targetStr = dataType;
            break;
        default:
            targetStr = try2Json(data);
            break;
    }
    return targetStr;
}
