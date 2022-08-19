import { babel } from '@rollup/plugin-babel';

// rollup-plugin-node-resolve 插件允许我们加载第三方模块
// @rollup/plugin-commons 插件将它们转换为ES6版本
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';

// 路径别名
import alias from '@rollup/plugin-alias';

// 用于替换字符串， 用于环境变量
import replace from '@rollup/plugin-replace';

const path = require('path');
const packageJson = require('./package');

export const LibName = 'VLog';
export const resolveFile = function (filePath) {
    return path.join(__dirname, filePath);
};

export default {
    input: resolveFile('src/index.ts'),
    output: {
        file: packageJson.module,
        format: 'umd',
        name: LibName,
        // 是否map文件
        sourcemap: true,
        // 文件头部
        banner: `
/**
 * @license
 * ${LibName} v${packageJson.version}.
 * Copyright (c) ${packageJson.author}.
 * License  ${packageJson.license}
 */`.trim(),
    },
    plugins: [
        typescript(),
        resolve(),
        commonjs(),
        babel({
            exclude: 'node_modules/**', // 排除掉node_modules的第三方库
        }),
        alias({
            entries: [{ find: '@', replacement: resolveFile('src') }],
        }),
        replace({
            values: {
                __BUILD_VERSION__: packageJson.version,
                __NODE_ENV__: process.env.NODE_ENV,
                __LIB_NAME__: LibName,
            },
            preventAssignment: true,
        }),
    ],
};
