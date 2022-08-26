// SourceMap 和 列和行数转为
// eslint-disable-next-line import/no-extraneous-dependencies
const sourceMap = require('source-map');
const fs = require('fs');

// mozilla/source-map库
const rawSourceMap = JSON.parse(
    // 打包后的sourceMap文件
    fs.readFileSync('./dist/umd/index.js.map').toString(),
);

// 7:5901
const errorPos = {
    // 上图中的错误位置
    line: 7,
    column: 5901,
};

async function main() {
    const consumer = await new sourceMap.SourceMapConsumer(rawSourceMap); // 获取sourceMap consumer，我们可以通过传入打包后的代码位置来查询源代码的位置

    const originalPosition = consumer.originalPositionFor({
        // 获取 出错代码 在 哪一个源文件及其对应位置
        line: errorPos.line,
        column: errorPos.column,
    });
    // { source: 'webpack:///src/index.js', line: 4, column: 14, name: 'a' }

    // 根据源文件名寻找对应源文件
    const sourceIndex = consumer.sources.findIndex((item) => item === originalPosition.source);
    const sourceContent = consumer.sourcesContent[sourceIndex];
    const contentRowArr = sourceContent.split('\n'); // 切分

    // 接下来根据行和列可获取更加具体的位置
    console.log(contentRowArr[originalPosition.line - 1]);
    console.log(contentRowArr.slice(originalPosition.line - 1 - 5, originalPosition.line - 1 + 5));

    consumer.destroy(); // 使用完后记得destroy
}

main();
