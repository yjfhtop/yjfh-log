import serve from 'rollup-plugin-serve';
import rollupConfig from './rollup.config';

// 本地服务

const rollupDveConfig = {
    ...rollupConfig,
};

rollupDveConfig.plugins = [
    ...rollupConfig.plugins,
    serve({
        open: true,
        port: 8858,
        // host: '0.0.0.0',
        contentBase: '',
    }),
];

export default rollupDveConfig;
