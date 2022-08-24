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
    | 'Set';

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

export function ErrorEvent2Json(this: ErrorEvent) {
    if (this.error) {
        return {
            message: this.error.message,
            stack: this.error.stack,
        };
    }
    return {
        message: this.message,
        stack: `${this.filename} ${this.lineno}:${this.colno}`,
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

export function promiseRejectionEvent2Json(this: PromiseRejectionEvent): any {
    const { reason } = this;
    if (!reason) {
        return {
            message: 'promiseRejectionEvent: reason is null',
            stack: '',
        };
    }
    return {
        message: reason.message,
        stack: reason.stack,
    };
}

export function prototypeAddToJSON() {
    typeof Function !== 'undefined' && ((Function.prototype as any).toJSON = toJsonBase);
    typeof Symbol !== 'undefined' && ((Symbol.prototype as any).toJSON = toJsonBase);

    typeof File !== 'undefined' && ((File.prototype as any).toJSON = file2Json);
    typeof FileList !== 'undefined' && ((FileList.prototype as any).toJSON = fileList2Json);
    typeof RegExp !== 'undefined' && ((RegExp.prototype as any).toJSON = toJsonBase);
    typeof ErrorEvent !== 'undefined' && ((ErrorEvent.prototype as any).toJSON = ErrorEvent2Json);
    typeof BigInt !== 'undefined' && ((BigInt.prototype as any).toJSON = toJsonBase);
    typeof Element !== 'undefined' && ((Element.prototype as any).toJSON = element2Json);
    typeof NodeList !== 'undefined' && ((NodeList.prototype as any).toJSON = nodeList2Json);
    typeof Map !== 'undefined' && ((Map.prototype as any).toJSON = map2Json);
    typeof Set !== 'undefined' && ((Set.prototype as any).toJSON = set2Json);
    typeof FormData !== 'undefined' && ((FormData.prototype as any).toJSON = formData2Json);
    typeof Event !== 'undefined' && ((Event.prototype as any).toJSON = event2Json);
    typeof PromiseRejectionEvent !== 'undefined' &&
        ((PromiseRejectionEvent.prototype as any).toJSON = promiseRejectionEvent2Json);
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
