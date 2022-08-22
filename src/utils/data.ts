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
    | 'BigInt'
    | 'Window'
    | 'Element'
    | 'NodeList'
    | 'Map'
    | 'Set';

export function toJsonBase(data: any) {
    return data.toString();
}
export function file2Json(file: File) {
    return {
        lastModified: file.lastModified,
        name: file.name,
        size: file.size,
        type: file.type,
        webkitRelativePath: file.webkitRelativePath,
    };
}

export function fileList2Json(data: FileList) {
    return Array.from(data);
}

export function ErrorEvent2Json(data: ErrorEvent) {
    if (data.error) {
        return `message: ${data.error.message}
        stack: ${data.error.stack}`;
    }
    return `message: ${data.message}
    stack: ${data.filename} ${data.lineno}:${data.colno}`;
}

export function element2Json(el: Element) {
    return el.outerHTML;
}

export function nodeList2Json(list: NodeList) {
    return Array.from(list);
}

export function map2Json(map: Map<any, any>) {
    return Object.fromEntries(map.entries());
}

export function set2Json(set: Set<any>) {
    return Array.from(set);
}

export function formData2Json(formData: FormData) {
    return Object.fromEntries(formData.entries());
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
function getDataType(data: any): DataType {
    if (isElement(data)) {
        return 'Element';
    }
    const typeStr = Object.prototype.toString.call(data);
    let useTypeStr = typeStr.slice(8);
    useTypeStr = useTypeStr.slice(0, useTypeStr.length - 1);
    return useTypeStr as DataType;
}

// 尝试将数据转为json, 缺点, 循环引用的出现会导致失败(暂不处理循环引用), 如果失败,会打印失败信息
function try2Json(data: any, errStr = '__json-err__'): string {
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
