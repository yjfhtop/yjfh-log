### 日志收集

    主要收集前端的打印日志(console.log | console.warn | console.error), 运行时错误日志(比如 null.aaa())  
    资源加载日志(比如脚本加载失败), 未处理的 Promise 日志

### 注意点
    1. 本项目为众多原本不存在 toJSON 的原生函数添加了 toJSON 方法, 使得它们能够被 JSON.stringify() 方法调用, 可能会使得 JSON.stringify 出现意外的字段  
