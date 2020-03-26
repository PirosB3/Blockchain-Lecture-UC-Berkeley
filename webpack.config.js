const path = require('path');

module.exports = {
    mode: 'development',
    entry: './src/index.ts',
    devtool: 'inline-source-map',
    devServer: {
        contentBase: path.join(__dirname, 'build'),
        compress: true,
        port: 9000
    },
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'build'),
    },
    resolve: {
        extensions: [ '.tsx', '.ts', '.js' ],
    },
    node: { 
        fs: 'empty'
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.(css)$/,
                use: [
                    'style-loader',
                    'css-loader'
                ],
            },
        ],
    },
};