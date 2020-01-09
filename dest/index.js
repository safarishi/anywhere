#!/usr/bin/env node
"use strict";
require('@babel/register')({
    plugins: [
        '@babel/plugin-transform-modules-commonjs'
    ],
    ignore: [],
    cache: false
});
require('./entry');
